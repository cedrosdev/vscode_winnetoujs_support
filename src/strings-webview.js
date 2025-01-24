// @ts-ignore
const vscode = acquireVsCodeApi();

let changedStringIds = new Array();

document?.getElementById("open-docs")?.addEventListener("click", () => {
  vscode.postMessage({
    type: "openLink",
    url: "https://winnetoujs.org/docs",
  });
});

document?.getElementById("filter")?.addEventListener("keyup", () => {
  // @ts-ignore
  let value = document?.getElementById("filter")?.value;
  vscode.postMessage({
    type: "filter",
    text: value,
  });
});

document.getElementById(`loadStringsLink`)?.addEventListener(`click`, () => {
  vscode.postMessage({
    type: `loadInitialStrings`,
  });

  let el = document.getElementById(`output-strings`);

  // @ts-ignore
  el.innerHTML = "Loading...";
});

window.addEventListener(`message`, ev => {
  const data = ev.data;
  switch (data.type) {
    case "strings_error":
      _alert(data.content);
      let el = document.getElementById(`output-strings`);
      if (el instanceof Element)
        el.innerHTML = `Strings can't be loaded. Verify if you have a valid strings location in your folders and reload window.`;
      break;
    case `strings`:
      setStrings(data.content);
      break;
    case `changeLang`:
      changeLang(data.lang);
      break;
    case `updateKey`:
      updateKey(data.oldKey, data.newKey);
      break;
    case `deleteKey`:
      deleteKey(data.key);
      break;
    case `newEntry`:
      newEntry(data.key, data.value);
      break;
    case `missing`:
      missing(data.strings);
      break;
  }
});

function missing(content) {
  let count = 0;
  let res = ``;
  Object.keys(content).forEach(key => {
    let value = content[key];
    res += getMissingEntryComponent(key, value, count);
    count++;
  });
  let el = document.getElementById(`output-strings`);
  if (el instanceof Element) el.innerHTML = res;
}

function newEntry(key, value) {
  let el = document.getElementById(`output-strings`);
  el instanceof Element &&
    (el.innerHTML = getStringEntryComponent(key, value) + el.innerHTML);
}

function deleteKey(key) {
  const el = document.getElementById(`div-` + key);
  el instanceof Element && el.remove();
}

function updateKey(oldKey, newKey) {
  const el = document.getElementById(oldKey);
  el instanceof Element && (el.innerHTML = newKey);
}

function changeLang(lang) {
  let el = document.getElementById(`defaultLangSpan`);
  el instanceof Element && (el.innerHTML = lang);
}

function changedString(value, key) {
  vscode.postMessage({
    type: "changedString",
    key,
    value,
  });
}

function changedMissingString(value, key) {
  vscode.postMessage({
    type: "changedMissingString",
    key,
    value,
  });
}

function changeKey(key) {
  vscode.postMessage({
    type: "changeKey",
    key,
  });
}

function del(key) {
  vscode.postMessage({
    type: "deleteKey",
    key,
  });
}

function getStringEntryComponent(key, value, count = new Date().getTime()) {
  return `
  <div style="width: 100%;" id="div-${key}">
    <div style= "
      display: flex;
      align-itens: center;
      align-content: center;
      margin-bottom: 5px;
      margin-top: 15px;
      width:100%;
      justify-content: space-between;
    ">
      <span id='${key}'>${key}</span>
      <div>
        <span class="codicon codicon-edit" style='margin-left: 10px; cursor: pointer;' onClick="changeKey('${key}')"></span>
        <span class="codicon codicon-trash" style='margin-left: 10px; cursor: pointer;' onClick="del('${key}')"></span>
      </div>
    </div>

    <textarea 
      spellcheck="true"
      id="textarea${count}" 
      onkeyup="changedString(this.value, '${key}')"
    >${value}</textarea>
  </div>
`;
}

function getMissingEntryComponent(key, value, count = new Date().getTime()) {
  return `
  <div style="width: 100%;" id="div-${key}">
    <div style= "
      display: flex;
      align-itens: center;
      align-content: center;
      margin-bottom: 5px;
      margin-top: 20px;
      width:100%;
      justify-content: space-between;
    ">
      <span id='${key}'>${key}</span>
     
    </div>
    <div class='missingSpan'>${value}</div>
  
       <textarea 
      spellcheck="true"
      id="input${count}_missing" 
      onkeyup="changedMissingString(this.value, '${key}')"
    ></textarea>
  </div>
`;
}

function setStrings(content) {
  let count = 0;
  let res = ``;
  Object.keys(content).forEach(key => {
    let value = content[key];
    res += getStringEntryComponent(key, value, count);
    count++;
  });
  let el = document.getElementById(`output-strings`);
  if (el instanceof Element) el.innerHTML = res;
}

function _alert(message) {
  vscode.postMessage({
    type: "alert",
    text: "Winnetoujs: " + message,
  });
}
