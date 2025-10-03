import type { Bot } from "grammy";
import type { MyContext } from "./types.js";
export async function setMyCommands(bot: Bot<MyContext>){
  await bot.api.deleteMyCommands().catch(()=>{});
  await bot.api.deleteMyCommands({ language_code:"en"}).catch(()=>{});
  await bot.api.deleteMyCommands({ language_code:"uk"}).catch(()=>{});
  const en=[{command:"tutorial",description:"Open tutorial"},{command:"me",description:"Show your info"},{command:"help",description:"Show help"},{command:"lang",description:"Change language"}];
  const uk=[{command:"tutorial",description:"Відкрити туторіал"},{command:"me",description:"Показати інформацію"},{command:"help",description:"Показати довідку"},{command:"lang",description:"Змінити мову"}];
  await bot.api.setMyCommands(en); await bot.api.setMyCommands(en,{language_code:"en"});
  await bot.api.setMyCommands(uk,{language_code:"uk"});
  await bot.api.setMyCommands(en,{scope:{type:"all_private_chats"}});
  await bot.api.setMyCommands(uk,{scope:{type:"all_private_chats"},language_code:"uk"});
}
