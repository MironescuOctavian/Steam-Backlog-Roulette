import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameInsightsService,parseMonthlyPlayers} from '../server/game-insights.mjs';
import {validateInsights} from '../src/game-insights-model.ts';
const html='<span class="num">900</span><br>24-hour peak<span class="num">1,200</span><br>all-time peak<table><tr><td class="month-cell">October 2026</td><td>123.45</td><td>-12.5</td><td>-9.19%</td><td>500</td></tr><tr><td>broken</td><td>0</td></tr></table>';
test('monthly player breakdown keeps source averages, signed gains and peaks',()=>{
  assert.deepEqual(parseMonthlyPlayers(html),[{month:'October 2026',average:123.45,gain:-12.5,percent:-9.19,peak:500}]);assert.deepEqual(parseMonthlyPlayers('<html>offline'),[]);
});
test('insights preserve reported history, official news and observed prices without inventing historical lows',async()=>{
  let at=Date.parse('2026-11-12T00:00:00Z'),stored=null,amount=999,calls=0;
  const service=createGameInsightsService({now:()=>at,priceDirectory:null,storage:{get:async()=>stored,put:async(_key,value)=>{stored=JSON.parse(value);}},request:async(input,options)=>{
    calls++;assert.equal(options.redirect,'manual');const u=new URL(input);
    if(u.pathname.endsWith('chart-data.json'))return Response.json([[at-3600000,100],[at,200]]);
    if(u.pathname.includes('GetNewsForApp')){assert.equal(u.searchParams.get('maxlength'),'0');return Response.json({appnews:{newsitems:[{title:'Update',url:'https://store.steampowered.com/news/app/70/view/1',date:Math.floor(at/1000),contents:'[img]{STEAM_CLAN_IMAGE}/1/update.jpg[/img]<b>Fixes</b>',tags:['patchnotes']},{title:'Unsafe',url:'javascript:bad',date:Math.floor(at/1000)}]}});}
    if(u.pathname.includes('appdetails'))return Response.json({70:{success:true,data:{price_overview:{currency:u.searchParams.get('cc')==='de'?'EUR':u.searchParams.get('cc')==='gb'?'GBP':'USD',final:amount}}}});
    return new Response(html);
  }});
  const first=validateInsights(await service(70));assert.equal(first.peakToday,900);assert.equal(first.peakAllTime,1200);assert.equal(first.history.length,2);assert.equal(first.updates.length,1);assert.equal(first.updates[0].patch,true);assert.equal(first.updates[0].images[0],'https://clan.akamai.steamstatic.com/images/1/update.jpg');assert.equal(first.updates[0].summary,'Fixes');assert.equal(first.prices.length,3);assert.equal(first.prices[0].amount,999);
  assert.throws(()=>validateInsights({...first,updates:[{...first.updates[0],images:['https://evil.test/tracker']}]}));
  const initial=calls;await service(70);assert.equal(calls,initial);
  at+=86400000;amount=499;const second=await service(70);assert.equal(second.prices.length,6);assert.equal(Math.min(...second.prices.filter(p=>p.currency==='USD').map(p=>p.amount)),499);
  assert.throws(()=>validateInsights({...second,updates:[{...second.updates[0],url:'https://evil.test'}]}));
});
test('missing sources stay unavailable and unreadable price history is not overwritten',async()=>{
  let writes=0;const service=createGameInsightsService({priceDirectory:null,storage:{get:async()=>({broken:true}),put:async()=>{writes++;}},request:async()=>new Response('',{status:503})});const data=validateInsights(await service(70));assert.equal(data.history.length,0);assert.equal(data.peakAllTime,null);assert.equal(data.prices.length,0);assert.equal(writes,0);assert.ok(data.warnings.some(w=>w.includes('preserved')));
});
