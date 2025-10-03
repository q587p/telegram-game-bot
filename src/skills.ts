import { Profile } from "./types.js";
export function nextXpTargetFor(level: number): number { return 13 * (level + 1); }
export function tryLevelUp(p: Profile): boolean {
  let leveled=false;
  while (p.xp >= p.xpTarget) { p.xp -= p.xpTarget; p.level += 1; p.xpTarget = nextXpTargetFor(p.level); leveled = true; }
  return leveled;
}
export function skillIncrement(current: number): number {
  const tier = Math.floor(current / 13);
  return 0.2 * Math.pow(0.5, tier);
}
export function ensureProfileMigrations(p: Profile) {
  if (p.staminaMax==null) p.staminaMax=5;
  if (p.lastStaminaTs==null) p.lastStaminaTs=Date.now();
  if (p.crystalsFound==null) p.crystalsFound=0;
  if (p.questsStarted==null) p.questsStarted=0;
  if (p.questsSucceeded==null) p.questsSucceeded=0;
  if (p.questsFailed==null) p.questsFailed=0;
  if ((p as any).seenStart==null) (p as any).seenStart=false;
  if (p.xpTarget==null || p.xpTarget<13) p.xpTarget=13;
  if ((p as any).skills==null) (p as any).skills={};
  const s:any=p.skills;
  if (s.lurk!=null && s.lurking==null){ s.lurking=s.lurk; delete s.lurk; }
  if (s.lurking==null) s.lurking=0;
  if (s.moving==null) s.moving=0;
  if ((p as any).ether==null) (p as any).ether=0;
  if ((p as any).shardMovesTotal==null) (p as any).shardMovesTotal=0;
  if ((p as any).shardQuestsSucceeded==null) (p as any).shardQuestsSucceeded=0;
}
export function skillMilestone(before: number, after: number): number | null {
  const b=Math.floor(before), a=Math.floor(after);
  return a>b? a : null;
}
