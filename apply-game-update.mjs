//
// apply-game-update.mjs (fixed)
// Usage: node apply-game-update.mjs  (run from repo root)
//
import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";

const enc = "utf-8";

function log(x){ console.log("•", x); }

async function exists(p){ try { await fs.access(p); return true; } catch { return false; } }
async function read(p){ return fs.readFile(p, enc); }
async function write(p, s){ return fs.writeFile(p, s, enc); }

function insertAfter(text, anchorRe, block) {
  const m = text.match(anchorRe);
  if (!m) return text + "\n" + block;
  const idx = m.index + m[0].length;
  return text.slice(0, idx) + "\n" + block + text.slice(idx);
}

function ensureOnce(text, snippet) {
  return text.includes(snippet) ? text : (text.trimEnd() + "\n" + snippet + "\n");
}

function replaceOrInsert(text, findRe, replacement, fallbackAnchorRe, fallbackBlock) {
  if (findRe.test(text)) return text.replace(findRe, replacement);
  if (fallbackAnchorRe) return insertAfter(text, fallbackAnchorRe, fallbackBlock);
  return text + "\n" + fallbackBlock;
}

function addI18n(ftl, key, msg) {
  return ftl.includes(key) ? ftl : (ftl.trimEnd() + "\n\n" + msg.trim() + "\n");
}

async function main(){
  // Detect paths
  const botCandidates = ["src/bot.ts", "bot.ts"];
  let botPath = null;
  for (const c of botCandidates) if (await exists(c)) { botPath = c; break; }
  if (!botPath) throw new Error("Cannot find src/bot.ts");

  const enCandidates = ["locales/en.ftl", "en.ftl"];
  const ukCandidates = ["locales/uk.ftl", "uk.ftl"];
  let enPath=null, ukPath=null;
  for (const c of enCandidates) if (await exists(c)) { enPath=c; break; }
  for (const c of ukCandidates) if (await exists(c)) { ukPath=c; break; }

  const pkg = JSON.parse(await read("package.json"));

  // Read files
  let bot = await read(botPath);
  let en  = enPath ? await read(enPath) : "";
  let uk  = ukPath ? await read(ukPath) : "";

  // 6) Ensure VERSION declared before logs, and logs exist
  if (!/export\s+const\s+VERSION\s*=/.test(bot) && !/const\s+VERSION\s*=/.test(bot)) {
    bot = insertAfter(bot, /import[\s\S]*?;[\r\n]+/, `\nexport const VERSION = "${pkg.version}";\n`);
  } else {
    bot = bot.replace(/(export\s+const\s+VERSION\s*=\s*["'`])(\d+\.\d+\.\d+)(["'`])/,
                       (_,p1,_v,p3)=> p1+pkg.version+p3);
    bot = bot.replace(/(const\s+VERSION\s*=\s*["'`])(\d+\.\d+\.\d+)(["'`])/,
                       (_,p1,_v,p3)=> p1+pkg.version+p3);
  }
  // BOOT log after VERSION
  bot = replaceOrInsert(
    bot,
    /console\.log\(`?\[BOOT\] Launching Telegram bot v.*?\);?/,
    'console.log(`[BOOT] Launching Telegram bot v${VERSION} …`);',
    /export\s+const\s+VERSION\s*=\s*["'`]\d+\.\d+\.\d+["'`]\s*;?/,
    'console.log(`[BOOT] Launching Telegram bot v${VERSION} …`);'
  );
  // Server started log inside start()
  bot = bot.replace(/console\.log\(`?🚀.*?\);\s*/g, '');
  bot = replaceOrInsert(
    bot,
    /console\.log\(`?🚀.*?\);\s*/,
    'console.log(`🚀 Server started — Telegram bot v${VERSION} (long polling)`);',
    /bot\.start\(\)\.then\(\s*async\s*\(\)\s*=>\s*{\s*/,
    '  console.log(`🚀 Server started — Telegram bot v${VERSION} (long polling)`);'
  );

  // 2) Skill progression base step 0.2
  if (!/const\s+SKILL_STEP_BASE/.test(bot)) {
    bot = insertAfter(bot, /\/\/ ================== Utilities ==================/, `\nconst SKILL_STEP_BASE = 0.2; // was 0.1\n`);
  } else {
    bot = bot.replace(/const\s+SKILL_STEP_BASE\s*=\s*([0-9.]+)/, 'const SKILL_STEP_BASE = 0.2');
  }
  bot = bot.replace(/(\bskills\.(lurk|move)\s*=\s*skills\.\2\s*\+\s*)(0\.1)/g, '$1SKILL_STEP_BASE');

  // 3) Track moves & average
  // Add fields to Profile
  bot = bot.replace(
    /(\b(type|interface)\s+Profile\s*=?\s*{[\s\S]*?skills\s*:\s*Skills;\s*)([\s\S]*?)}\s*;/,
    (m, a, _b, c) => a + '  movesTotal: number;\n  searchRuns: number;\n  _runMoves: number; // transient counter per run\n' + c + '};'
  );
  // Ensure defaultProfile has move skill and counters
  bot = bot.replace(
    /(defaultProfile\(\)\s*:\s*Profile\s*{\s*return\s*{[\s\S]*?skills\s*:\s*{)([^}]*)(}\s*,)/,
    (_m, p1, inner, p3) => {
      // add move:0 if missing
      let skills = inner;
      if (!/move\s*:/.test(skills)) {
        if (skills.trim().endsWith(",")) skills += " move: 0 ";
        else if (!skills.trim()) skills = " lurk: 0, move: 0 ";
        else skills += ", move: 0 ";
      }
      return p1 + skills + p3;
    }
  );
  bot = bot.replace(
    /(defaultProfile\(\)\s*:\s*Profile\s*{\s*return\s*{[\s\S]*?seenStart:\s*false)/,
    (m) => m + ',\n    movesTotal: 0,\n    searchRuns: 0,\n    _runMoves: 0'
  );
  // Session chatId capture (for broadcast)
  if (!/ctx\.session\.chatId\s*=/.test(bot)) {
    bot = insertAfter(bot, /bot\.use\(i18n\);\s*/, `\n// capture chat id for broadcasts\nbot.use(async (ctx, next) => { if (ctx.chat?.id) ctx.session.chatId = ctx.chat.id; await next(); });\n`);
  }

  // Helpers
  const helpers = `
// ============ Moves & skill helpers ============
function recordMove(ctx){ try { ctx.session.profile._runMoves = (ctx.session.profile._runMoves || 0) + 1; } catch {} }
function finalizeRunOnShard(ctx){ try { const p = ctx.session.profile; p.movesTotal = (p.movesTotal||0) + (p._runMoves||0); p.searchRuns = (p.searchRuns||0) + 1; p._runMoves = 0; } catch {} }

function maybeAnnounceIntegerSkill(ctx, name, value){
  const intPart = Math.floor(value + 1e-9);
  const isExactInt = Math.abs(value - intPart) < 1e-9;
  if (isExactInt && intPart >= 1){
    const label = name === "move" ? ctx.t("skill-move-level-up", { level: String(intPart) }) : ctx.t("skill-lurk-level-up", { level: String(intPart) });
    ctx.reply(label);
  }
}
`;
  if (!bot.includes("============ Moves & skill helpers ============")) {
    bot = insertAfter(bot, /\/\/ ================== Utilities ==================/, "\n" + helpers + "\n");
  }

  // In /me handler: after main reply, add avg_moves line
  bot = bot.replace(
    /(async function sendMe\(ctx: [\s\S]*?{[\s\S]*?const p = ctx\.session\.profile;[\s\S]*?await ctx\.reply\([\s\S]*?me[\s\S]*?\);\s*)/,
    (m) => m + `  await ctx.reply(ctx.t("stats-avg-moves", { avg_moves: String(p.searchRuns ? Math.round((p.movesTotal / p.searchRuns) * 10)/10 : 0) }));\n`
  );

  // 5) Shutdown broadcast (use join from node:path to avoid requiring 'path' object)
  const shutdown = `
// ============ Graceful shutdown broadcast ============
async function broadcastMaintenance(bot){
  try {
    const { readdirSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "data", "sessions");
    if (!existsSync(dir)) return;
    const files = readdirSync(dir).filter(f => f.endsWith(".json"));
    const seen = new Set();
    for (const f of files){
      try {
        const s = JSON.parse(await fs.readFile(join(dir, f), "utf-8"));
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
`;
  if (!bot.includes("Graceful shutdown broadcast")) {
    bot = insertAfter(bot, /bot\.start\(\)\.then\([\s\S]*?\);\s*/, "\n" + shutdown + "\n");
  }

  // 7) Quest rework
  const questHelpers = `
// ============ Quest rework ============
async function offerQuest(ctx){
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
`;
  if (!bot.includes("Quest rework")) {
    bot = insertAfter(bot, /\/\/ ================== Commands ==================/, "\n" + questHelpers + "\n");
  }
  if (!/bot\.command\(["']quest["']/.test(bot)) {
    bot = insertAfter(bot, /\/\/ ================== Commands ==================/, `\nbot.command("quest", offerQuest);\n`);
  }
  if (!/bot\.callbackQuery\(["']portal_enter["']/.test(bot)) {
    bot = insertAfter(bot, /\/\/ ================== Commands ==================/, `
bot.callbackQuery("portal_enter", async (ctx) => {
  const p = ctx.session.profile;
  if ((p.aether||0) < 13) { await ctx.answerCallbackQuery({ text: ctx.t("quest-portal-insufficient", { aether: String(p.aether||0) }) }); return; }
  p.aether -= 13;
  p._runMoves = 0;
  await ctx.editMessageText(ctx.t("portal-entered"));
  if (typeof startChaosSearch === "function") { await startChaosSearch(ctx); }
  else { await ctx.reply(ctx.t("portal-search-placeholder")); }
});
bot.callbackQuery("portal_skip", async (ctx) => {
  await ctx.editMessageText(ctx.t("portal-skipped"));
  await sendGreeting(ctx);
});
`);
  }

  // Add i18n keys
  if (enPath){
    let x = en;
    x = addI18n(x, "stats-avg-moves", "stats-avg-moves = ⏱️ Avg moves to find: { $avg_moves }");
    x = addI18n(x, "skill-lurk-level-up", "skill-lurk-level-up = 🧠 Lurking reached level { $level }.");
    x = addI18n(x, "skill-move-level-up", "skill-move-level-up = 🦶 Moving reached level { $level }.");
    x = addI18n(x, "quest-gain-xp", "quest-gain-xp = 📖 You learned arcana (cognitio arcana) and gained +1 XP.");
    x = addI18n(x, "quest-fun-no-gain", "quest-fun-no-gain = 🎭 You spent time on nonsense. Fun, but no XP gained.");
    x = addI18n(x, "quest-find-aether", "quest-find-aether = ✨ You found { $gained } Aether. Total: { $total }.");
    x = addI18n(x, "quest-portal-found2", "quest-portal-found2 = 🔮 A portal to the Fields of Chaos shimmers before you.");
    x = addI18n(x, "quest-portal-insufficient", "quest-portal-insufficient = 🔮 You see a portal, but your Aether ({ $aether }) is insufficient to open it (need 13).");
    x = addI18n(x, "portal-enter", "portal-enter = Enter portal");
    x = addI18n(x, "portal-skip", "portal-skip = Go on");
    x = addI18n(x, "portal-entered", "portal-entered = 🌀 You step into the portal…");
    x = addI18n(x, "portal-search-placeholder", "portal-search-placeholder = (search starts here — implement startChaosSearch(ctx))");
    x = addI18n(x, "portal-skipped", "portal-skipped = You ignore the portal and its chaotic emanations. Perhaps for the best.");
    await write(enPath, x);
    log(`Patched ${enPath}`);
  }
  if (ukPath){
    let x = uk;
    x = addI18n(x, "stats-avg-moves", "stats-avg-moves = ⏱️ Середня кількість ходів для пошуку: { $avg_moves }");
    x = addI18n(x, "skill-lurk-level-up", "skill-lurk-level-up = 🧠 \"Нишпорення\" досягло рівня { $level }.");
    x = addI18n(x, "skill-move-level-up", "skill-move-level-up = 🦶 \"Переміщення\" досягло рівня { $level }.");
    x = addI18n(x, "quest-gain-xp", "quest-gain-xp = 📖 Ви пізнали arcana (cognitio arcana) та отримали +1 досвіду.");
    x = addI18n(x, "quest-fun-no-gain", "quest-fun-no-gain = 🎭 Ви витратили час на нісенітницю. Весело, але без досвіду.");
    x = addI18n(x, "quest-find-aether", "quest-find-aether = ✨ Ви знайшли { $gained } етеру. Всього: { $total }.");
    x = addI18n(x, "quest-portal-found2", "quest-portal-found2 = 🔮 Перед вами мерехтить портал на Поля Хаосу.");
    x = addI18n(x, "quest-portal-insufficient", "quest-portal-insufficient = 🔮 Ви бачите портал, але вашого етеру ({ $aether }) недостатньо для відкриття (потрібно 13).");
    x = addI18n(x, "portal-enter", "portal-enter = Зайти в портал");
    x = addI18n(x, "portal-skip", "portal-skip = Іти далі");
    x = addI18n(x, "portal-entered", "portal-entered = 🌀 Ви ступаєте в портал…");
    x = addI18n(x, "portal-search-placeholder", "portal-search-placeholder = (тут має стартувати пошук — реалізуйте startChaosSearch(ctx))");
    x = addI18n(x, "portal-skipped", "portal-skipped = Ви проігнорували портал та еманації хаосу. Можливо, це й на краще.");
    await write(ukPath, x);
    log(`Patched ${ukPath}`);
  }

  // README block (append at end if not there)
  if (await exists("README.md")){
    let rd = await read("README.md");
    if (!rd.includes("## Quick Start")){
      rd = rd.trimEnd() + "\n\n" + `## Quick Start

**Requirements:** Node.js 18+ (LTS recommended)

\`\`\`bash
# 1) Configure environment
cp .env.example .env
# edit .env and set BOT_TOKEN

# 2) Install deps
npm ci

# 3) Build TypeScript
npm run build

# 4) Run (long polling)
node dist/bot.js
\`\`\`

On start you should see:
\`\`\`
[BOOT] Launching Telegram bot vX.Y.Z …
🚀 Server started — Telegram bot vX.Y.Z (long polling)
\`\`\`

### Environment variables (.env)

\`\`\`
BOT_TOKEN=123456789:ABC...your_bot_token...   # required
NODE_ENV=production                           # optional
ADMIN_IDS=123456789,987654321                 # optional: restrict hidden debug commands to these user IDs
\`\`\`

> Keep your token private. Do not commit \`.env\`.

## Public commands

- **/start** — start the bot, language selection on first run, greeting.
- **/help** — short help text.
- **/me** (alias **/profile**) — your profile: level, exp, energy, stats.
- **/version** — current bot version.
- *(hidden)* \`/aether\` — +13 Aether (for testing; ideally admin‑only).

## Development

- Type check (no emit):
  \`\`\`bash
  npm run typecheck
  \`\`\`
- Build:
  \`\`\`bash
  npm run build
  \`\`\`
- Run built code:
  \`\`\`bash
  node dist/bot.js
  \`\`\`
`;
      await write("README.md", rd);
      log("Appended Quick Start + Public commands to README.md");
    }
  }

  await write(botPath, bot);
  log(`Patched ${botPath}`);
  console.log("Done. Review changes, build, and test.");
}
main().catch(e => { console.error("ERROR:", e); process.exit(1); });
