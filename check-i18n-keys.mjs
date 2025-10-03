//
// check-i18n-keys.mjs
// Usage: node check-i18n-keys.mjs
//
// Verifies that required quest rework i18n keys exist in locales/en.ftl & locales/uk.ftl
// and checks whether the keys are referenced anywhere in src/ (ctx.t("key"))
//

import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";

const requiredKeys = [
  "quest-gain-xp",
  "quest-fun-no-gain",
  "quest-find-aether",
  "quest-portal-found2",
  "quest-portal-insufficient",
  "portal-enter",
  "portal-skip",
  "portal-entered",
  "portal-search-placeholder",
  "portal-skipped",
];

async function readIfExists(p) {
  try { return await fs.readFile(p, "utf-8"); }
  catch { return ""; }
}

function checkKeys(ftl, lang) {
  const missing = [];
  for (const k of requiredKeys) {
    if (!new RegExp(`^\\s*${k}\\s*=`, "m").test(ftl)) missing.push(k);
  }
  const dupes = [];
  for (const k of requiredKeys) {
    const matches = ftl.match(new RegExp(`^\\s*${k}\\s*=`, "mg")) || [];
    if (matches.length > 1) dupes.push(k);
  }
  return { missing, dupes };
}

function scanSrcForUsage(root) {
  const used = new Set();
  const keyRegex = /ctx\.t\(\s*["']([^"']+)["']/g;
  const files = [];
  function walk(dir){
    for (const entry of fss.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // skip node_modules, dist, build
        if (/node_modules|dist|build/.test(full)) continue;
        walk(full);
      } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
        files.push(full);
        const txt = fss.readFileSync(full, "utf-8");
        let m;
        while ((m = keyRegex.exec(txt))) used.add(m[1]);
      }
    }
  }
  walk(root);
  return { used, files };
}

async function main(){
  const en = await readIfExists(path.join("locales", "en.ftl"));
  const uk = await readIfExists(path.join("locales", "uk.ftl"));

  const enRes = checkKeys(en, "en");
  const ukRes = checkKeys(uk, "uk");

  const { used } = scanSrcForUsage(path.join(process.cwd(), "src"));

  console.log("=== locales/en.ftl ===");
  console.log("Missing:", enRes.missing.length ? enRes.missing : "none");
  console.log("Duplicates:", enRes.dupes.length ? enRes.dupes : "none");
  console.log("");
  console.log("=== locales/uk.ftl ===");
  console.log("Missing:", ukRes.missing.length ? ukRes.missing : "none");
  console.log("Duplicates:", ukRes.dupes.length ? ukRes.dupes : "none");

  const shouldExist = new Set(requiredKeys);
  const unused = [...shouldExist].filter(k => !used.has(k));
  const unknownUsed = [...used].filter(k => shouldExist.has(k) === false && /^(quest-|portal-)/.test(k));

  console.log("");
  console.log("=== src usage ===");
  console.log("Keys referenced in code but NOT in required set (quest/portal-ish):", unknownUsed.length ? unknownUsed : "none");
  console.log("Required keys NOT referenced in code:", unused.length ? unused : "none");

  if (unknownUsed.length) {
    console.log("\nTip: If you see e.g. 'quest-portal-found' in code but locales have 'quest-portal-found2', rename either side to match.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
