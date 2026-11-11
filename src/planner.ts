import { remainingHours, type Game } from './library.ts';
export type Filters = { search: string; time: string; state: string; genre: string; score: number; maxHours: number };
export const defaultFilters: Filters = {search:'',time:'all',state:'backlog',genre:'',score:0,maxHours:200};
export function filterGames(games: Game[], f: Filters): Game[] {
  return games.filter(g => {
    const hours = remainingHours(g);
    return g.title.toLowerCase().includes(f.search.trim().toLowerCase())
      && (f.state === 'all' || (g.status !== 'Completed' && g.status !== 'Dropped'
        && (f.state === 'backlog' || (f.state === 'never' && g.playtimeHours === 0) || (f.state === 'under2' && g.playtimeHours < 2) || (f.state === 'next' && g.playNext))))
      && (!f.genre || g.genres.includes(f.genre))
      && (f.score === 0 || (g.metacritic !== null && g.metacritic >= f.score))
      && hours <= f.maxHours
      && (f.time === 'all' || (f.time === 'quick' && hours < 10) || (f.time === 'medium' && hours >= 10 && hours <= 30) || (f.time === 'epic' && hours >= 50));
  });
}
