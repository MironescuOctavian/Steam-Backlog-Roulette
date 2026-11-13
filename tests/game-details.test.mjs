import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameDetailsService,parseGameIds,steamMicrotrailer} from '../server/game-details.mjs';
import {validateGameInfo,validatePlayers,validatePrices} from '../src/game-details-model.ts';
import {createApp} from '../server/index.mjs';

test('microtrailers use game-specific Steam CDN paths and reject unrelated URLs',()=>{
  assert.equal(steamMicrotrailer([{dash_h264:'https://video.akamai.steamstatic.com/store_trailers/620/abc/dash_h264.mpd?t=1'}]),'https://video.akamai.steamstatic.com/store_trailers/620/abc/microtrailer.webm?t=1');
  assert.equal(steamMicrotrailer([{webm:{max:'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/123/movie_max.webm'}}]),'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/123/microtrailer.webm');
  for(const raw of ['https://evil.test/movie_max.webm','http://video.akamai.steamstatic.com/store_trailers/1/microtrailer.webm','https://video.akamai.steamstatic.com/a/full-trailer.mp4'])assert.equal(steamMicrotrailer([{dash_h264:raw}]),null);
  assert.equal(steamMicrotrailer(undefined),null);
});

test('game details combine real player counts and store fields, cache requests and reject invalid IDs',async()=>{
  assert.deepEqual(parseGameIds('70,70,220'),[70,220]);assert.throws(()=>parseGameIds(Array.from({length:25},(_,i)=>i+1).join(',')));assert.throws(()=>parseGameIds('https://evil.test'));
  let calls=0;const service=createGameDetailsService({request:async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return {ok:true,json:async()=>String(url).includes('GetNumberOfCurrentPlayers')?{response:{result:1,player_count:0}}:{70:{success:true,data:{short_description:'A <b>classic</b> game',developers:['Valve'],genres:[{description:'Action'}],platforms:{windows:true},release_date:{date:'19 Nov, 1998'},price_overview:{final_formatted:'$9.99'}}}}};}});
  const game=await service.game(70);assert.equal(validateGameInfo(game).playersNow,0);assert.equal(game.description,'A classic game');assert.deepEqual(game.platforms,['windows']);assert.equal(game.price,'$9.99');await service.game(70);await service.players([70]);assert.equal(calls,2);
  assert.throws(()=>validatePlayers([{appId:70,playersNow:-1,capturedAt:new Date().toISOString()}]));assert.throws(()=>validateGameInfo({...game,developers:['x'.repeat(201)]}));
});
test('unavailable Steam data is unknown, not zero or invented metadata',async()=>{
  const service=createGameDetailsService({request:async()=>({ok:false})});const game=await service.game(70);assert.equal(game.playersNow,null);assert.equal(game.price,null);assert.equal(game.available,false);assert.deepEqual(game.developers,[]);validateGameInfo(game);
});
test('game endpoints validate request sizes and serve details independently of profile credentials',async()=>{
  const service=createGameDetailsService({request:async()=>({ok:false})});const server=createApp({key:'',gameDetails:service});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const root='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(root+'/api/game-details?ids=70,220')).status,400);assert.equal((await fetch(root+'/api/game-players?ids=70',{method:'POST'})).status,405);assert.equal((await fetch(root+'/api/game-details?ids=70')).status,200);assert.equal((await (await fetch(root+'/api/game-players?ids=70')).json())[0].playersNow,null);}finally{await new Promise(resolve=>server.close(resolve));}
});
test('prices come from Steam store data: discounts, free games and unknown stay distinct and are cached',async()=>{
  let calls=0;const service=createGameDetailsService({request:async url=>{calls++;assert.match(String(url),/filters=price_overview/);return {ok:true,json:async()=>({
    70:{success:true,data:{price_overview:{final_formatted:'$4.99',initial_formatted:'$9.99',discount_percent:50}}},
    220:{success:true,data:{price_overview:{final_formatted:'$9.99',initial_formatted:'$9.99',discount_percent:0}}},
    730:{success:true,data:[]},
    999:{success:false},
  })};}});
  const prices=validatePrices(await service.prices([70,220,730,999]));
  assert.deepEqual(prices[0],{appId:70,price:'$4.99',initial:'$9.99',discountPercent:50,free:false});
  assert.deepEqual(prices[1],{appId:220,price:'$9.99',initial:null,discountPercent:0,free:false});
  assert.deepEqual(prices[2],{appId:730,price:null,initial:null,discountPercent:0,free:true});
  assert.deepEqual(prices[3],{appId:999,price:null,initial:null,discountPercent:0,free:false});
  await service.prices([70,220,730]);assert.equal(calls,1);
  assert.throws(()=>validatePrices([{appId:70,price:'$1',initial:null,discountPercent:101,free:false}]));
  assert.throws(()=>validatePrices([{appId:70,price:'x'.repeat(41),initial:null,discountPercent:0,free:false}]));
});
test('unavailable Steam prices are unknown, never free or zero, and the endpoint validates input',async()=>{
  const service=createGameDetailsService({request:async()=>({ok:false})});
  assert.deepEqual(await service.prices([70]),[{appId:70,price:null,initial:null,discountPercent:0,free:false}]);
  const server=createApp({key:'',gameDetails:service});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const root='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(root+'/api/game-prices?ids=bad')).status,400);assert.equal((await fetch(root+'/api/game-prices?ids=70',{method:'POST'})).status,405);const ok=await fetch(root+'/api/game-prices?ids=70');assert.equal(ok.status,200);assert.equal((await ok.json())[0].price,null);}finally{await new Promise(resolve=>server.close(resolve));}
});
