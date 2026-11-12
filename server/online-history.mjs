import fs from 'node:fs/promises';
import path from 'node:path';
const hour=3600000,day=24*hour;
export function mergeOnlineHistory(saved,incoming,now=Date.now()){
  const samples=new Map();
  for(const [at,count] of [...saved,...incoming])if(at<=now+300000)samples.set(at,count);
  const latest=Math.max(0,...samples.keys()),buckets=new Map();
  for(const [at,count] of samples){const interval=at>=latest-2*day?1:at>=latest-60*day?hour:day,key=interval+':'+Math.floor(at/interval),old=buckets.get(key);if(!old||count>old[1])buckets.set(key,[at,count]);}
  return [...buckets.values()].sort((a,b)=>a[0]-b[0]).slice(-20000);
}
export function createOnlineHistory({file=null,storage,now=()=>Date.now()}={}){
  let retained=[];
  return async feed=>{
    const warnings=[];let saved=retained,writable=true;
    try{const value=storage?await storage.read():file?JSON.parse(await fs.readFile(file,'utf8')):retained;if(value!==null&&value!==undefined){if(!Array.isArray(value)||value.length>20000||value.some(p=>!Array.isArray(p)||p.length!==2||!Number.isSafeInteger(p[0])||p[0]<1||p[0]>now()+300000||!Number.isSafeInteger(p[1])||p[1]<0))throw Error('Invalid archive');saved=value;}}
    catch(e){if(e.code!=='ENOENT'){writable=false;warnings.push('Saved Steam online-user history could not be read; existing data was preserved.');}}
    retained=mergeOnlineHistory(saved,feed?.samples??[],now());
    if(writable&&feed&&JSON.stringify(retained)!==JSON.stringify(saved))try{
      if(storage)await storage.write(retained);else if(file){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(retained));await fs.rename(file+'.tmp',file);}
    }catch{warnings.push('New Steam online-user history could not be saved.');}
    return {online:retained.length>=2?{sampledAt:new Date(retained.at(-1)[0]).toISOString(),samples:retained}:undefined,warnings};
  };
}
