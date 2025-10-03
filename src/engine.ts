import type { MyContext } from "./types.js";
import { mainKb, questKb } from "./keyboards.js";
import { tryLevelUp, skillIncrement } from "./skills.js";
import { displayNameFull, escapeMarkdown, percent } from "./utils.js";
import { startPortalQuest, renderMap, look as pqLook, move as pqMove } from "./portalQuest.js";
import { InlineKeyboard } from "grammy";

const XP_ON_SHARD=1;

export function buildMeText(ctx: MyContext): string {
  const p=ctx.session.profile;
  const name=escapeMarkdown(displayNameFull(ctx));
  const pct=percent(p.xp, p.xpTarget);
  const lines:string[]=[];
  lines.push(ctx.t("me-base",{ name, level:String(p.level), percent:pct, xp:String(p.xp), xp_target:String(p.xpTarget), stamina:String(p.stamina), stamina_max:String(p.staminaMax) }));
  if(p.crystalsFound>0){
    lines.push(ctx.t("me-line-shards",{ shards_found:String(p.crystalsFound) }));
    if(p.shardQuestsSucceeded>0){
      const avg=(p.shardMovesTotal/p.shardQuestsSucceeded).toFixed(2);
      lines.push(ctx.t("me-line-avg-moves",{ avg_moves:avg }));
    }
  }
  if(p.ether>0){ lines.push(ctx.t("me-line-ether",{ ether:String(p.ether) })); }
  const lurk=p.skills.lurking??0, move=p.skills.moving??0;
  const skillsUnlocked=[lurk,move].filter(v=>Math.floor(v)>=1).length;
  if(skillsUnlocked>0){
    lines.push(ctx.t("me-line-skills-header",{ skills_count:String(skillsUnlocked) }));
    if(Math.floor(lurk)>=1) lines.push(`• ${ctx.t("skill-name-lurking")}: ${Math.floor(lurk)}`);
    if(Math.floor(move)>=1) lines.push(`• ${ctx.t("skill-name-moving")}: ${Math.floor(move)}`);
  }
  return lines.join("\n");
}

export async function sendMe(ctx: MyContext){
  const p=ctx.session.profile;
  if(p.questsSucceeded===0) await ctx.reply(ctx.t("me-notice"));
  const text=buildMeText(ctx);
  const kb=ctx.session.quest?.active ? questKb(ctx) : mainKb(ctx);
  await ctx.reply(text,{ parse_mode:"Markdown", reply_markup: kb });
}

export async function sendTutorial(ctx: MyContext){
  const p=ctx.session.profile;
  const active=!!ctx.session.quest?.active;
  if(!p.questsSucceeded && !active){
    const head=ctx.t("greet");
    const body=ctx.t("tutorial-body",{ level:String(p.level), xp_target:String(p.xpTarget), stamina:String(p.stamina) });
    const task=ctx.t("tutorial-task-start");
    await ctx.reply(`${head}\n\n${body}\n${task}`,{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
  }else if(active){
    const head=ctx.t("greet");
    const body=ctx.t("tutorial-body",{ level:String(p.level), xp_target:String(p.xpTarget), stamina:String(p.stamina) });
    const task=ctx.t("tutorial-task-complete-quest");
    await ctx.reply(`${head}\n\n${body}\n${task}`,{ parse_mode:"Markdown", reply_markup: questKb(ctx) });
  }else if(p.level<1){
    await ctx.reply(ctx.t("tutorial-step-reach-l1",{ xp:String(p.xp), xp_target:String(p.xpTarget) }),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
  }else{
    await ctx.reply(ctx.t("tutorial-dev"),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
  }
}

export async function startRandomQuest(ctx: MyContext){
  const p=ctx.session.profile;
  if(p.stamina<=0){ await ctx.reply(ctx.t("no-stamina"),{ reply_markup: mainKb(ctx) }); return; }
  p.stamina=Math.max(0,p.stamina-1);
  p.questsStarted+=1;

  const roll=Math.random();
  if(roll<0.25){
    p.xp+=1;
    const leveled=tryLevelUp(p);
    await ctx.reply(ctx.t("quest-rng-xp"),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
    if(leveled) await ctx.reply(ctx.t("leveled-up",{ level:String(p.level) }),{ reply_markup: mainKb(ctx) });
  }else if(roll<0.5){
    await ctx.reply(ctx.t("quest-rng-waste"),{ reply_markup: mainKb(ctx) });
  }else if(roll<0.75){
    const amt=1+Math.floor(Math.random()*5);
    p.ether+=amt;
    await ctx.reply(ctx.t("quest-rng-ether",{ amt:String(amt) }),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
  }else{
    const canEnter=p.ether>=13 ? "yes":"no";
    await ctx.reply(ctx.t("quest-portal-found",{ ether:String(p.ether), can_enter: canEnter }),{ parse_mode:"Markdown", reply_markup: canEnter==="yes"? undefined : mainKb(ctx) });
    if(canEnter==="yes"){
      await ctx.reply(" ", { reply_markup: new InlineKeyboard().text(ctx.t("btn-portal-enter"),"portal_enter").text(ctx.t("btn-portal-skip"),"portal_skip") });
    }
  }
}

export async function onPortalEnter(ctx: MyContext){
  const p=ctx.session.profile;
  if(p.ether<13){
    await ctx.answerCallbackQuery();
    await ctx.reply(ctx.t("quest-portal-found",{ ether:String(p.ether), can_enter:"no" }),{ parse_mode:"Markdown", reply_markup: mainKb(ctx) });
    return;
  }
  p.ether-=13;
  ctx.session.quest=startPortalQuest(p);
  await ctx.answerCallbackQuery();
  await ctx.reply(ctx.t("quest-intro-seed",{ seed:String(ctx.session.quest.seed) }),{ parse_mode:"Markdown" });
  await ctx.reply(renderMap(ctx.session.quest),{ reply_markup: questKb(ctx) });
}

export async function onPortalSkip(ctx: MyContext){
  await ctx.answerCallbackQuery();
  await sendMe(ctx);
}

export async function onQuestBtn(ctx: MyContext, kind:"look"|"up"|"down"|"left"|"right"|"surrender"|"noop"){
  const q=ctx.session.quest; await ctx.answerCallbackQuery();
  if(!q?.active){ await ctx.reply(ctx.t("quest-not-active"),{ reply_markup: mainKb(ctx) }); return; }
  if(kind==="surrender"){
    ctx.session.profile.questsFailed+=1; q.active=false; ctx.session.quest=undefined;
    await ctx.reply(ctx.t("quest-surrendered"),{ reply_markup: mainKb(ctx) }); return;
  }
  if(kind==="look"){
    const p=ctx.session.profile; const before=p.skills.lurking??0; const inc=skillIncrement(before); const after=Math.round((before+inc)*1000)/1000; p.skills.lurking=after;
    pqLook(q);
    await ctx.reply(renderMap(q),{ reply_markup: questKb(ctx) });
    const ms = Math.floor(before) < Math.floor(after) ? Math.floor(after) : null;
    if(ms!==null){ const key = Math.floor(before)<1 ? "skill-unlocked-first" : "skill-unlocked"; await ctx.reply(ctx.t(key,{ skill: ctx.t("skill-name-lurking"), level:String(ms) }), { parse_mode:"Markdown" }); }
    return;
  }
  let moved=false;
  if(kind==="up") moved=pqMove(q,"up");
  if(kind==="down") moved=pqMove(q,"down");
  if(kind==="left") moved=pqMove(q,"left");
  if(kind==="right") moved=pqMove(q,"right");
  if(moved){
    const p=ctx.session.profile; const before=p.skills.moving??0; const inc=skillIncrement(before); const after=Math.round((before+inc)*1000)/1000; p.skills.moving=after;
    const ms = Math.floor(before) < Math.floor(after) ? Math.floor(after) : null;
    if(ms!==null){ const key = Math.floor(before)<1 ? "skill-unlocked-first" : "skill-unlocked"; await ctx.reply(ctx.t(key,{ skill: ctx.t("skill-name-moving"), level:String(ms) }), { parse_mode:"Markdown" }); }
  }
  if(q.px===q.cx && q.py===q.cy){
    const p=ctx.session.profile; p.xp+=XP_ON_SHARD; p.crystalsFound+=1; p.questsSucceeded+=1; p.shardQuestsSucceeded+=1; p.shardMovesTotal+=q.moves;
    const leveled=tryLevelUp(p); q.active=false; ctx.session.quest=undefined;
    await ctx.reply(ctx.t("quest-complete",{ xp_gain:String(XP_ON_SHARD), xp:String(p.xp), xp_target:String(p.xpTarget), stamina:String(p.stamina) }),{ reply_markup: mainKb(ctx), parse_mode:"Markdown" });
    if(leveled) await ctx.reply(ctx.t("leveled-up",{ level:String(p.level) }),{ reply_markup: mainKb(ctx) });
    return;
  }
  await ctx.reply(renderMap(q),{ reply_markup: questKb(ctx) });
}
