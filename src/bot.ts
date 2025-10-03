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
import setupQuest from "./quest-rework.js";


// ================== Version ==================
export const VERSION = "0.0.25";

console.log(`[BOOT] Launching Telegram bot v${VERSION} …`);

// ================== Types ====================
type Skills = Record<string, number>;

type Profile = {
  level: number;
  xp: number;
  xpTarget: number;
  stamina: number;       // displayed as Energy
  staminaMax: number;
  lastStaminaTs: number; // ms epoch, for auto-regen
  aether: number;
  skills: Skills;          movesTotal: number;
  searchRuns: number;
  _runMoves: number; // transient counter per run
// e.g., { lurking: 0, moving: 0 }
  crystalsFound: number; // Chaos shards
  questsStarted: number;
  questsSucceeded: number;
  questsFailed: number;
  seenStart: boolean;    // whether greeted once
  lastSeenVersion?: string;
};

type Quest = {
  active: boolean;
  bumpDir?: "up" | "down" | "left" | "right";
  gridSize: number; // 5
  px: number;
  py: number;
  cx: number;
  cy: number;
  seed: number;
  seen: boolean[][]; // fog of war (true = revealed)
  walls: boolean[][]; // reserved (unused for visual bump)
};

type SessionData = {
  locale?: "uk" | "en";
  profile: Profile;
  quest?: Quest;

  chatId?: number;
}

type MyContext = Context & SessionFlavor<SessionData> & I18nFlavor;

// ================== Defaults =================
const GRID_SIZE = 5;
const XP_ON_SHARD = 1;

function nowMs() { return Date.now(); }
function defaultProfile(): Profile {
  return {
    level: 0,
    xp: 0,
    xpTarget: 13,
    stamina: 5,
    staminaMax: 5,
    lastStaminaTs: nowMs(),
    aether: 0,
    skills: { lurking: 0, moving: 0 , move: 0 },
    crystalsFound: 0,
    questsStarted: 0,
    questsSucceeded: 0,
    questsFailed: 0,
    seenStart: false,
    movesTotal: 0,
    searchRuns: 0,
    _runMoves: 0,
    lastSeenVersion: undefined,
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
    try { await fsp.unlink(p); } catch (e: any) { if (e.code !== "ENOENT") throw e; }
  }
}

// ================== Boot ======================
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("❌ BOT_TOKEN is missing in .env");
  process.exit(1);
}
const bot = new Bot<MyContext>(token);
setupQuest(bot);

// Global error handler
bot.catch((err) => {
  console.error("BotError", err);
});

// Sessions: persisted under data/sessions/
// (use untyped session() for compatibility across grammy versions)
const storage = new FileStorage<SessionData>(join(process.cwd(), "data", "sessions"));
bot.use(session({ initial: () => defaultSession(), storage }));

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



// capture chat id for broadcasts
bot.use(async (ctx, next) => { if (ctx.chat?.id) ctx.session.chatId = ctx.chat.id; await next(); });
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
  return text.replace(/([\\*_`\\[\\]\\\\])/g, '\\$1');
}
function percent(passed: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (passed / total) * 100;
  return `${pct.toFixed(2)}%`;
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
  const anySkills: any = p.skills;
  if (anySkills.lurk != null && anySkills.lurking == null) {
    anySkills.lurking = anySkills.lurk;
    delete anySkills.lurk;
  }
  if (anySkills.lurking == null) anySkills.lurking = 0;
  if (anySkills.moving == null) anySkills.moving = 0;
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

// auto-regen (Energy): +1/min until max; notify user (only outside quests)
function regenAmount(p: Profile): number {
  const n = Date.now();
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

// Version notifier + regen + migrations
bot.use(async (ctx, next) => {
  const p = (ctx as any).session?.profile as Profile | undefined;
  if (p) {
    ensureProfileMigrations(p);
    // version notice
    if (p.lastSeenVersion !== VERSION) {
      const name = escapeMarkdown(displayNameFull(ctx as any));
      await ctx.reply((ctx as any).t("version-notice", { version: VERSION, name }), { parse_mode: "Markdown", reply_markup: mainKb(ctx as any) });
      p.lastSeenVersion = VERSION;
    }
    const hasActiveQuest = !!(ctx as any).session?.quest?.active;
    if (!hasActiveQuest) {
      const gained = regenAmount(p);
      if (gained > 0) {
        if (p.stamina >= p.staminaMax) {
          await ctx.reply((ctx as any).t("stamina-full"));
        } else {
          await ctx.reply((ctx as any).t("stamina-tick", { amt: String(gained), stamina: String(p.stamina) }));
        }
      }
    }
  }
  await next();
});

// ================== Keyboards =================
// main — only Me (first) and Quest (second)
function mainKb(ctx: MyContext) {
  return new InlineKeyboard()
    .text((ctx as any).t("btn-me"), "show_me")
    .text((ctx as any).t("btn-quest"), "quest_lurk");
}

// quest — 3×3
function questKb(ctx: MyContext) {
  return new InlineKeyboard()
    .text((ctx as any).t("btn-look"), "q_look")
    .text((ctx as any).t("btn-up"), "q_up")
    .text((ctx as any).t("btn-empty"), "noop")
    .row()
    .text((ctx as any).t("btn-left"), "q_left")
    .text((ctx as any).t("btn-you"), "noop")
    .text((ctx as any).t("btn-right"), "q_right")
    .row()
    .text((ctx as any).t("btn-empty"), "noop")
    .text((ctx as any).t("btn-down"), "q_down")
    .text((ctx as any).t("btn-surrender"), "q_surrender");
}

const langKb = new InlineKeyboard()
  .text("Українська", "set_lang_uk")
  .text("English", "set_lang_en");

// ================== Quest helpers =============
const GRID_FOG = "⬛";
const GRID_FLOOR = "🟫";
const GRID_WALL = "🧱";
const GRID_PLAYER = "📍";
const GRID_SHARD = "🔮";

function createSeen(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => false));
}
function createWalls(): boolean[][] {
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

  // derive a 32-bit seed
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
  const q: Quest = { active: true, bumpDir: undefined, gridSize: GRID_SIZE, px, py, cx, cy, seed, seen: createSeen(), walls: createWalls() };
  // reveal starting tile only
  q.seen[py][px] = true;
  return q;
}

function renderMap(q: Quest): string {
  function cellChar(x: number, y: number): string {
    const isPlayer = x === q.px && y === q.py;
    const isShard  = x === q.cx && y === q.cy;
    if (!q.seen[y][x]) return GRID_FOG;
    if (isPlayer) return GRID_PLAYER;
    if (isShard)  return GRID_SHARD;
    return GRID_FLOOR;
  }

  // Base 5×5 map
  let baseRows: string[] = [];
  for (let y = 0; y < q.gridSize; y++) {
    let line = "";
    for (let x = 0; x < q.gridSize; x++) {
      line += cellChar(x, y);
    }
    baseRows.push(line);
  }

  // Bump overlay: visualize a wall just OUTSIDE the boundary in the attempted direction
  if (q.bumpDir === "right") {
    baseRows = baseRows.map((row, y) => row + " " + (y === q.py ? GRID_WALL : GRID_FOG));
  } else if (q.bumpDir === "left") {
    baseRows = baseRows.map((row, y) => (y === q.py ? GRID_WALL : GRID_FOG) + " " + row);
  } else if (q.bumpDir === "up") {
    let top = "";
    for (let x = 0; x < q.gridSize; x++) top += (x === q.px ? GRID_WALL : GRID_FOG);
    baseRows = [top, ...baseRows];
  } else if (q.bumpDir === "down") {
    let bottom = "";
    for (let x = 0; x < q.gridSize; x++) bottom += (x === q.px ? GRID_WALL : GRID_FOG);
    baseRows = [...baseRows, bottom];
  }

  return baseRows.join("\n");
}

function move(q: Quest, dir: "up" | "down" | "left" | "right"): boolean {
  q.bumpDir = undefined;
  let moved = false;
  if (dir === "up") {
    if (q.py > 0) { q.py -= 1; moved = true; } else { q.bumpDir = "up"; }
  } else if (dir === "down") {
    if (q.py < q.gridSize - 1) { q.py += 1; moved = true; } else { q.bumpDir = "down"; }
  } else if (dir === "left") {
    if (q.px > 0) { q.px -= 1; moved = true; } else { q.bumpDir = "left"; }
  } else if (dir === "right") {
    if (q.px < q.gridSize - 1) { q.px += 1; moved = true; } else { q.bumpDir = "right"; }
  }
  if (moved) {
    q.seen[q.py][q.px] = true; // only reveal current tile
  }
  return moved;
}

// ================== Level / XP / Skills utils ==========
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
function skillIncrement(current: number): number {
  const tier = Math.floor(current / 13); // every 13 halves the gain
  const inc = 0.1 * Math.pow(0.5, tier);
  return inc;
}

// ================== Core replies ==============
async function sendGreeting(ctx: MyContext) {
  const p = (ctx as any).session.profile as Profile;
  if (p.seenStart) {
    await ctx.reply((ctx as any).t("welcome-back", { name: escapeMarkdown(displayNameFull(ctx as any)) }), {
      parse_mode: "Markdown",
      reply_markup: mainKb(ctx),
    });
  } else {
    await ctx.reply(
      (ctx as any).t("greet", {
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
  const p = (ctx as any).session.profile as Profile;
  const name = escapeMarkdown(displayNameFull(ctx as any));
  const pct = percent(p.xp, p.xpTarget);
  if (p.questsSucceeded === 0) {
    await ctx.reply((ctx as any).t("me-notice"));
  }
  const lurking = p.skills.lurking ?? 0;
  const moving = p.skills.moving ?? 0;
  const skillsUnlocked = [lurking, moving].filter(v => Math.floor(v) >= 1).length;

  const lines: string[] = [];
  lines.push((ctx as any).t("me-base", {
    name,
    level: String(p.level),
    percent: pct,
    xp: String(p.xp),
    xp_target: String(p.xpTarget),
    stamina: String(p.stamina),
    stamina_max: String(p.staminaMax),
  }));

  if (p.crystalsFound > 0) {
    lines.push((ctx as any).t("me-line-shards", { shards_found: String(p.crystalsFound) }));
  }
  if (skillsUnlocked > 0) {
    lines.push((ctx as any).t("me-line-skills-header", { skills_count: String(skillsUnlocked) }));
    if (Math.floor(lurking) >= 1) lines.push(`• ${(ctx as any).t("skill-name-lurking")}: ${Math.floor(lurking)}`);
    if (Math.floor(moving) >= 1)  lines.push(`• ${(ctx as any).t("skill-name-moving")}: ${Math.floor(moving)}`);
  }

  const text = lines.join("\n");
  const kb = (ctx as any).session.quest?.active ? questKb(ctx) : mainKb(ctx);
  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: kb });
}

// ================== Commands ==================

bot.callbackQuery("portal_enter", async (ctx) => {
  const p = ctx.session.profile;
  if ((p.aether||0) < 13) { await ctx.answerCallbackQuery({ text: ctx.t("quest-portal-insufficient", { aether: String(p.aether||0) }) }); return; }
  p.aether -= 13;
  p._runMoves = 0;
  await ctx.editMessageText(ctx.t("portal-entered"));
  const scs = (globalThis as any).startChaosSearch;
if (typeof scs === "function") { await scs(ctx as any); } else { await ctx.reply(ctx.t("portal-search-placeholder")); }
});
bot.callbackQuery("portal_skip", async (ctx) => {
  await ctx.editMessageText(ctx.t("portal-skipped"));
  await sendGreeting(ctx);
});


bot.command("quest", offerQuest);



// ============ Quest rework ============
async function offerQuest(ctx: any){
  const roll = Math.random();
  if (roll < 0.25){
    // a) +1 XP
    ctx.session.profile.xp += 1;
    await ctx.reply(ctx.t("quest-gain-xp"));
  } else if (roll < 0.5){
    // b) fun but no xp
    await ctx.reply(ctx.t("quest-fun-no-gain"));
  } else if (roll < 0.75){
    // c) find 1..5 Aether
    const gain = 1 + Math.floor(Math.random()*5);
    ctx.session.profile.aether = (ctx.session.profile.aether || 0) + gain;
    await ctx.reply(ctx.t("quest-find-aether", { gained: String(gain), total: String(ctx.session.profile.aether) }));
  } else {
    // d) portal to Chaos
    const a = ctx.session.profile.aether || 0;
    if (a < 13){
      await ctx.reply(ctx.t("quest-portal-insufficient", { aether: String(a) }));
    } else {
      const { InlineKeyboard } = await import("grammy");
      const kb = new InlineKeyboard()
        .text("🌀 " + ctx.t("portal-enter"), "portal_enter")
        .text("➡️ " + ctx.t("portal-skip"), "portal_skip");
      await ctx.reply(ctx.t("quest-portal-found2"), { reply_markup: kb });
    }
  }
}


bot.command("version", async (ctx) => {
  await ctx.reply(`🤖 Version: ${VERSION}`);
});

bot.command("help", async (ctx) => {
  await ctx.reply((ctx as any).t("help"), { parse_mode: "Markdown" });
});

bot.command(["me", "profile"], sendMe);

bot.command("lang", async (ctx) => {
  await ctx.reply((ctx as any).t("choose-language"), { reply_markup: langKb });
});

// hidden debug command — restore energy
bot.command("restore", async (ctx) => {
  const p = (ctx as any).session.profile as Profile;
  p.stamina = p.staminaMax;
  p.lastStaminaTs = Date.now();
  await ctx.reply((ctx as any).t("restored", { stamina: String(p.stamina) }), {
    reply_markup: mainKb(ctx),
  });
});

// hidden restart command — resets character and tutorial progress
bot.command("restart", async (ctx) => {
  (ctx as any).session = defaultSession();
  await ctx.reply((ctx as any).t("restart-done"));
  await sendGreeting(ctx);
});

// hidden changelog command — NOT in setMyCommands
bot.command("changelog", async (ctx) => {
  try {
    const path = join(process.cwd(), "CHANGELOG.md");
    const content = await fsp.readFile(path, "utf8");
    const m = content.match(/## [^\n]+\n(?:.*?\n)*?(?=^## |\Z)/ms);
    const latest = m ? m[0].trim() : "";
    const text = latest ? latest : (ctx as any).t("changelog-empty");
    await ctx.reply(`${(ctx as any).t("changelog-title")}\n\n${text}`, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply((ctx as any).t("changelog-empty"));
  }
});

bot.command("tutorial", async (ctx) => {
  const p = (ctx as any).session.profile as Profile;
  const questActive = !!(ctx as any).session.quest?.active;
  if (!p.questsSucceeded && !questActive) {
    await ctx.reply((ctx as any).t("tutorial-intro-pre", { level: String(p.level), xp_target: String(p.xpTarget), stamina: String(p.stamina) }), { parse_mode: "Markdown", reply_markup: mainKb(ctx) });
  } else if (questActive) {
    await ctx.reply((ctx as any).t("tutorial-task-complete-quest"), { parse_mode: "Markdown", reply_markup: questKb(ctx) });
  } else if (p.level < 1) {
    await ctx.reply((ctx as any).t("tutorial-step-reach-l1", { xp: String(p.xp), xp_target: String(p.xpTarget) }), { parse_mode: "Markdown", reply_markup: mainKb(ctx) });
  } else {
    await ctx.reply((ctx as any).t("tutorial-dev"), { parse_mode: "Markdown", reply_markup: mainKb(ctx) });
  }
});

// hidden: re-apply commands
bot.command("fixmenu", async (ctx) => {
  await setMyCommands();
  await ctx.reply("✅ Commands menu refreshed.");
});

// hidden debug command — grant 13 aether
bot.command("aether", async (ctx) => {
  const p = ctx.session.profile;
  p.aether = (p.aether ?? 0) + 13;
  await ctx.reply(ctx.t("aether-granted", { gained: "13", aether: String(p.aether) }));
});

bot.command("start", async (ctx) => {
  if (!(ctx as any).session.locale) {
    await ctx.reply((ctx as any).t("start-lang-intro"));
    await ctx.reply((ctx as any).t("choose-language"), { reply_markup: langKb });
    return;
  }
  await setMyCommands(); // ensure menu on /start
  await sendGreeting(ctx);
  await ctx.reply(ctx.t("stats-avg-moves", { avg_moves: String((ctx.session.profile.searchRuns ? Math.round((ctx.session.profile.movesTotal / ctx.session.profile.searchRuns) * 10)/10 : 0)) }));
});

// ================== Language callbacks ========
bot.callbackQuery("set_lang_uk", async (ctx) => {
  (ctx as any).session.locale = "uk";
  await (ctx as any).i18n.renegotiateLocale();
  await ctx.answerCallbackQuery();
  await ctx.editMessageText((ctx as any).t("lang-set-uk"));
  await setMyCommands();
  await sendGreeting(ctx);
});

bot.callbackQuery("set_lang_en", async (ctx) => {
  (ctx as any).session.locale = "en";
  await (ctx as any).i18n.renegotiateLocale();
  await ctx.answerCallbackQuery();
  await ctx.editMessageText((ctx as any).t("lang-set-en"));
  await setMyCommands();
  await sendGreeting(ctx);
});

// ================== Main inline buttons =======
bot.callbackQuery("show_me", async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendMe(ctx);
});

bot.callbackQuery("quest_lurk", async (ctx) => {
  const p = (ctx as any).session.profile as Profile;
  await ctx.answerCallbackQuery();

  // already on a quest?
  if ((ctx as any).session.quest?.active) {
    await ctx.reply((ctx as any).t("quest-already"), { reply_markup: questKb(ctx) });
    return;
  }

  if (p.stamina <= 0) {
    await ctx.reply((ctx as any).t("no-stamina"), { reply_markup: mainKb(ctx) });
    return;
  }

  // start quest
  (ctx as any).session.quest = startQuest(p);
  await ctx.reply((ctx as any).t("quest-intro-seed", { seed: String((ctx as any).session.quest.seed) }), { parse_mode: "Markdown" });
  await ctx.reply(renderMap((ctx as any).session.quest), { reply_markup: questKb(ctx) });
});

// ================== Quest controls ============
bot.callbackQuery(
  ["q_look", "q_up", "q_down", "q_left", "q_right", "q_surrender", "noop"],
  async (ctx) => {
    const q = (ctx as any).session.quest as Quest | undefined;
    await ctx.answerCallbackQuery();

    if (!q?.active) {
      await ctx.reply((ctx as any).t("quest-not-active"), { reply_markup: mainKb(ctx as any) });
      return;
    }

    if ((ctx as any).match === "q_surrender") {
      (ctx as any).session.profile.questsFailed += 1;
      q.active = false;
      (ctx as any).session.quest = undefined;
      await ctx.reply((ctx as any).t("quest-surrendered"), { reply_markup: mainKb(ctx as any) });
      return;
    }

    if ((ctx as any).match === "q_look") {
      q.bumpDir = undefined;
      revealAround(q);
      const p = (ctx as any).session.profile as Profile;
      const before = p.skills.lurking ?? 0;
      const inc = skillIncrement(before);
      const after = Math.round((before + inc) * 1000) / 1000;
      const unlockedBefore = Math.floor(before) >= 1 ? 1 : 0;
      p.skills.lurking = after;

      await ctx.reply(renderMap(q), { reply_markup: questKb(ctx as any) });

      if (Math.floor(before) < 1 && Math.floor(after) >= 1 && unlockedBefore === 0) {
        await ctx.reply((ctx as any).t("skill-unlocked-first", { skill: (ctx as any).t("skill-name-lurking") }), { parse_mode: "Markdown", reply_markup: mainKb(ctx as any) });
      }
      return;
    }

    let moved = false;
    if ((ctx as any).match === "q_up") moved = move(q, "up");
    else if ((ctx as any).match === "q_down") moved = move(q, "down");
    else if ((ctx as any).match === "q_left") moved = move(q, "left");
    else if ((ctx as any).match === "q_right") moved = move(q, "right");

    if (moved) {
      // moving skill gains
      const p = (ctx as any).session.profile as Profile;
      const b = p.skills.moving ?? 0;
      const inc = skillIncrement(b);
      p.skills.moving = Math.round((b + inc) * 1000) / 1000;
    }

    // success?
    if (q.px === q.cx && q.py === q.cy) {
      const p = (ctx as any).session.profile as Profile;
      p.xp += XP_ON_SHARD;
      p.crystalsFound += 1;
      p.questsSucceeded += 1;

      const leveled = tryLevelUp(p);
      q.active = false;
      (ctx as any).session.quest = undefined;

      await ctx.reply(
        (ctx as any).t("quest-complete", {
          xp_gain: String(XP_ON_SHARD),
          xp: String(p.xp),
          xp_target: String(p.xpTarget),
          stamina: String(p.stamina),
        }),
        { reply_markup: mainKb(ctx as any), parse_mode: "Markdown" }
      );
      if (leveled) {
        await ctx.reply((ctx as any).t("leveled-up", { level: String(p.level) }), { reply_markup: mainKb(ctx as any) });
      }
      return;
    }

    // not found yet — show current map
    await ctx.reply(renderMap(q), { reply_markup: questKb(ctx as any) });
  }
);

// ================== Commands menu =============
async function setMyCommands() {
  // clear & set localized menus
  await bot.api.deleteMyCommands().catch(()=>{});
  await bot.api.deleteMyCommands({ language_code: "en" }).catch(()=>{});
  await bot.api.deleteMyCommands({ language_code: "uk" }).catch(()=>{});

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
  await bot.api.setMyCommands(uk, { scope: { type: "all_private_chats" }, language_code: "uk" });
}

// ================== Start ======================
bot.start().then(async () => {
  
  console.log(`🚀 Server started — Telegram bot v${VERSION} (long polling)`);


// ============ Graceful shutdown broadcast ============
async function broadcastMaintenance(bot: any){
  try {
    const { readdirSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "data", "sessions");
    if (!existsSync(dir)) return;
    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    const seen = new Set();
    for (const f of files){
      try {
        const s = JSON.parse(await (await import("node:fs/promises")).readFile(join(dir, f), "utf-8"));
        const chatId = s?.chatId;
        if (chatId && !seen.has(chatId)){
          seen.add(chatId);
          await bot.api.sendMessage(chatId, "⚙️ Бот зупиняється на технічні роботи. Будь ласка, зачекайте на перезапуск.");
        }
      } catch {}
    }
  } catch (e) { console.error("broadcastMaintenance error:", e); }
}
["SIGINT","SIGTERM"].forEach(sig => {
  try {
    process.on(sig, async () => {
      await broadcastMaintenance(bot);
      process.exit(0);
    });
  } catch {}
});

await setMyCommands();
  });


const SKILL_STEP_BASE = 0.2; // was 0.1



// ============ Moves & skill helpers ============
function recordMove(ctx: any){ try { ctx.session.profile._runMoves = (ctx.session.profile._runMoves || 0) + 1; } catch {} }
function finalizeRunOnShard(ctx: any){ try { const p = ctx.session.profile; p.movesTotal = (p.movesTotal||0) + (p._runMoves||0); p.searchRuns = (p.searchRuns||0) + 1; p._runMoves = 0; } catch {} }

function maybeAnnounceIntegerSkill(ctx: any, name: "move" | "lurk", value: number){
  const intPart = Math.floor(value + 1e-9);
  const isExactInt = Math.abs(value - intPart) < 1e-9;
  if (isExactInt && intPart >= 1){
    const label = name === "move" ? ctx.t("skill-move-level-up", { level: String(intPart) }) : ctx.t("skill-lurk-level-up", { level: String(intPart) });
    ctx.reply(label);
  }
}

