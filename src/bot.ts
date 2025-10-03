import "dotenv/config";
import {
  Bot,
  Context,
  InlineKeyboard,
  session,
  SessionFlavor,
  StorageAdapter,
} from "grammy";
import { I18n, I18nFlavor } from "@grammyjs/i18n";
import { mkdirSync, existsSync } from "node:fs";
import { promises as fsp } from "node:fs";
import { join } from "node:path";

// ================== Version ==================
export const VERSION = "0.0.13";

// ================== Types ====================
type Skills = Record<string, number>;

type Profile = {
  level: number;
  xp: number;
  xpTarget: number;
  stamina: number;       // internal name kept for compatibility (displayed as Energy)
  staminaMax: number;
  lastStaminaTs: number; // ms epoch, for auto-regen
  skills: Skills;        // e.g., { lurk: 0.3 }
  crystalsFound: number;
  questsStarted: number;
  questsSucceeded: number;
  questsFailed: number;
  seenStart: boolean;        // whether greeted once
};

type Quest = {
  active: boolean;
  gridSize: number; // 5
  px: number;
  py: number;
  cx: number;
  cy: number;
  seed: number;
  seen: boolean[][]; // fog of war (true = revealed)
};

type SessionData = {
  locale?: "uk" | "en";
  profile: Profile;
  quest?: Quest;
};

type MyContext = Context & SessionFlavor<SessionData> & I18nFlavor;

// ================== Defaults =================
const GRID = 5;
const XP_ON_CRYSTAL = 1;

function nowMs() {
  return Date.now();
}
function defaultProfile(): Profile {
  return {
    level: 0,
    xp: 0,
    xpTarget: 13,
    stamina: 5,
    staminaMax: 5,
    lastStaminaTs: nowMs(),
    skills: { lurk: 0 },
    crystalsFound: 0,
    questsStarted: 0,
    questsSucceeded: 0,
    questsFailed: 0,
    seenStart: false,
  };
}
function defaultSession(): SessionData {
  return { profile: defaultProfile() };
}

// ================== File-based storage ========
function sanitize(key: string) {
  return key.replace(/[^a-z0-9_-]/gi, "_");
}
class FileStorage<T> implements StorageAdapter<T> {
  constructor(private baseDir: string) {
    if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  }
  private pathFor(key: string) {
    return join(this.baseDir, sanitize(key) + ".json");
  }
  async read(key: string): Promise<T | undefined> {
    const p = this.pathFor(key);
    try {
      const raw = await fsp.readFile(p, "utf8");
      return JSON.parse(raw) as T;
    } catch (e: any) {
      if (e.code === "ENOENT") return undefined;
      throw e;
    }
  }
  async write(key: string, value: T): Promise<void> {
    const p = this.pathFor(key);
    await fsp.writeFile(p, JSON.stringify(value), "utf8");
  }
  async delete(key: string): Promise<void> {
    const p = this.pathFor(key);
    try {
      await fsp.unlink(p);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
}

// ================== Boot ======================
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("❌ BOT_TOKEN is missing in .env");
  process.exit(1);
}
const bot = new Bot<MyContext>(token);

// Sessions: persisted under data/sessions/
const storage = new FileStorage<SessionData>(join(process.cwd(), "data", "sessions"));
bot.use(session<SessionData, MyContext>({ initial: () => defaultSession(), storage }));

// i18n: uk default, locales/*.ftl
const i18n = new I18n<MyContext>({
  defaultLocale: "uk",
  directory: "locales",
  localeNegotiator: (ctx) => {
    if (ctx.session.locale) return ctx.session.locale;
    const hint = (ctx.from?.language_code || "").toLowerCase();
    if (hint.startsWith("uk") || hint.startsWith("ru")) return "uk";
    return "en";
  },
});
bot.use(i18n);

// ================== Utilities =================
function displayNameFull(ctx: MyContext): string {
  const u = ctx.from;
  if (!u) return "Player";
  const parts = [u.first_name, u.last_name].filter(Boolean);
  const name = parts.join(" ").trim() || "Player";
  return name;
}
function escapeMarkdown(text: string): string {
  // Escape Telegram Markdown special chars: *, _, `, [, ], and backslash
  return text.replace(/([\*_`\[\]\\])/g, '\$1');
}
function percent(passed: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (passed / total) * 100;
  return `${pct.toFixed(2)}%`;
}
function randInt(min: number, maxInclusive: number) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}
function ensureProfileMigrations(p: Profile) {
  if (p.staminaMax == null) p.staminaMax = 5;
  if (p.lastStaminaTs == null) p.lastStaminaTs = nowMs();
  if (p.crystalsFound == null) p.crystalsFound = 0;
  if (p.questsStarted == null) p.questsStarted = 0;
  if (p.questsSucceeded == null) p.questsSucceeded = 0;
  if (p.questsFailed == null) p.questsFailed = 0;
  if ((p as any).seenStart == null) (p as any).seenStart = false;
  if (p.xpTarget == null || p.xpTarget < 13) p.xpTarget = 13;
  if (!p.skills) p.skills = {};
  if (p.skills.lurk == null) p.skills.lurk = 0;
}

// Seeded PRNG (mulberry32)
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// XP threshold progression: 13×(level+1)
function nextXpTargetFor(level: number): number {
  return 13 * (level + 1);
}

// auto-regen (Energy): +1/min until max; notify user
function regenAmount(p: Profile): number {
  const n = nowMs();
  const diffMin = Math.floor((n - p.lastStaminaTs) / 60000);
  if (diffMin <= 0) return 0;
  const canGain = Math.max(0, p.staminaMax - p.stamina);
  const gain = Math.min(diffMin, canGain);
  if (gain > 0) {
    p.stamina += gain;
    p.lastStaminaTs += gain * 60000;
  } else {
    p.lastStaminaTs += diffMin * 60000;
  }
  return gain;
}

// Notify regen before each update + migrate old sessions
bot.use(async (ctx, next) => {
  const p = ctx.session?.profile;
  if (p) {
    ensureProfileMigrations(p);
    const gained = regenAmount(p);
    if (gained > 0) {
      if (p.stamina >= p.staminaMax) {
        await ctx.reply(ctx.t("stamina-full")); // text says Energy
      } else {
        await ctx.reply(ctx.t("stamina-tick", { amt: String(gained), stamina: String(p.stamina) }));
      }
    }
  }
  await next();
});

// ================== Keyboards =================
// main — only Me (first) and Quest (second)
function mainKb(ctx: MyContext) {
  return new InlineKeyboard()
    .text(ctx.t("btn-me"), "show_me")
    .text(ctx.t("btn-quest"), "quest_lurk");
}

// quest — 3×3
function questKb(ctx: MyContext) {
  return new InlineKeyboard()
    .text(ctx.t("btn-look"), "q_look")  // labeled Lurk
    .text(ctx.t("btn-up"), "q_up")
    .text(ctx.t("btn-empty"), "noop")
    .row()
    .text(ctx.t("btn-left"), "q_left")
    .text(ctx.t("btn-you"), "noop")
    .text(ctx.t("btn-right"), "q_right")
    .row()
    .text(ctx.t("btn-empty"), "noop")
    .text(ctx.t("btn-down"), "q_down")
    .text(ctx.t("btn-surrender"), "q_surrender");
}

const langKb = new InlineKeyboard()
  .text("Українська", "set_lang_uk")
  .text("English", "set_lang_en");

// ================== Quest helpers =============
const GRID_SIZE = 5;
function createSeen(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => false));
}
function revealAround(q: Quest) {
  for (let yy = q.py - 1; yy <= q.py + 1; yy++) {
    for (let xx = q.px - 1; xx <= q.px + 1; xx++) {
      if (xx >= 0 && yy >= 0 && xx < q.gridSize && yy < q.gridSize) {
        q.seen[yy][xx] = true;
      }
    }
  }
}
function startQuest(p: Profile): Quest {
  // consume 1 energy on start
  p.stamina = Math.max(0, p.stamina - 1);
  p.questsStarted += 1;

  // derive a 32-bit seed (combine time and a small random)
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rng = mulberry32(seed);

  // random positions from seed
  const px = Math.floor(rng() * GRID_SIZE);
  const py = Math.floor(rng() * GRID_SIZE);
  let cx = Math.floor(rng() * GRID_SIZE);
  let cy = Math.floor(rng() * GRID_SIZE);
  if (cx === px && cy === py) {
    cx = (cx + 1) % GRID_SIZE;
  }
  const q: Quest = { active: true, gridSize: GRID_SIZE, px, py, cx, cy, seed, seen: createSeen() };
  // reveal starting tile
  q.seen[py][px] = true;
  return q;
}

function renderFullMap(q: Quest): string {
  let out = "";
  for (let y = 0; y < q.gridSize; y++) {
    let line = "";
    for (let x = 0; x < q.gridSize; x++) {
      const isPlayer = x === q.px && y === q.py;
      const isCrystal = x === q.cx && y === q.cy;
      if (!q.seen[y][x]) {
        line += "◻️"; // fog
      } else if (isPlayer) {
        line += "📍";
      } else if (isCrystal) {
        line += "💎";
      } else {
        line += "▫️"; // empty revealed
      }
    }
    out += line + "\\n";
  }
  return out.trimEnd();
}

function move(q: Quest, dir: "up" | "down" | "left" | "right"): boolean {
  const before = { x: q.px, y: q.py };
  if (dir === "up" && q.py > 0) q.py -= 1;
  else if (dir === "down" && q.py < q.gridSize - 1) q.py += 1;
  else if (dir === "left" && q.px > 0) q.px -= 1;
  else if (dir === "right" && q.px < q.gridSize - 1) q.px += 1;
  const moved = (before.x !== q.px) || (before.y !== q.py);
  // reveal around on any attempt (even bumping border)
  revealAround(q);
  if (moved) {
    q.seen[q.py][q.px] = true;
  }
  return moved;
}

// ================== Level / XP utils ==========
function tryLevelUp(p: Profile): boolean {
  let leveled = false;
  while (p.xp >= p.xpTarget) {
    p.xp -= p.xpTarget;
    p.level += 1;
    p.xpTarget = nextXpTargetFor(p.level);
    leveled = true;
  }
  return leveled;
}

// Lurk skill gain with scaling per 13 thresholds
function lurkIncrement(current: number): number {
  const tier = Math.floor(current / 13); // 0..∞, each tier halves the gain
  const inc = 0.1 * Math.pow(0.5, tier);
  return inc;
}

// ================== Core replies ==============
async function sendGreeting(ctx: MyContext) {
  const p = ctx.session.profile;
  if (p.seenStart) {
    await ctx.reply(ctx.t("welcome-back"), { reply_markup: mainKb(ctx) });
  } else {
    await ctx.reply(
      ctx.t("greet", {
        level: String(p.level),
        xp_target: String(p.xpTarget),
        stamina: String(p.stamina),
      }),
      { parse_mode: "Markdown", reply_markup: mainKb(ctx) }
    );
    p.seenStart = true;
  }
}


async function sendMe(ctx: MyContext) {
  const p = ctx.session.profile;
  const name = escapeMarkdown(displayNameFull(ctx));
  const pct = percent(p.xp, p.xpTarget);
  if (p.questsSucceeded === 0) {
    await ctx.reply(ctx.t("me-notice"));
  }
  const skillsCount = Object.values(p.skills).filter(v => v >= 1).length;
  const lurkLevel = (p.skills.lurk ?? 0).toFixed(2);

  const lines: string[] = [];
  lines.push(ctx.t("me-base", {
    name,
    level: String(p.level),
    percent: pct,
    xp: String(p.xp),
    xp_target: String(p.xpTarget),
    stamina: String(p.stamina),
    stamina_max: String(p.staminaMax),
  }));

  if (p.crystalsFound > 0) {
    lines.push(ctx.t("me-line-shards", { shards_found: String(p.crystalsFound) }));
  }
  if (skillsCount > 0) {
    lines.push(ctx.t("me-line-skills", { skills_count: String(skillsCount), lurk_level: String(lurkLevel) }));
  }

  const text = lines.join("
");
  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: mainKb(ctx) });
}
const skillsCount = Object.values(p.skills).filter(v => v >= 1).length;
  const lurkLevel = (p.skills.lurk ?? 0).toFixed(2);

  let lines: string[] = [];
  lines.push(ctx.t("me-base", {
    name,
    level: String(p.level),
    percent: pct,
    xp: String(p.xp),
    xp_target: String(p.xpTarget),
    stamina: String(p.stamina),
    stamina_max: String(p.staminaMax),
  }));

  if (p.crystalsFound > 0) {
    lines.push(ctx.t("me-line-shards", { shards_found: String(p.crystalsFound) }));
  }
  if (skillsCount > 0) {
    lines.push(ctx.t("me-line-skills", { skills_count: String(skillsCount), lurk_level: String(lurkLevel) }));
  }

  const text = lines.join("
");
  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: mainKb(ctx) });
}
  const skillsCount = Object.values(p.skills).filter(v => v >= 1).length;
  const lurkLevel = (p.skills.lurk ?? 0).toFixed(2);
  await ctx.reply(
    ctx.t("me-card", {
      name,
      level: String(p.level),
      percent: pct,
      xp: String(p.xp),
      xp_target: String(p.xpTarget),
      stamina: String(p.stamina),
      stamina_max: String(p.staminaMax),
      crystals_found: String(p.crystalsFound),
      quests_started: String(p.questsStarted),
      quests_succeeded: String(p.questsSucceeded),
      quests_failed: String(p.questsFailed),
      skills_count: String(skillsCount),
      lurk_level: String(lurkLevel),
    }),
    { parse_mode: "Markdown", reply_markup: mainKb(ctx) }
  );
}

// ================== Commands ==================
bot.command("version", async (ctx) => {
  await ctx.reply(`🤖 Version: ${VERSION}`);
});

bot.command("help", async (ctx) => {
  await ctx.reply(ctx.t("help"), { parse_mode: "Markdown" });
});

bot.command(["me", "profile"], sendMe);

bot.command("lang", async (ctx) => {
  await ctx.reply(ctx.t("choose-language"), { reply_markup: langKb });
});

// hidden debug command — restore energy
bot.command("restore", async (ctx) => {
  const p = ctx.session.profile;
  p.stamina = p.staminaMax;
  p.lastStaminaTs = nowMs();
  await ctx.reply(ctx.t("restored", { stamina: String(p.stamina) }), {
    reply_markup: mainKb(ctx),
  });
});


// hidden restart command — resets character and tutorial progress
bot.command("restart", async (ctx) => {
  ctx.session = defaultSession();
  await ctx.reply(ctx.t("restart-done"));
  await sendGreeting(ctx);
});

// hidden changelog command — NOT in setMyCommands
bot.command("changelog", async (ctx) => {
  try {
    const path = join(process.cwd(), "CHANGELOG.md");
    const content = await fsp.readFile(path, "utf8");

    // Extract the latest "## ..." section (up to the next "## " or end)
    const m = content.match(/## [^\n]+\n(?:.*?\n)*?(?=^## |\Z)/ms);
    const latest = m ? m[0].trim() : "";

    const text = latest ? latest : "No entries.";
    await ctx.reply(`${ctx.t("changelog-title")}\n\n${text}`, { parse_mode: "Markdown" });
  } catch (e) {
    await ctx.reply(ctx.t("changelog-empty"));
  }
});

bot.command("tutorial", async (ctx) => {
  const p = ctx.session.profile;
  if (p.questsSucceeded === 0) {
    await ctx.reply(ctx.t("tutorial-intro-pre", { level: String(p.level), xp_target: String(p.xpTarget), stamina: String(p.stamina) }));
  } else if (p.level < 1) {
    await ctx.reply(ctx.t("tutorial-step-reach-l1", { xp: String(p.xp), xp_target: String(p.xpTarget) }));
  } else {
    await ctx.reply(ctx.t("tutorial-dev"));
  }
});

bot.command("start", async (ctx) => {
  if (!ctx.session.locale) {
    await ctx.reply(ctx.t("start-lang-intro"));
    await ctx.reply(ctx.t("choose-language"), { reply_markup: langKb });
    return;
  }
  await sendGreeting(ctx);
});

// ================== Language callbacks ========
bot.callbackQuery("set_lang_uk", async (ctx) => {
  ctx.session.locale = "uk";
  await ctx.i18n.renegotiateLocale();
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ctx.t("lang-set-uk"));
  await sendGreeting(ctx);
});

bot.callbackQuery("set_lang_en", async (ctx) => {
  ctx.session.locale = "en";
  await ctx.i18n.renegotiateLocale();
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ctx.t("lang-set-en"));
  await sendGreeting(ctx);
});

// ================== Main inline buttons =======
bot.callbackQuery("show_me", async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendMe(ctx);
});

bot.callbackQuery("quest_lurk", async (ctx) => {
  const p = ctx.session.profile;
  await ctx.answerCallbackQuery();

  // already on a quest?
  if (ctx.session.quest?.active) {
    await ctx.reply(ctx.t("quest-already"), { reply_markup: questKb(ctx) });
    return;
  }

  if (p.stamina <= 0) {
    await ctx.reply(ctx.t("no-stamina"), { reply_markup: mainKb(ctx) });
    return;
  }

  // start quest
  ctx.session.quest = startQuest(p);
  await ctx.reply(ctx.t("quest-intro-seed", { seed: String(ctx.session.quest.seed) }));
  await ctx.reply(renderFullMap(ctx.session.quest), { reply_markup: questKb(ctx) });
});

// ================== Quest controls ============
bot.callbackQuery(
  ["q_look", "q_up", "q_down", "q_left", "q_right", "q_surrender", "noop"],
  async (ctx) => {
    const q = ctx.session.quest;
    await ctx.answerCallbackQuery();

    if (!q?.active) {
      await ctx.reply(ctx.t("quest-not-active"), { reply_markup: mainKb(ctx as MyContext) });
      return;
    }

    if (ctx.match === "q_surrender") {
      ctx.session.profile.questsFailed += 1;
      q.active = false;
      ctx.session.quest = undefined;
      await ctx.reply(ctx.t("quest-surrendered"), { reply_markup: mainKb(ctx as MyContext) });
      return;
    }

    if (ctx.match === "q_look") {
      // Lurk action: reveal and train skill with scaling
      revealAround(q);
      const p = ctx.session.profile;
      const before = p.skills.lurk ?? 0;
      const inc = lurkIncrement(before);
      const after = Math.round((before + inc) * 1000) / 1000; // 3 decimals
      const unlockedBefore = Object.values(p.skills).filter(v => v >= 1).length;
      p.skills.lurk = after;

      await ctx.reply(renderFullMap(q), { reply_markup: questKb(ctx as MyContext) });

      if (before < 1 && after >= 1 && unlockedBefore === 0) {
        await ctx.reply(ctx.t("skill-unlocked-first", { skill: "Lurk" }));
      }
      return;
    }

    if (ctx.match === "q_up") move(q, "up");
    else if (ctx.match === "q_down") move(q, "down");
    else if (ctx.match === "q_left") move(q, "left");
    else if (ctx.match === "q_right") move(q, "right");

    // success?
    if (q.px === q.cx && q.py === q.cy) {
      const p = ctx.session.profile;
      p.xp += XP_ON_CRYSTAL;
      p.crystalsFound += 1;
      p.questsSucceeded += 1;

      const leveled = tryLevelUp(p);
      q.active = false;
      ctx.session.quest = undefined;

      await ctx.reply(
        ctx.t("quest-complete", {
          xp_gain: String(XP_ON_CRYSTAL),
          xp: String(p.xp),
          xp_target: String(p.xpTarget),
          stamina: String(p.stamina),
        }),
        { reply_markup: mainKb(ctx as MyContext) }
      );
      if (leveled) {
        await ctx.reply(ctx.t("leveled-up", { level: String(p.level) }), { reply_markup: mainKb(ctx as MyContext) });
      }
      return;
    }

    // not found yet — show current map
    await ctx.reply(renderFullMap(q), { reply_markup: questKb(ctx as MyContext) });
  }
);

// ================== Commands menu =============
async function setMyCommands() {
  const en = [
    { command: "tutorial", description: "Open tutorial" },
    { command: "me", description: "Show your info" },
    { command: "help", description: "Show help" },
    { command: "lang", description: "Change language" },
  ];
  const uk = [
    { command: "tutorial", description: "Відкрити туторіал" },
    { command: "me", description: "Показати інформацію" },
    { command: "help", description: "Показати довідку" },
    { command: "lang", description: "Змінити мову" },
  ];

  await bot.api.setMyCommands(en);
  await bot.api.setMyCommands(en, { language_code: "en" });
  await bot.api.setMyCommands(uk, { language_code: "uk" });
  await bot.api.setMyCommands(en, { scope: { type: "all_private_chats" } });
}

// ================== Start ======================
bot.start().then(async () => {
  await setMyCommands();
  console.log(`🚀 Bot is running (long polling)… v${VERSION}`);
});