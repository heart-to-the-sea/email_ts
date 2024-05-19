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
    const cmd = await input({ message: "请输入指令" });
    switch (cmd) {
      case "exit":
        // console.clear();
        flag = false;
        await mailManager.readMailManager.imap.closeBox((err) => {
          console.log(err);
          process.exit();
        });
        yield false;
      case "list":
        // console.clear();
        const list = await mailManager.readMailManager.getList();

        const arr = Array.from(list).map((item) => {
          return {
            title: item.head.subject.join(","),
            // fileList: item.head.fileList.length,
          };
        });
        // console.log(list.map(item=>item))
        console.table(arr);
        // console.log("===>", JSON.stringify(list,null,2));
        yield true;
      case "connect":
        // console.clear();
        await mailManager.init(configManager.config);
        yield true;
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
