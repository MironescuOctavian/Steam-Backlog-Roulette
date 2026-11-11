import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoLibrary} from '../src/library.ts';
import {buildReel} from '../src/roulette-model.ts';
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
