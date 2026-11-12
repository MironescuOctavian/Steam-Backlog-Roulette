const decode=text=>text.replace(/<[^>]*>/g,'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').trim();
export function parseChartPage(html){
  const rows=[];
  for(const row of html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)){
    const body=row[1];const rank=Number(body.match(/<td>\s*(\d+)\.\s*<\/td>/)?.[1]);
    const title=body.match(/href="\/app\/(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    const current=body.match(/<td class="num">\s*(\d+)\s*<\/td>/);
    if(rank&&title&&current)rows.push({appid:Number(title[1]),rank,name:decode(title[2]),concurrent_in_game:Number(current[1])});
  }
  if(rows.length!==25)throw new Error('Steam Charts page format changed.');
  return rows;
}
export function createExtendedChart({request=fetch,now=()=>Date.now()}={}){
  let cached;let pending;let retryAfter=0;
  return async()=>{
    if(now()<retryAfter){if(cached)return {...cached,stale:true};throw new Error('Extended ranking is temporarily unavailable.');}
    if(cached&&now()-Date.parse(cached.capturedAt)<3600000)return cached;
    if(!pending)pending=(async()=>{
      const pages=Array.from({length:40},(_,i)=>i+1);const results=[];
      for(let offset=0;offset<pages.length;offset+=4){
        const batch=await Promise.all(pages.slice(offset,offset+4).map(async page=>{
          const response=await request(`https://steamcharts.com/top/p.${page}`,{signal:AbortSignal.timeout(15000),redirect:'manual'});
          if(!response.ok)throw new Error('Extended player ranking unavailable.');
          return parseChartPage(await response.text());
        }));results.push(...batch.flat());
      }
      results.sort((a,b)=>a.rank-b.rank);
      if(results.length!==1000||new Set(results.map(g=>g.appid)).size!==1000||results.some((g,i)=>g.rank!==i+1))throw new Error('Extended ranking is incomplete; previous data was preserved.');
      cached={ranks:results,capturedAt:new Date(now()).toISOString()};return cached;
    })().catch(error=>{retryAfter=now()+300000;if(cached)return {...cached,stale:true};throw error;}).finally(()=>{pending=undefined;});
    return pending;
  };
}
