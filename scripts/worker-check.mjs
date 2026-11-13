import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(fs.realpathSync('node_modules/@cloudflare/vite-plugin/package.json'));
const {Miniflare}=require('miniflare');
const root=path.resolve('.cloudflare/output/v0/workers/default');
const at=Date.now();
let upstreamCalls=0;
async function upstream(request){
  upstreamCalls++;
  const url=new URL(request.url),ranks=Array.from({length:100},(_,i)=>({appid:1000+i,rank:i+1,concurrent_in_game:100000-i,peak_in_game:110000-i}));
  if(url.pathname.includes('GetGamesByConcurrentPlayers'))return Response.json({response:{last_update:Math.floor(at/1000),ranks}});
  if(url.pathname.includes('GetNumberOfCurrentPlayers'))return Response.json({response:{result:1,player_count:777}});
  if(url.pathname.includes('GetNewsForApp'))return Response.json({appnews:{newsitems:[{title:'Official update',url:'https://store.steampowered.com/news/app/70/view/1',date:Math.floor(at/1000),contents:'Fixes',tags:['patchnotes']}]}});
  if(url.pathname.includes('appdetails'))return Response.json(url.searchParams.get('filters')==='price_overview'?{70:{success:true,data:{price_overview:{final_formatted:'$4.99',initial_formatted:'$9.99',discount_percent:50}}},220:{success:true,data:[]}}:{70:{success:true,data:{short_description:'A classic game',developers:['Valve'],platforms:{windows:true},release_date:{date:'1998'},is_free:false}}});
  if(url.pathname.includes('/curator/'))return Response.json({results_html:'<div class="recommendation" data-ds-appid="70"><a href="https://store.steampowered.com/app/70/Half_Life/">Half-Life</a><div data-price-final="999"></div></div>'});
  if(url.pathname.includes('GetMostPlayedGames'))return Response.json({response:{ranks:[]}});
  if(url.pathname.includes('GetPlayerSummaries'))return Response.json({response:{players:[{steamid:'76561198000000001',communityvisibilitystate:3,personaname:'Worker QA'}]}});
  if(url.pathname.includes('GetOwnedGames'))return Response.json({response:{games:[{appid:70,name:'Half-Life',playtime_forever:90}]}});
  if(url.pathname.includes('featuredcategories'))return Response.json({new_releases:{items:[]}});
  if(url.pathname.includes('userdata.json'))return Response.json([{label:'Steam users logged in',data:[[at-300000,30000000],[at,31000000]]}]);
  if(url.pathname.includes('GetItems')){
    const ids=JSON.parse(url.searchParams.get('input_json')).ids;
    return Response.json({response:{store_items:ids.map(({appid})=>({success:1,appid,name:'Game '+appid,type:0,categories:{supported_player_categoryids:[2]},reviews:{summary_filtered:{percent_positive:95,review_count:1000}},assets:{asset_url_format:'apps/'+appid+'/${FILENAME}',header:'header.jpg'}}))}});
  }
  if(url.hostname==='steamcharts.com'&&url.pathname.startsWith('/top/p.')){
    const page=Number(url.pathname.split('.').at(-1));
    return new Response('<table>'+Array.from({length:25},(_,i)=>{const rank=(page-1)*25+i+1;return `<tr><td>${rank}.</td><td><a href="/app/${999+rank}">Game ${999+rank}</a></td><td class="num">${100001-rank}</td></tr>`;}).join('')+'</table>');
  }
  if(url.pathname.endsWith('/chart-data.json'))return Response.json([[at-3600000,100],[at,120]]);
  if(url.hostname==='steamcharts.com'&&url.pathname==='/app/70')return new Response('<span class="num">1,000</span><br>all-time peak');
  throw Error('Unexpected upstream path: '+url.pathname);
}
const runtime=new Miniflare({workers:[{config:{
  name:'steam-next',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],
  manifest:{mainModule:'index.js',modulesRoot:path.join(root,'bundle'),modules:{'index.js':{type:'esm',contents:fs.readFileSync(path.join(root,'bundle/index.js'),'utf8')}}},
  env:{ASSETS:{type:'assets'},HISTORY:{type:'kv'},STEAM_API_KEY:{type:'text',value:'test-only'}},
  assets:{directory:path.join(root,'assets'),hasUserWorker:true,notFoundHandling:'single-page-application',runWorkerFirst:['/api/*']},
},dev:{outboundService:{type:'fetcher',handler:upstream}}}]});
try{
  const home=await runtime.dispatchFetch('https://app.test/');assert.equal(home.status,200);assert.match(await home.text(),/id="app"/);
  const activity=await runtime.dispatchFetch('https://app.test/activity',{headers:{Accept:'text/html'}});assert.equal(activity.status,200);assert.match(await activity.text(),/id="app"/);
  const discovery=await runtime.dispatchFetch('https://app.test/top250',{headers:{Accept:'text/html'}});assert.equal(discovery.status,200);assert.match(await discovery.text(),/id="app"/);
  const news=await runtime.dispatchFetch('https://app.test/news',{headers:{Accept:'text/html'}});assert.equal(news.status,200);assert.match(await news.text(),/id="app"/);
  const calculator=await runtime.dispatchFetch('https://app.test/calculator',{headers:{Accept:'text/html'}});assert.equal(calculator.status,200);assert.match(await calculator.text(),/id="app"/);
  assert.equal((await runtime.dispatchFetch('https://app.test/api/activity',{method:'POST'})).status,405);
  const hero=await runtime.dispatchFetch('https://app.test/api/hero');assert.equal(hero.status,200);assert.equal((await hero.json()).games.length,25);
  const curator=await runtime.dispatchFetch('https://app.test/api/sample-curator?slot=0');assert.equal(curator.status,200);assert.equal((await curator.json()).games[0].appId,70);
  const counts=await runtime.dispatchFetch('https://app.test/api/activity');assert.equal(counts.status,200);assert.equal((await counts.json()).games.length,1000);
  const metadata=await runtime.dispatchFetch('https://app.test/api/steam/metadata?ids=70');assert.equal(metadata.status,200);assert.equal((await metadata.json())[0].appId,70);
  const history=await runtime.dispatchFetch('https://app.test/api/game-history?ids=70');assert.equal(history.status,200);assert.equal((await history.json())[0].peakAllTime,1000);
  const profile=await runtime.dispatchFetch('https://app.test/api/steam/profile?profile=76561198000000001');assert.equal(profile.status,200);assert.equal((await profile.json()).profile.name,'Worker QA');
  const details=await runtime.dispatchFetch('https://app.test/api/game-details?ids=70');assert.equal(details.status,200);assert.equal((await details.json()).playersNow,777);
  const players=await runtime.dispatchFetch('https://app.test/api/game-players?ids=70,220');assert.equal(players.status,200);assert.equal((await players.json()).length,2);
  const prices=await runtime.dispatchFetch('https://app.test/api/game-prices?ids=70,220');assert.equal(prices.status,200);const priceRows=await prices.json();assert.equal(priceRows[0].price,'$4.99');assert.equal(priceRows[1].free,true);
  const insights=await runtime.dispatchFetch('https://app.test/api/game-insights?ids=70');assert.equal(insights.status,200);const research=await insights.json();assert.equal(research.history.length,2);assert.equal(research.updates.length,1);
  assert.ok(upstreamCalls>=50,'real workerd outbound fetch paths were exercised');
  console.log('PASS: Cloudflare workerd serves routes and all Steam APIs with controlled upstream feeds, including the 1,000-game ranking.');
}finally{await runtime.dispose();}
