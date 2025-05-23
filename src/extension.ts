import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  getLanguages,
  getUpdatedWinConfig,
  parseConstructos,
  parseStrings,
} from "./parser";
import { Statusbar } from "./statusbar";
import { MyStringsWebviewProvider } from "./strings-webview";
import { bundlerProvider } from "./bundler-webview";
import { historyProvider } from "./history-webview";
import { errorProvider } from "./error-webview";
const statusbar = new Statusbar();

// codicons reference
// https://iconduck.com/sets/codicons

export async function activate(context: vscode.ExtensionContext) {
  activate_(context);
}

async function activate_(context: vscode.ExtensionContext) {
  console.log(`WinnetouJs IDE is running.`);

  statusbar.messages.running();
  statusbar.show();
  statusbar.messages.parsing();

  const config = await getUpdatedWinConfig();

  if (!config) {
    vscode.window.showErrorMessage(
      "WinnetouJs extension not running because win.config.json file not found or it is not a WinnetouJs project workspace."
    );

    statusbar.messages.error("WinnetouJs extension not running.");

    const bundlerProvider_ = new errorProvider(context.extensionUri);
    const stringsProvider_ = new errorProvider(context.extensionUri);
    const historyProvider_ = new errorProvider(context.extensionUri);

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "stringsWebview",
        stringsProvider_
      ),
      vscode.window.registerWebviewViewProvider(
        "historyWebview",
        historyProvider_
      ),
      vscode.window.registerWebviewViewProvider(
        "bundlerWebView",
        bundlerProvider_
      )
    );
    return;
  }
  const defaultLang = config.defaultLang;

  parseConstructos().then(constructosObj => {
    setTimeout(statusbar.messages.running, 5000);
    const provider = vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "javascript" },
      {
        provideDefinition(document, position, token) {
          const range = document.getWordRangeAtPosition(position, /[\.\w\(]+/);
          let word = range ? document.getText(range) : "";
          if (!word.includes("(") || word.includes(".")) return;
          else word = word.replace("(", "").replace(".", "");
          let match = constructosObj.find(elem => elem.id === word);
          if (match) {
            if (fs.existsSync(match.file)) {
              const location = new vscode.Location(
                vscode.Uri.file(match.file),
                new vscode.Position(match.line - 1, match.position)
              );

              // Navigate to the first item directly
              vscode.workspace.openTextDocument(location.uri).then(doc => {
                vscode.window.showTextDocument(doc, {
                  selection: new vscode.Range(
                    location.range.start,
                    location.range.start
                  ),
                });
              });
              // --------------
              // returns item for popup
              const htmlUri = vscode.Uri.file(match.file);
              return new vscode.Location(
                htmlUri,
                new vscode.Position(match.line - 1, match.position)
              );
            }
          }
          return null;
        },
      }
    );
    context.subscriptions.push(provider);
    //-----
    const fileChangeWatcher = vscode.workspace.onDidChangeTextDocument(
      async event => {
        if (event.document.languageId === "html") {
          constructosObj = await parseConstructos();
          return true;
        }
      }
    );
    context.subscriptions.push(fileChangeWatcher);
  });

  const stringsWebviewProvider = new MyStringsWebviewProvider(
    context.extensionUri,
    defaultLang as string
  );

  gotoString(context, stringsWebviewProvider);

  synchronizeStrings(context, stringsWebviewProvider, defaultLang as string);

  const bundlerProvider_ = new bundlerProvider(context.extensionUri);

  const historyProvider_ = new historyProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "stringsWebview",
      stringsWebviewProvider
    ),
    vscode.window.registerWebviewViewProvider(
      "bundlerWebView",
      bundlerProvider_
    ),
    vscode.window.registerWebviewViewProvider(
      "historyWebview",
      historyProvider_
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("winnetoujs.extension.reload", () => {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    }),
    vscode.commands.registerCommand("winnetoujs.strings.add", () => {
      stringsWebviewProvider.addEntry();
    }),
    vscode.commands.registerCommand(
      "winnetoujs.strings.changeLanguage",
      async () => {
        let languagesAvailable = await getLanguages(),
          languages = new Array();

        languagesAvailable.forEach(lang => {
          languages.push({
            label: lang,
            description: `Change strings to ${lang}`,
          });
        });
        // Define options for the Quick Pick
        languages.push({
          label: "Cancel",
          description: "Exit without changing",
          alwaysShow: true,
        });

        // Display the Quick Pick
        const selectedLanguage = await vscode.window.showQuickPick(languages, {
          title: "Select a Language",
          placeHolder: "Choose the language you want to work with",
          matchOnDescription: true,
          ignoreFocusOut: false, // Keeps the Quick Pick open when losing focus
          canPickMany: false, // Set to true if you want multi-select capability
        });

        // Handle the user's selection
        if (selectedLanguage) {
          if (selectedLanguage.label === "Cancel") {
            vscode.window.showInformationMessage("No language was changed.");
          } else {
            stringsWebviewProvider.changeLanguage(selectedLanguage.label);
          }
        } else {
          vscode.window.showInformationMessage("Language selection canceled.");
        }
      }
    ),
    vscode.commands.registerCommand("winnetoujs.strings.save", () => {
      stringsWebviewProvider.save();
    }),
    vscode.commands.registerCommand("winnetoujs.history.refresh", () => {
      historyProvider_.getHistory();
    })
  );
}

function gotoString(
  context: vscode.ExtensionContext,
  sidebar: MyStringsWebviewProvider
) {
  const provider = (newEntry: boolean) => {
    const cursorPosition = vscode.window.activeTextEditor?.selection.active;
    if (!cursorPosition) return;
    const wordRange =
      vscode.window.activeTextEditor?.document.getWordRangeAtPosition(
        cursorPosition,
        /\.(\w+)/
      );
    if (!wordRange) return;

    let word = vscode.window.activeTextEditor?.document.getText(wordRange);
    if (!word) return;
    if (!word.includes(".")) return;
    else word = word.replace(".", "");
    // vscode.window.showInformationMessage(word);
    vscode.commands.executeCommand("workbench.view.extension.WinnetouSidebar");
    newEntry ? sidebar.gotoAdd(word) : sidebar.goto(word);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(`winnetoujs.strings.goto`, () =>
      provider(false)
    ),
    vscode.commands.registerCommand(`winnetoujs.strings.gotoAdd`, () =>
      provider(true)
    )
  );
}

function synchronizeStrings(
  context: vscode.ExtensionContext,
  sidebar: MyStringsWebviewProvider,
  defaultLang: string
) {
  context.subscriptions.push(
    vscode.commands.registerCommand("winnetoujs.strings.synchronize", () => {
      sidebar.synchronize(defaultLang);
    })
  );
}

export function deactivate() {}
