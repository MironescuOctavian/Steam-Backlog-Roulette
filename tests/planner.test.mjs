import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoLibrary} from '../src/library.ts';
import {filterGames,defaultFilters,analytics,rankValue} from '../src/planner.ts';
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
test('analytics handle empty libraries and value ranking does not mutate the library',()=>{
  assert.deepEqual(analytics([]),{backlog:0,remaining:0,unplayedPercent:0,averageCost:null});
  const g=demoLibrary()[0];
  const games=[{...g,appId:1,pricePaid:20,playtimeHours:0},{...g,appId:2,pricePaid:10,playtimeHours:10},{...g,appId:3,pricePaid:20,playtimeHours:2}];
  assert.deepEqual(rankValue(games,false).map(g=>g.appId),[2,3]);
  assert.deepEqual(rankValue(games,true).map(g=>g.appId),[1,3,2]);
  assert.deepEqual(games.map(g=>g.appId),[1,2,3]);
  assert.equal(analytics(games).averageCost,5.5);
});
