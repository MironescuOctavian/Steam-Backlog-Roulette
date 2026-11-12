import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameDetailsService,parseGameIds} from '../server/game-details.mjs';
import {validateGameInfo,validatePlayers} from '../src/game-details-model.ts';
import {createApp} from '../server/index.mjs';

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
