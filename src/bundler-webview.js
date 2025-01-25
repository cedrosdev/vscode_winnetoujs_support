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
const port = 5501;
let totalErrors = 0;
let totalWarnings = 0;
let errorsOutput = ``;
let isWatching = false;
let filesLoaded = 0;
let totalFiles = 0;

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

function killAllTerminals() {
  vscode.postMessage({
    type: "killAllTerminals",
  });
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
      ).innerHTML = `Extension is unable to connect to WinnetouJs WBR Server. Please check if port is already in use, change it in on and try again.`;
    console.log("\n\nFailed to connect to the WinnetouJs server");
    displayWbrServerNotRunning();
  });

  // Optional: Listener for disconnect
  socket.on("disconnect", reason => {
    socket.close();
    displayWbrServerNotRunning();
    console.log("\n\nDisconnected from the WinnetouJs server");
  });

  socket.on("totalFiles", total => {
    totalFiles = total;
  });

  socket.on("fileName", name => {
    get(`output_component`).innerHTML = name;
  });

  socket.on("file", fileName => {
    if (isWatching) {
      totalFiles = 1;
      filesLoaded = 0;
    }
    filesLoaded++;
    const pp = (filesLoaded / totalFiles) * 100;

    // console.log("file", {
    //   isWatching,
    //   filesLoaded,
    //   totalFiles,
    //   pp: Math.round(pp),
    //   fileName,
    // });

    get(`inner-bar`).style.width = pp + `%`;
    get(`percent`).innerHTML = pp ? Math.round(pp) + `%` : ``;
    get(`output_component`).innerHTML = fileName;
    // if (filesLoaded === totalFiles) filesLoaded = 0;
    if (isWatching) {
      get(`output_component`).innerHTML =
        `<span style="color: green">Updated: ` + fileName + `</span>`;
      setTimeout(() => {
        get(`output_component`).innerHTML = ``;
      }, 3000);
    }
  });

  socket.on("timeElapsed", time => {
    get(`output_component`).innerHTML = `in ${time}ms`;
    get(`runBundlerButton`).removeAttribute("disabled");
    get(`bar`).classList.remove(`toggleAnimation`);
    if (totalErrors > 0) {
      get(`bar`).classList.add(`toggleAnimationError`);
    }
  });

  socket.on("compilationErrors", data => {
    if (data.errors?.length > 0 || data.warnings?.length > 0) {
      get(`errors`).style.display = "flex";
      // ---------------------------------------
      totalErrors += data.errors?.length || 0;
      totalWarnings += data.warnings?.length || 0;
      get(`errorsNumber`).innerHTML = totalErrors.toString();
      get(`warningsNumber`).innerHTML = totalWarnings.toString();
      let out = ``;
      data.errors?.forEach(error => {
        out += "Error: " + error + "<p>----------------------</p>";
      });
      data.warnings?.forEach(warning => {
        out += "Warning: " + warning + "<p>----------------------</p>";
      });
      console.log(`compilationErrors`, {
        errors: data.errors,
        warnings: data.warnings,
      });
      errorsOutput += out;
      get(`errorsOutput`).innerHTML = errorsOutput;
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
    // console.log("winnetoujs: received watchingT event", { isWatching });
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

// onclick html webview button
function runBundler() {
  get(`errors`).style.display = "none";
  get(`errorsOutput`).style.display = "none";
  get(`errorsOutput`).innerHTML = ``;
  get("xwin").style.display = "none";
  get(`bar`).classList.remove(`toggleAnimationError`);
  // reset vars
  totalErrors = 0;
  totalWarnings = 0;
  errorsOutput = ``;
  filesLoaded = 0;

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

  get(`bar`).classList.add(`toggleAnimation`);
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
