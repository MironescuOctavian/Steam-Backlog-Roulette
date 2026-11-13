import type {Game} from './library.ts';
export function patchGames(games:Game[],ids:number[],patch:Partial<Pick<Game,'status'|'tags'>>){
  const selected=new Set(ids);if(!games.some(g=>selected.has(g.appId)))return games;
  return games.map(g=>selected.has(g.appId)?{...g,...patch,userManaged:true}:g);
}
