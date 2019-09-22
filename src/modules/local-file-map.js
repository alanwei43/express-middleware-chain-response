const Path = require("path"),
    Fs = require("fs"),
    { recuriseFiles } = require("../index");

const extTypeMaps = {
    ".json": "application/json",
    ".js": "application/javascript",
    ".html": "text/html"
};

/**
 * 获取本地文件映射
 * @param {string} fileDir 
 * @param {function({query: {}, path: string}): string} getFileNameByReq 
 * @param {Object.<string, string>} fileExtContentTypeMaps 
 */
function getLocalFileMapModule(fileDir, getFileNameByReq, fileExtContentTypeMaps) {
    fileExtContentTypeMaps && Object.keys(fileExtContentTypeMaps).map(key => extTypeMaps[key] = fileExtContentTypeMaps[key]);

    return {
        isOpen: true, //是否开启
        name: "local-file-map",

        /**
         * 模块和本次请求是否匹配
         * @param {{method: string, originalUrl: string, path: string, query: string, xhr: boolean, request: Object}} param0 请求信息
         * @returns {Promise | boolean}
         */
        isMatch({ method, originalUrl, path, query, xhr, request }) {
            const files = recuriseFiles(fileDir);
            const fileName = getFileNameByReq({ query: query, path: path });
            const match = files.filter(f => f.fileName === fileName)[0] || files.filter(f => f.fileNameWithoutExt === fileName)[0];
            return match ? Promise.resolve(match) : false;
        },
        /**
         *  获取响应内容
         * @param {{method: string, originalUrl: string, path: string, query: string, xhr: boolean, request: Object}} param0 请求信息
         * @param {Object} matchResult isMatch 返回的结果(fulfill 的值)
         * @param {{content: string, headers: Array.<string, string>}} prevResponse 上一个模块的 getResponse 返回返回值
         * @param {{name: string, priotiy: number, isMatch: function():Promise, getResponse: function():Promise}} handledModules 已处理模块堆栈
         * @returns {Promise<{content: string, headers: Object.<string, string>}>} 
         */
        getResponse({ method, originalUrl, path, query, xhr, request }, { fullPath, extName } = {}, prevResponse, handledModules) {
            //返回值必须包含 content 和 headers 
            const content = Fs.readFileSync(fullPath);
            return {
                content: content.toString(),
                headers: {
                    "Content-Type": extTypeMaps[extName] || "text/plain"
                }
            };
        }
    }
};

module.exports = getLocalFileMapModule;