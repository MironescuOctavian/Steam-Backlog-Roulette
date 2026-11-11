import {fetchPublicProfile,parseProfileInput} from './steam.mjs';
import {createActivityService} from './activity.mjs';

let activity;
const profiles=new Map();
const limits=new Map();
const json=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    if(request.method!=='GET')return json(405,{error:'Use GET for this endpoint.'});
    if(url.pathname==='/api/activity'){
      // Stay within the request budget after the 40-page ranking collection and history storage.
      activity??=createActivityService({historyFile:null,metadataBatchLimit:4,historyStore:env.HISTORY?{read:async()=>await env.HISTORY.get('observations','json')??[],write:history=>env.HISTORY.put('observations',JSON.stringify(history),{expirationTtl:7*86400})}:undefined});
      try{return json(200,await activity());}catch{return json(503,{error:'Steam activity could not be refreshed. Please retry shortly.'});}
    }
    if(url.pathname!=='/api/steam/profile')return json(404,{error:'Endpoint not found.'});
    const input=url.searchParams.get('profile');let identity;
    try{identity=JSON.stringify(parseProfileInput(input));}catch(e){return json(400,{error:e.message});}
    const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')??'local';
    let limit=limits.get(ip);
    if(!limit||now-limit.at>60000){limit={at:now,count:0};if(limits.size>10000)limits.clear();limits.set(ip,limit);}
    if(++limit.count>30)return json(429,{error:'Too many lookups. Please wait a minute and try again.'});
    if(!env.STEAM_API_KEY)return json(503,{error:'Profile lookup is not configured on this server yet. You can explore the Top 250 or import a JSON library.'});
    let result=profiles.get(identity);
    if(!result||result.expires<now){
      try{result={data:await fetchPublicProfile(input,env.STEAM_API_KEY),expires:now+300000};}catch(e){return json(502,{error:e.message});}
      if(profiles.size>=500)profiles.delete(profiles.keys().next().value);profiles.set(identity,result);
    }
    return json(200,result.data);
  },
};
