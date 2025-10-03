import { InlineKeyboard } from "grammy";
import type { MyContext } from "./types.js";
export function mainKb(ctx: MyContext){
  return new InlineKeyboard().text(ctx.t("btn-me"),"show_me").text(ctx.t("btn-quest"),"quest_main");
}
export function questKb(ctx: MyContext){
  return new InlineKeyboard()
    .text(ctx.t("btn-look"),"q_look").text(ctx.t("btn-up"),"q_up").text(ctx.t("btn-empty"),"noop").row()
    .text(ctx.t("btn-left"),"q_left").text(ctx.t("btn-you"),"noop").text(ctx.t("btn-right"),"q_right").row()
    .text(ctx.t("btn-empty"),"noop").text(ctx.t("btn-down"),"q_down").text(ctx.t("btn-surrender"),"q_surrender");
}
export const langKb = new InlineKeyboard().text("Українська","set_lang_uk").text("English","set_lang_en");
