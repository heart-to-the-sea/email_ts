import { Config } from "./configManager";
import nodeMailer from "nodemailer";

/** 发送邮件 */
export default 
class Smtp {
  config:Config
  transporter: nodeMailer.Transporter;
  constructor(config: Required<Config>) {
    this.config = config
    this.transporter = nodeMailer.createTransport({
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
  }
  send(address: string,title: string,content:string) {
    // 发送邮件的选项
    const mailOptions = {
      from: `${this.config.email}`,
      to: address,
      subject: title,
      text: content,
      // html: "<p>This is an <strong>HTML</strong> email</p>",
    };
    return new Promise<void>((res, rej) => {
      // 发送邮件
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          rej();
        } else {
          res();
        }
      });
    });
  }
}
