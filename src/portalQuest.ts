import type { PortalQuest, Profile } from "./types.js";

const GRID_SIZE=5;
const GRID_FOG="⬛", GRID_FLOOR="🟫", GRID_WALL="🧱", GRID_PLAYER="📍", GRID_SHARD="🔮";

function mulberry32(a:number){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296; } }

export function startPortalQuest(p: Profile): PortalQuest {
  const seed=(Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0;
  const rng=mulberry32(seed);
  const px=Math.floor(rng()*GRID_SIZE), py=Math.floor(rng()*GRID_SIZE);
  let cx=Math.floor(rng()*GRID_SIZE), cy=Math.floor(rng()*GRID_SIZE);
  if (cx===px && cy===py) cx=(cx+1)%GRID_SIZE;
  const seen:boolean[][]=Array.from({length:GRID_SIZE},()=>Array.from({length:GRID_SIZE},()=>false));
  seen[py][px]=true;
  return { active:true, gridSize:GRID_SIZE, px, py, cx, cy, seed, seen, moves:0 };
}

export function renderMap(q: PortalQuest): string {
  function cell(x:number,y:number){ const isP=x===q.px && y===q.py; const isS=x===q.cx && y===q.cy; if(!q.seen[y][x]) return GRID_FOG; if(isP) return GRID_PLAYER; if(isS) return GRID_SHARD; return GRID_FLOOR; }
  const rows:string[]=[]; for(let y=0;y<q.gridSize;y++){ let line=""; for(let x=0;x<q.gridSize;x++) line+=cell(x,y); rows.push(line); }
  if(q.bumpDir==="right") return rows.map((r,y)=>r+" "+(y===q.py?GRID_WALL:GRID_FOG)).join("\n");
  if(q.bumpDir==="left") return rows.map((r,y)=>(y===q.py?GRID_WALL:GRID_FOG)+" "+r).join("\n");
  if(q.bumpDir==="up"){ let top=""; for(let x=0;x<q.gridSize;x++) top+=(x===q.px?GRID_WALL:GRID_FOG); return [top,...rows].join("\n"); }
  if(q.bumpDir==="down"){ let btm=""; for(let x=0;x<q.gridSize;x++) btm+=(x===q.px?GRID_WALL:GRID_FOG); return [...rows,btm].join("\n"); }
  return rows.join("\n");
}

export function look(q: PortalQuest){ q.moves+=1; for(let yy=q.py-1; yy<=q.py+1; yy++){ for(let xx=q.px-1; xx<=q.px+1; xx++){ if(xx>=0&&yy>=0&&xx<q.gridSize&&yy<q.gridSize) q.seen[yy][xx]=true; } } q.bumpDir=undefined; }
export function move(q: PortalQuest, dir:"up"|"down"|"left"|"right"): boolean {
  q.moves+=1; q.bumpDir=undefined; let moved=false;
  if(dir==="up"){ if(q.py>0){ q.py-=1; moved=true; } else q.bumpDir="up"; }
  else if(dir==="down"){ if(q.py<q.gridSize-1){ q.py+=1; moved=true; } else q.bumpDir="down"; }
  else if(dir==="left"){ if(q.px>0){ q.px-=1; moved=true; } else q.bumpDir="left"; }
  else if(dir==="right"){ if(q.px<q.gridSize-1){ q.px+=1; moved=true; } else q.bumpDir="right"; }
  if(moved) q.seen[q.py][q.px]=true;
  return moved;
}
