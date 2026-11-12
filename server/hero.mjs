import {createMetadataService} from './metadata.mjs';
export function createHeroService({request=fetch,metadata=createMetadataService({request}),now=()=>Date.now()}={}){
  let cached,pending;
  return async()=>{
    if(cached&&now()-cached.at<300000)return cached.data;
    if(!pending)pending=(async()=>{
      const response=await request('https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/',{signal:AbortSignal.timeout(15000),redirect:'manual'});if(!response.ok)throw Error('Steam is unavailable.');
      const body=await response.json(),ranks=body.response?.ranks?.slice(0,25);if(!Array.isArray(ranks)||ranks.length<4)throw Error('Steam ranking unavailable.');
      const details=new Map((await metadata(ranks.map(g=>g.appid))).map(g=>[g.appId,g]));
      const data={sampledAt:new Date(Number(body.response.last_update)*1000||now()).toISOString(),games:ranks.map((g,i)=>({appId:g.appid,title:details.get(g.appid)?.title??`Steam app ${g.appid}`,rank:i+1,playersNow:g.concurrent_in_game,image:details.get(g.appid)?.image})).filter(g=>g.image)};
      if(data.games.length!==25)throw Error('Steam artwork unavailable.');cached={at:now(),data};return data;
    })().finally(()=>{pending=undefined;});return pending;
  };
}
