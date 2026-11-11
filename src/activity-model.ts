export type ActivityGame={appId:number;title:string;rank:number|null;playersNow:number|null;peakToday:number|null;weeklyChange:number|null;reviewPercent:number|null;reviewCount:number|null;price:string|null;image?:string};
export type Observation={at:string;counts:Record<string,number>};
export type ActivityData={sampledAt:string;extendedCapturedAt?:string;games:ActivityGame[];movers:ActivityGame[];releases:ActivityGame[];acclaimed:ActivityGame[];history:Observation[];warnings:string[];stale:boolean};
const count=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export function validateActivity(value:unknown):ActivityData {
  const data=value as ActivityData;
  if(!data||!Number.isFinite(Date.parse(data.sampledAt))||typeof data.stale!=='boolean'||!Array.isArray(data.warnings)||!data.warnings.every(w=>typeof w==='string'))throw new Error('Invalid activity response.');
  if(data.extendedCapturedAt!==undefined&&!Number.isFinite(Date.parse(data.extendedCapturedAt)))throw new Error('Invalid extended ranking timestamp.');
  for(const list of [data.games,data.movers,data.releases,data.acclaimed]){
    if(!Array.isArray(list)||list.length>1000)throw new Error('Invalid activity list.');
    for(const g of list){
      if(g.image!==undefined && !/^https:\/\/shared\.(?:akamai|cloudflare|fastly)\.steamstatic\.com\/store_item_assets\//.test(g.image))throw new Error('Invalid Steam artwork URL.');
      if(!g||!count(g.appId)||g.appId<1||typeof g.title!=='string'||g.title.length>300||![g.rank,g.playersNow,g.peakToday,g.reviewCount].every(v=>v===null||count(v))||!(g.reviewPercent===null||(count(g.reviewPercent)&&g.reviewPercent<=100))||!(g.weeklyChange===null||Number.isSafeInteger(g.weeklyChange))||!(g.price===null||typeof g.price==='string'))throw new Error('Invalid activity game.');
    }
  }
  if(!Array.isArray(data.history)||data.history.length>2500||data.history.some(p=>!p||!Number.isFinite(Date.parse(p.at))||!p.counts||Object.entries(p.counts).some(([id,n])=>!/^\d+$/.test(id)||!count(n))))throw new Error('Invalid observation history.');
  return data;
}
export function sortActivity(games:ActivityGame[],sort:string):ActivityGame[]{
  return [...games].sort((a,b)=>sort==='peak'?(b.peakToday??-1)-(a.peakToday??-1):sort==='name'?a.title.localeCompare(b.title):(b.playersNow??-1)-(a.playersNow??-1));
}
export function paginationPages(total:number,current:number):(number|'…')[]{
  const pages=Array.from({length:Math.max(0,total)},(_,i)=>i+1).filter(n=>total<=7||n===1||n===total||Math.abs(n-current)<=1||current<=3&&n<=5||current>=total-2&&n>=total-4);
  return pages.flatMap((n,i)=>i&&n-pages[i-1]!>1?['…' as const,n]:[n]);
}
export function historyPath(history:Observation[],appId:number):string {
  const points=history.filter(p=>p.counts[String(appId)]!==undefined);
  if(points.length<2)return '';
  const first=Date.parse(points[0]!.at);const span=Math.max(1,Date.parse(points.at(-1)!.at)-first);
  const max=Math.max(1,...points.map(p=>p.counts[String(appId)]!));
  return points.map((p,i)=>`${i===0||Date.parse(p.at)-Date.parse(points[i-1]!.at)>900000?'M':'L'}${(20+(Date.parse(p.at)-first)/span*760).toFixed(1)},${(180-p.counts[String(appId)]!/max*155).toFixed(1)}`).join(' ');
}
