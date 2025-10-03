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
  // Ensure ctx.session.profile exists + normalize skills to lurking/moving
  bot.use(async (ctx: any, next: any) => {
    const s = (ctx.session ??= {} as any);

    // 1) Базовий профіль
    const p = (s.profile ??= {
      xp: 0,
      aether: 0,
      // одразу створюємо "правильні" ключі
      skills: { lurking: 0, moving: 0 },
      crystalsFound: 0,
      movesTotal: 0,
      searchRuns: 0,
      _runMoves: 0,
    });

    // 2) Дефолти на випадок відсутності
    p.aether ??= 0;
    p.skills ??= { lurking: 0, moving: 0 };

    // 3) МІГРАЦІЙНИЙ ШОВ: якщо десь ще лишилися старі назви
    const sk: any = p.skills;
    if (typeof sk.lurk === "number" && sk.lurking === undefined) sk.lurking = sk.lurk;
    if (typeof sk.move === "number" && sk.moving === undefined) sk.moving = sk.move;

    // (необов'язково) прибрати старі ключі, щоб не плутали
    delete sk.lurk;
    delete sk.move;

    await next();
  });

  // Core quest logic
  async function performQuest(ctx: any) {
    const s = (ctx.session ??= { profile: { aether: 0, skills: { lurk: 0, move: 0 } } });
    const p = (s.profile ??= { aether: 0, skills: { lurk: 0, move: 0 } });

    const roll = Math.random();

    if (roll < 0.25) {
      // +1 XP
      p.xp = (p.xp ?? 0) + 1;
      await ctx.reply(ctx.t("quest-gain-xp"));
      return;
    }

    if (roll < 0.50) {
      // fun, no gain
      await ctx.reply(ctx.t("quest-fun-no-gain"));
      return;
    }

    if (roll < 0.75) {
      // +1..5 Aether
      const gain = 1 + Math.floor(Math.random() * 5);
      p.aether = (p.aether ?? 0) + gain;
      await ctx.reply(
        ctx.t("quest-find-aether", { gained: String(gain), total: String(p.aether) })
      );
      return;
    }

    // Portal branch
    const kb = new InlineKeyboard()
      .text(ctx.t("portal-enter"), "portal_enter")
      .text(ctx.t("portal-skip"), "portal_skip");
    await ctx.reply(ctx.t("quest-portal-found2"), { reply_markup: kb });
  }

  // Allow both: /quest command and “Quest” button (callback "quest_go")
  bot.command("quest", async (ctx: any) => {
    await performQuest(ctx);
  });

  bot.callbackQuery(["quest_lurk", "quest_main", "quest_go"], async (ctx: any) => {
    await ctx.answerCallbackQuery();
    await performQuest(ctx);
  });

  // Enter portal: costs 13 Aether → start chaos search (if available)
  bot.callbackQuery("portal_enter", async (ctx: any) => {
    await ctx.answerCallbackQuery(); // закриваємо спінер, без алерта

    const p = ctx.session.profile;
    const a = p.aether ?? 0;

    if (a < 13) {
      await ctx.reply(
        ctx.t("quest-portal-insufficient", { aether: String(a) }),
        { reply_markup: mainKb(ctx) }
      );
      return;
    }

    p.aether = a - 13;

    // звичайне повідомлення про вхід
    await ctx.reply(ctx.t("portal-entered"));

    // 🚀 Стартуємо 5×5 через місток
    const begin = (globalThis as any).beginMapQuestFromPortal;
    if (typeof begin === "function") {
      await begin(ctx);
    } else {
      // fallback (не повинно статись)
      await ctx.reply(ctx.t("portal-search-placeholder"), { reply_markup: mainKb(ctx) });
    }
  });


  // Skip portal → back to main
  bot.callbackQuery("portal_skip", async (ctx: any) => {
    await ctx.editMessageText(ctx.t("portal-skipped"));
    if (typeof (globalThis as any).sendGreeting === "function") {
      await (globalThis as any).sendGreeting(ctx);
    } else if (typeof (globalThis as any).sendMe === "function") {
      await (globalThis as any).sendMe(ctx);
    }
  });
}
