import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fetchPublicProfile,parseProfileInput} from './steam.mjs';
import {createActivityService} from './activity.mjs';

export function createApp({key=process.env.STEAM_API_KEY,lookup=fetchPublicProfile,activity=createActivityService(),root=path.resolve('dist')}={}) {
  const cache=new Map();const limits=new Map();
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/activity'){
        if(req.method!=='GET')return send(405,{error:'Use GET for activity data.'});
        try{return send(200,await activity());}catch{return send(503,{error:'Steam activity could not be refreshed. Please retry shortly.'});}
      }
      if(url.pathname==='/api/steam/profile'){
        if(req.method!=='GET')return send(405,{error:'Use GET for profile lookup.'});
        const input=url.searchParams.get('profile');
        try{parseProfileInput(input);}catch(e){return send(400,{error:e.message});}
        const ip=req.socket.remoteAddress;const now=Date.now();
        let limit=limits.get(ip);if(!limit||now-limit.time>60000){limit={time:now,count:0};if(limits.size>10000)limits.clear();limits.set(ip,limit);}
        if(++limit.count>30)return send(429,{error:'Too many lookups. Please wait a minute and try again.'});
        if(!key)return send(503,{error:'Profile lookup is not configured on this server yet. You can explore the Top 250 or import a JSON library.'});
        const identity=JSON.stringify(parseProfileInput(input));
        let result=cache.get(identity);
        if(!result||result.expires<now){
          try{result={data:await lookup(input,key),expires:now+300000};}catch(e){return send(502,{error:e.message});}
          if(cache.size>=500)cache.delete(cache.keys().next().value);cache.set(identity,result);
        }
        return send(200,result.data);
      }
      if(url.pathname.startsWith('/api/'))return send(404,{error:'Endpoint not found.'});
      if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed.'});
      const requested=decodeURIComponent(url.pathname)==='/'?'/index.html':decodeURIComponent(url.pathname);
      let file=path.resolve(root,'.'+requested);
      if(!file.startsWith(root+path.sep))return send(403,{error:'Forbidden.'});
      let content;
      try{content=await fs.readFile(file);}catch(error){
        if(error.code==='ENOENT'&&!path.extname(requested)&&req.headers.accept?.includes('text/html')){file=path.join(root,'index.html');content=await fs.readFile(file);}
        else throw error;
      }
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]??'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
    }catch{send(404,{error:'Not found.'});}
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const port=Number(process.env.PORT??8787);
  createApp().listen(port,process.env.HOST??'127.0.0.1',()=>console.log(`Backlog Roulette: http://localhost:${port}`));
}
