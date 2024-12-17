import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

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

  // Read win.config.js (assume it's in the workspace root)
  const configPath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
    "win.config.js"
  );
  if (!fs.existsSync(configPath)) {
    throw new Error(`win.config.js not found at ${configPath}`);
  }

  const config = await import(configPath); // Load config
  const folder = config.default.constructosPath;

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

export async function getUpdatedWinConfig(): Promise<any> {
  const configPath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
    "win.config.js"
  );
  if (!fs.existsSync(configPath)) {
    throw new Error(`win.config.js not found at ${configPath}`);
  }

  const config = (await import(configPath)).default;

  return config;
}

export async function getUpdatedPort(): Promise<any> {
  const configPath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath || "",
    "win.config.js"
  );
  if (!fs.existsSync(configPath)) {
    throw new Error(`win.config.js not found at ${configPath}`);
  }
  const configFileContent = fs.readFileSync(configPath, "utf-8");
  const regex = /serverPort\s*:\s*(\d+)/;
  const match = configFileContent.match(regex);

  if (match) {
    const serverPort = parseInt(match[1], 10); // Extracted port number
    console.log("Server Port:", serverPort);
    return serverPort;
  } else {
    console.log("serverPort not found");
    return false;
  }
}
