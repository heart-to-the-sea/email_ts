import { Config } from "./configManager";
//@ts-ignore
import Pop3client from "node-pop3";
import libqp from "libqp";
export default class Pop {
  config: Config;
  client: Pop3client;
  constructor(config: Required<Config>) {
    this.config = config;
    this.client = new Pop3client({
      user: config.email,
      password: config.password,
      host: config.host,
    });
  }
  init() {}

  async getList(): Promise<any> {
    const list = await this.client.LIST();
    const arr: any[] = [];
    for (let node of list) {
      const data = await this.getMail(+node[0]);
      arr.push(data);
    }
    return arr;
  }
  async getMail(index: number) {
    const str = await this.client.RETR(index);
    const [headStr, bodyStr] = str.split(`\r\n\r\n`);
    const body = bodyStr;
    const head = headStr
      .split("\r\n")
      .map((item) => item.split(": "))
      .reduce<any>((obj, item) => {
        if (item[0] === "Subject") {
          if (decodeMimeEncodedString(item[1])) {
            obj[item[0]] = decodeMimeEncodedString(item[1]);
          } else if (/^=\?utf-8\?[q|Q]\?/g.test(item[1])) {
            obj[item[0]] = libqp
              .decode(item[1].replace(/^=\?utf-8\?[q|Q]\?/g, ""))
              .toString(); //decodeMimeEncodedString2(item[1]);
          } else {
            obj[item[0]] = item[1];
          }
        } else {
          obj[item[0]] = item[1];
        }
        return obj;
      }, {});
    // console.log(header);
    return {
      id: index,
      head,
      body,
    };
  }
}

function decodeMimeEncodedString(input: string) {
  // 匹配Base64编码部分（包括=?和?=边界）
  const base64Match = input.match(/=\?([^?]+)\?B\?([^?]+)\?=/);
  if (!base64Match) {
    return false;
  }

  // 获取编码类型和Base64编码的文本
  const charset = base64Match[1];
  const base64Text = base64Match[2];

  // 解码Base64字符串
  const decodedBytes = atob(base64Text);

  // 如果编码类型是UTF-8，则不需要进一步转换，否则需要知道正确的编码方式
  // 因为我们不知道原始的编码方式，这里我们假设它是UTF-8，但实际上可能不是
  // 如果解码后不是有效的UTF-8，您可能需要找到原始编码方式并进行转换
  const decodedString = decodeURIComponent(escape(decodedBytes));

  return decodedString;
}
