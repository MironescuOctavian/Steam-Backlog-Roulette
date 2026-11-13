export const CURATOR_SOURCES=[
  {slot:0,id:1850,name:'PC Gamer',theme:'PC hits & editor picks',url:'https://store.steampowered.com/curator/1850-PC-Gamer/',start:40},
  {slot:1,id:35411526,name:'Wholesome Games ♥',theme:'Cozy & heartfelt indies',url:'https://store.steampowered.com/curator/35411526-Wholesome-Games-%E2%99%A5/',start:30},
  {slot:2,id:4771848,name:'/r/pcmasterrace Group',theme:'Community PC favorites',url:'https://store.steampowered.com/curator/4771848-r-pcmasterrace-Group/',start:40},
  {slot:3,id:1370293,name:'Cynical Brit Gaming',theme:'Classic PC curation',url:'https://store.steampowered.com/curator/1370293-Cynical-Brit-Gaming/',start:20},
  {slot:4,id:31507748,name:'Achievement Scouts',theme:'Completionist & backlog picks',url:'https://store.steampowered.com/curator/31507748-Achievement-Scouts/',start:40},
];

function decodeEntities(text){
  return String(text||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&reg;|®/g,'®').replace(/&trade;|™/g,'™');
}

function parseRgApps(html){
  const match=html.match(/AddStoreItemDataSet\(\s*(\{[\s\S]*?\})\s*\)\s*;/);
  if(!match)return {};
  try{
    const parsed=JSON.parse(match[1]);
    return parsed&&typeof parsed.rgApps==='object'&&parsed.rgApps?parsed.rgApps:{};
  }catch{return {};}
}

export function parseCuratorHtml(html){
  const rgApps=parseRgApps(html);
  const items=[];
  const seen=new Set();
  for(const block of html.matchAll(/<div class="recommendation"[^>]*data-ds-appid="(\d+)"([\s\S]*?)(?=<div class="recommendation"|<script|$)/g)){
    const appId=Number(block[1]);
    if(!Number.isSafeInteger(appId)||appId<1||seen.has(appId))continue;
    seen.add(appId);
    const body=block[2];
    const app=rgApps[String(appId)];
    if(app?.coming_soon)continue;
    const slugMatch=body.match(new RegExp(`store\\.steampowered\\.com\\/app\\/${appId}\\/([^/?"']+)`));
    const title=decodeEntities(app?.name||(slugMatch?decodeURIComponent(slugMatch[1]).replace(/_/g,' '):'')).trim();
    if(!title)continue;
    const priceMatch=body.match(/data-price-final="(\d+)"/);
    const cents=priceMatch?Number(priceMatch[1]):null;
    const pricePaid=cents!==null&&Number.isFinite(cents)?Number((cents/100).toFixed(2)):0;
    const priceKnown=cents!==null&&Number.isFinite(cents);
    const image=typeof app?.headerv5==='string'&&app.headerv5.startsWith('https://shared.')?app.headerv5:undefined;
    items.push({appId,title,pricePaid,priceKnown,...(image?{image}:{})});
    if(items.length>=25)break;
  }
  return items;
}

export function createCuratorSampleService({fetchImpl=fetch,ttlMs=3600000}={}){
  const cache=new Map();
  return async function getCuratorSample(rawSlot){
    const slot=Number.isSafeInteger(rawSlot)&&rawSlot>=0&&rawSlot<CURATOR_SOURCES.length?rawSlot:0;
    const now=Date.now();
    const cached=cache.get(slot);
    if(cached&&cached.expires>now)return cached.data;
    const source=CURATOR_SOURCES[slot];
    const url=`https://store.steampowered.com/curator/${source.id}/ajaxgetcuratorrecommendations/render/?start=${source.start}&count=35&cc=US&l=english`;
    const response=await fetchImpl(url,{headers:{'User-Agent':'SteamNext/1.0'},signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error(`Steam curator HTTP ${response.status}`);
    const payload=await response.json();
    const games=parseCuratorHtml(typeof payload?.results_html==='string'?payload.results_html:'');
    if(!games.length)throw new Error('No released games returned by curator.');
    const data={curator:{slot:source.slot,id:source.id,name:source.name,theme:source.theme,url:source.url},games,capturedAt:new Date(now).toISOString()};
    cache.set(slot,{data,expires:now+ttlMs});
    return data;
  };
}
