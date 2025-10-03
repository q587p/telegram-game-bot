# Telegram Game Bot (0.0.11)

**Stable dev on Windows:** compile-then-run (no experimental loaders).
- `npm run dev` — initial build, then `tsc -w` + `nodemon` on `dist/`
- `npm run build && npm start` — one-off build & run

Features:
- EN/UK i18n (Fluent `.ftl`)
- Commands: `/tutorial`, `/me`, `/help`, `/lang` (hidden: `/restore`, `/changelog`)
- Inline: **🧙 Me**, **🗺 Quest**; in-quest **Lurk**, movement, surrender
- Seeded quests; Energy regen; skill Lurk with scaling gains; XP 13×(level+1)
- Persistent sessions (Windows-friendly)
