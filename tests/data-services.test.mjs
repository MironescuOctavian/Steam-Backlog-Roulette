import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMetadataService,parseMetadataIds} from '../server/metadata.mjs';
import {createGameHistoryService,parseGameHistory,parseSteamOnline,parseHistoryIds} from '../server/game-history.mjs';
import {nearestSample,seriesPath,validateGameHistories} from '../src/charts.ts';
test('chart inspection selects actual nearest samples without inventing values',()=>{
  const points=[[1000,10],[2000,30],[10000,5]];
  assert.equal(nearestSample([],123),undefined);
  assert.equal(nearestSample(points,-1),points[0]);
  assert.equal(nearestSample(points,99999),points[2]);
  assert.equal(nearestSample(points,2000),points[1]);
  assert.equal(nearestSample(points,1600),points[1]);
  assert.equal(nearestSample(points,1500),points[0]);
  assert.deepEqual(points,[[1000,10],[2000,30],[10000,5]]);
});
import {createHeroService} from '../server/hero.mjs';
test('metadata validates IDs, classifies Steam flags and caches responses',async()=>{
  assert.deepEqual(parseMetadataIds('70,70,220'),[70,220]);assert.throws(()=>parseMetadataIds('https://evil.test'));assert.throws(()=>parseHistoryIds('1,2,3,4,5,6,7,8,9'));
  let calls=0;const service=createMetadataService({request:async()=>{calls++;return {ok:true,json:async()=>({response:{store_items:[{success:1,appid:70,name:'Test',type:0,categories:{supported_player_categoryids:[1]}},{success:1,appid:220,name:'Software',type:6}]}})};}});
  const result=await service([70,220]);assert.equal(result[0].multiplayerOnly,true);assert.equal(result[1].appType,'software');await service([70]);assert.equal(calls,1);
});
test('history keeps source-reported all-time peak and actual timestamped samples',()=>{
  const now=Date.parse('2026-11-11T12:00:00Z'),history=parseGameHistory(70,'<span class="num">1,234</span><br>all-time peak',[[now-3600000,10],[now,20],[now-10*86400000,999]],now);
  assert.equal(history.peakAllTime,1234);assert.equal(history.samples.length,2);assert.equal(validateGameHistories([history]).length,1);assert.match(seriesPath(history.samples),/^M/);
  assert.equal(seriesPath([[now,10]]),'');assert.throws(()=>validateGameHistories([{...history,peakAllTime:-1}]));
  const monthly=[[now-31*86400000,10],[now,20]];assert.equal((seriesPath(monthly).match(/M/g)??[]).length,2);assert.equal((seriesPath(monthly,100,30,35*86400000).match(/L/g)??[]).length,1);
  const online=parseSteamOnline([{label:'Steam users logged in',data:[[now-300000,100],[now,200]]}]);assert.equal(online.samples.at(-1)[1],200);assert.throws(()=>parseSteamOnline([]));
});
test('unavailable history stays unknown and is cached without fake points',async()=>{
  let calls=0;const service=createGameHistoryService({request:async()=>{calls++;return {ok:false};}});
  const [a,b]=await Promise.all([service([70]),service([70])]);assert.deepEqual(a,b);assert.equal(a[0].peakAllTime,null);assert.deepEqual(a[0].samples,[]);assert.equal(calls,2);
});
test('hero serves a complete top 25 and caches its public data',async()=>{
  let calls=0,now=1000,incomplete=false;
  const service=createHeroService({now:()=>now,request:async()=>{calls++;return {ok:true,json:async()=>({response:{last_update:1,ranks:Array.from({length:25},(_,i)=>({appid:i+1,concurrent_in_game:100-i}))}})};},metadata:async ids=>ids.slice(0,incomplete?24:25).map(appId=>({appId,title:'Game '+appId,image:'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/'+appId+'/header.jpg'}))});
  assert.equal((await service()).games.length,25);await service();assert.equal(calls,1);
  now+=300001;incomplete=true;await assert.rejects(service(),/artwork/);
});
