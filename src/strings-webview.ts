import * as vscode from "vscode";
import { parseStrings } from "./parser";
import * as fs from "fs";
import * as path from "path";

export class MyStringsWebviewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _defaultLanguage: string
  ) {
    this.extensionUri = _extensionUri;
    this.defaultLanguage = _defaultLanguage;
  }

  private _view?: vscode.WebviewView;
  extensionUri: vscode.Uri;
  codiconUri: any;
  strings: any;
  defaultLanguage: string;
  private stringsChanged = new Array();
  private keysChanged = new Array();
  private keysDeleted = new Array();
  private newKeys = new Array();
  private missingStringsChanged = new Array();

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this.codiconUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        "node_modules",
        "@vscode",
        "codicons",
        "dist",
        "codicon.css"
      )
    );
    this._view = webviewView;

    // =====================================================
    webviewView.webview.onDidReceiveMessage(message => {
      console.log({ message });
      switch (message.type) {
        case "openLink": // why this fucking shit is not triggering???!!!
          const linkUri = vscode.Uri.parse(message.url);
          vscode.env.openExternal(linkUri); // Open the external link
          break;
        case "filter":
          console.log(message.text);
          this.filterStrings(message.text);
          break;
        case "alert":
          vscode.window.showInformationMessage(message.text);
          break;
        case `loadInitialStrings`:
          this.loadInitialStrings();
          break;
        case "changedString":
          this.changedString(message.key, message.value);
          break;
        case "changeKey":
          this.changeKey(message.key);
          break;
        case "deleteKey":
          this.deleteKey(message.key);
          break;
        case `changedMissingString`:
          this.changedMissingString(message.key, message.value);
          break;
      }
    });
    // =====================================================

    webviewView.webview.options = {
      // Allow scripts in the Webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    this.getExternalHTML().then(content => {
      webviewView.webview.html = content;
    });
  }

  async addEntry() {
    const key = await vscode.window.showInputBox({
      title: "New strings entry",
      prompt: "key",
      placeHolder: "new key...",
      ignoreFocusOut: true, // Keeps the input box open when the user clicks outside
    });

    if (!key) return;
    if (!this.strings) {
      await this.loadInitialStrings();
    }
    if (this.strings[this.defaultLanguage][key]) {
      vscode.window.showErrorMessage(`This key (${key}) is already in use.`);
      return;
    }

    const value = await vscode.window.showInputBox({
      title: "New strings entry",
      prompt: "value",
      placeHolder: "new value...",
      ignoreFocusOut: true, // Keeps the input box open when the user clicks outside
    });

    if (!value) return;

    this.newKeys.push({
      key: key.replaceAll(" ", ""),
      value,
    });

    this._view?.webview.postMessage({
      type: `newEntry`,
      key: key.replaceAll(" ", ""),
      value,
    });

    vscode.window.showInformationMessage(
      `String added successfully to ${this.defaultLanguage}. Don't forget to apply your updates.`
    );
  }

  async changeKey(key: string) {
    const userInput = await vscode.window.showInputBox({
      title: "Change key name",
      prompt: key,
      placeHolder: "new key...",
      ignoreFocusOut: true, // Keeps the input box open when the user clicks outside
    });
    if (!userInput) return;
    this.keysChanged.push({
      oldKey: key,
      newKey: userInput?.replaceAll(" ", ""),
    });
    this._view?.webview.postMessage({
      type: "updateKey",
      oldKey: key,
      newKey: userInput?.replaceAll(" ", ""),
    });
  }

  async deleteKey(key: string) {
    const userResponse = await vscode.window.showInformationMessage(
      `Are you sure you want to delete this string? (${key})`,
      { modal: true },
      "Yes",
      "No"
    );
    if (userResponse === "Yes") {
      this.keysDeleted.push(key);
      this._view?.webview.postMessage({
        type: "deleteKey",
        key,
      });
    }
  }

  async changedString(key: string, value: string) {
    let index = this.stringsChanged.indexOf(
      this.stringsChanged.filter(el => el.key == key)[0]
    );
    if (index !== -1) this.stringsChanged[index] = { key, value };
    else this.stringsChanged.push({ key, value });
    // console.log(this.stringsChanged);
  }

  async changedMissingString(key: string, value: string) {
    let index = this.missingStringsChanged.indexOf(
      this.missingStringsChanged.filter(el => el.key == key)
    );
    if (index !== -1) this.missingStringsChanged[index] = { key, value };
    else this.missingStringsChanged.push({ key, value });
  }

  async save() {
    // when update keys has to check for duplications on json
    // needs to reload

    let strings = this.strings[this.defaultLanguage];

    // == delete
    this.keysDeleted.forEach(item => delete strings[item]);

    // == new Entries
    this.newKeys.forEach(item => {
      strings[item.key] = item.value;
    });

    // == missing ones
    this.missingStringsChanged.forEach(item => {
      strings[item.key] = item.value;
    });

    // == values
    this.stringsChanged.forEach(item => {
      strings[item.key] = item.value;
    });

    // == keys
    this.keysChanged.forEach(item => {
      if (strings[item.newKey]) {
        vscode.window.showErrorMessage(`Key ${item.newKey} is already in use.`);
      } else {
        strings[item.newKey] = strings[item.oldKey];
        delete strings[item.oldKey];
      }
    });

    // clears cache
    this.keysChanged = [];
    this.stringsChanged = [];
    this.keysDeleted = [];
    this.newKeys = [];

    // now has to rewrite json file with fs
    const folderPath = path.join(
      vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
      "translations"
    );

    if (!fs.existsSync(folderPath)) {
      vscode.window.showErrorMessage(`Folder not found: ${folderPath}`);
      return;
    }

    // Build the path to the JSON file for the default language
    const jsonFilePath = path.join(folderPath, `${this.defaultLanguage}.json`);

    if (!fs.existsSync(jsonFilePath)) {
      vscode.window.showErrorMessage(`File not found: ${jsonFilePath}`);
      return;
    }

    // Write the updated strings back to the JSON file
    await fs.promises.writeFile(
      jsonFilePath,
      JSON.stringify(strings, null, 2), // Format with indentation
      "utf-8"
    );

    this._view?.webview.postMessage({
      type: "strings",
      content: strings,
    });

    vscode.window.showInformationMessage(
      `Saved! Synchronized with ${this.defaultLanguage}.json file. `
    );
    return true;
  }

  async changeLanguage(lang: string) {
    this.defaultLanguage = lang;
    this.loadInitialStrings();
    this._view?.webview.postMessage({
      type: "changeLang",
      lang,
    });
  }

  async loadInitialStrings() {
    return new Promise((resolve, reject) => {
      parseStrings().then(res => {
        this.strings = res;
        this._view?.webview.postMessage({
          type: "strings",
          content: res[this.defaultLanguage],
        });
        return resolve(true);
      });
    });
  }

  private async getExternalHTML(): Promise<string> {
    let script = await fs.promises.readFile(
      path.resolve(this._extensionUri.fsPath, "src", "strings-webview.js"),
      "utf-8"
    );
    let content = await fs.promises.readFile(
      path.resolve(this._extensionUri.fsPath, "src", "strings-webview.html"),
      "utf-8"
    );
    return content
      .replace("{codiconUri}", this.codiconUri)
      .replace(`(script)`, script)
      .replace(`// @ts-ignore`, ``)
      .replace(`//@ts-ignore`, ``)
      .replace(`{defaultLang}`, this.defaultLanguage);
  }

  async filterStrings(searchTerm: string) {
    if (!this.strings) await this.loadInitialStrings();
    let filteredStrings = Object.fromEntries(
      Object.entries(this.strings[this.defaultLanguage]).filter(
        ([key, value]) =>
          key.includes(searchTerm) || (value as string).includes(searchTerm)
      )
    );
    this._view?.webview.postMessage({
      type: `strings`,
      content: filteredStrings,
    });
    return true;
  }

  async goto(searchTerm: string) {
    if (!this.strings) await this.loadInitialStrings();

    let filteredStrings = Object.fromEntries(
      Object.entries(this.strings[this.defaultLanguage]).filter(
        ([key, value]) => key === searchTerm
      )
    );

    this._view?.webview.postMessage({
      type: `strings`,
      content: filteredStrings,
    });
    return true;
  }

  async gotoAdd(searchTerm: string) {
    if (!this.strings) {
      await this.loadInitialStrings();
    }
    if (this.strings[this.defaultLanguage][searchTerm]) {
      vscode.window.showErrorMessage(
        `Impossible to create. The key (${searchTerm}) is already in use.`
      );
      return;
    }
    const value = await vscode.window.showInputBox({
      title: "New strings entry",
      prompt: "value",
      placeHolder: "new value...",
      ignoreFocusOut: true, // Keeps the input box open when the user clicks outside
    });

    if (!value) return;

    this.newKeys.push({
      key: searchTerm.replaceAll(" ", ""),
      value,
    });

    await this.save();
    await this.goto(searchTerm);
    return true;
  }

  async synchronize(officialLanguage: string) {
    if (this.defaultLanguage === officialLanguage) {
      vscode.window.showInformationMessage(
        "Default language selected. Please choose another one."
      );
      return false;
    }
    // needs to compare actual lang with defaultLanguage and
    // find missing ones

    let official = this.strings[officialLanguage];
    let translation = this.strings[this.defaultLanguage];
    let missing: { [key: string]: string } = {};
    Object.keys(official).forEach(key => {
      if (!translation[key]) missing[key] = official[key];
    });

    this._view?.webview.postMessage({
      type: "missing",
      strings: missing,
    });

    return true;
  }
}
