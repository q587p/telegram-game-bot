start-lang-intro =
  The game is primarily in English since it is an international project with players from around the world.
  However, tutorial tips have been translated into several languages.
  You can choose the language that suits you:
choose-language = 🌐 Choose a language:
lang-set-en = ✅ Language set to English.
lang-set-uk = ✅ Language set to Ukrainian.

greet =
  🎉 You join the brave magi of 👀 Lurkers.

  Head out on adventures to gain experience, increase your skill and other rewards.
  You earn 📖 experience *by completing quests*.

tutorial-body =
  🏅 Level:
    • You are currently at level { $level }.
    • Earn 📖 experience to level up.
    • When your experience reaches { $xp_target }, your level will increase.

  ⚡️ Energy:
    • Current energy: { $stamina }.

  ❗️ Current task:
tutorial-task-start =   • Start a quest
tutorial-task-complete-quest =   • Complete the quest you started

welcome-back = 👋 *Ave*, { $name } — welcome back to the arcane adventures!
version-notice = 🔔 *Update:* { $name }, the bot has been updated to *v{ $version }*.

btn-quest = 🗺 Quest
btn-me = 🧙 Me
btn-look = 🔎 Lurking
btn-up = ⬆️ Up
btn-left = ⬅️ Left
btn-right = ➡️ Right
btn-down = ⬇️ Down
btn-surrender = 🏳️ Surrender
btn-empty = ·
btn-you = 🧭 You
btn-portal-enter = 🌀 Enter portal
btn-portal-skip = 🚶 Move on

help =
  ℹ️ *Help*

  Available commands:
  /tutorial — open tutorial
  /me — show your info
  /help — show this help
  /lang — change language

me-notice = ❗️You have unfinished business, check the /tutorial command.
me-base =
  { $name }
  Magus of 👀 Lurkers
  🏅Level: { $level } { $percent }
  📖Exp: { $xp }/{ $xp_target }
  ⚡️Energy: { $stamina }/{ $stamina_max } ⏰
me-line-shards =   🔮Chaos shards found: { $shards_found }
me-line-avg-moves =   ⏱ Average moves per shard: { $avg_moves }
me-line-ether =   🜁 Ether: { $ether }
me-line-skills-header =   🧠Skills unlocked: { $skills_count }
skill-name-lurking = Lurking
skill-name-moving = Moving

tutorial-step-reach-l1 =
  ✅ You completed a quest successfully.
  Next goal: reach *Level 1*.
  Progress: { $xp } / { $xp_target } XP.
tutorial-dev = 🧪 Further steps are in development. Stay tuned!

quest-rng-xp =
  📜 *Arcanum revelatum!* You glean secret lore from ancient tomes.
  +1 XP
quest-rng-waste =
  🤡 You spent time on delightful nonsense. Fun, but no progress today.
quest-rng-ether =
  🜁 You distilled a bit of ether from the aetheric currents.
  +{ $amt } Ether
quest-portal-found =
  🌀 A portal to the Fields of Chaos flickers before you.

  Cost to enter: 13 Ether.
  Your Ether: { $ether }

  { $can_enter ->
    [yes] Choose:
    [no] You lack sufficient Ether. Seek more power.
   }

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
stamina-tick = ⚡️ Your energy recovered slightly (+{ $amt }). Current: { $stamina }.
stamina-full = 💪 You are full of energy. Adventures await you!
skill-unlocked-first = 🎉 Congratulations! You unlocked skill progression — *{ $skill }* reached { $level }.
skill-unlocked = 🎯 *{ $skill }* reached { $level } — nice!
changelog-title = 📜 *Changelog* (latest)
changelog-empty = (no changelog found)
restored = ⚡️ Energy restored to { $stamina }.
restart-done = 🔁 Character reset. Tutorial restarted; your progress is now fresh.
shutdown-broadcast = ⚠️ Scheduled maintenance: the server is going down now. Please wait for a restart.
