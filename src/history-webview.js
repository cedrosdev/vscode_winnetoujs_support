// @ts-ignore
const vscode = acquireVsCodeApi();

window.addEventListener("message", payload => {
  const data = payload.data;
  switch (data.type) {
  }
});

function _alert(message) {
  vscode.postMessage({
    type: "alert",
    text: "Winnetoujs: " + message,
  });
}
