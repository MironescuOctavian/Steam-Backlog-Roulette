import {demoLibrary} from './fixtures/library.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {buildReel,rouletteCandidates,rememberPick} from '../src/roulette-model.ts';
import {filterGames,defaultFilters} from '../src/planner.ts';
import {validatePreferences,defaultPreferences} from '../src/preferences.ts';
test('reel always lands on the selected matching game, including one-game pools',()=>{
  const games=demoLibrary().slice(0,3);
  for(const random of [()=>0,()=>0.999999]){
    const reel=buildReel(games,random);
    assert.equal(reel.cards[reel.winnerIndex],reel.winner);
    assert.ok(reel.cards.every(g=>games.includes(g)));
  }
  assert.equal(buildReel([games[0]]).winner,games[0]);
  assert.throws(()=>buildReel([]));
});
test('roulette excludes temporary skips and recent picks only when alternatives remain',()=>{
  const games=demoLibrary().slice(0,4).map(g=>({...g,status:'Backlog'}));
  const recent=rememberPick([],games[0].appId,1);
  assert.deepEqual(rouletteCandidates(games,[games[1].appId],recent).map(g=>g.appId),games.slice(2).map(g=>g.appId));
  assert.equal(rouletteCandidates([games[0]],[],recent)[0],games[0]);
  assert.deepEqual(rouletteCandidates([games[0]],[games[0].appId],recent),[]);
  assert.deepEqual(rouletteCandidates([{...games[0],status:'Completed'}],[],[]),[]);
});
test('recent picks are distinct, ordered, capped and do not mutate past history',()=>{
  let picks=[];for(let id=1;id<=10;id++)picks=rememberPick(picks,id,id);
  assert.equal(picks.length,8);assert.equal(picks[0].appId,10);
  const next=rememberPick(picks,8,20);assert.equal(next[0].appId,8);assert.equal(next.filter(p=>p.appId===8).length,1);assert.equal(picks[0].appId,10);
});
test('continue mode includes started unfinished games and remains a valid saved filter',()=>{
  const g=demoLibrary()[0],games=[{...g,playtimeHours:0,status:'Backlog'},{...g,appId:2,playtimeHours:1,status:'Backlog'},{...g,appId:3,playtimeHours:0,status:'Playing'},{...g,appId:4,playtimeHours:2,status:'Completed'}];
  const filters={...defaultFilters,state:'started'};
  assert.deepEqual(filterGames(games,filters).map(g=>g.appId),[2,3]);assert.equal(validatePreferences({...defaultPreferences,filters}).filters.state,'started');
});
