import {test} from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../src/data/top250.json' with {type:'json'};
import {filterGames,defaultFilters,analytics} from '../src/planner.ts';
import {remainingHours} from '../src/library.ts';
test('ranking snapshot has exactly 250 distinct, ordered Steam games and real review percentages',()=>{
  assert.equal(snapshot.games.length,250);assert.equal(new Set(snapshot.games.map(g=>g.appId)).size,250);
  assert.ok(snapshot.games.every((g,i)=>g.rank===i+1&&g.title&&g.positivePercent>=0&&g.positivePercent<=100));
});
test('unknown completion times stay unknown and are excluded only by time filters',()=>{
  const game={appId:70,title:'Half-Life',genres:['Action'],playtimeHours:0,timeToBeatHours:null,metacritic:null,pricePaid:0,priceKnown:false,status:'Unplayed',steamPositivePercent:98};
  assert.equal(remainingHours(game),null);
  assert.equal(filterGames([game],defaultFilters).length,1);
  assert.equal(filterGames([game],{...defaultFilters,time:'quick'}).length,0);
  assert.equal(filterGames([game],{...defaultFilters,maxHours:199}).length,0);
  assert.equal(filterGames([game],{...defaultFilters,score:95}).length,1);
  assert.equal(analytics([game]).unknownTimes,1);
  assert.equal(analytics([game]).averageCost,null);
});
