import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  getUpdatedPort,
  getUpdatedWinConfig,
  getWinnetouFolderFromWorkspaceSettings,
} from "./parser";
const { exec } = require("child_process");

export class errorProvider implements vscode.WebviewViewProvider {
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
    webviewView.webview.options = {
      enableScripts: true,
    };
    this._view = webviewView;
    webviewView.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #1e1e1e;
            color: #f8f8f2;
          }
          .error-container {
            text-align: center;
            padding: 20px;
            border: 1px solid #44475a;
            background-color: #282a36;
            border-radius: 5px;
          }
          h1 {
            margin: 0;
            font-size: 24px;
            color: #ff5555;
          }
          p {
            margin: 10px 0 0;
            color: #f8f8f2;
          }
          .more-info {
            display: none;
            margin-top: 15px;
            text-align: left;
            color: #f8f8f2;
            font-size: 14px;
            max-width: 100%;
          }
          .link-button {
            margin-top: 10px;
            color: #61dafb;
            cursor: pointer;
            text-decoration: underline;
            background: none;
            border: none;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Error</h1>
          <p>Something went wrong. Please try again.</p>
          <button class="link-button" onclick="toggleMoreInfo()">Show More Info</button>
          <div class="more-info" id="moreInfo">
            <p>To resolve this issue, ensure that the <code>winnetoujs.projectPath</code> is correctly set in your workspace settings.</p>
            <p>Steps:</p>
            <ol>
              <li>Open your workspace settings (<code>.code-workspace</code> file).</li>
              <li>Add or update the following configuration:</li>
              <code>{
  "settings": {
    "winnetoujs.projectPath": "/path/to/your/winnetou/project"
  }
}</code>
              <li>Reload your workspace.</li>
            </ol>
          </div>
        </div>
        <script>
          function toggleMoreInfo() {
            const moreInfoDiv = document.getElementById('moreInfo');
            const linkButton = document.querySelector('.link-button');

            if (moreInfoDiv.style.display === 'none' || moreInfoDiv.style.display === '') {
              moreInfoDiv.style.display = 'block';
              linkButton.style.display = 'none'; // Hide the button after it's clicked
            } else {
              moreInfoDiv.style.display = 'none';
              linkButton.style.display = 'inline'; // Show the button again if needed
            }
          }
        </script>
      </body>
      </html>`;
  }
}
