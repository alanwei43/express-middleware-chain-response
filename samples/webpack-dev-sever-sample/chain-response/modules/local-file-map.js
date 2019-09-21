const Path = require("path"), Fs = require("fs"), { recuriseFiles } = require("../../../../src/ChainResponse");
const extTypeMaps = {
    ".json": "application/json",
    ".js": "application/javascript",
    ".html": "text/html"
};

/**
 * 本地文件映射
 */
module.exports = {
    isOpen: true, //是否开启
    name: "local-file-map",

    /**
     * 模块和本次请求是否匹配
     * @param {{method: string, originalUrl: string, path: string, query: string, xhr: boolean, request: Object}} param0 请求信息
     * @returns {Promise | boolean}
     */
    isMatch({ method, originalUrl, path, query, xhr, request }) {
        const files = recuriseFiles(Path.join(__dirname, "../mock-files"));
        const match = files.filter(f => f.fileName === path.replace(/\//g, "_"))[0] || files.filter(f => f.fileNameWithoutExt == path.replace(/\//g, "_"))[0];
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
};