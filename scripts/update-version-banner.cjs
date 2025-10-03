// scripts/update-version-banner.cjs
const fs = require("fs");
const pkg = require("../package.json");

// за потреби скоригуй шлях до bot.ts
const file = "src/bot.ts";

let s = fs.readFileSync(file, "utf8");
const re = /export const VERSION = "[^"]+";/;
if (!re.test(s)) {
  console.error('Cannot find line: export const VERSION = "..." ; in', file);
  process.exit(1);
}
s = s.replace(re, `export const VERSION = "${pkg.version}";`);
fs.writeFileSync(file, s);
