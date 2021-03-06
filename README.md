# Express 中间件

主要用于 webpack-dev-server mock接口使用.

## 安装

```bash
npm install @alanlib/express-middleware-chain-response
```

## 使用方式

函数定义

```javascript
/**
 * 获取 express 中间件
 * @param {Array.<string | {isOpen: boolean, isMatch: function(): Promise<boolean> getResponse: function(): Promise}>} modules 模块(可以是已经加载好的模块数组, 也可以是模块文件所在目录, 或者模块的文件路径)
 * @param {{debug: boolean, switchPath: string, currentSwitchOn: boolean}} options 选项
 * @returns {function} express中间件
 */
function chainResponse(modules, options){
    //...
}
```

* options: 
    * debug: `boolean` 开启会输出更多log日志
    * switchPath: `string` 用来开启/关闭此中间件的拦截功能, 默认 `/@alanlib/express-middleware-chain-response`
    * currentSwitchOn: `boolean` 默认开启/关闭拦截功能

可以指定模块所在目录: `chainResponse(["../modules"])`, 或模块文件: `chainResponse(["../modules/jsonp-module.js"])`

也可以直接传入模块: `chainResponse([require("./module1"), require("./module2")])`

或者混合使用: `chainResponse(["../modules-dir", "./module1.js", require("./module1"), require("./module2")])`

### webpack-dev-server

参考例子: [samples/webpack-dev-sever-sample](./samples/webpack-dev-sever-sample)

```javascript
const { chainResponse } = require("express-middleware-chain-response");

module.exports = {
    //other configurations
    devServer: {
        before: function (app, server) {
            app.use(chainResponse([path.join(__dirname, "modules")], { debug: true }));
        }
    }
};
```

### Express Web

参考例子: [samples/express-sample](./samples/express-sample)

```javascript
const { chainResponse } = require("express-middleware-chain-response");
app.use(chainResponse([path.join(__dirname, "modules")], { debug: true }));
```

## 模块定义

[例子如下](./src/modules/module-sample.js):

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



## 其他

访问 `/@alanlib/express-middleware-chain-response` 可以开启/关闭此中间件的拦截, 通过`chainResponse`的参数`options.switchPath`可以改变路径.

下一步支持 request.body 和图片等二进制文件mock.