const chainOptions = {
    debugMode: false,
    switchPath: "/@alanlib/express-middleware-chain-response",
    currentSwitchOn: true,

    /**
     * 获取日志前缀
     * @returns {string}
     */
    getLogPrefix() { return `[express-middleware-chain-response ${new Date().toLocaleTimeString()}]`; },
    /**
     * 更新选项
     * @param {{debug: boolean, switchPath: string, currentSwitchOn: boolean}} options 选项
     * @returns {void}
     */
    update(options) {
        if (!options) {
            return;
        }
        if (typeof options.debug === "boolean") {
            this.debugMode = options.debug;
        }
        if (typeof options.switchPath === "string") {
            this.switchPath = options.switchPath;
        }
        if (typeof options.currentSwitchOn === "boolean") {
            this.currentSwitchOn = options.currentSwitchOn;
        }
    }
}

module.exports = chainOptions;