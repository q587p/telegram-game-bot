import { InlineKeyboard } from "grammy";

/**
 * Robust quest module.
 * - Defensive session/profile init (won't crash if session middleware is registered later).
 * - New randomized outcomes: +XP / fun / +1..5 Aether / Portal (cost 13 to enter).
 * - Uses existing i18n keys: quest-gain-xp, quest-fun-no-gain, quest-find-aether,
 *   quest-portal-found2, quest-portal-insufficient, portal-enter, portal-skip,
 *   portal-entered, portal-search-placeholder, portal-skipped.
 */
export default function setupQuest(bot: any) {
  // Defensive guard: ensure ctx.session and ctx.session.profile exist.
  bot.use(async (ctx: any, next: any) => {
    const s = (ctx.session ??= {} as any);
    if (!s.profile) {
      s.profile = {
        // minimal safe defaults; merged with any existing fields
        xp: 0,
        aether: 0,
        skills: { lurk: 0, move: 0 },
        crystalsFound: 0,
        movesTotal: 0,
        searchRuns: 0,
        _runMoves: 0,
      };
    } else {
      // ensure required fields exist
      s.profile.aether ??= 0;
      s.profile.skills ??= { lurk: 0, move: 0 };
    }
    await next();
  });

  // ================== Quest command ==================
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
    }
  });
}
