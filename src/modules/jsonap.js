
/**
 * 获取JSONP模块
 * @param {Array.<string>} callbackParams jsonp 的callback参数名
 */
function getJsonpModule(callbackParams, priority = 5) {

    return {
        isOpen: false, //是否开启
        priority: priority, //优先级, 默认100, 值越高越先执行
        name: "jsonp", //模块名称(方便调试)

        /**
         * 模块和本次请求是否匹配
         * @param {{method: string, originalUrl: string, path: string, query: string, xhr: boolean, request: Object}} param0 请求信息
         * @returns {Promise | boolean}
         */
        isMatch({ method, originalUrl, path, query, xhr, getHeader, request }) {
            const paramKey = callbackParams.filter(param => query[param])[0];
            if (paramKey) {
                return Promise.resolve(query[paramKey]);
            }
            return false;
        },
        /**
         *  获取响应内容
         * @param {{method: string, originalUrl: string, path: string, query: string, xhr: boolean, request: Object}} param0 请求信息
         * @param {Object} matchResult isMatch 返回的结果(fulfill 的值)
         * @param {{content: string, headers: Array.<string, string>}} prevResponse 上一个模块的 getResponse 返回返回值
         * @param {{name: string, priotiy: number, isMatch: function():Promise, getResponse: function():Promise}} handledModules 已处理模块堆栈
         * @returns {Promise<{content: string, headers: Object.<string, string>}>} 
         */
        getResponse({ method, originalUrl, path, query, xhr, request }, matchResult, prevResponse, handledModules) {
            if (!prevResponse) {
                return prevResponse;
            }
            prevResponse.headers["Content-Type"] = "application/x-javascript; charset=utf-8"
            prevResponse.content = `${matchResult}(${prevResponse.content})`;

            return Promise.resolve(prevResponse);
        }
    };
}

module.exports = getJsonpModule;