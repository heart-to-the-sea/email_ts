import input from "@inquirer/input";
import password from "@inquirer/password";
import { ConfigManager } from "./configManager";
import { MailManager } from "./MailManager";
const configManager = new ConfigManager();
const mailManager = new MailManager();
async function* run() {
  let flag = true;
  while (flag) {
    if (!configManager.config.email) {
      console.clear();
      const host = await input({ message: "请输入邮箱服务器地址:" });
      configManager.config.host = host;
      const port = await input({ message: "请输入邮箱服务器端口:" });
      configManager.config.port = Number(port);
      const email = await input({ message: "请输入用户邮箱账户:" });
      configManager.config.email = email;
      const pwd = await password({ message: "请输入邮箱密码:" });
      configManager.config.password = pwd;
      configManager.saveLocal();
      console.clear();
      yield true;
    }
    await mailManager.init(configManager.config);
    const cmdStr = await input({ message: "请输入指令" });
    const cmdArr = cmdStr.split(" ");
    switch (cmdArr[0]) {
      case "exit":
        flag = false;
        yield false;
        break;
      case "list":
        // console.clear();
        const list = await mailManager.readMailManager.getList();
        // console.log(list);
        const arr = list.map((item:any, index:number) => {
          return {
            id: item.id,
            title: item.head.Subject,
            date: item.head.Date,
          };
        });
        console.table(arr);
        yield true;
        break;
      case "connect":
        await mailManager.init(configManager.config);
        yield true;
      case "write":
        const address = await input({ message: "请输入发送的邮箱地址:" });
        const title = await input({ message: "请输入标题:" });
        const content = await input({ message: "请输入内容:" });
        await mailManager.writeMailManager.send(address, title, content);
        console.log("发送成功");
        yield true;
        break;
      case "read":
        if (!cmdArr[1]) {
          console.warn("请输入序号");
          yield true;
          break;
        }
        const mail = await mailManager.readMailManager.getMail(+cmdArr[1]);
        console.log(mail.body);
        yield true;
        break;
      case "clear":
        console.clear();
        await new Promise<void>((res) =>
          setTimeout(() => {
            res();
          }, 100)
        );
        yield true;
        break;
      default:
        yield true;
    }
  }
}
async function main() {
  const r = await run();
  while ((await r.next()).value);
}

main();
