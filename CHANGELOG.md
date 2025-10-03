# Changelog

## 0.0.30 - 2025-10-03
- Switched main “Quest” button to the new quest module (quest-rework.ts). The old 3×3 quest UI is removed.
- Added support for the `quest_go` inline button; `/quest` and the button now trigger the same flow.
- Cleaned up unused legacy modules to reduce confusion (kept in repo for now): engine.ts, keyboards.ts, menus.ts, portalQuest.ts, storage.ts, i18n.ts, utils.ts, skills.ts, types.ts, version.ts.
- Ensured startup banner prints: `🚀 Server started — Telegram bot v0.0.30 (long polling)`.

## 0.0.26 — Aetherwalkers rename & intro
- README updated with Aetherwalkers name, dual-language description, features, and setup.
- New /start greeting aligned with Aetherwalkers lore (EN/UK locales).
- Added boot log: `[BOOT] Launching Telegram bot vX.Y.Z …`.

## 0.0.24
- Quest rework: randomized outcomes (+1 XP / fun / +1..5 Aether / Portal).
- Portal flow: enter (cost 13 Aether) or skip; on enter, call existing 55 search.
- Robust session/profile init in quest module (fixes ctx.session undefined).
- ESM import fix: use \import "./quest-rework.js"\ with NodeNext/Node16 resolution.

## 0.0.23
- Hidden command `/aether`: grants 13 Aether for testing.
- Boot logs: print `[BOOT] Launching Telegram bot v0.0.23 …` and `🚀 Server started — Telegram bot v0.0.23 (long polling)`.
- Keep EN/UK translations for `aether-granted` and `quest-portal-found` in locales.

## 0.0.21
- Hidden command `/aether`: grants 13 Aether for testing.
- Boot logs: print `[BOOT] Launching Telegram bot v0.0.21 …` and `🚀 Server started — Telegram bot v0.0.21 (long polling)`.
- Add missing translations: `quest-portal-found` (EN/UK) and `aether-granted`.

## 0.0.20
- Console: clearer startup banner (“Server started — Telegram bot vX.Y.Z”).
- Walls UX: on hitting a boundary the map visually shifts and shows a *virtual* wall outside the field
  instead of replacing the player tile. Implemented as a bump overlay for all four directions.

## 0.0.19
- Husky hooks compatible with latest Husky: removed deprecated loader lines.
- Windows-friendly pre-push: no `npm ci` (avoids EPERM on OneDrive/locked files). Runs `npm run build` only.

## 0.0.18
- Build fix: count unlocked skills numerically (no boolean arithmetic) — resolves TS2365.
- Dev tooling:
  - PowerShell script `tools/push-and-restart.ps1` to push → reinstall → build → start.
  - Husky hooks: `pre-commit` (typecheck) and `pre-push` (install+build).
  - GitHub Actions CI to ensure `main` builds.

## 0.0.17
- Version notice per user; dynamic tutorial during active quest; Moving skill; Lurking rename; UA “Підглядачі”.
- Fix Markdown crash in `/me`; bot-wide error handler; menu registration reinforced.
