import { InlineKeyboard, type Context } from "grammy";

/**
 * Plug-in to add randomized quest outcomes and portal flow.
 * Usage in src/bot.ts:
 *   import { setupQuest } from "./quest-rework";
 *   setupQuest(bot);
 */
export function setupQuest(bot: any) {
  // Randomized quest outcome (a/b/c/d)
  bot.command("quest", async (ctx: any) => {
    const p = ctx.session.profile;

    const roll = Math.random();
    if (roll < 0.25) {
      // (a) +1 XP — arcane flavor
      p.xp = (p.xp ?? 0) + 1;
      await ctx.reply(ctx.t("quest-gain-xp"));
      return;
    }
    if (roll < 0.50) {
      // (b) fun but no gain
      await ctx.reply(ctx.t("quest-fun-no-gain"));
      return;
    }
    if (roll < 0.75) {
      // (c) find 1..5 Aether
      const gain = 1 + Math.floor(Math.random() * 5);
      p.aether = (p.aether ?? 0) + gain;
      await ctx.reply(ctx.t("quest-find-aether", { gained: String(gain), total: String(p.aether) }));
      return;
    }

    // (d) Portal to Chaos
    const a = p.aether ?? 0;
    if (a < 13) {
      await ctx.reply(ctx.t("quest-portal-insufficient", { aether: String(a) }));
      return;
    }

    const kb = new InlineKeyboard()
      .text("🌀 " + ctx.t("portal-enter"), "portal_enter")
      .text("➡️ " + ctx.t("portal-skip"), "portal_skip");
    await ctx.reply(ctx.t("quest-portal-found2"), { reply_markup: kb });
  });

  // Enter portal: costs 13 Aether → start the old 5×5 search
  bot.callbackQuery("portal_enter", async (ctx: any) => {
    const p = ctx.session.profile;
    if ((p.aether ?? 0) < 13) {
      await ctx.answerCallbackQuery({ text: ctx.t("quest-portal-insufficient", { aether: String(p.aether ?? 0) }) });
      return;
    }
    p.aether -= 13;
    await ctx.editMessageText(ctx.t("portal-entered"));

    // call existing chaos search if available
    const scs = (globalThis as any).startChaosSearch;
    if (typeof scs === "function") {
      await scs(ctx);
    } else {
      await ctx.reply(ctx.t("portal-search-placeholder"));
    }
  });

  // Skip portal: go back to main menu (Me + Quest buttons)
  bot.callbackQuery("portal_skip", async (ctx: any) => {
    await ctx.editMessageText(ctx.t("portal-skipped"));
    if (typeof (globalThis as any).sendGreeting === "function") {
      await (globalThis as any).sendGreeting(ctx);
    } else if (typeof (globalThis as any).sendMe === "function") {
      await (globalThis as any).sendMe(ctx);
    } else {
      await ctx.reply(ctx.t("me"));
    }
  });
}

export default setupQuest;
