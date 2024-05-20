import nodeMailer from "nodemailer";
import { Config } from "./configManager";
import NIMap from "./NIMap";
import Smtp from "./Smtp";
import Pop from "./Pop";
export class MailManager {
  // readMailManager!: NIMap;
  readMailManager!: Pop;
  writeMailManager!: Smtp;
  async init(config: Required<Config>) {
    this.writeMailManager = new Smtp(config);
    // this.readMailManager = new NIMap(config);
    this.readMailManager = new Pop(config);
    await this.readMailManager.init();
  }
}
