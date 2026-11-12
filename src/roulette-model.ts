import type { Game } from './library.ts';
export type RecentPick={appId:number;at:number};
export function rememberPick(picks:RecentPick[],appId:number,at=Date.now()):RecentPick[]{return [{appId,at},...picks.filter(p=>p.appId!==appId)].slice(0,8);}
export function rouletteCandidates(games:Game[],skipped:number[],recent:RecentPick[]){
  const excluded=new Set(skipped),last=new Set(recent.slice(0,3).map(p=>p.appId));
  const pool=games.filter(g=>g.status!=='Completed'&&g.status!=='Dropped'&&!excluded.has(g.appId));
  const fresh=pool.filter(g=>!last.has(g.appId));return fresh.length?fresh:pool;
}
export function buildReel(pool: Game[], random: () => number = Math.random) {
  if(!pool.length)throw new Error('Cannot spin an empty library.');
  const pick=()=>pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))]!;
  const winner=pick();
  const cards=Array.from({length:50},pick);
  const winnerIndex=45;
  cards[winnerIndex]=winner;
  return {cards,winner,winnerIndex};
}
