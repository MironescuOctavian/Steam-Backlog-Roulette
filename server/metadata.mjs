export function parseMetadataIds(input){
  if(typeof input!=='string'||!/^\d+(?:,\d+){0,49}$/.test(input))throw Error('Provide up to 50 Steam app IDs.');
  const ids=[...new Set(input.split(',').map(Number))];if(ids.some(id=>!Number.isSafeInteger(id)||id<1))throw Error('Invalid Steam app ID.');return ids;
}
export function createMetadataService({request=fetch,now=()=>Date.now()}={}){
  const cache=new Map();
  return async ids=>{
    const missing=ids.filter(id=>!cache.has(id)||cache.get(id).expires<now());
    if(missing.length){
      const input={ids:missing.map(appid=>({appid})),context:{language:'english',country_code:'US'},data_request:{include_basic_info:true,include_assets:true}};
      const response=await request('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json='+encodeURIComponent(JSON.stringify(input)),{signal:AbortSignal.timeout(15000),redirect:'error'});
      if(!response.ok)throw Error('Steam game details are unavailable.');
      const data=await response.json();if(!Array.isArray(data.response?.store_items))throw Error('Invalid Steam game details.');
      for(const item of data.response.store_items){if(item.success!==1)continue;const appId=item.appid??item.id;if(!ids.includes(appId))continue;const flags=item.categories?.supported_player_categoryids,asset=item.assets;
        const image=asset?.asset_url_format&&asset?.header?'https://shared.akamai.steamstatic.com/store_item_assets/'+asset.asset_url_format.replace('${FILENAME}',asset.header):undefined;
        if(cache.size>20000)cache.clear();cache.set(appId,{expires:now()+86400000,data:{appId,title:item.name,appType:item.type===0?'game':item.type===1?'demo':item.type===6?'software':'other',multiplayerOnly:Array.isArray(flags)&&flags.includes(1)&&!flags.includes(2),...(image?{image}:{})}});
      }
    }
    return ids.flatMap(id=>cache.has(id)?[cache.get(id).data]:[]);
  };
}
