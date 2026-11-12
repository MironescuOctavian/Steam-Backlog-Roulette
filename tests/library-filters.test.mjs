import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterChips,filterRecovery,unknownTimeMatches} from '../src/library-filters.ts';
import {defaultFilters,filterGames} from '../src/planner.ts';
import {defaultPreferences,validatePreferences} from '../src/preferences.ts';
import {demoLibrary} from './fixtures/library.ts';
test('view preference migrates existing saves and rejects unsupported views',()=>{
  const {libraryView,...old}=defaultPreferences;
  assert.equal(libraryView,'grid');assert.equal(validatePreferences(old).libraryView,'grid');
  assert.equal(validatePreferences({...old,libraryView:'list'}).libraryView,'list');
  assert.throws(()=>validatePreferences({...old,libraryView:'bad'}));
});
test('filter chips remove one restriction without clearing other choices',()=>{
  const f={...defaultFilters,search:'Hades',genre:'RPG',time:'quick',score:90};
  const chips=filterChips(f);assert.equal(chips.length,4);
  assert.deepEqual(chips.find(c=>c.key==='genre').patch,{genre:''});assert.equal(f.genre,'RPG');
  assert.deepEqual(filterChips(defaultFilters),[]);
});
test('empty results suggest a relaxation that really returns games and count unknown times honestly',()=>{
  const games=demoLibrary().slice(0,2).map(g=>({...g,status:'Backlog',timeToBeatHours:null}));
  const f={...defaultFilters,time:'quick'};assert.equal(filterGames(games,f).length,0);
  assert.equal(unknownTimeMatches(games,f),2);assert.equal(unknownTimeMatches(games,{...f,search:'not a game'}),0);
  const r=filterRecovery(games,f);assert.equal(r.key,'time');assert.equal(filterGames(games,{...f,...r.patch}).length,r.count);
  assert.equal(filterRecovery([],{...defaultFilters,search:'Nothing'}),null);
});
