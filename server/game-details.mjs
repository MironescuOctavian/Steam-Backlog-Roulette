import {parseMetadataIds} from './metadata.mjs';
export function parseGameIds(value){const ids=parseMetadataIds(value);if(ids.length>24)throw Error('Provide up to 24 game IDs.');return ids;}
export function createGameDetailsService({request=fetch,now=()=>Date.now()}={}){
  const counts=new Map(),details=new Map(),pending=new Map(),priceCache=new Map();
  async function json(url){const response=await request(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Steam is unavailable.');return response.json();}
  async function player(appId){
    const saved=counts.get(appId);if(saved&&now()-Date.parse(saved.capturedAt)<300000)return saved;
    const key='players:'+appId;if(pending.has(key))return pending.get(key);
    const promise=(async()=>{let playersNow=null;try{const body=await json('https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid='+appId);if(body.response?.result===1&&Number.isSafeInteger(body.response.player_count)&&body.response.player_count>=0)playersNow=body.response.player_count;}catch{}
      const data={appId,playersNow,capturedAt:new Date(now()).toISOString()};if(counts.size>=20000)counts.clear();counts.set(appId,data);return data;
    })().finally(()=>pending.delete(key));pending.set(key,promise);return promise;
  }
  async function game(appId){
    const saved=details.get(appId);if(saved&&now()-Date.parse(saved.capturedAt)<300000)return saved;
    const key='details:'+appId;if(pending.has(key))return pending.get(key);
    const promise=(async()=>{
      const [current,store]=await Promise.all([player(appId),json('https://store.steampowered.com/api/appdetails?appids='+appId+'&cc=us&l=english').then(body=>body[appId]?.success?body[appId].data:null).catch(()=>null)]);
      const strings=value=>Array.isArray(value)?value.filter(v=>typeof v==='string').slice(0,20).map(v=>v.slice(0,200)):[];
      const data={...current,description:typeof store?.short_description==='string'?store.short_description.replace(/<[^>]*>/g,'').slice(0,3000):'',developers:strings(store?.developers),publishers:strings(store?.publishers),genres:strings(store?.genres?.map(g=>g.description)),platforms:['windows','mac','linux'].filter(p=>store?.platforms?.[p]===true),releaseDate:typeof store?.release_date?.date==='string'?store.release_date.date.slice(0,100):null,price:store?.is_free===true?'Free to play':typeof store?.price_overview?.final_formatted==='string'?store.price_overview.final_formatted.slice(0,100):null,available:Boolean(store)};
      if(details.size>=5000)details.clear();details.set(appId,data);return data;
    })().finally(()=>pending.delete(key));pending.set(key,promise);return promise;
  }
  async function prices(ids){
    const missing=ids.filter(id=>!(priceCache.get(id)&&now()-priceCache.get(id).at<1800000));
    for(let i=0;i<missing.length;i+=24){
      const batch=missing.slice(i,i+24);let body={};
      try{body=await json('https://store.steampowered.com/api/appdetails?appids='+batch.join(',')+'&filters=price_overview&cc=us&l=english');}catch{}
      for(const id of batch){
        const entry=body[id];if(entry?.success!==true)continue;
        const p=entry.data?.price_overview,discount=Number.isInteger(p?.discount_percent)&&p.discount_percent>=0&&p.discount_percent<=100?p.discount_percent:0;
        // Steam returns an empty data array for free games when only price_overview is requested.
        const data=typeof p?.final_formatted==='string'?{appId:id,price:p.final_formatted.slice(0,40),initial:discount>0&&typeof p.initial_formatted==='string'?p.initial_formatted.slice(0,40):null,discountPercent:discount,free:false}:{appId:id,price:null,initial:null,discountPercent:0,free:Array.isArray(entry.data)};
        if(priceCache.size>=20000)priceCache.clear();priceCache.set(id,{at:now(),data});
      }
    }
    return ids.map(id=>priceCache.get(id)?.data??{appId:id,price:null,initial:null,discountPercent:0,free:false});
  }
  return {game,prices,players:async ids=>{const result=[];for(let i=0;i<ids.length;i+=4)result.push(...await Promise.all(ids.slice(i,i+4).map(player)));return result;}};
}
