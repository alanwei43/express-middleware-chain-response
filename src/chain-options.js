const chainOptions = {
    debugMode: false,
    switchPath: "/@alanlib/express-middleware-chain-response",
    currentSwitchOn: true,
    getLogPrefix: () => `[ChainResponse ${new Date().toLocaleTimeString()}]`
}

module.exports = chainOptions;