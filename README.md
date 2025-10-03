# Telegram Game Bot (0.0.8)

- EN/UK i18n (Fluent `.ftl`)
- Commands menu: `/tutorial`, `/me`, `/help`, `/lang` (hidden: `/restore`, `/changelog`)
- Inline buttons: **🧙 Me**, **🗺 Quest**
- Quest: 5×5 field, fog of war, **Lurk** reveal, arrows to move, surrender
- **Seeded** quests: same seed → same layout/crystal
- Energy auto-regen +1/min on interactions (with notifications)
- Skills: **Lurk** scaling (+0.1 … +0.05 … +0.025 …)
- XP progression: **13 × (level+1)**; XP +1 per crystal
- Persistent sessions (Windows-friendly)

## Scripts
- `npm run dev` — Node `--import` + ts-node ESM register
- `npm run dev:watch` — nodemon autoreload
- `npm run build && npm start` — compile to JS and run
