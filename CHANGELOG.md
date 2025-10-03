# Changelog

## 0.0.18
- Build fix: count unlocked skills numerically (no boolean arithmetic) — resolves TS2365.
- Dev tooling:
  - PowerShell script `tools/push-and-restart.ps1` to push → reinstall → build → start.
  - Husky hooks: `pre-commit` (typecheck) and `pre-push` (install+build).
  - GitHub Actions CI to ensure `main` builds.

## 0.0.17
- Version notice per user; dynamic tutorial during active quest; Moving skill; Lurking rename; UA “Підглядачі”.
- Fix Markdown crash in `/me`; bot-wide error handler; menu registration reinforced.

## 0.0.16
- Clean `bot.ts`; `/me` skills list; kept 0.0.15 UX and mechanics.
