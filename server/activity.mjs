import fs from 'node:fs/promises';
import path from 'node:path';
import {validateActivity} from '../src/activity-model.ts';
import {createExtendedChart} from './extended-chart.mjs';

export function createActivityService({request=fetch,historyFile=path.resolve('.data/activity-history.json'),historyStore,metadataBatchLimit=Infinity,now=()=>Date.now(),extended=createExtendedChart({request,now})}={}) {
  let cached;let expires=0;let pending;
  const metadata=new Map();
  async function json(url){const response=await request(url,{signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw new Error('Steam feed unavailable.');return response.json();}
  async function collect(){
    const warnings=[];
    const [live,weekly,featured,wider]=await Promise.all([
      json('https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/'),
      json('https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/').catch(()=>{warnings.push('Weekly rank changes are unavailable.');return {}; }),
      json('https://store.steampowered.com/api/featuredcategories/?cc=us&l=english').catch(()=>{warnings.push('New-release lists are unavailable.');return {}; }),
      extended(),
    ]);
    if(!Array.isArray(live.response?.ranks)||!live.response.ranks.length)throw new Error('Steam player activity is unavailable.');
    if(wider.stale)warnings.push('The extended ranking could not refresh. Its last successful capture is shown.');
    const official=live.response.ranks.slice(0,100);
    const combined=new Map(wider.ranks.map(g=>[g.appid,g]));
    for(const game of official)combined.set(game.appid,{...combined.get(game.appid),...game});
    const ranks=[...combined.values()].sort((a,b)=>b.concurrent_in_game-a.concurrent_in_game).slice(0,1000).map((g,i)=>({...g,rank:i+1}));
    const weeklyRanks=Array.isArray(weekly.response?.ranks)?weekly.response.ranks:[];
    const releases=Array.isArray(featured.new_releases?.items)?featured.new_releases.items.filter(g=>g.type===0).slice(0,30):[];
    const ids=[...new Set([...ranks,...weeklyRanks].map(g=>g.appid).concat(releases.map(g=>g.id)))].filter(id=>Number.isSafeInteger(id)&&id>0);
    for(const [id,entry] of metadata)if(now()-entry.at>=3600000)metadata.delete(id);
    const details=new Map([...metadata].map(([id,entry])=>[id,entry.item]));
    const missing=ids.filter(id=>!details.has(id));
    if(missing.length>metadataBatchLimit*50)warnings.push('Some review details are unavailable during this refresh; reported player counts are still shown.');
    for(let i=0;i<Math.min(missing.length,metadataBatchLimit*50);i+=50){
      const input={ids:missing.slice(i,i+50).map(appid=>({appid})),context:{language:'english',country_code:'US'},data_request:{include_basic_info:true,include_reviews:true,include_assets:true}};
      try{const result=await json('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json='+encodeURIComponent(JSON.stringify(input)));for(const item of result.response?.store_items??[])if(item.success===1){details.set(item.appid??item.id,item);metadata.set(item.appid??item.id,{at:now(),item});}}
      catch{warnings.push('Some game names or reviews are unavailable.');break;}
    }
    const liveById=new Map(ranks.map(g=>[g.appid,g]));const weeklyById=new Map(weeklyRanks.map(g=>[g.appid,g]));
    const game=(id,release)=>{
      const item=details.get(id);const current=liveById.get(id);const week=weeklyById.get(id);const review=item?.reviews?.summary_filtered;
      const asset=item?.assets;
      const image=asset?.asset_url_format&&asset?.header?'https://shared.akamai.steamstatic.com/store_item_assets/'+asset.asset_url_format.replace('${FILENAME}',asset.header):release?.header_image;
      const price=release&&typeof release.final_price==='number'&&release.currency?new Intl.NumberFormat('en-US',{style:'currency',currency:release.currency}).format(release.final_price/100):null;
      return {appId:id,title:item?.name??current?.name??release?.name??`Steam app ${id}`,rank:current?.rank??null,playersNow:current?.concurrent_in_game??null,peakToday:current?.peak_in_game??null,weeklyChange:week&&week.last_week_rank>0?week.last_week_rank-week.rank:null,reviewPercent:review?.percent_positive??null,reviewCount:review?.review_count??null,price,...(image?{image}:{})};
    };
    const games=ranks.map(g=>game(g.appid));
    const releaseGames=releases.map(g=>game(g.id,g));
    const timestamp=Number(live.response.last_update)*1000;
    const sampledAt=new Date(Number.isFinite(timestamp)&&timestamp>0?timestamp:now()).toISOString();
    let history=[];let writable=true;
    if(historyFile||historyStore){
      try{const saved=historyStore?await historyStore.read():JSON.parse(await fs.readFile(historyFile,'utf8'));history=validateActivity({sampledAt,games:[],movers:[],releases:[],acclaimed:[],history:saved,warnings:[],stale:false}).history;}
      catch(e){if(e.code!=='ENOENT'){writable=false;warnings.push('Observation history is unavailable; existing history was preserved.');}}
    }
    history=history.filter(p=>Date.parse(p.at)>=now()-7*86400000);
    if(!history.length||Date.parse(sampledAt)-Date.parse(history.at(-1).at)>=240000)history.push({at:sampledAt,counts:Object.fromEntries(official.map(g=>[g.appid,g.concurrent_in_game]))});
    history=history.slice(-2016);
    const reviewPool=[...new Map([...games,...releaseGames].map(g=>[g.appId,g])).values()];
    const data=validateActivity({sampledAt,extendedCapturedAt:wider.capturedAt,games,movers:weeklyRanks.filter(g=>g.last_week_rank>g.rank).map(g=>game(g.appid)).sort((a,b)=>b.weeklyChange-a.weeklyChange),releases:releaseGames,acclaimed:reviewPool.filter(g=>g.reviewCount>=50&&g.reviewPercent!==null).sort((a,b)=>b.reviewPercent-a.reviewPercent||b.reviewCount-a.reviewCount).slice(0,100),history,warnings,stale:false});
    if((historyFile||historyStore)&&writable){try{if(historyStore)await historyStore.write(history);else{await fs.mkdir(path.dirname(historyFile),{recursive:true});await fs.writeFile(historyFile+'.tmp',JSON.stringify(history));await fs.rename(historyFile+'.tmp',historyFile);}}catch{data.warnings.push('New observation history could not be saved.');}}
    cached=data;expires=now()+300000;return data;
  }
  return async()=>{
    if(cached&&now()<expires)return cached;
    if(!pending)pending=collect().catch(()=>{if(cached)return {...cached,stale:true,warnings:[...cached.warnings,'Steam could not refresh activity. Showing the last successful observation.']};throw new Error('Steam activity is unavailable. Please retry shortly.');}).finally(()=>{pending=undefined;});
    return pending;
  };
}
