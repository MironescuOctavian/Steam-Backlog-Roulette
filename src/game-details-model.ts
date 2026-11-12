export type PlayerCount={appId:number;playersNow:number|null;capturedAt:string};
export type GameInfo=PlayerCount&{description:string;developers:string[];publishers:string[];genres:string[];platforms:string[];releaseDate:string|null;price:string|null;available:boolean};
export function validatePlayers(value:unknown):PlayerCount[]{
  if(!Array.isArray(value)||value.length>24)throw Error('Invalid player counts.');
  const ids=new Set<number>();
  return value.map(g=>{if(!g||!Number.isSafeInteger(g.appId)||g.appId<1||ids.has(g.appId)||!(g.playersNow===null||Number.isSafeInteger(g.playersNow)&&g.playersNow>=0)||typeof g.capturedAt!=='string'||!Number.isFinite(Date.parse(g.capturedAt)))throw Error('Invalid player count.');ids.add(g.appId);return {appId:g.appId,playersNow:g.playersNow,capturedAt:g.capturedAt};});
}
export function validateGameInfo(value:unknown):GameInfo{
  const g=value as GameInfo;validatePlayers([g]);
  if(typeof g.description!=='string'||g.description.length>3000||typeof g.available!=='boolean'||![g.developers,g.publishers,g.genres,g.platforms].every(a=>Array.isArray(a)&&a.length<=20&&a.every(v=>typeof v==='string'&&v.length<=200))||![g.releaseDate,g.price].every(v=>v===null||typeof v==='string'&&v.length<=100))throw Error('Invalid game details.');
  return g;
}
