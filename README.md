# Aetherwalkers (Етерні мандрівники)

> This is a game about everything and nothing: the laughter of Goddess Eris, the shadows of Chaos, the Will of Thelema, the face of Death, and the hymn to Satan. You can simply lurk, read amusing texts, and watch what unfolds; or step onto the path of initiation and undergo the full cycle of transformation into the immortal form of the Philosopher’s Stone.  

> Це гра про все і ні про що: сміх богині Еріди, тіні Хаосу, Волю Телеми, обличчя Смерті та гімн Сатані. Ви можете просто підглядати, читати цікаві тексти та стежити за розвитком подій; або ж ступити на шлях ініціації та пройти повний цикл перетворення у безсмертну форму Філософського каменю.   

---

## 🌀 About
**Aetherwalkers** is a text-based role-playing game in the Telegram bot format.
Follow the path from Lurker to Magus! 

**Етерні мандрівники** — це текстова рольова гра у форматі Телеґрам-бота.   
Пройди шлях від Підглядача до Маґуса!

---

## 🎮 Features
- Complete tasks and grow in levels and above yourself. 
- Read occult texts, aphorisms, chaotic jokes, and watch how the world around you changes.  
- Follow this path alone or create/join covens, orders, guilds, and other associations, help/compete with others. 
- Become part of the **Magnus Opus** and create your own philosopher's stone.   

- Виконуй завдання та рости в рівнях і над собою.   
- Читай окультні тексти, афоризми, хаотичні жарти й дивись, як світ навколо тебе змінюється.  
- Йди цим шляхом сам чи створюй/вступай в ковени, ордени, гільдії та інші об’єднання, допомагай/змагайся з іншими. 
- Стань частиною **Великої Роботи** і створи власний філософський камінь.   

---

## 🚀 Getting Started
1. Open the bot in Telegram.  
2. Press **/start**.  
3. Complete the tutorial (/tutorial) 
 
1. Відкрий бота у Telegram.  
2. Натисни **/start**.  
3. Пройди навчання (/tutorial) 

---

## 📖 License

MIT

---

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
```

> Keep your token private. Do not commit `.env`.

## Public commands

- **/start** — start the bot, language selection on first run, greeting.
- **/help** — short help text.
- **/lang** — change language.
- **/tutorial** — details about first steps.
- **/me** (alias **/profile**) — your profile: level, exp, energy, stats.
- **/version** — current bot version.

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
