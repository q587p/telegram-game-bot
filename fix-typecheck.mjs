//
// fix-typecheck.mjs
// Usage (from repo root): node fix-typecheck.mjs
//
// Fixes:
// - Add `chatId?: number` to SessionData
// - Avoid TS2304 by using globalThis.startChaosSearch (if present)
// - Annotate helper fn params (no implicit any)
// - Fix fs read in broadcastMaintenance
// - Replace 'p.' in stats-avg-moves line with ctx.session.profile.* to avoid scope issues
//
import fs from "node:fs/promises";

const enc = "utf-8";

async function read(p){ return fs.readFile(p, enc); }
async function write(p, s){ return fs.writeFile(p, s, enc); }

function ensureSessionChatId(ts){
  // Handle type or interface SessionData
  const reType = /type\s+SessionData\s*=\s*{([\s\S]*?)}\s*;?/;
  const reIface = /interface\s+SessionData\s*{([\s\S]*?)}/;
  if (reType.test(ts)){
    ts = ts.replace(reType, (m, inner) => {
      if (/\bchatId\??:\s*number/.test(inner)) return m;
      return `type SessionData = {${inner}\n  chatId?: number;\n}`;
    });
  } else if (reIface.test(ts)){
    ts = ts.replace(reIface, (m, inner) => {
      if (/\bchatId\??:\s*number/.test(inner)) return m;
      return `interface SessionData {${inner}\n  chatId?: number;\n}`;
    });
  }
  return ts;
}

function fixStartChaosCall(ts){
  // Replace bare startChaosSearch occurrences to use globalThis to avoid TS2304
  ts = ts.replace(
    /if\s*\(\s*typeof\s+startChaosSearch\s*===\s*["']function["']\s*\)\s*{\s*await\s+startChaosSearch\(\s*ctx\s*\)\s*;\s*}\s*else\s*{\s*await\s+ctx\.reply\([\s\S]*?\);\s*}\s*/,
    'const scs = (globalThis as any).startChaosSearch;\nif (typeof scs === "function") { await scs(ctx as any); } else { await ctx.reply(ctx.t("portal-search-placeholder")); }\n'
  );
  // If only the positive branch existed, convert it
  ts = ts.replace(
    /if\s*\(\s*typeof\s+startChaosSearch\s*===\s*["']function["']\s*\)\s*{\s*await\s+startChaosSearch\(\s*ctx\s*\)\s*;\s*}/,
    'const scs = (globalThis as any).startChaosSearch;\nif (typeof scs === "function") { await scs(ctx as any); }'
  );
  // Replace direct calls if any
  ts = ts.replace(/await\s+startChaosSearch\(\s*ctx\s*\)\s*;/g,
                  'const scs = (globalThis as any).startChaosSearch; if (typeof scs === "function") { await scs(ctx as any); }');
  return ts;
}

function annotateHelpers(ts){
  ts = ts.replace(/function\s+recordMove\s*\(\s*ctx\s*\)/, 'function recordMove(ctx: any)');
  ts = ts.replace(/function\s+finalizeRunOnShard\s*\(\s*ctx\s*\)/, 'function finalizeRunOnShard(ctx: any)');
  ts = ts.replace(/function\s+maybeAnnounceIntegerSkill\s*\(\s*ctx\s*,\s*name\s*,\s*value\s*\)/, 'function maybeAnnounceIntegerSkill(ctx: any, name: "move" | "lurk", value: number)');
  ts = ts.replace(/async\s+function\s+offerQuest\s*\(\s*ctx\s*\)/, 'async function offerQuest(ctx: any)');
  ts = ts.replace(/async\s+function\s+broadcastMaintenance\s*\(\s*bot\s*\)/, 'async function broadcastMaintenance(bot: any)');
  return ts;
}

function fixBroadcastFs(ts){
  // Use readFile imported from node:fs/promises (fs var may not exist)
  ts = ts.replace(
    /JSON\.parse\(await\s+fs\.readFile\(/g,
    'JSON.parse(await (await import("node:fs/promises")).readFile('
  );
  return ts;
}

function fixAvgMovesLine(ts){
  // Replace the line that uses variable `p` with a version referencing ctx.session.profile
  const re = /ctx\.t\("stats-avg-moves",\s*\{\s*avg_moves:\s*String\(\s*p\.searchRuns\s*\?\s*Math\.round\(\(p\.movesTotal\s*\/\s*p\.searchRuns\)\s*\*\s*10\)\s*\/\s*10\s*:\s*0\)\s*\}\)/;
  if (re.test(ts)){
    ts = ts.replace(re,
      'ctx.t("stats-avg-moves", { avg_moves: String((ctx.session.profile.searchRuns ? Math.round((ctx.session.profile.movesTotal / ctx.session.profile.searchRuns) * 10)/10 : 0)) })'
    );
  }
  return ts;
}

async function main(){
  const botPath = (await fs.stat("src").then(()=>true).catch(()=>false)) ? "src/bot.ts" : "bot.ts";
  let ts = await read(botPath);

  ts = ensureSessionChatId(ts);
  ts = fixStartChaosCall(ts);
  ts = annotateHelpers(ts);
  ts = fixBroadcastFs(ts);
  ts = fixAvgMovesLine(ts);

  await write(botPath, ts);
  console.log("Patched", botPath);
}

main().catch(e => { console.error(e); process.exit(1); });
