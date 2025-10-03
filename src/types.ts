import { Context, SessionFlavor } from "grammy";
import { I18nFlavor } from "@grammyjs/i18n";

export type Skills = Record<string, number>;

export type Profile = {
  level: number; xp: number; xpTarget: number;
  stamina: number; staminaMax: number; lastStaminaTs: number;
  skills: Skills;
  crystalsFound: number;
  questsStarted: number; questsSucceeded: number; questsFailed: number;
  shardMovesTotal: number; shardQuestsSucceeded: number;
  ether: number;
  seenStart: boolean; lastSeenVersion?: string;
};

export type PortalQuest = {
  active: boolean;
  bumpDir?: "up" | "down" | "left" | "right";
  gridSize: number;
  px: number; py: number;
  cx: number; cy: number;
  seed: number;
  seen: boolean[][];
  moves: number;
};

export type SessionData = { locale?: "uk" | "en"; profile: Profile; quest?: PortalQuest; };
export type MyContext = Context & SessionFlavor<SessionData> & I18nFlavor;
