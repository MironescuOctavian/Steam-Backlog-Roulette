import type { Game } from './library.ts';
export function buildReel(pool: Game[], random: () => number = Math.random) {
  if(!pool.length)throw new Error('Cannot spin an empty library.');
  const pick=()=>pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))]!;
  const winner=pick();
  const cards=Array.from({length:50},pick);
  const winnerIndex=45;
  cards[winnerIndex]=winner;
  return {cards,winner,winnerIndex};
}
