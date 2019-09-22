const express = require("express");
const app = express();
const { chainResponse } = require("../../src");
const { getJsonpModule, getLocalFileMapModule } = require("../../src/modules");
const path = require("path");

app.get('/', (req, res) => res.send('Hello World!'))
app.use(chainResponse([
    path.join(__dirname, "modules"),
    getJsonpModule(["_callback"]),
    getLocalFileMapModule(path.join(__dirname, "mock-files"), params => params.path.replace(/\//g, "_"))
], { debug: true }));

app.listen(3001, () => console.log('Example app listening on port 3001!'))