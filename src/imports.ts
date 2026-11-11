import {validateLibrary,type Game} from './library.ts';
import snapshot from './data/top250.json' with {type:'json'};
export function parseImport(text:string):Game[] {
  if(text.length>5_000_000)throw new Error('JSON must be smaller than 5 MB.');
  const data=JSON.parse(text);
  if(!Array.isArray(data) && data?.version!==1)throw new Error('Unsupported JSON format. Use a game array or version 1 export.');
  const rows=Array.isArray(data) ? data : data.games;
  if(!Array.isArray(rows))throw new Error('Expected an array of games.');
  return validateLibrary(rows.map(g=>({...g,tags:g.tags??[],playNext:g.playNext??g.status==='Play Next',status:g.status==='Play Next'?'Backlog':g.status,metadataSource:g.metadataSource??'Custom'})));
}
export function mergeLibrary(existing:Game[],incoming:Game[]):Game[] {
  const merged=new Map(existing.map(g=>[g.appId,g]));
  for(const game of incoming)merged.set(game.appId,game);
  return validateLibrary([...merged.values()]);
}
export function parseSteam(data:unknown,existing:Game[]):Game[] {
  const response=(data as {response?:{games?:unknown;game_count?:unknown}})?.response;
  if(!response || !Array.isArray(response.games))throw new Error('Steam returned no game list. Make your profile and Game details public, then check the ID and key.');
  const catalog=new Map(snapshot.games.map(g=>[g.appId,g]));
  const saved=new Map(existing.map(g=>[g.appId,g]));
  return validateLibrary(response.games.map((item:unknown)=>{
    const g=item as {appid:number;name:string;playtime_forever:number};
    if(!g || !Number.isSafeInteger(g.appid) || typeof g.name!=='string' || typeof g.playtime_forever!=='number' || !Number.isFinite(g.playtime_forever) || g.playtime_forever<0)throw new Error('Steam returned invalid game data.');
    const old=saved.get(g.appid);
    const real=old?.metadataSource!=='Demo estimates' ? old : undefined;
    const supplied=old?.metadataSource==='Custom'?old:undefined;
    const ranked=catalog.get(g.appid);
    return {appId:g.appid,title:g.name,genres:real?.genres??ranked?.genres??['Unknown'],playtimeHours:Math.round(g.playtime_forever/6)/10,
      timeToBeatHours:supplied?.timeToBeatHours??null,metacritic:supplied?.metacritic??null,pricePaid:real?.pricePaid??0,priceKnown:real ? real.priceKnown!==false : false,
      status:(old?.userManaged ? old.status : real?.status)??(g.playtime_forever===0?'Unplayed':'Backlog'),tags:old?.tags??[],playNext:old?.playNext??false,metadataSource:real?.metadataSource==='Custom'?'Custom':'Steam',...(old?.userManaged ? {userManaged:true} : {}),...(ranked ? {rank:ranked.rank,steamPositivePercent:ranked.positivePercent} : {})};
  }));
}
