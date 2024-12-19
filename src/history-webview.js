// @ts-ignore
const vscode = acquireVsCodeApi();

const sendSignalToReceiveHistory = async () => {
  vscode.postMessage({
    type: "getHistory",
  });
};

const getEl = id => document.getElementById(id) || new HTMLElement();

const listItem = (
  /** @type {string} */ text,
  /** @type {string} */ containerId
) => {
  return `
    <div class='listItem' onclick="toggle('${containerId}')">
      <span class="codicon codicon-chevron-right" style='margin-right: 5px; cursor: pointer;' id="icon_${containerId}"></span> ${text}
    </div>
  `;
};

const container = id => {
  return `
    <div class='container' id='container_${id}'></div>
`;
};

const dataItem = (/** @type {{ date: any; size: any; }} */ data) => {
  return `
  <div class='dataItem'>
    <span class='date'>${data.date}</span>
    <span class='size'>${data.size}</span>
  </div>
  `;
};

function toggle(containerId) {
  getEl("container_" + containerId).classList.toggle(`containerShow`);
  getEl("icon_" + containerId).classList.toggle(`codicon-chevron-down`);
  getEl("icon_" + containerId).classList.toggle(`codicon-chevron-right`);
}

// onde parei: this logic are wrong!
const historyReceived = async content => {
  getEl(`output`).innerHTML = "";
  const KEYS = Object.keys(content);

  KEYS.forEach(key => {
    getEl(`output`).innerHTML += listItem(key, key) + container(key);

    const FILES = Object.keys(content[key]);

    FILES.forEach(file => {
      let containerName = `${file}_${key}`;

      getEl("container_" + key).innerHTML +=
        listItem(file, containerName) + container(containerName);

      content[key][file].reverse().forEach(data => {
        getEl("container_" + containerName).innerHTML += dataItem({
          date: new Date(data.date).toLocaleString(),
          size: data.sizeKB + "KB",
        });
      });
    });
  });
};

window.addEventListener("message", payload => {
  const data = payload.data;
  switch (data.type) {
    case `historyReceived`:
      historyReceived(data.content);
      break;
  }
});

function _alert(message) {
  vscode.postMessage({
    type: "alert",
    text: "Winnetoujs: " + message,
  });
}

(async () => {
  sendSignalToReceiveHistory();
})();
