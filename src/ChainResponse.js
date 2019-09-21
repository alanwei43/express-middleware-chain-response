const fs = require("fs"), path = require("path");
let debugMode = false;

//#region 日志函数
function log(txt) {
    if (debugMode) {
        console.log(`[${new Date().toLocaleString()}] ${txt}`);
    }
}
function warn(txt) {
    if (debugMode) {
        console.warn(`[${new Date().toLocaleString()}] ${txt}`);
    }
}
function error(txt, e) {
    console.error(`[${new Date().toLocaleString()}] ${txt}`, e);
}
//#endregion

//#region 实用函数
/**
 * 是否是Promise对象
 * @param {Object} obj 
 * @returns {boolean}
 */
function isPromise(obj) {
    return obj && typeof obj.then === "function" && typeof obj.catch === "function";
};

/**
 * 递归获取指定目录下的所有文件
 * @param {String} dir 目录
 * @param {[{filePath: String, fileName: String, extName: String, fileNameWithoutExt: String, relativePath: String}]} files 
 * @returns {[{fullPath: string, filePath: string, fileName: string, extName: string, fileNameWithoutExt: string, relativePath: string}]}
 */
function recuriseFiles(dir, files) {
    if (!files) {
        files = [];
    }
    const children = fs.readdirSync(dir)
        .map(item => path.join(dir, item))
        .map(item => ({
            path: item,
            stat: fs.statSync(item)
        }));

    children.filter(item => item.stat.isDirectory()).map(d => recuriseFiles(d.path, files));
    children.filter(item => item.stat.isFile()).map(f => {
        const fileInfo = {
            fullPath: f.path,
            filePath: path.dirname(f.path),
            fileName: path.basename(f.path),
            extName: path.extname(f.path),
        };
        if (fileInfo.extName) {
            fileInfo.fileNameWithoutExt = fileInfo.fileName.split('.').slice(0, -1).join('.')
            fileInfo.relativePath = path.relative(__dirname, fileInfo.filePath);
        }

        files.push(fileInfo);
    });
    return files;
}

/**
 * 所有Promise都被 settled
 * @param {[{promise: function():Promise, data: {}}]} promises
 * @retu {Promise<[{isResolved: boolean, isRejected: boolean, result: {}, data: {}, error: {}}]>}
 */
function whenAllSettled(promises) {

    const mapedPromises = promises
        .map(item => {
            if (isPromise(item)) {
                return { promise: item, data: undefined };
            }
            if (item && isPromise(item.promise)) {
                return item;
            }
            return {
                promise: Promise.reject(new Error("invalid_promise")),
                data: item
            };
        })
        .map(item => item.promise.then(result => {
            return {
                isResolved: true,
                result: result,
                data: item.data
            }
        }, error => {
            return {
                isRejected: true,
                error: error,
                data: item.data
            };
        }));

    return Promise.all(mapedPromises);
}
//#endregion


/**
 * 校验模块有效性
 * @param {{path: string, module: function | {}}} item 模块
 * @returns {boolean}
 */
function checkChainModule(item) {
    const logPrefix = `[${item.path}]`;
    log(`${logPrefix}开始校验`);

    if (typeof item.module === "function") {
        item.module = item.module();
    }

    if (!item.module || typeof item.module !== "object") {
        warn(`${logPrefix}模块必须是一个对象或者是一个能返回有效对象的函数`)
        return false;
    }
    if (typeof item.module.isOpen !== "boolean") {
        item.module.isOpen = true;
    }
    if (typeof item.module.name !== "string") {
        item.module.name = item.path;
    }
    if (typeof item.module.priority !== "number") {
        item.module.priority = 100;
    }
    if (typeof item.module.isMatch !== "function") {
        warn(`${logPrefix}校验失败: isMatch 必须是个函数`);
        return false;
    }
    if (typeof item.module.getResponse !== "function") {
        warn(`${logPrefix}校验失败: getResponse 必须是个函数`)
        return false;
    }

    log(`${logPrefix}校验通过`);
    return true;
}
/**
 * 获取所有模块 
 * @param {String} dir 模块所在目录
 * @param {RegExp | function({fullPath: string, fileName: string}): boolean} filter 文件过滤
 * @returns {[{isOpen: boolean, isMatch: function(): Promise, getResponse: function(): Promise}]}
 */
function getAllModules(dir, filter) {
    log(`开始从目录${dir}加载模块`)

    let filterFn = ({ fullPath }) => /\.js$/g.test(fullPath);
    if (filter instanceof RegExp) {
        filterFn = meta => filter.test(meta);
    } else if (typeof filter === "function") {
        filterFn = filter;
    } else {
        log(`加载所有以.js结尾的文件`);
    }

    return recuriseFiles(dir)
        .filter(filterFn)
        .map(f => {
            const modulePath = `.${path.sep}${f.relativePath}${path.sep}${f.fileName}`;
            log(`读取到模块文件: ${modulePath}`);
            return modulePath;
        })
        .map(p => ({ module: require(p), path: p }))
        .filter(checkChainModule)
        .map(item => item.module);
}

/**
 * 
 * @param {{}} reqInfo
 * @param {[{matchResult: Object, module: {name: string, getResponse: function():Promise}}]} modules 
 * @returns {Promise<{prevResponse: {content: string, headers: Object.<string, string>}, handledModules: []}>}
 */
function chainModules(reqInfo, modules) {
    log(`开始串联${modules.length}个模块: ${modules.map(m => m.module.name).join(", ")}`);
    return modules.reduce((prev, next) => {
        return prev.then(({ prevResponse, handledModules }) => {
            log(`[模块${next.module.name}]调用 getResponse 方法`);
            return Promise.resolve(next.module.getResponse(reqInfo, next.matchResult, prevResponse, handledModules)).then(result => {
                log(`[模块${next.module.name}]getResponse 方法执行完成`);
                return {
                    prevResponse: result,
                    handledModules: [...handledModules, next.module]
                };
            }).catch(e => {
                error(`[模块${next.module.name}]getResponse 方法发生异常: ${e.message}`, e);
                return {
                    prevResponse: prevResponse,
                    handledModules: [...handledModules, next.module]
                }
            });
        }).catch(e => {
            error(`在执行模块${next.module.name}或上一模块时发生异常: ${e.message}`, e);
            return {
                prevResponse: undefined,
                handledModules: []
            };
        });
    }, Promise.resolve({ prevResponse: undefined, handledModules: [] }));
}

/**
 * 获取 express 中间件
 * @param {{dir: string, filter: RegExp | function} | Array.<{isOpen: boolean, isMatch: function(): Promise<boolean>, getResponse: function(): Promise}>} modulesOrOptions 模块(可以是已经加载好的模块数组, 也可以指定模块路径)
 * @param {{debug: boolean, modules: RegExp}} param1 选项
 * @returns {function}
 }}
 */
function chainResponse(modulesOrOptions, { debug } = {}) {
    debugMode = !!debug;

    const modules = Array.isArray(modulesOrOptions) ? modulesOrOptions : getAllModules(modulesOrOptions.dir, modulesOrOptions.filter);

    log(`加载了${modules.length}个模块: ${modules.map(m => m.name).join(", ")}`);

    return function (req, res, next) {
        let reqInfo = {
            method: req.method + "",
            originalUrl: req.originalUrl,
            path: req.path,
            query: req.query,
            xhr: req.xhr,
            getHeader: req.get,
            request: req
        };

        const logPrefix = `[${reqInfo.method.toUpperCase()} ${reqInfo.path}]`;
        const matchPromises = modules.map(m => {
            let matchResult = m.isMatch(reqInfo);
            if (typeof matchResult === "boolean") {
                matchResult = matchResult ? Promise.resolve() : Promise.reject();
            }
            return { data: m, promise: matchResult };
        });
        whenAllSettled(matchPromises).then(promises => {
            const resolvedModules = promises
                .filter(p => p.isResolved)
                .map(p => ({
                    matchResult: p.result,
                    module: p.data,
                    priority: typeof p.data.priority === "number" ? p.data.priority : 0
                }))
                .sort((prev, next) => next.priority - prev.priority);

            log(`${logPrefix}匹配到${resolvedModules.length}个模块`);

            return chainModules(reqInfo, resolvedModules);
        }).then(({ prevResponse, handledModules }) => {
            if (!prevResponse) {
                log(`${logPrefix}模块响应内容为空, 执行 next()`);
                next();
                return;
            }
            if (typeof prevResponse.content !== "string") {
                log(`${logPrefix}模块响应内容不是字符串, 执行 next()`);
                next();
                return;
            }

            Object.keys(prevResponse.headers || {}).forEach(key => {
                const value = prevResponse.headers[key];
                res.append(key, value);
                log(`${logPrefix}设置响应头 ${key}: value`);
            });
            res.send(prevResponse.content);
            log(`${logPrefix}模块发送响应内容, 长度${prevResponse.content.length}`);
        });

    }
}
exports.recuriseFiles = recuriseFiles;
exports.whenAllSettled = whenAllSettled;
exports.chainResponse = chainResponse;