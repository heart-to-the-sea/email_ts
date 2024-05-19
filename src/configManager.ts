import fs from "fs";
import path from "path";

export class Config {
  email?: string;
  host?: string;
  port?: number;
  password?: string;
}
export class ConfigManager {
  FILEPATH = path.resolve(__dirname, "config");
  config = new Config() as Required<Config>;
  constructor() {
    this.init();
  }
  private init() {
    const state = fs.existsSync(this.FILEPATH);
    // 文件存在
    if (state) {
      const file = fs.readFileSync(this.FILEPATH, "utf-8");
      try {
        const obj = JSON.parse(file);
        this.config = obj;
      } catch {}
    }
  }
  saveLocal() {
    const confStr = JSON.stringify(this.config);
    fs.writeFileSync(this.FILEPATH, confStr, "utf8");
  }
}
