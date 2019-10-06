const path = require("path"),
    fs = require("fs"),
    chainOptions = require("./chain-options"),
    { log, warn, error } = require("./log"),
    { recuriseFiles, checkChainModule, chainModules, whenAllSettled, isPromise } = require("./util");

/**
 * 获取所有模块 
 * @param {String} dir 模块所在目录
 * @param {RegExp | function({fullPath: string, fileName: string}): boolean} filter 文件过滤
 * @returns {[{isOpen: boolean, isMatch: function(): Promise, getResponse: function(): Promise}]}
 */
function getAllModules(dir) {
    log(`开始从目录${dir}加载模块`)

    return recuriseFiles(dir)
        .filter(({ fullPath }) => /\.js$/g.test(fullPath))
        .map(f => {
            const modulePath = `.${path.sep}${f.relativePath}${path.sep}${f.fileName}`;
            log(`读取到模块文件: ${modulePath}`);
            return modulePath;
        })
        .map(p => {
            const m = require(p);
            if (typeof m.name !== "string" || m.name === "") {
                m.name = p;
            }
            return m;
        });
}

/**
 * 获取 express 中间件
 * @param {Array.<string | Object>} modulesOrOptions 模块(可以是已经加载好的模块数组, 也可以指定模块路径)
 * @param {{debug: boolean, switchPath: string, currentSwitchOn: boolean}} options 选项
 * @returns {function} express中间件
 */
function chainResponse(modules, options) {
    if (!Array.isArray(modules)) {
        warn("参数 modules 必须是数组");
        return;
    }
    
    chainOptions.update(options);

    const validModules = modules.filter(m => m && (typeof m === "string" && fs.existsSync(m)) || typeof m === "object" || typeof m === "function")
        .map(m => {
            if (typeof m === "string") {
                if (fs.statSync(m).isFile()) {
                    return [require(m)];
                } else if (fs.statSync(m).isDirectory()) {
                    return getAllModules(m);
                } else {
                    warn(`${m}无法找到任何模块`)
                    return [];
                }
            }
            return [m];
        })
        .reduce((prev, next) => prev.concat(next), [])
        .map(m => checkChainModule(m))
        .filter(item => item.isValid && item.chainModule.isOpen)
        .map(item => item.chainModule);

    log(`加载了${validModules.length}个模块: ${validModules.map(m => m.name).join(", ")}`);

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
        if (chainOptions.switchPath === reqInfo.path) {
            chainOptions.currentSwitchOn = !chainOptions.currentSwitchOn;
            res.send(`current switch is ${chainOptions.currentSwitchOn}`);
            return;
        }
        if (!chainOptions.currentSwitchOn) {
            log("middleware is off, go to next.");
            next();
            return;
        }

        const logPrefix = `[${reqInfo.method.toUpperCase()} ${reqInfo.path}]`;
        const matchPromises = validModules.map(m => {
            let matchResult = m.isMatch(reqInfo);
            if (typeof matchResult === "boolean") {
                matchResult = matchResult ? Promise.resolve(true) : Promise.reject(false);
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
                log(`${logPrefix}所有模块没有响应, 执行 next()`);
                next();
                return;
            }

            Object.keys(prevResponse.headers || {}).forEach(key => {
                const value = prevResponse.headers[key];
                res.append(key, value);
                log(`${logPrefix}设置响应头 ${key}: ${value}`);
            });
            if (prevResponse.content) {
                res.send(prevResponse.content);
                log(`${logPrefix}模块已发送响应内容`);
            }
            if (prevResponse.continueNext) {
                next();
                log(`${logPrefix}continue next`);
            }
        });

    }
}
exports.chainResponse = chainResponse;
