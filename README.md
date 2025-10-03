# Telegram Game Bot (0.0.6)

- EN/UK i18n (Fluent `.ftl`)
- Commands menu: `/tutorial`, `/me`, `/help`, `/lang` (and hidden `/restore`)
- Inline buttons: **🧙 Me**, **🗺 Quest** (normal mode)
- Quest: 5×5 field, fog of war, **Lurk** reveal (formerly Look), arrows to move, surrender
- **Seeded** quests: same seed → same layout/crystal
- Energy auto-regen +1/min on interactions (with notifications)
- Skills: **Lurk** starts at 0; scaling gains (+0.1 … +0.05 … +0.025 …); first unlock banner at 1.0
- XP progression: **13 × (level+1)**; XP +1 per crystal
- Persistent sessions (Windows-friendly)

## GitHub quick start
```bash
git init
git add .
git commit -m "feat: initial import v0.0.6"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```
