import { MyContext } from "./types.js";
export function nowMs() { return Date.now(); }
export function displayNameFull(ctx: MyContext): string {
  const u = ctx.from; if (!u) return "Player";
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return (parts.join(" ").trim() || "Player");
}
export function escapeMarkdown(text: string): string {
  return text.replace(/([\*_`\[\]\\])/g, '\\$1');
}
export function percent(passed: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (passed / total) * 100;
  return `${pct.toFixed(2)}%`;
}
