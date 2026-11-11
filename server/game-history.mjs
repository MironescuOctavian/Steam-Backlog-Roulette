import {parseMetadataIds} from './metadata.mjs';
export function parseHistoryIds(input){const ids=parseMetadataIds(input);if(ids.length>8)throw Error('Request at most eight games.');return ids;}
export function parseSteamOnline(body){
  const series=Array.isArray(body)?body.find(s=>s?.label==='Steam users logged in'):null;
  if(!Array.isArray(series?.data)||series.data.length<2||series.data.length>3000)throw Error('Steam online history unavailable.');
  const samples=series.data.filter(p=>Array.isArray(p)&&p.length===2&&Number.isSafeInteger(p[0])&&p[0]>0&&Number.isSafeInteger(p[1])&&p[1]>=0).sort((a,b)=>a[0]-b[0]);
  if(samples.length<2)throw Error('Invalid Steam online history.');return {sampledAt:new Date(samples.at(-1)[0]).toISOString(),samples};
}
export function parseGameHistory(appId,html,chart,now=Date.now()){
  const peak=html.match(/<span class="num">\s*([\d,]+)\s*<\/span>\s*<br>\s*all-time peak/i)?.[1];
  const peakAllTime=peak===undefined?null:Number(peak.replaceAll(',',''));
  if(!Array.isArray(chart))throw Error('Game history unavailable.');
  const samples=chart.filter(p=>Array.isArray(p)&&p.length===2&&Number.isSafeInteger(p[0])&&p[0]>=now-7*86400000&&p[0]<=now+300000&&Number.isSafeInteger(p[1])&&p[1]>=0).sort((a,b)=>a[0]-b[0]).slice(-336);
  return {appId,peakAllTime:Number.isSafeInteger(peakAllTime)?peakAllTime:null,samples,capturedAt:new Date(now).toISOString(),unavailable:false};
}
export function createGameHistoryService({request=fetch,now=()=>Date.now(),storage}={}){
  const cache=new Map(),pending=new Map();
  async function get(appId){
    if(cache.has(appId)&&cache.get(appId).expires>now())return cache.get(appId).data;
    if(pending.has(appId))return pending.get(appId);
    const task=(async()=>{
      if(storage){try{const saved=await storage.get('game-history:'+appId,'json');if(saved?.appId===appId&&Date.parse(saved.capturedAt)>now()-3600000&&Array.isArray(saved.samples)&&saved.samples.length<=336){cache.set(appId,{expires:Date.parse(saved.capturedAt)+3600000,data:saved});return saved;}}catch{}}
      let data;
      try{const [page,chart]=await Promise.all([request('https://steamcharts.com/app/'+appId,{signal:AbortSignal.timeout(15000),redirect:'error'}),request('https://steamcharts.com/app/'+appId+'/chart-data.json',{signal:AbortSignal.timeout(15000),redirect:'error'})]);
        if(!page.ok||!chart.ok)throw Error('unavailable');data=parseGameHistory(appId,await page.text(),await chart.json(),now());
      }catch{data={appId,peakAllTime:null,samples:[],capturedAt:new Date(now()).toISOString(),unavailable:true};}
      if(cache.size>2000)cache.clear();cache.set(appId,{expires:now()+(data.unavailable?300000:3600000),data});
      if(storage&&!data.unavailable){try{await storage.put('game-history:'+appId,JSON.stringify(data),{expirationTtl:3600});}catch{}}
      return data;
    })().finally(()=>pending.delete(appId));pending.set(appId,task);return task;
  }
  return ids=>Promise.all(ids.map(get));
}
