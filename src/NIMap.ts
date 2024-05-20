import { mimeWordDecode } from "emailjs-mime-codec";
import { Config } from "./configManager";
import Imap from "imap";
import Cache from "./cache";
import { inspect } from "util";

export default class NIMap {
  openFlag = false;
  imap: Imap;
  cache = new Cache();
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
          ["SINCE", new Date("2024-05-12").toISOString()], // 起始时间
          ["BEFORE", new Date("2024-05-21").toISOString()], // 结束时间
        ],
        async (err, data) => {
          // console.log(await this.getBody(data));
          // res([]);
          // return;
          const list = await this.getEmailInfoList(data);
          this.cache.emailList = list;
          console.log(JSON.stringify(list));
          res(list);
        }
      );
    });
  }
  // readByIndex(index: number) {
  //   if (this.cache.emailList.length >= index) {
  //     console.log("输入下标异常");
  //     return;
  //   }
  //   return new Promise<void>((res, rej) => {
  //     this.imap.fetch(
  //       { uid: this.cache.emailList[index].head.uid, bodies: "" },

  //     );
  //   });
  // }

  getBody(box: any) {
    console.log(box);
    var f = this.imap.seq.fetch("3:*", {
      bodies: ["HEADER.FIELDS (FROM)", "TEXT"],
    });
    f.on("message", (msg, seqno) => {
      console.log("Message #%d", seqno);
      var prefix = "(#" + seqno + ") ";
      msg.on("body", (stream, info) => {
        if (info.which === "TEXT")
          console.log(
            prefix + "Body [%s] found, %d total bytes",
            inspect(info.which),
            info.size
          );
        var buffer = "",
          count = 0;
        stream.on("data", (chunk) => {
          count += chunk.length;
          buffer += chunk.toString("utf8");
          if (info.which === "TEXT")
            console.log(
              prefix + "Body [%s] (%d/%d)",
              inspect(info.which),
              count,
              info.size
            );
        });
        stream.once("end", () => {
          if (info.which !== "TEXT")
            console.log(
              prefix + "Parsed header: %s",
              inspect(Imap.parseHeader(buffer))
            );
          else console.log(prefix + "Body [%s] Finished", inspect(info.which));
        });
      });
      msg.once("attributes", (attrs) => {
        console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
      });
      msg.once("end", () => {
        console.log(prefix + "Finished");
      });
    });
    f.once("error", (err) => {
      console.log("Fetch error: " + err);
    });
    f.once("end", () => {
      console.log("Done fetching all messages!");
      this.imap.end();
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
      let body: any = {};
      let fileList: any = [];
      msg.on("body", (stream) => {
        stream.on("data", (chunk) => {
          // str += iconv.decode(chunk, "utf8");
          str += chunk;
        });
        stream.once("end", () => {
          head = { ...head, ...Imap.parseHeader(str) };
          // body = {this.imap}
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
        list.push({ head, fileList, body });
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
