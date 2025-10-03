# Telegram Game Bot (0.0.16)

Stable dev on Windows: **compile → run** (no experimental loaders).
- `npm run dev` — first build, then `tsc -w` + `nodemon`
- `npm run build && npm start` — one-off build & run

Features:
- EN/UK i18n (Fluent `.ftl`)
- Commands: `/tutorial`, `/me`, `/help`, `/lang` (hidden: `/restore`, `/restart`, `/changelog`)
- Inline: **🧙 Me**, **🗺 Quest**; in-quest **Lurk**, movement, surrender
- Seeded quests (shows `Seed: N`); fog of war; Lurk reveals; walls when bumping
- Energy auto-regen (+1/min) **only outside quests**
- Skills: **Lurk** scaling (+0.1 → +0.05 → … every 13); first unlock banner
- XP curve: **13 × (level+1)**; +1 XP per shard
- Persistent sessions (`data/sessions/`)
