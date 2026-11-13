import {extractNewsImages,steamNewsImage} from '../src/steam-news-image.ts';
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&nbsp;',' ').replaceAll('&mdash;','—').replaceAll('&ndash;','–').replaceAll('&hellip;','…').replaceAll('&rsquo;','’').replaceAll('&lsquo;','‘').replaceAll('&rdquo;','”').replaceAll('&ldquo;','“').replaceAll('&amp;','&');
function extractCapsuleImages(event){
  const out=[];
  const clan=typeof event?.clan_steamid==='string'&&/^\d+$/.test(event.clan_steamid)?Number(BigInt(event.clan_steamid)&0xffffffffn):null;
  if(!clan)return out;
  let jd={};
  try{jd=typeof event.jsondata==='string'?JSON.parse(event.jsondata):event.jsondata&&typeof event.jsondata==='object'?event.jsondata:{};}catch{}
  for(const field of ['localized_capsule_image','localized_sale_header']){
    const list=Array.isArray(jd[field])?jd[field]:[];
    for(const file of list){
      if(typeof file==='string'&&/^[a-zA-Z0-9._-]+$/.test(file)){
        const image=steamNewsImage(`https://clan.akamai.steamstatic.com/images/${clan}/${file}`);
        if(image)out.push(image);
        break;
      }
    }
  }
  return out;
}
export function parseFeatured(html){
  const match=html.match(/data-initialEvents="([^"]*)"/i);
  if(!match)throw Error('Featured feed unavailable');
  return JSON.parse(decode(match[1])).events;
}
export function createNewsService({request=fetch,now=Date.now}={}){
  const cache=new Map();
  return async section=>{
    if(!['featured','official'].includes(section))throw Error('Invalid section');
    const saved=cache.get(section);if(saved&&now()-saved.at<300000)return saved.items;
    const url=section==='featured'?'https://store.steampowered.com/news/collection/featured/?l=english':'https://store.steampowered.com/events/ajaxgetpartnereventspageable/?clan_accountid=0&appid=593110&offset=0&count=12&l=english';
    const r=await request(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('News unavailable');
    const events=section==='featured'?parseFeatured(await r.text()):(await r.json()).events;
    if(!Array.isArray(events))throw Error('Invalid feed');
    const items=events.filter(e=>/^\d+$/.test(e.gid)&&Number.isSafeInteger(e.appid)&&e.appid>0&&typeof e.event_name==='string'&&Number.isFinite(e.rtime32_start_time)).slice(0,24).map(e=>({title:e.event_name.slice(0,300),appId:e.appid,url:`https://store.steampowered.com/news/app/${e.appid}/view/${e.gid}`,date:new Date(e.rtime32_start_time*1000).toISOString()}));
    for(const item of items){
      const event=events.find(e=>e.gid===item.url.split('/').at(-1));
      const body=typeof event?.announcement_body?.body==='string'?event.announcement_body.body:'';
      item.images=[...new Set([...extractNewsImages(body),...extractCapsuleImages(event)])];
      item.summary=decode(body.replace(/\[img\][\s\S]*?\[\/img\]/gi,'').replace(/<[^>]*>/g,'').replace(/\[[^\]]*\]/g,'')).trim().slice(0,600);
    }
    cache.set(section,{at:now(),items});return items;
  };
}
