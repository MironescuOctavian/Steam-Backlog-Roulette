import { costPerHour, remainingHours, type Game } from './library.ts';
import type {Preferences} from './preferences.ts';
export type Filters = { search: string; time: string; state: string; genre: string; score: number; maxHours: number };
export const defaultFilters: Filters = {search:'',time:'all',state:'backlog',genre:'',score:0,maxHours:200};
export function exclusionReason(g:Game,p:Preferences):string{
  return p.excludedIds.includes(g.appId)?'Manually excluded':p.hideSoftware&&g.appType==='software'?'Software excluded':p.hideDemos&&g.appType==='demo'?'Demos excluded':p.hideMultiplayer&&g.multiplayerOnly===true?'Multiplayer-only excluded':'';
}
export function recommendationReasons(g:Game,f:Filters,personal:boolean):string{
  return [personal?(g.playtimeHours===0?'Unplayed':`${g.playtimeHours}h played`):g.rank?`#${g.rank} in Steam 250`:'Steam discovery',g.playNext?'On your shortlist':'',f.genre&&g.genres.includes(f.genre)?`Matches ${f.genre}`:'',g.timeToBeatHours!==null?`~${Number(remainingHours(g)?.toFixed(1))}h remaining`:''].filter(Boolean).join(' · ');
}
export function sortLibrary(games:Game[],sort:string):Game[]{
  return [...games].sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='playtime'?b.playtimeHours-a.playtimeHours:sort==='remaining'?(remainingHours(a)??Infinity)-(remainingHours(b)??Infinity):sort==='priority'?Number(b.playNext)-Number(a.playNext):0);
}
export function filterGames(games: Game[], f: Filters): Game[] {
  return games.filter(g => {
    const hours = remainingHours(g);
    return g.title.toLowerCase().includes(f.search.trim().toLowerCase())
      && (f.state === 'all' || (g.status !== 'Completed' && g.status !== 'Dropped'
        && (f.state === 'backlog' || (f.state === 'never' && g.playtimeHours === 0) || (f.state === 'under2' && g.playtimeHours < 2) || (f.state === 'next' && g.playNext))))
      && (!f.genre || g.genres.includes(f.genre))
      && (f.score === 0 || ((g.steamPositivePercent??g.metacritic) !== null && (g.steamPositivePercent??g.metacritic)! >= f.score))
      && (f.maxHours === 200 || (hours !== null && hours <= f.maxHours))
      && (f.time === 'all' || (hours !== null && ((f.time === 'quick' && hours < 10) || (f.time === 'medium' && hours >= 10 && hours <= 30) || (f.time === 'epic' && hours >= 50))));
  });
}
export function analytics(games: Game[]) {
  const played = games.filter(g => g.playtimeHours > 0 && g.priceKnown !== false);
  const backlog = games.filter(g => g.status !== 'Completed' && g.status !== 'Dropped');
  return {
    backlog:backlog.length,
    remaining:backlog.reduce((sum,g)=>sum+(remainingHours(g)??0),0),
    unknownTimes:backlog.filter(g=>g.timeToBeatHours===null).length,
    unplayedPercent:games.length ? 100*games.filter(g=>g.playtimeHours===0).length/games.length : 0,
    averageCost:played.length ? played.reduce((sum,g)=>sum+costPerHour(g)!,0)/played.length : null,
  };
}
export function rankValue(games: Game[], worst: boolean): Game[] {
  return [...games.filter(g=>g.priceKnown !== false && (worst || g.playtimeHours>0))].sort((a,b)=>{
    if(worst && (a.playtimeHours===0 || b.playtimeHours===0)) {
      if(a.playtimeHours===0 && b.playtimeHours===0)return b.pricePaid-a.pricePaid || a.title.localeCompare(b.title);
      return a.playtimeHours===0 ? -1 : 1;
    }
    return (worst ? -1 : 1)*(costPerHour(a)!-costPerHour(b)!) || a.title.localeCompare(b.title);
  });
}
