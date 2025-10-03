# Start: language intro + chooser
start-lang-intro =
  The game is primarily in English since it is an international project with players from around the world.
  However, tutorial tips have been translated into several languages.
  You can choose the language that suits you:
choose-language = 🌐 Choose a language:
lang-set-en = ✅ Language set to English.
lang-set-uk = ✅ Language set to Ukrainian.

# Greeting / welcome
greet =
  👁 You open your eyes and see the moving aether.
  Whispers of Eris echo in laughter, shadows of Chaos crawl across your vision.
  Are you ready to transition from *Lurker* to *Magus*, from observing the dance of the world to *creating the Philosopher's Stone*?

  Head out on adventures to gain experience, increase your skill and other rewards.
  You earn 📖 experience *by completing quests*.

  🏅 Level:
    • You are currently at level { $level }.
    • Earn 📖 experience to level up.
    • When your experience reaches { $xp_target }, your level will increase.

  ⚡️ Energy:
    • Current energy: { $stamina }.

  ❗️ Current task:
    • Start a quest
welcome-back = 👋 *Ave*, { $name } — welcome back to the arcane adventures!
version-notice = 🔔 *Update:* { $name }, the bot has been updated to *v{ $version }*.

# Buttons (main)
btn-quest = 🗺 Quest
btn-me = 🧙 Me

# Quest control buttons (9-grid)
btn-look = 🔎 Lurking
btn-up = ⬆️ Up
btn-left = ⬅️ Left
btn-right = ➡️ Right
btn-down = ⬇️ Down
btn-surrender = 🏳️ Surrender
btn-empty = ·
btn-you = 🧭 You

# Help
help =
  ℹ️ *Help*

  Available commands:
  /tutorial — open tutorial
  /me — show your info
  /help — show this help
  /lang — change language

# Me base + optional lines
me-notice = ❗️You have unfinished business, check the /tutorial command.
me-base =
  { $name }
  Magus of 👀 Lurkers
  🏅Level: { $level } { $percent }
  📖Exp: { $xp }/{ $xp_target }
  ⚡️Energy: { $stamina }/{ $stamina_max } ⏰
me-line-shards =   🔮Chaos shards found: { $shards_found }
me-line-skills-header =   🧠Skills unlocked: { $skills_count }
skill-name-lurking = Lurking
skill-name-moving = Moving

tutorial-intro-pre =
  🎉 You join the brave magi of 👀 Lurkers.

  Head out on adventures to gain experience, increase your skill and other rewards.
  You earn 📖 experience *by completing quests*.

  🏅 Level:
    • You are currently at level { $level }.
    • Earn 📖 experience to level up.
    • When your experience reaches { $xp_target }, your level will increase.

  ⚡️ Energy:
    • Current energy: { $stamina }.

  ❗️ Current task:
    • Start a quest
tutorial-step-reach-l1 =
  ✅ You completed a quest successfully.
  Next goal: reach *Level 1*.
  Progress: { $xp } / { $xp_target } XP.
tutorial-task-complete-quest = ❗️ Current task: • Complete the quest you started.
tutorial-dev = 🧪 Further steps are in development. Stay tuned!

# Quest texts
quest-intro-seed = ✨ Generating an ether field 5×5. Seed: `{ $seed }`. Find the *Chaos shard* within it.
quest-already = 🧭 You are already on a quest. Use the buttons below.
quest-not-active = ℹ️ No active quest. Tap 🗺 Quest to start.
quest-complete =
  🎉 You found the *Chaos shard*! 🔮
  +{ $xp_gain } XP
  ⚡️ Energy: { $stamina }
  🏅 XP: { $xp } / { $xp_target }
quest-surrendered = 🏳️ You gave up. The quest ends with no XP.
leveled-up = 🆙 Level up! You reached level { $level }.

no-stamina = ⛔ You are out of energy. Come back later!

# Regen messages
stamina-tick = ⚡️ Your energy recovered slightly (+{ $amt }). Current: { $stamina }.
stamina-full = 💪 You are full of energy. Adventures await you!

# Skills
skill-unlocked-first = 🎉 Congratulations! You unlocked skill progression — *{ $skill }* reached 1. Skills grow with use; keep playing to discover and train others!

# Changelog
changelog-title = 📜 *Changelog* (latest)
changelog-empty = (no changelog found)

# Debug / hidden
restored = ⚡️ Energy restored to { $stamina }.
restart-done = 🔁 Character reset. Tutorial restarted; your progress is now fresh.
aether-granted = ✨ You received { $gained } Aether. Total: { $aether }.

# Quest events
quest-portal-found = 🔮 You sense a faint portal shimmer nearby… Keep lurking to reveal it!

stats-avg-moves = ⏱️ Avg moves to find: { $avg_moves }

skill-lurk-level-up = 🧠 Lurking reached level { $level }.

skill-move-level-up = 🦶 Moving reached level { $level }.

quest-gain-xp = 📖 You learned arcana (cognitio arcana) and gained +1 XP.

quest-fun-no-gain = 🎭 You spent time on nonsense. Fun, but no XP gained.

quest-find-aether = ✨ You found { $gained } Aether. Total: { $total }.

quest-portal-found2 = 🔮 A portal to the Fields of Chaos shimmers before you.

quest-portal-insufficient = 🔮 You see a portal, but your Aether ({ $aether }) is insufficient to open it (need 13).

portal-enter = Enter portal

portal-skip = Go on

portal-entered = 🌀 You step into the portal…

portal-search-placeholder = (search starts here — implement startChaosSearch(ctx))

portal-skipped = You ignore the portal and its chaotic emanations. Perhaps for the best.

# === Auto-added placeholders ===
btn-portal-enter = [btn-portal-enter]
btn-portal-skip = [btn-portal-skip]
me-line-avg-moves = [me-line-avg-moves]
me-line-ether = [me-line-ether]
quest-rng-ether = [quest-rng-ether]
quest-rng-waste = [quest-rng-waste]
quest-rng-xp = [quest-rng-xp]
tutorial-body = [tutorial-body]
tutorial-task-start = [tutorial-task-start]
