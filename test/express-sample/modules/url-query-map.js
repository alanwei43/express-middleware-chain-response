const Path = require("path"),
    Fs = require("fs"),
    { recuriseFiles } = require("../../../src/ChainResponse");

const extTypeMaps = {
    ".json": "application/json",
    ".js": "application/javascript",
    ".html": "text/html"
};

const chainModule = {
    isOpen: true, //是否开启
    name: "url-query-map", //模块名称(方便调试)

    /**
     * 模块和本次请求是否匹配
     * @param {{method: string, originalUrl: string, path: string, query: string, xhr: boolean, getHeader: function(string): string request: Object}} param0 请求信息
     * @returns {Promise | boolean}
     */
    isMatch({ method, originalUrl, path, query, xhr, getHeader, request }) {
        /**
         * method: HTTP method
         * originalUrl: 请求的原始URL, 包含URL参数
         * path: URL路径, 不包含URL参数
         * query: URL查询参数
         * xhr: 是否是Ajax请求(判断请求头 X-Requested-With 值是否是 XMLHttpRequest) 
         * getHeader: 获取请求头
         * request: express 框架包裹的请求对象 http://www.expressjs.com.cn/4x/api.html#req
         */

        /**
         * 返回值必须是boolean类型或者Promise对象
         */
        if (path !== "/getdata") {
            return false;
        }
        const action = query._action;
        const files = recuriseFiles(Path.join(__dirname, "../mock-files"));
        const match = files.filter(f => f.fileName === action)[0] || files.filter(f => f.fileNameWithoutExt == action)[0];

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
    getResponse({ method, originalUrl, path, query, xhr, request }, { fullPath, extName }, prevResponse, handledModules) {
        const content = Fs.readFileSync(fullPath);
        return {
            content: content.toString(),
            headers: {
                "Content-Type": extTypeMaps[extName] || "text/plain"
            }
        };
    }
};

module.exports = () => chainModule;

