import * as vscode from "vscode";
export class Statusbar {
  statusBarItem: vscode.StatusBarItem;
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
  }
  messages = {
    running: () => (this.statusBarItem.text = `WinnetouJs support is running`),
    parsing: () =>
      (this.statusBarItem.text = `$(loading~spin) Parsing Winnetou constructos for intellisense...`),
  };
  show() {
    this.statusBarItem.show();
  }
  hide() {
    this.statusBarItem.hide();
  }
}
