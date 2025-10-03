import "dotenv/config";
import { Bot, session } from "grammy";
import type { MyContext, SessionData, Profile } from "./types.js";
import { FileStorage } from "./storage.js";
import { createI18n } from "./i18n.js";
import { mainKb, langKb } from "./keyboards.js";
import { setMyCommands } from "./menus.js";
import { ensureProfileMigrations } from "./skills.js";
import { displayNameFull, escapeMarkdown } from "./utils.js";
import { VERSION } from "./version.js";
import { sendMe, sendTutorial, startRandomQuest, onPortalEnter, onPortalSkip, onQuestBtn } from "./engine.js";
import { promises as fsp } from "node:fs";
import { join } from "node:path";

console.log(`[BOOT] Launching Telegram bot v${VERSION} …`);

const token=process.env.BOT_TOKEN;
if(!token){ console.error("❌ BOT_TOKEN is missing in .env"); process.exit(1); }

const bot = new Bot<MyContext>(token);
bot.catch((err)=>console.error("BotError",err));

const storage = new FileStorage<SessionData>(join(process.cwd(),"data","sessions"));
bot.use(session({ initial:()=>defaultSession(), storage }));

const i18n=createI18n();
bot.use(i18n.middleware());

// regen + version notice + stamina tick (if not on quest)
bot.use(async (ctx,next)=>{
  const p=ctx.session?.profile as Profile|undefined;
  if(p){
    ensureProfileMigrations(p);
    if(p.lastSeenVersion!==VERSION){
      const name=escapeMarkdown(displayNameFull(ctx));
      await ctx.reply(ctx.t("version-notice",{ version: VERSION, name }),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
      p.lastSeenVersion=VERSION;
    }
    const hasActive=!!ctx.session?.quest?.active;
    if(!hasActive){
      const n=Date.now(); const diff=Math.floor((n-p.lastStaminaTs)/60000);
      if(diff>0){
        const canGain=Math.max(0,p.staminaMax-p.stamina);
        const gain=Math.min(diff, canGain);
        if(gain>0){
          p.stamina+=gain; p.lastStaminaTs+=gain*60000;
          if(p.stamina>=p.staminaMax) await ctx.reply(ctx.t("stamina-full"));
          else await ctx.reply(ctx.t("stamina-tick",{ amt:String(gain), stamina:String(p.stamina) }));
        } else {
          p.lastStaminaTs+=diff*60000;
        }
      }
    }
  }
  await next();
});

bot.command("version", async (ctx)=>ctx.reply(`🤖 Version: ${VERSION}`));
bot.command("help", async (ctx)=>ctx.reply(ctx.t("help"),{ parse_mode:"Markdown" }));
bot.command(["me","profile"], sendMe);
bot.command("lang", async (ctx)=>ctx.reply(ctx.t("choose-language"),{ reply_markup: langKb }));
bot.command("restore", async (ctx)=>{ const p=ctx.session.profile; p.stamina=p.staminaMax; p.lastStaminaTs=Date.now(); await ctx.reply(ctx.t("restored",{ stamina:String(p.stamina)}),{ reply_markup: mainKb(ctx)}); });
bot.command("restart", async (ctx)=>{ ctx.session=defaultSession(); await ctx.reply(ctx.t("restart-done")); await sendGreeting(ctx); });
bot.command("changelog", async (ctx)=>{ try{ const path=join(process.cwd(),"CHANGELOG.md"); const content=await fsp.readFile(path,"utf8"); const m=content.match(/## [^\n]+\n(?:.*?\n)*?(?=^## |\Z)/ms); const latest=m?m[0].trim():""; const text=latest?latest:ctx.t("changelog-empty"); await ctx.reply(`${ctx.t("changelog-title")}\n\n${text}`,{ parse_mode:"Markdown" }); }catch{ await ctx.reply(ctx.t("changelog-empty")); } });
bot.command("tutorial", sendTutorial);
bot.command("fixmenu", async (ctx)=>{ await setMyCommands(bot); await ctx.reply("✅ Commands menu refreshed."); });

bot.command("start", async (ctx)=>{
  if(!ctx.session.locale){
    await ctx.reply(ctx.t("start-lang-intro"));
    await ctx.reply(ctx.t("choose-language"),{ reply_markup: langKb });
    return;
  }
  await setMyCommands(bot);
  await sendGreeting(ctx);
});

bot.callbackQuery("set_lang_uk", async (ctx)=>{ ctx.session.locale="uk"; await ctx.i18n.renegotiateLocale(); await ctx.answerCallbackQuery(); await ctx.editMessageText(ctx.t("lang-set-uk")); await setMyCommands(bot); await sendGreeting(ctx); });
bot.callbackQuery("set_lang_en", async (ctx)=>{ ctx.session.locale="en"; await ctx.i18n.renegotiateLocale(); await ctx.answerCallbackQuery(); await ctx.editMessageText(ctx.t("lang-set-en")); await setMyCommands(bot); await sendGreeting(ctx); });

bot.callbackQuery("show_me", async (ctx)=>{ await ctx.answerCallbackQuery(); await sendMe(ctx); });
bot.callbackQuery("quest_main", async (ctx)=>{ await ctx.answerCallbackQuery(); await startRandomQuest(ctx); });
bot.callbackQuery("portal_enter", onPortalEnter);
bot.callbackQuery("portal_skip", onPortalSkip);
bot.callbackQuery(["q_look","q_up","q_down","q_left","q_right","q_surrender","noop"], async (ctx)=>{
  const map:any={ q_look:"look", q_up:"up", q_down:"down", q_left:"left", q_right:"right", q_surrender:"surrender", noop:"noop" };
  await onQuestBtn(ctx, map[ctx.match as string] ?? "noop");
});

async function sendGreeting(ctx: MyContext){
  const p=ctx.session.profile;
  if(p.seenStart){
    await ctx.reply(ctx.t("welcome-back",{ name: escapeMarkdown(displayNameFull(ctx)) }),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
  } else {
    const head=ctx.t("greet");
    const body=ctx.t("tutorial-body",{ level:String(p.level), xp_target:String(p.xpTarget), stamina:String(p.stamina) });
    const task=ctx.t("tutorial-task-start");
    await ctx.reply(`${head}\n\n${body}\n${task}`,{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
    p.seenStart=true;
  }
}

function defaultSession(): SessionData {
  return {
    profile: {
      level:0, xp:0, xpTarget:13,
      stamina:5, staminaMax:5, lastStaminaTs:Date.now(),
      skills:{ lurking:0, moving:0 },
      crystalsFound:0, questsStarted:0, questsSucceeded:0, questsFailed:0,
      shardMovesTotal:0, shardQuestsSucceeded:0, ether:0,
      seenStart:false, lastSeenVersion: undefined,
    }
  };
}

// Shutdown broadcast (simple, bilingual)
let shuttingDown=false;
async function broadcastShutdown(){
  if(shuttingDown) return; shuttingDown=true;
  try{
    const dir=join(process.cwd(),"data","sessions");
    const entries=await fsp.readdir(dir).catch(()=>[] as string[]);
    for(const name of entries){
      if(!name.endsWith(".json")) continue;
      const chatId=Number(name.replace(/[^0-9-]/g,""));
      if(!Number.isFinite(chatId)) continue;
      const msg = "⚠️ Scheduled maintenance: the server is going down now. Please wait for a restart.\n⚠️ Технічні роботи: сервер зупиняється зараз. Зачекайте на перезапуск.";
      try{ await bot.api.sendMessage(chatId, msg); }catch{}
    }
  }catch{}
}
process.on("SIGINT", async ()=>{ console.log("🛑 SIGINT received — broadcasting shutdown…"); await broadcastShutdown(); setTimeout(()=>process.exit(0), 800); });
process.on("SIGTERM", async ()=>{ console.log("🛑 SIGTERM received — broadcasting shutdown…"); await broadcastShutdown(); setTimeout(()=>process.exit(0), 800); });

bot.start().then(async ()=>{ await setMyCommands(bot); console.log(`🚀 Server started — Telegram bot v${VERSION} (long polling)`); });
