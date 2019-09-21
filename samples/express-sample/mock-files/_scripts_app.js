var ele = document.createElement("p");
ele.textContent = "from _scripts_app.js";
document.body.appendChild(ele);

var script = document.createElement("script");
const functionName = "function" + Date.now();
window[functionName] = function (data) {
    window.console.log("from jsonp: ", data);
};
script.src = "/hello.json?_callback=" + functionName;
document.body.appendChild(script);