import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createActivityService} from '../server/activity.mjs';
import {createOnlineHistory,mergeOnlineHistory} from '../server/online-history.mjs';
import {createApp} from '../server/index.mjs';
import {validateActivity,sortActivity,historyPath,paginationPages} from '../src/activity-model.ts';
import snapshot from '../src/data/activity.json' with {type:'json'};
test('pagination keeps endpoints, nearby pages and compact gaps',()=>{
  assert.deepEqual(paginationPages(20,1),[1,2,3,4,5,'…',20]);
  assert.deepEqual(paginationPages(20,10),[1,'…',9,10,11,'…',20]);
  assert.deepEqual(paginationPages(20,20),[1,'…',16,17,18,19,20]);
  assert.deepEqual(paginationPages(1,1),[1]);
  assert.deepEqual(paginationPages(0,1),[]);
  assert.deepEqual(paginationPages(7,4),[1,2,3,4,5,6,7]);
});

function feeds(at){return async input=>{
  const url=new URL(input);let data;
  if(url.pathname.includes('GetGamesByConcurrentPlayers'))data={response:{last_update:at/1000,ranks:[{appid:70,rank:1,concurrent_in_game:100,peak_in_game:200}]}};
  else if(url.pathname.includes('GetMostPlayedGames'))data={response:{ranks:[{appid:70,rank:2,last_week_rank:6}]}};
  else if(url.pathname.includes('featuredcategories'))data={new_releases:{items:[{type:0,id:220,name:'Half-Life 2',final_price:999,currency:'USD'}]}};
  else if(url.pathname.includes('userdata.json'))data=[{label:'Steam users logged in',data:[[at-300000,100],[at,200]]}];
  else data={response:{store_items:[{success:1,appid:70,name:'Half-Life',reviews:{summary_filtered:{percent_positive:96,review_count:1000}}},{success:1,appid:220,name:'Half-Life 2',reviews:{summary_filtered:{percent_positive:98,review_count:800}}}]}};
  return {ok:true,json:async()=>data};
};}
test('real snapshot contains observed counts and releases, not generated history',()=>{
  assert.equal(validateActivity(snapshot).games.length,1000);assert.equal(snapshot.history.length,1);
  assert.ok(snapshot.games.every(g=>Number.isInteger(g.playersNow)&&g.playersNow>=0));
});
test('malformed online history and missing game records are rejected before display',()=>{
  assert.throws(()=>validateActivity({...snapshot,online:{sampledAt:snapshot.sampledAt,samples:[]}}),/online history/);
  assert.throws(()=>validateActivity({...snapshot,games:[null]}),/Invalid activity game/);
});
test('activity joins public feeds, distinguishes current counts, rank movement and prices, and caches requests',async()=>{
  let now=Date.parse('2026-11-11T08:00:00Z');let calls=0;
  const service=createActivityService({extended:async()=>({ranks:[],capturedAt:new Date().toISOString()}),now:()=>now,historyFile:null,request:async input=>{calls++;return feeds(now)(input);}});
  const data=await service();assert.equal(data.games[0].title,'Half-Life');assert.equal(data.games[0].playersNow,100);assert.equal(data.games[0].peakToday,200);
  assert.equal(data.movers[0].weeklyChange,4);assert.equal(data.releases[0].price,'$9.99');assert.equal(data.releases[0].playersNow,null);assert.equal(data.acclaimed[0].reviewPercent,98);
  const total=calls;await Promise.all([service(),service()]);assert.equal(calls,total);
  now+=300001;await Promise.all([service(),service()]);assert.equal(calls,total+4,'concurrent refreshes share one upstream collection');
});
test('history records only actual distinct observations and keeps the prior snapshot when Steam fails',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'activity-history-test-'));
  const historyFile=path.join(directory,'history.json');let now=Date.parse('2026-11-11T08:00:00Z');let fail=false;
  const service=createActivityService({extended:async()=>({ranks:[],capturedAt:new Date().toISOString()}),now:()=>now,historyFile,request:input=>{if(fail)throw new Error('offline');return feeds(now)(input);}});
  try{
    assert.equal((await service()).history.length,1);now+=300001;
    assert.equal((await service()).history.length,2);
    assert.equal(JSON.parse(await fs.readFile(historyFile,'utf8')).length,2);
    fail=true;now+=300001;const stale=await service();assert.equal(stale.stale,true);assert.equal(stale.history.length,2);
  }finally{
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));
    await fs.rm(directory,{recursive:true,force:true});
  }
});
test('chart sorting preserves source ordering and gaps in history are not interpolated',()=>{
  const games=snapshot.games.slice(0,3);const ids=games.map(g=>g.appId);sortActivity(games,'name');assert.deepEqual(games.map(g=>g.appId),ids);
  assert.equal(historyPath([{at:'2026-11-11T08:00:00Z',counts:{'70':100}}],70),'');
  const plot=historyPath([{at:'2026-11-11T08:00:00Z',counts:{'70':100}},{at:'2026-11-11T08:05:00Z',counts:{'70':120}},{at:'2026-11-11T09:00:00Z',counts:{'70':80}}],70);
  assert.equal((plot.match(/M/g)??[]).length,2);assert.equal((plot.match(/L/g)??[]).length,1);
});
test('activity endpoint works without a profile API key and handles failures explicitly',async()=>{
  const server=createApp({key:'',activity:async()=>snapshot});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const base='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(base+'/api/activity')).status,200);assert.equal((await fetch(base+'/api/activity',{method:'POST'})).status,405);}finally{await new Promise(resolve=>server.close(resolve));}
});
test('optional feed failures keep real player counts and show explicit warnings',async()=>{
  const at=Date.parse('2026-11-11T08:00:00Z');
  const service=createActivityService({extended:async()=>({ranks:[],capturedAt:new Date().toISOString()}),historyFile:null,now:()=>at,request:async input=>{
    if(String(input).includes('GetMostPlayedGames')||String(input).includes('featuredcategories'))return {ok:false};
    return feeds(at)(input);
  }});
  const data=await service();assert.equal(data.games[0].playersNow,100);assert.deepEqual(data.movers,[]);assert.deepEqual(data.releases,[]);assert.equal(data.warnings.length,2);
});
test('portable history storage preserves samples and limits optional metadata requests',async()=>{
  let stored=[];let now=Date.parse('2026-11-11T08:00:00Z');
  const service=createActivityService({historyFile:null,historyStore:{read:async()=>stored,write:async history=>{stored=history;}},metadataBatchLimit:0,now:()=>now,extended:async()=>({ranks:[],capturedAt:new Date(now).toISOString()}),request:feeds(now)});
  const first=await service();assert.equal(first.games[0].playersNow,100);assert.equal(first.games[0].reviewPercent,null);assert.match(first.warnings.join(' '),/review details/);assert.equal(stored.length,1);
  now+=300001;
  const second=await service();assert.equal(second.history.length,1,'duplicate source timestamps are not invented');
});

test('online history archives Steam 48h feeds into longer ranges and preserves existing archives on errors',async()=>{
  const hour=3600000,day=24*hour,now=Date.UTC(2026,10,12,12,0);
  const saved=[[now-70*day,100],[now-70*day+hour,150],[now-10*day,200],[now-10*day+300000,250],[now-day,300],[now-day+300000,320]];
  const incoming=[[now-600000,340],[now,360],[now+400000,999]];
  const merged=mergeOnlineHistory(saved,incoming,now);
  assert.deepEqual(merged,[[now-70*day+hour,150],[now-10*day+300000,250],[now-day,300],[now-day+300000,320],[now-600000,340],[now,360]],'keeps daily >60d, hourly 2-60d, full <=48h, and drops future timestamps');

  let stored=null;
  const archive=createOnlineHistory({storage:{read:async()=>stored,write:async next=>{stored=next;}},now:()=>now});
  const first=await archive({samples:[[now-10*day,110],[now-10*day+hour,120]]});
  assert.equal(first.warnings.length,0);
  assert.equal(stored.length,2);
  const afterOutage=await archive(undefined);
  assert.equal(afterOutage.online.samples.length,2,'keeps archived online samples when Steam feed fails');

  let badWrite=false;
  const corrupt=createOnlineHistory({storage:{read:async()=>'corrupt',write:async()=>{badWrite=true;}},now:()=>now});
  const preserved=await corrupt({samples:[[now-60000,400],[now,410]]});
  assert.equal(badWrite,false,'unreadable archive is never overwritten');
  assert.match(preserved.warnings[0],/preserved/);
});
