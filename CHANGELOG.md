# Changelog

## 0.0.14
- Clean rebuild of `src/bot.ts` to fix earlier merge glitches (broken strings / stray braces).
- Hidden `/restart` to reset character and tutorial.
- `/me` hides shards/skills lines until non-zero; “Crystals” renamed to **Chaos shards** (EN) / **Осколки Хаосу** (UK).
- `/tutorial` intro uses current *level*/*energy* and says XP comes from quests.
- Stable dev flow: compile then run (tsc → nodemon).

## 0.0.15
- Markdown fixes: tutorial and skill unlock use Markdown; main buttons shown after those replies.
- Menu hardened with default + per-language + private chats scopes.
- Welcome back now includes name with a flourish ("Ave, …").
- Map visuals: fog ⬛, floor 🟫, shard 🔮; border bumps draw 🧱; moving no longer reveals surroundings (only **Lurk** does).
- Energy regen pauses during an active quest.
- Quest texts renamed to **Chaos shard / Осколок Хаосу**.
