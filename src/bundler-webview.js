// @ts-ignore
const vscode = acquireVsCodeApi();

window.addEventListener("message", payload => {
  const data = payload.data;
  switch (data.type) {
    case "didReceivePortFromConfig":
      start_Socket(data.port);
      break;
  }
});

let socket;

let triedToConnect = false;
let port = 5501;

let isWatching = false;

const get = id => document.getElementById(id) || new HTMLElement();

const getCheckbox = id => {
  let el = document.getElementById(id);
  if (el instanceof HTMLInputElement) return el;
  else return new HTMLInputElement();
};

function openErrorsOutput() {
  get(`errorsOutput`).style.display = "block";
}

function displayWbrServerNotRunning() {
  let el = document.getElementById(`notRunning`);
  if (el) el.style.display = "block";
  let el2 = document.getElementById(`app`);
  if (el2) el2.style.display = "none";
}

function toggleWatch() {
  let c = getCheckbox(`check-production`).checked;
  if (c) {
    getCheckbox(`check-watch`).checked = false;
  }
}

function toggleProduction() {
  let c = getCheckbox(`check-watch`).checked;
  if (c) {
    getCheckbox(`check-production`).checked = false;
  }
}

function displayWbrServer() {
  let el = document.getElementById(`notRunning`);
  if (el) el.style.display = "none";
  let el2 = document.getElementById(`app`);
  if (el2) el2.style.display = "block";
}

function startWBRServer() {
  // will try to get updated port in win.config.js
  vscode.postMessage({
    type: "getPortFromConfig",
  });
  triedToConnect = true;
  get(`errorMessage`).innerHTML = ``;
  const el = get(`btnStart`);
  const hasToShowTerminal = getCheckbox(`check-terminal`).checked;
  let tmp;
  if (el) {
    tmp = el.innerHTML;
    el.innerHTML = `Loading...`;
    // @ts-ignore
    el.disabled = true;
  }
  vscode.postMessage({
    type: "runServer",
    hasToShowTerminal,
  });
  setTimeout(() => {
    if (el) {
      el.innerHTML = tmp;
      // @ts-ignore
      el.disabled = false;
    }
  }, 3000);
}

function start_Socket(receivedPort) {
  setTimeout(() => {
    get(`errorMessage`).innerHTML = ``;
    socket.connect();
    sendToWBR({
      type: "isWatchingT",
      payload: "",
    });
  }, 3000);
  console.log(
    `WinnetouJs Server attempting to connect at ${receivedPort || port}`
  );
  // @ts-ignore
  socket = io(`http://localhost:${receivedPort || port}`, {
    transports: ["websocket", "polling"],
  });

  // Listener for successful connection
  socket.on("connect", () => {
    console.log("\n\nConnected to the WinnetouJs server successfully!");
    displayWbrServer();
  });

  // Listener for connection errors
  socket.on("connect_error", error => {
    socket.close();
    if (triedToConnect)
      get(
        `errorMessage`
      ).innerHTML = `Extension is unable to connect to WinnetouJs WBR Server. Please check if port is already in use, change it in win.config.js and try again.`;
    console.log("\n\nFailed to connect to the WinnetouJs server");
    displayWbrServerNotRunning();
  });

  // Optional: Listener for disconnect
  socket.on("disconnect", reason => {
    socket.close();
    displayWbrServerNotRunning();
    console.log("\n\nDisconnected from the WinnetouJs server");
  });

  let filesLoaded = 0;
  let totalFiles = 0;

  socket.on("totalFiles", total => {
    totalFiles = total;
  });

  socket.on("fileName", name => {
    get(`output_component`).innerHTML = name;
  });

  socket.on("file", fileName => {
    if (isWatching) {
      totalFiles = 1;
    }
    filesLoaded++;
    const pp = (filesLoaded / totalFiles) * 100;

    get(`inner-bar`).style.width = pp + `%`;
    get(`percent`).innerHTML = pp + `%`;
    get(`output_component`).innerHTML = fileName;
    if (filesLoaded === totalFiles) filesLoaded = 0;
  });

  socket.on("timeElapsed", time => {
    get(`output_component`).innerHTML = `in ${time}ms`;
    get(`runBundlerButton`).removeAttribute("disabled");
  });

  socket.on("compilationErrors", data => {
    if (data.errors?.length > 0 || data.warnings?.length > 0) {
      get(`errors`).style.display = "flex";
      get(`errorsNumber`).innerHTML = data.errors?.length || 0;
      get(`warningsNumber`).innerHTML = data.warnings?.length || 0;
      let out = ``;
      data.errors?.forEach(error => {
        out += "Error: " + error + "<p>----------------------</p>";
      });
      data.warnings?.forEach(warning => {
        out += "Warning: " + warning + "<p>----------------------</p>";
      });
      get(`errorsOutput`).innerHTML = out;
    }
  });

  socket.on(`xwin`, () => {
    get(`xwin`).style.display = "inline";
  });

  // after transpilation it receives watchingT //
  // that turns totalFiles = 1 and             //
  // cause error in pp calculation when        //
  // receive compiled files                    //
  // to work with event we need to have a      //
  // excellent code management                 //
  socket.on(`watchingT`, () => {
    get(`watching`).style.display = `block`;
    isWatching = true;
  });

  socket.on(`cancelWatchingT`, () => {
    get(`watching`).style.display = `none`;
    isWatching = false;
  });
}

function closeWBR() {
  sendToWBR({
    type: "closeWBR",
    payload: "",
  });
}

function runBundler() {
  get(`errors`).style.display = "none";
  get(`errorsOutput`).style.display = "none";
  get("xwin").style.display = "none";

  let options = {
    watch: getCheckbox(`check-watch`).checked,
    transpile: getCheckbox(`check-transpile`).checked,
    compile: getCheckbox(`check-compile`).checked,
    production: getCheckbox(`check-production`).checked,
  };
  if (!options.transpile && !options.compile) {
    _alert(`At last compile or transpile options needs to be checked.`);
    return;
  }
  get(`runBundlerButton`).setAttribute("disabled", "true");
  get(`inner-bar`).style.width = `0%`;
  get(`percent`).innerHTML = `0%`;
  sendToWBR({
    type: "runBundler",
    payload: options,
  });
}

/**
 *
 * @param {string} component
 * @param {'update'|'append'|'prepend'} [behavior]
 */
function html(component, behavior = `update`) {
  const el = document.getElementById(`app`);
  if (el instanceof Element) {
    switch (behavior) {
      case `update`:
        el.innerHTML = component;
        break;
      case `append`:
        el.innerHTML = el.innerHTML + component;
        break;
      case `prepend`:
        el.innerHTML = component + el.innerHTML;
        break;
    }
  }
}

function _alert(message) {
  vscode.postMessage({
    type: "alert",
    text: "Winnetoujs: " + message,
  });
}

/**
 * @param {{ type: string; payload: any; }} data
 */
function sendToWBR(data) {
  socket.emit(data.type, data.payload);
}

displayWbrServerNotRunning();

/**
 * It will try to connect to a running
 * WinnetouJs WBR Server
 */
vscode.postMessage({
  type: "getPortFromConfig",
});
