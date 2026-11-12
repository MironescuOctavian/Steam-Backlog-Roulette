import {test} from 'node:test';
import assert from 'node:assert/strict';
import {queueGames,moveQueuedGame,pinQueuedGame,patchGames} from '../src/queue-model.ts';
import {validateLibrary,saveLibrary,loadLibrary} from '../src/library.ts';
import {parseImport,parseSteam} from '../src/imports.ts';
import {sortLibrary} from '../src/planner.ts';
import {demoLibrary} from './fixtures/library.ts';
const seed=()=>demoLibrary().slice(0,4).map((g,i)=>({...g,playNext:i<3,status:'Backlog',queuePosition:i}));
test('queue ordering and pinning preserve library order and block moving the pinned focus',()=>{
  const games=seed(),before=games.map(g=>g.appId),moved=moveQueuedGame(games,games[1].appId,-1);
  assert.deepEqual(queueGames(moved).map(g=>g.appId),[before[1],before[0],before[2]]);assert.deepEqual(games.map(g=>g.appId),before);
  const pinned=pinQueuedGame(moved,before[2]);assert.equal(queueGames(pinned)[0].appId,before[2]);assert.equal(pinned.filter(g=>g.pinned).length,1);
  assert.equal(moveQueuedGame(pinned,before[2],1),pinned);assert.equal(pinQueuedGame(games,before[3]),games);
  assert.deepEqual(sortLibrary(pinned,'priority').slice(0,3).map(g=>g.appId),queueGames(pinned).map(g=>g.appId));
});
test('bulk patches preserve unrelated fields, append new entries and unpin finished or removed titles',()=>{
  const games=pinQueuedGame(seed(),seed()[0].appId),id=games[0].appId;
  const finished=patchGames(games,[id,games[1].appId],{status:'Completed'});assert.equal(finished[0].pinned,false);assert.equal(finished[0].userManaged,true);assert.deepEqual(finished[0].tags,games[0].tags);assert.equal(queueGames(finished).length,1);
  const removed=patchGames(games,[id],{playNext:false});assert.equal(removed[0].pinned,false);
  const added=patchGames(games,[games[3].appId],{playNext:true});assert.equal(queueGames(added).at(-1).appId,games[3].appId);
  assert.equal(patchGames(games,[999999999],{status:'Dropped'}),games);
});
test('queue fields survive saves, JSON exports, Steam refresh and reject invalid focus data',()=>{
  const games=pinQueuedGame(seed(),seed()[1].appId);let raw=null;const storage={getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};
  saveLibrary(storage,games);assert.equal(loadLibrary(storage).games[1].pinned,true);assert.equal(parseImport(JSON.stringify({version:1,games}))[1].queuePosition,1);
  const refreshed=parseSteam({response:{games:games.map(g=>({appid:g.appId,name:g.title,playtime_forever:60}))}},games);assert.equal(refreshed[1].pinned,true);assert.equal(refreshed[1].queuePosition,1);
  for(const patch of [{queuePosition:-1},{queuePosition:1.5},{pinned:'yes'},{pinned:true,playNext:false},{pinned:true,status:'Completed'}])assert.throws(()=>validateLibrary([{...games[0],...patch}]));
  assert.throws(()=>validateLibrary(games.map(g=>({...g,pinned:true,playNext:true}))));
});
