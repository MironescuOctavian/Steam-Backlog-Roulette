import type {Game} from './library.ts';
export const unfinished=(game:Game)=>game.status!=='Completed'&&game.status!=='Dropped';
export const queueCompare=(a:Game,b:Game)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(a.queuePosition??Number.MAX_SAFE_INTEGER)-(b.queuePosition??Number.MAX_SAFE_INTEGER);
export function queueGames(games:Game[]){return games.filter(g=>g.playNext&&unfinished(g)).sort(queueCompare);}
export function patchGames(games:Game[],ids:number[],patch:Partial<Pick<Game,'status'|'playNext'|'tags'>>){
  const selected=new Set(ids);if(!games.some(g=>selected.has(g.appId)))return games;
  const next=games.map(g=>{if(!selected.has(g.appId))return g;const updated={...g,...patch,userManaged:true};if(patch.playNext===true&&!g.playNext)delete updated.queuePosition;if(!updated.playNext||!unfinished(updated))updated.pinned=false;return updated;});
  const positions=new Map(queueGames(next).map((g,index)=>[g.appId,index]));
  return next.map(g=>positions.has(g.appId)?{...g,queuePosition:positions.get(g.appId)!}:g);
}
export function moveQueuedGame(games:Game[],id:number,direction:-1|1){
  const queue=queueGames(games),index=queue.findIndex(g=>g.appId===id),target=index+direction;
  if(index<0||target<0||target>=queue.length||queue[index]!.pinned||queue[target]!.pinned)return games;
  [queue[index],queue[target]]=[queue[target]!,queue[index]!];
  const positions=new Map(queue.map((g,i)=>[g.appId,i]));return games.map(g=>positions.has(g.appId)?{...g,queuePosition:positions.get(g.appId)!}:g);
}
export function pinQueuedGame(games:Game[],id:number|null){
  if(id!==null&&!queueGames(games).some(g=>g.appId===id))return games;
  return games.map(g=>g.appId===id||g.pinned?{...g,pinned:g.appId===id}:g);
}
