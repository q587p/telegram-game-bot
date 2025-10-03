# Changelog

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
