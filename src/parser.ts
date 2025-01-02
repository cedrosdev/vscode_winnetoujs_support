import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { IWinConfig } from "./types";

interface ConstructorData {
  id: string;
  file: string;
  line: number;
  position: number;
}

export async function getLanguages(): Promise<string[]> {
  const folderPath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
    "translations"
  );
  if (!fs.existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    return [];
  }
  let jsonFiles = await fs.promises.readdir(folderPath);
  let res = jsonFiles
    .filter(file => file.endsWith(".json"))
    .map(json => {
      return path.basename(json, path.extname(json));
    });
  return res;
}

export async function parseStrings(): Promise<{ [key: string]: any }> {
  const results: { [key: string]: any } = new Array();

  const folderPath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
    "translations"
  );
  if (!fs.existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    return [];
  }

  const jsonFiles = fs
    .readdirSync(folderPath)
    .filter(file => file.endsWith(".json"));

  await Promise.all(
    jsonFiles.map(async json => {
      const filePath = path.join(folderPath, json);
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      results[path.basename(json, path.extname(json))] =
        JSON.parse(fileContent);
    })
  );
  return results;
}

export async function parseConstructos(): Promise<ConstructorData[]> {
  const results: ConstructorData[] = [];
  const config = await __getUpdatedWinConfig();
  const folder = config !== false ? config.constructosPath : `./constructos`;
  const folderPath = path.isAbsolute(folder)
    ? folder
    : path.join(
        vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
        folder
      );
  if (!fs.existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    return [];
  }
  const htmlFiles = fs
    .readdirSync(folderPath)
    .filter(file => file.endsWith(".html"));

  // ---------------------

  await Promise.all(
    htmlFiles.map(async htmlFile => {
      const filePath = path.join(folderPath, htmlFile);
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const lines = fileContent.split("\n");

      lines.forEach((line, index) => {
        // Match id="[[box]]" syntax
        const regex = /id="\[\[([^\]]+)\]\]"/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
          const id = match[1]; // Extract the id value (e.g., box)
          const position = match.index + match[0].indexOf(`[[${id}]]`) + 2; // Position in line

          results.push({
            id,
            file: filePath,
            line: index + 1, // Line number (1-based)
            position, // Position in line (0-based)
          });
        }
      });
    })
  );

  return results;
}

export async function getUpdatedWinConfig(): Promise<IWinConfig | false> {
  return await __getUpdatedWinConfig();
}

export async function getUpdatedPort(): Promise<Number> {
  const config = await __getUpdatedWinConfig();
  return config !== false ? config.serverPort : 0;
}

async function __getUpdatedWinConfig(): Promise<IWinConfig | false> {
  const configPath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
    "win.config.json"
  );
  if (!fs.existsSync(configPath)) {
    console.warn(
      `WinnetouJs Extension: parser.ts: win.config.json not found at ${configPath} - code 9sk3l`
    );
    return false;
  }

  const configFileContent = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(configFileContent);
  return config;
}
