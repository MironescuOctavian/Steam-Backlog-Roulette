import {extractNewsImages} from '../src/steam-news-image.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseGameHistory} from './game-history.mjs';
const plain=value=>String(value??'').replace(/\[img\][\s\S]*?\[\/img\]/gi,'').replace(/<[^>]*>/g,'').replace(/\[[^\]]*\]/g,'').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").trim();
const numeric=value=>{const text=plain(value).replaceAll(',','').replace('%','');return /^[-+]?\d+(?:\.\d+)?$/.test(text)?Number(text):null;};
export function parseMonthlyPlayers(html){
  const rows=[];
  for(const row of html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)){
    const cells=[...row[1].matchAll(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi)].map(m=>plain(m[1]));
    if(cells.length!==5||!(/^[A-Za-z]+ \d{4}$/.test(cells[0])||cells[0]==='Last 30 Days'))continue;
    const [average,gain,percent,peak]=cells.slice(1).map(numeric);if(average===null||average<0||peak===null||!Number.isSafeInteger(peak)||peak<0)continue;
    rows.push({month:cells[0],average,gain,percent,peak});if(rows.length>=240)break;
  }return rows;
}
export function createGameInsightsService({request=fetch,now=()=>Date.now(),storage,priceDirectory=path.resolve('.data/price-history')}={}){
  const cache=new Map(),pending=new Map(),prices=new Map();
  async function json(url){const r=await request(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Source unavailable');return r.json();}
  return async appId=>{
    if(!Number.isSafeInteger(appId)||appId<1)throw Error('Invalid game ID.');
    const saved=cache.get(appId);if(saved&&now()-Date.parse(saved.capturedAt)<300000)return saved;if(pending.has(appId))return pending.get(appId);
    const task=(async()=>{
      const warnings=[];
      const regions=[{country:'us',currency:'USD'},{country:'de',currency:'EUR'},{country:'gb',currency:'GBP'}];
      const [html,chart,news,quotes]=await Promise.all([
        request('https://steamcharts.com/app/'+appId,{redirect:'manual',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.text():'').catch(()=>''),
        json('https://steamcharts.com/app/'+appId+'/chart-data.json').catch(()=>[]),
        json('https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid='+appId+'&count=8&maxlength=0&feeds=steam_community_announcements').catch(()=>{warnings.push('Official news is unavailable.');return {};}),
        Promise.all(regions.map(async region=>{try{const body=await json('https://store.steampowered.com/api/appdetails?appids='+appId+'&cc='+region.country+'&l=english'),game=body[appId]?.success?body[appId].data:null;const amount=game?.is_free===true?0:game?.price_overview?.currency===region.currency?game.price_overview.final:null;return Number.isSafeInteger(amount)&&amount>=0?{currency:region.currency,amount,capturedAt:new Date(now()).toISOString()}:null;}catch{return null;}})),
      ]);
      const history=Array.isArray(chart)?chart.filter(p=>Array.isArray(p)&&p.length===2&&Number.isSafeInteger(p[0])&&p[0]>0&&p[0]<=now()+300000&&Number.isSafeInteger(p[1])&&p[1]>=0).sort((a,b)=>a[0]-b[0]).slice(-5000):[];
      if(history.length<2)warnings.push('Reported player history is unavailable.');
      const peakAllTime=parseGameHistory(appId,html,[],now()).peakAllTime;
      const peakToday=numeric(html.match(/<span class="num">\s*([\d,]+)\s*<\/span>\s*<br>\s*24-hour peak/i)?.[1]);
      let observations=prices.get(appId)??[],writable=true;
      try{const saved=storage?await storage.get('price-observations:'+appId,'json'):priceDirectory?JSON.parse(await fs.readFile(path.join(priceDirectory,appId+'.json'),'utf8')):observations;if(saved!==null&&saved!==undefined){if(!Array.isArray(saved)||saved.length>1200||saved.some(p=>!p||!['USD','EUR','GBP'].includes(p.currency)||!Number.isSafeInteger(p.amount)||p.amount<0||!Number.isFinite(Date.parse(p.capturedAt))))throw Error('Invalid observations');observations=saved;}}catch(e){if(e.code!=='ENOENT'){writable=false;warnings.push('Saved price history could not be read; it was preserved.');}}
      const current=quotes.filter(Boolean);
      for(const quote of current){const prior=observations.filter(p=>p.currency===quote.currency).at(-1);if(!prior||prior.amount!==quote.amount||prior.capturedAt.slice(0,10)!==quote.capturedAt.slice(0,10))observations=[...observations,quote];}
      observations=observations.slice(-1200);if(prices.size>=100)prices.clear();prices.set(appId,observations);
      if(writable&&current.length){try{if(storage)await storage.put('price-observations:'+appId,JSON.stringify(observations));else if(priceDirectory){await fs.mkdir(priceDirectory,{recursive:true});const file=path.join(priceDirectory,appId+'.json');await fs.writeFile(file+'.tmp',JSON.stringify(observations));await fs.rename(file+'.tmp',file);}}catch{warnings.push('New price observations could not be saved.');}}
      const updates=(Array.isArray(news.appnews?.newsitems)?news.appnews.newsitems:[]).filter(n=>{try{const u=new URL(n.url);return u.protocol==='https:'&&['store.steampowered.com','steamcommunity.com','steamstore-a.akamaihd.net'].includes(u.hostname)&&Number.isSafeInteger(n.date)&&n.date>0&&typeof n.title==='string';}catch{return false;}}).slice(0,8).map(n=>({title:plain(n.title).slice(0,300),url:n.url,date:new Date(n.date*1000).toISOString(),summary:plain(n.contents).slice(0,1800),images:extractNewsImages(n.contents),patch: Array.isArray(n.tags)&&n.tags.includes('patchnotes')}));
      const data={appId,capturedAt:new Date(now()).toISOString(),history,peakToday:Number.isSafeInteger(peakToday)?peakToday:null,peakAllTime,monthly:parseMonthlyPlayers(html),prices:observations,currentPrices:current,updates,warnings};
      if(cache.size>=100)cache.clear();cache.set(appId,data);return data;
    })().finally(()=>pending.delete(appId));pending.set(appId,task);return task;
  };
}
