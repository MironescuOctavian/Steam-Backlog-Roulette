import {test} from 'node:test';
import assert from 'node:assert/strict';
import {patchGames} from '../src/game-patch.ts';
import {validateLibrary,saveLibrary,loadLibrary} from '../src/library.ts';
import {parseImport} from '../src/imports.ts';
import {validatePreferences,defaultPreferences} from '../src/preferences.ts';
import {sortLibrary,filterGames,defaultFilters} from '../src/planner.ts';
import {demoLibrary} from './fixtures/library.ts';
test('bulk patches preserve unrelated fields, mark games as user managed and ignore unknown IDs',()=>{
  const games=demoLibrary().slice(0,3).map(g=>({...g,status:'Backlog',tags:['keep']})),before=JSON.stringify(games);
  const patched=patchGames(games,[games[0].appId,games[1].appId],{status:'Completed'});
  assert.equal(patched[0].status,'Completed');assert.equal(patched[0].userManaged,true);assert.deepEqual(patched[0].tags,['keep']);assert.equal(patched[2],games[2]);
  assert.equal(JSON.stringify(games),before);assert.equal(patchGames(games,[999999999],{status:'Dropped'}),games);
});
test('libraries saved with the removed Play Next fields still load and drop them',()=>{
  const legacy=demoLibrary().slice(0,2).map((g,i)=>({...g,playNext:true,queuePosition:i,pinned:i===0}));
  const clean=validateLibrary(legacy);for(const g of clean){assert.equal('playNext' in g,false);assert.equal('queuePosition' in g,false);assert.equal('pinned' in g,false);}
  let raw=null;const storage={getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};
  raw=JSON.stringify({version:1,kind:'personal',games:legacy,profile:null});assert.equal(loadLibrary(storage).games.length,2);
  saveLibrary(storage,loadLibrary(storage).games);assert.doesNotMatch(raw,/playNext|queuePosition|pinned/);
  assert.equal(parseImport(JSON.stringify({version:1,games:legacy})).length,2);
  assert.equal(parseImport(JSON.stringify([{...demoLibrary()[0],status:'Play Next'}]))[0].status,'Backlog');
});
test('saved preferences that used Play Next fall back to the default backlog view',()=>{
  const saved=validatePreferences({...defaultPreferences,librarySort:'priority',filters:{...defaultFilters,state:'next'}});
  assert.equal(saved.filters.state,'backlog');assert.equal(saved.librarySort,'default');
  const games=demoLibrary().map(g=>({...g,status:'Backlog'}));
  assert.equal(filterGames(games,{...defaultFilters,state:'next'}).length,0);assert.equal(sortLibrary(games,'priority').length,games.length);
});
test('disconnecting a profile leaves an empty discovery library without a profile',()=>{
  let raw=null;const storage={getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};
  const profile={steamId:'76561198000000001',name:'QA',avatar:'',url:'https://steamcommunity.com/profiles/76561198000000001/',updatedAt:new Date().toISOString()};
  saveLibrary(storage,demoLibrary(),profile);assert.equal(loadLibrary(storage).profile?.name,'QA');
  saveLibrary(storage,[],null,false);const after=loadLibrary(storage);assert.equal(after.loaded,false);assert.equal(after.profile,null);assert.deepEqual(after.games,[]);
});
