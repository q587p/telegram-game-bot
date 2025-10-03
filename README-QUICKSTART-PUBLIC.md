## Quick Start

**Requirements:** Node.js 18+ (LTS recommended)

```bash
# 1) Configure environment
cp .env.example .env
# edit .env and set BOT_TOKEN

# 2) Install deps
npm ci

# 3) Build TypeScript
npm run build

# 4) Run (long polling)
node dist/bot.js
```

On start you should see:
```
[BOOT] Launching Telegram bot vX.Y.Z …
🚀 Server started — Telegram bot vX.Y.Z (long polling)
```

### Environment variables (.env)

```
BOT_TOKEN=123456789:ABC...your_bot_token...   # required
NODE_ENV=production                           # optional
ADMIN_IDS=123456789,987654321                 # optional: restrict hidden debug commands to these user IDs
```

> Keep your token private. Do not commit `.env`.

## Public commands

- **/start** — start the bot, language selection on first run, greeting.
- **/help** — short help text.
- **/me** (alias **/profile**) — your profile: level, exp, energy, stats.
- **/version** — current bot version.
- *(hidden)* `/aether` — +13 Aether (for testing; ideally admin‑only).

## Development

- Type check (no emit):
  ```bash
  npm run typecheck
  ```
- Build:
  ```bash
  npm run build
  ```
- Run built code:
  ```bash
  node dist/bot.js
  ```
