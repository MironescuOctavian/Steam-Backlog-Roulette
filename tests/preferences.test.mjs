import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPreferences,validatePreferences,defaultPreferences} from '../src/preferences.ts';
import {exclusionReason,recommendationReasons,sortLibrary,defaultFilters} from '../src/planner.ts';
import {demoLibrary} from './fixtures/library.ts';
import {loadLibrary,saveLibrary} from '../src/library.ts';
test('preferences round trip filters, sorting, exclusions and safe internal routes',()=>{
  const p=validatePreferences({...defaultPreferences,filters:{...defaultFilters,genre:'RPG'},excludedIds:[70,70,220],lastRoute:'/activity',pulsePage:20});
  assert.deepEqual(p.excludedIds,[70,220]);assert.equal(loadPreferences({getItem:()=>JSON.stringify(p)}).value.pulsePage,20);
  for(const patch of [{lastRoute:'https://evil.test'},{pulsePage:21},{excludedIds:[-1]},{hideDemos:'yes'},{filters:{...defaultFilters,score:101}}])assert.throws(()=>validatePreferences({...p,...patch}));
  assert.ok(loadPreferences({getItem:()=>'{broken'}).warning);assert.ok(loadPreferences({getItem:()=>{throw Error('blocked');}}).warning);
});
test('exclusions use explicit classifications and never guess from titles',()=>{
  const game=demoLibrary()[0],p={...defaultPreferences,hideMultiplayer:true,hideSoftware:true,hideDemos:true};
  assert.equal(exclusionReason({...game,title:'Multiplayer Demo Software'},p),'');
  assert.equal(exclusionReason({...game,appType:'software'},p),'Software excluded');
  assert.equal(exclusionReason({...game,appType:'demo'},p),'Demos excluded');
  assert.equal(exclusionReason({...game,multiplayerOnly:true},p),'Multiplayer-only excluded');
  assert.equal(exclusionReason(game,{...p,excludedIds:[game.appId]}),'Manually excluded');
});
test('recommendations explain actual state and sorting preserves the source library',()=>{
  const game={...demoLibrary()[0],playtimeHours:0,playNext:true,genres:['RPG']};
  assert.match(recommendationReasons(game,{...defaultFilters,genre:'RPG'},true),/Unplayed · On your shortlist · Matches RPG/);
  assert.doesNotMatch(recommendationReasons({...game,rank:3},defaultFilters,false),/Unplayed/);
  const games=demoLibrary(),ids=games.map(g=>g.appId);sortLibrary(games,'title');assert.deepEqual(games.map(g=>g.appId),ids);
});
test('restoring discovery after undo does not manufacture a personal library',()=>{
  let raw=null;const storage={getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};
  saveLibrary(storage,[],null,false);assert.equal(loadLibrary(storage).loaded,false);
  saveLibrary(storage,[],null,true);assert.equal(loadLibrary(storage).loaded,true);
});
