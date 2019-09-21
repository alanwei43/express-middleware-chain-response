const express = require("express");
const app = express();
//const { chainResponse } = require("@alanlib/express-middleware-chain-response");
const { chainResponse } = require("../../src/ChainResponse");
const path = require("path");

app.get('/', (req, res) => res.send('Hello World!'))
app.use(chainResponse({ dir: path.join(__dirname, "modules") }, { debug: true }));

app.listen(3001, () => console.log('Example app listening on port 3001!'))