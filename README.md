# Express 中间件

主要用于 webpack-dev-server mock接口使用.

## 使用方式

函数定义

```javascript
/**
 * 获取 express 中间件
 * @param {{dir: string, filter: RegExp | function(): boolean} | Array.<{isOpen: boolean, isMatch: function(): Promise<boolean> getResponse: function(): Promise}>} modulesOrOptions 模块(可以是已经加载好的模块数组, 也可以指定模块路径)
 * @param {{debug: boolean, modules: RegExp}} param1 选项
 * @returns {function} express中间件
 */
function chainResponse(modulesOrOptions, { debug }){
    //...
}
```

可以指定模块所在目录: `chainResponse({dir: "../modules" })`

也可以直接传入模块: `chainResponse([require("./module1"), require("./module2")])`

### webpack-dev-server

```javascript
const { chainResponse } = require("express-middleware-chain-response");

module.exports = {
    //other configurations
    devServer: {
        before: function (app, server) {
            app.use(chainResponse({ dir: path.join(__dirname, "modules") }, { debug: true }));
        }
    }
};
```

### Express Web

```javascript
const { chainResponse } = require("express-middleware-chain-response");
app.use(chainResponse({ dir: path.join(__dirname, "modules") }, { debug: true }));
```

## 模块定义

```javascript
/**
 * 模块例子
 */
const chainModule = {
    isOpen: false, //是否开启
    priority: 5, //优先级, 默认100, 值越高越先执行
    name: "module name", //模块名称(方便调试)

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

        // 返回值必须是boolean类型
        return false; 

        // 或者Promise对象
        return Promise.resolve();
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
        // 返回对象必须包含 content 和 headers 
        return {
            content: "",
            headers: {
                // "Content-Type": "application/json"
            }
        };
        // 也可以返回一个Promise
        return Promise.resolve({
            content: "",
            headers: {
                // "Content-Type": "application/json"
            }
        });
    }
};

/**
 * 可以直接导出对象
 */
module.exports = chainModule;

/**
 * 也可以导出一个函数, 函数返回一个对象:
 * module.exports = () => chainModule;
 */
```

