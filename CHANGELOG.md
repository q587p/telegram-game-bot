# Changelog

## 0.0.17
- Fix Telegram Markdown crash in `/me` (no leading `*` bullets; using `•`).
- Skills: add **Moving**; rename **Lurk → Lurking**; show skills as a list with integer levels.
- `/tutorial`: if a quest is active — text says to complete it; replies show quest 9‑button keyboard (also `/me` while quest active).
- Menu: added `/fixmenu` to force re-register; also register commands on startup and on `/start`.
- Welcome back: “Ave, {name} …” remains; UA profile now uses “Підглядачі” for Lurkers.
- Version bump notifier: per-user `lastSeenVersion` to announce updates.
- Energy regen paused during quests (kept), walls marking, fog/floor/shard tiles (kept).
- Add `bot.catch(...)` to avoid crashing on API errors.
