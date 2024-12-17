import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getUpdatedPort, getUpdatedWinConfig } from "./parser";
const { exec } = require("child_process");

export class historyProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {
    this.extensionUri = _extensionUri;
  }

  private _view?: vscode.WebviewView;
  codiconUri: any;
  extensionUri: vscode.Uri;

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // =====================================================
    webviewView.webview.onDidReceiveMessage(async message => {
      // console.log(`log bundler-webview.ts --> `, { message });
      switch (message.type) {
        case "alert":
          vscode.window.showInformationMessage(message.text);
          break;
      }
    });
    // =====================================================
    webviewView.webview.options = {
      enableScripts: true,
    };
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
    this.getExternalHTML().then(content => {
      webviewView.webview.html = content;
    });
  }

  private async getExternalHTML(): Promise<string> {
    let script = await fs.promises.readFile(
      path.resolve(this._extensionUri.fsPath, "src", "history-webview.js"),
      "utf-8"
    );
    let content = await fs.promises.readFile(
      path.resolve(this._extensionUri.fsPath, "src", "history-webview.html"),
      "utf-8"
    );
    return content
      .replace("{codiconUri}", this.codiconUri)
      .replace(`(script)`, script)
      .replace(`// @ts-ignore`, ``)
      .replace(`//@ts-ignore`, ``);
  }
}
