const { chainResponse } = require("../../src");
const path = require("path");

module.exports = {
    publicPath: "/",
    pages: {
        cnblogs: {
            entry: "src/cnblogs/main.js",
            template: "templates/cnblogs.html",
            filename: "cnblogs.html",
        }
    },
    devServer: {
        before: function (app, server) {
            app.use(chainResponse([path.join(__dirname, "chain-response", "modules")], { debug: true }));
        }
    }
};