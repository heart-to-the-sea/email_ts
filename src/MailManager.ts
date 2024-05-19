import nodeMailer from "nodemailer";
import { mimeWordDecode } from "emailjs-mime-codec";
import { Config } from "./configManager";
import Imap from "imap";
export class MailManager {
  readMailManager!: NIMap;
  mail: nodeMailer.Transporter | undefined;
  async init(config: Required<Config>) {
    this.mail = nodeMailer.createTransport({
      host: config.host,
      secure: true,
      auth: {
        user: config.email,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    this.readMailManager = new NIMap(config);
    await this.readMailManager.init();
  }
}

class NIMap {
  openFlag = false;
  imap: Imap;
  constructor(config: Required<Config>) {
    this.imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: true, //使用安全传输协议
      tlsOptions: { rejectUnauthorized: false }, //禁用对证书有效性的检查
    });
  }
  async init() {
    const promise = new Promise<void>((res, rej) => {
      this.imap.once("ready", async (e: any) => {
        if (e) {
          rej(e);
          return;
        }
        try {
          await this.openBox();
        } catch {
          rej();
        }
        res();
      });
    });
    this.imap.connect();
    return promise;
  }

  // 打开盒子
  async openBox() {
    return new Promise<void>((res, rej) => {
      this.imap?.openBox("INBOX", true, (e, b) => {
        if (e) {
          rej(e);
        } else {
          res();
        }
      });
    });
  }
  getList() {
    return new Promise<any[]>((res, rej) => {
      this.imap.search(
        [
          "ALL", // 查询类型
          ["SINCE", new Date("2024-04-01").toISOString()], // 起始时间
          ["BEFORE", new Date("2024-05-12").toISOString()], // 结束时间
        ],
        async (err, data) => {
          const list = await this.getEmailInfoList(data);
          res(list);
        }
      );
    });
  }

  // 获取邮件列表
  getEmailInfoList(res: number[]): Promise<any[]> {
    const list: Partial<any>[] = [];
    if (!res.length) {
      return Promise.resolve([]);
    }
    const item = this.imap?.fetch(res, {
      bodies: "",
      struct: true,
      markSeen: true,
    });
    item?.on("message", (msg) => {
      let str = "";
      let head: any = {};
      let fileList: any = [];
      msg.on("body", (stream) => {
        stream.on("data", (chunk) => {
          // str += iconv.decode(chunk, "utf8");
          str += chunk;
        });
        stream.once("end", () => {
          head = { ...head, ...Imap.parseHeader(str) };
        });
      });
      msg.on("attributes", (struct) => {
        const list = this.getAttachment(struct);
        fileList = list.map((item) => ({
          ...item,
          uid: struct.uid,
          //@ts-ignore
          filename: item.filename,
          // filename: iconv.decode(item.filename, "utf-8"),
        }));
        head.uid = struct.uid;
      });
      msg.on("end", () => {
        list.push({ head, fileList });
      });
    });
    return new Promise((res, rej) => {
      item?.once("end", () => {
        res(list);
      });
    });
  }

  getAttachment(
    struct: Imap.ImapMessageAttributes
  ): Imap.ImapMessageAttributes[] {
    let attrList: any[] = [];
    const handleAttachment = (struct: any) => {
      if (Array.isArray(struct)) {
        struct.forEach((item) => {
          handleAttachment(item);
        });
      } else {
        if (Array.isArray(struct.struct)) {
          struct.struct.forEach((item: any) => {
            handleAttachment(item);
          });
        } else {
          if (struct.disposition && struct.disposition.type === "attachment") {
            struct.params.name = mimeWordDecode(struct.params.name);
            attrList.push(struct);
          }
        }
      }
    };
    handleAttachment(struct);
    return attrList;
  }
}
