import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoLibrary} from '../src/library.ts';
import {filterGames,defaultFilters} from '../src/planner.ts';
test('filters compose and preserve time boundaries and unknown scores',()=>{
  const games=demoLibrary();
  assert.ok(filterGames(games,defaultFilters).every(g=>!['Completed','Dropped'].includes(g.status)));
  assert.equal(filterGames(games,{...defaultFilters,search:'  HOLLOW  '})[0].title,'Hollow Knight');
  assert.ok(filterGames(games,{...defaultFilters,state:'never'}).every(g=>g.playtimeHours===0));
  const g={...games[0],playtimeHours:0,timeToBeatHours:10};
  assert.equal(filterGames([g],{...defaultFilters,time:'quick'}).length,0);
  assert.equal(filterGames([g],{...defaultFilters,time:'medium'}).length,1);
  assert.equal(filterGames([{...g,metacritic:null}],{...defaultFilters,score:5}).length,0);
  assert.equal(filterGames([g],{...defaultFilters,genre:'Puzzle'}).length,0);
});
