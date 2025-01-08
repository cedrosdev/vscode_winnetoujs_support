interface App {
  entry: string;
  out: string;
}

interface Sass {
  entryFolder: string;
  outFolder: string;
  firstFile?: string;
}

export interface IWinConfig {
  constructosPath: string;
  constructosOut: string;
  serverPort: number;
  apps: App[];
  entry?: string | object;
  out?: string | object;
  sass?: Sass[];
  defaultLang?: string;
  publicPath?: string;
  icons?: string;
}
