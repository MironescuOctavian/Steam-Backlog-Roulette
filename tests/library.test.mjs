import {demoLibrary} from './fixtures/library.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLibrary, loadLibrary, saveLibrary, remainingHours, costPerHour } from '../src/library.ts';

const memory = () => {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value)};
};
test('demo library is valid, distinct, and independently cloned', () => {
  const games = demoLibrary();
  assert.equal(games.length,30);
  assert.deepEqual(validateLibrary(games),games);
  games[0].genres.push('changed');
  games[0].tags.push('changed');
  assert.ok(!demoLibrary()[0].genres.includes('changed'));
  assert.deepEqual(demoLibrary()[0].tags,[]);
});
test('first load is empty without a default profile; saves preserve status, tags and independent priority', () => {
  const storage = memory();
  const initial=loadLibrary(storage);
  const {warning} = initial;
  assert.deepEqual(initial.games,[]);assert.equal(initial.loaded,false);
  const games=demoLibrary();saveLibrary(storage,games);
  assert.equal(warning,null);
  assert.deepEqual(loadLibrary(storage).games,games);
  games[0].status = 'Playing';
  games[0].tags = ['weekend'];
  saveLibrary(storage,games);
  assert.deepEqual(loadLibrary(storage).games,games);
  saveLibrary(storage,[]);
  assert.deepEqual(loadLibrary(storage).games,[]);
});
test('invalid data, duplicates, nonfinite and negative numbers are rejected before writing', () => {
  const game = demoLibrary()[0];
  for (const change of [{appId:0},{title:''},{playtimeHours:-1},{pricePaid:Infinity},{metacritic:101},{tags:[1]},{status:'Play Next'}]) {
    assert.throws(() => validateLibrary([{...game,...change}]));
  }
  assert.throws(() => validateLibrary([game,game]));
  assert.throws(() => saveLibrary({setItem:()=>assert.fail('must not write')},[{...game,pricePaid:NaN}]));
});
test('corrupt and future-version saved data is never overwritten', () => {
  for (const raw of ['{broken',JSON.stringify({version:2,games:[]}),JSON.stringify({version:1,games:[{}]})]) {
    const result = loadLibrary({getItem:()=>raw,setItem:()=>assert.fail('must preserve existing data')});
    assert.ok(result.warning);
    assert.equal(result.games.length,0);
  }
});
test('blocked storage and quota failures show recoverable warnings', () => {
  assert.ok(loadLibrary({getItem:()=>{throw new Error('blocked');},setItem:()=>{}}).warning);
  assert.throws(()=>saveLibrary({getItem:()=>null,setItem:()=>{throw new Error('quota');}},demoLibrary()));
});
test('legacy default demo entries are not mistaken for an owned library',()=>{
  const games=demoLibrary();
  const saved=JSON.stringify({version:1,games});
  assert.equal(loadLibrary({getItem:()=>saved,setItem:()=>assert.fail('must not overwrite')}).loaded,false);
  games[0].userManaged=true;
  const migrated=loadLibrary({getItem:()=>JSON.stringify({version:1,games}),setItem:()=>assert.fail('must not overwrite')});
  assert.equal(migrated.games.length,1);assert.equal(migrated.games[0].appId,games[0].appId);
});
test('status changes affect planning; a failed save preserves the last library', () => {
  const storage = memory();
  const games = demoLibrary();
  const original = games[0];
  original.status = 'Backlog';
  original.playtimeHours = 2;
  original.timeToBeatHours = 10;
  saveLibrary(storage,games);
  const completed = {...original,status:'Completed'};
  assert.equal(remainingHours(completed),0);
  assert.equal(remainingHours({...completed,status:'Backlog'}),8);
  assert.throws(() => saveLibrary({getItem:storage.getItem,setItem:()=>{throw new Error('quota');}},[completed]));
  assert.deepEqual(loadLibrary(storage).games,games);
  saveLibrary(storage,[completed]);
  assert.deepEqual(loadLibrary(storage).games,[completed]);
});
test('remaining time and cost handle completed, dropped, unplayed and free games', () => {
  const g = {...demoLibrary()[0],timeToBeatHours:10,playtimeHours:3,pricePaid:12};
  assert.equal(remainingHours(g),7);
  assert.equal(remainingHours({...g,playtimeHours:20}),0);
  assert.equal(remainingHours({...g,status:'Completed'}),0);
  assert.equal(remainingHours({...g,status:'Dropped'}),0);
  assert.equal(costPerHour(g),4);
  assert.equal(costPerHour({...g,playtimeHours:0}),null);
  assert.equal(costPerHour({...g,pricePaid:0}),0);
});
