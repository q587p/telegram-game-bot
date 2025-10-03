# Changelog

## 0.0.6
- Add `.gitignore` and Git-friendly structure.
- Quest start now generates a deterministic **seed** and prints it; map & crystal placement come from this seed.
- Skill **Lurk** scaling: +0.1 per use until 13; +0.05 until 26; +0.025 until 39; etc. (each 13 increases halve gain).
- /tutorial: after the "reach level 1" tip, shows "further steps in development".
- Text polish and bugfixes. Version bumped to **0.0.6**.

## 0.0.5
- Rename main action to **Quest** (EN) / **Квест** (UK).
- Rename Stamina → **Energy** (Енерґія) in all messages.
- In-quest **Look** button now labeled **Lurk** (keeps same behavior).
- Add first skill **Lurk**: starts at 0; pressing *Lurk* increases it by **+0.1**.
  - On reaching **1.0** (and if it’s the first unlocked skill) show a congratulations message about unlocking skill progression.
- Keep dynamic tutorial; XP thresholds now scale as **13 × (level+1)**.
- Bump version to **0.0.5**.

## 0.0.4
- Switch dev runner to **ts-node/ESM** to avoid esbuild/tsx transform errors on some Windows setups (especially OneDrive paths).
- Add `dev:watch` with nodemon.

## 0.0.3
- Commands menu (/tutorial, /me, /help, /lang) visible in input field.
- Ukrainian titles: **Маґус** (with ґ); greeting “Раді поверненню” on /start if returning.
- /tutorial is dynamic (never “finished”): intro before first success → ask to reach level 1 → next-level guidance.
- Progressive XP thresholds 13, 26, 39, …
- Energy auto-regen every minute with user notifications.
- Lurk quest 5×5 with fog of war, *Lurk* to reveal, moves, surrender.
- Persistent sessions; /restore debug command.

## 0.0.1
- Minimal bot with /start, /help, language selection (EN/UK), persistent sessions, inline buttons, and basic game skeleton.

## 0.0.7
- Add hidden `/changelog` command (not registered in command menu). It prints the latest section(s) from `CHANGELOG.md`.
- Fix percentage formatting bug in `percent()` function.
- Keep all features from 0.0.6 (seeded quests, skill scaling, Energy terminology, etc.).

## 0.0.8
- Dev scripts switched to Node's `--import` with a tiny `register-ts-node.mjs` (avoids experimental loader warning and ESM quirks on Windows).
- Fixed a minor bug in `/changelog` handler (`.strip()` → `.trim()`).
- All features from 0.0.7 retained.

## 0.0.9
- Dev flow no longer uses ts-node at all. Switched to **compile-then-run**:
  - `tsc -w` writes to `dist/`
  - `nodemon` runs `node dist/bot.js` and restarts on changes
- This avoids ESM loader quirks on Node 20/Windows and plays nice with OneDrive paths.

## 0.0.10
- Fix TypeScript syntax issues: remove stray first-line char and replace Python-style `r"..."` in `escapeMarkdown` with proper TS string.
- Add `/_/` and `**/_/` to `.gitignore` to ignore local `_` folders.
- Dev flow remains compile-then-run (tsc→nodemon).

## 0.0.11
- Hardcoded fix for `escapeMarkdown` (now pure TypeScript: `return text.replace(/([\*_`\[\]\\])/g, '\\$1');`).
- Keeps compile-then-run dev flow (tsc→nodemon). If you still see errors, ensure files were fully replaced.

## 0.0.12
- Hidden `/restart` command: fully resets your character (progress and tutorial).
- `/me` now hides Chaos shards and Skills until you have at least 1 shard / unlocked skill.
- Renamed "Crystals" → **Chaos shards** (EN) / **Осколки Хаосу** (UK) in the optional line.
- `/tutorial` intro now shows current *level* and *energy*, and clarifies that XP comes from quests.
- Version bump; all previous features preserved.

## 0.0.13
- Fix build errors: correct `escapeMarkdown` regex and replacement; fix `sendMe` `lines.join("\n")`.
- Ensure `session<SessionData, MyContext>` is used (TypeScript generics).
- Keep `/restart`, dynamic tutorial, hidden shards/skills, and seeded quests.
