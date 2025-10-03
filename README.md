# Telegram Game Bot (0.0.14)

Stable dev on Windows: **compile → run** (no experimental loaders).
- `npm run dev` — first build, then `tsc -w` + `nodemon`
- `npm run build && npm start` — one-off build & run

Features:
- EN/UK i18n (Fluent `.ftl`)
- Commands: `/tutorial`, `/me`, `/help`, `/lang` (hidden: `/restore`, `/restart`, `/changelog`)
- Inline: **🧙 Me**, **🗺 Quest**; in-quest **Lurk**, movement, surrender
- Seeded quests (shows `Seed: N`); fog of war; Lurk reveals
- Energy auto-regen on interactions (+1/min, with messages)
- Skills: **Lurk** scaling (+0.1 → +0.05 → +0.025 … every 13); first unlock banner
- XP curve: **13 × (level+1)**; +1 XP per crystal (shown as Chaos shards in profile)
- Persistent sessions (`data/sessions/`)

