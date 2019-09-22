const fs = require("fs"),
    path = require("path"),
    { log, warn, error } = require("./log");

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
 * @param {function | {name: string, isOpen: boolean}} m 模块
 * @returns {{isValid: boolean, chainModule: {isOpen: boolean, name: string}}}
 */
function checkChainModule(m) {
    const item = {
        chainModule: m,
        isValid: false
    };
    if (typeof m === "function") {
        item.chainModule = m();
    }

    if (!item.chainModule || typeof item.chainModule !== "object") {
        warn(`模块必须是一个对象或者是一个能返回有效对象的函数`)
        return item;
    }
    const logPrefix = `[${item.chainModule.name}]`;
    if (typeof item.chainModule.name !== "string") {
        warn(`模块的 name 属性不能为空`);
        return item;
    }
    if (typeof item.chainModule.isOpen !== "boolean") {
        item.chainModule.isOpen = true;
    }
    if (typeof item.chainModule.priority !== "number") {
        item.chainModule.priority = 100;
    }
    if (typeof item.chainModule.isMatch !== "function") {
        warn(`${logPrefix}校验失败: isMatch 必须是个函数`);
        return item;
    }
    if (typeof item.chainModule.getResponse !== "function") {
        warn(`${logPrefix}校验失败: getResponse 必须是个函数`)
        return item;
    }

    log(`${logPrefix}校验通过`);
    item.isValid = true;
    return item;
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
                    handledModules: handledModules
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

exports.chainModules = chainModules;
exports.isPromise = isPromise;
exports.recuriseFiles = recuriseFiles;
exports.checkChainModule = checkChainModule;
exports.whenAllSettled = whenAllSettled;