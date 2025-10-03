# Changelog

## 0.0.14
- Clean rebuild of `src/bot.ts` to fix earlier merge glitches (broken strings / stray braces).
- Hidden `/restart` to reset character and tutorial.
- `/me` hides shards/skills lines until non-zero; “Crystals” renamed to **Chaos shards** (EN) / **Осколки Хаосу** (UK).
- `/tutorial` intro uses current *level*/*energy* and says XP comes from quests.
- Stable dev flow: compile then run (tsc → nodemon).
