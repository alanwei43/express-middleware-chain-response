const chainOptions = require("./chain-options");

exports.log = function (txt) {
    if (chainOptions.debugMode) {
        console.log(`${chainOptions.getLogPrefix()} ${txt}`);
    }
}
exports.warn = function (txt) {
    if (chainOptions.debugMode) {
        console.warn(`${chainOptions.getLogPrefix()} ${txt}`);
    }
}
exports.error = function (txt, e) {
    console.error(`${chainOptions.getLogPrefix()} ${txt}`, e);
}
