import {demoLibrary} from './fixtures/library.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {costPerHour} from '../src/library.ts';
import {parseImport,mergeLibrary,parseSteam} from '../src/imports.ts';
test('JSON round trips, defaults optional fields and rejects unsupported formats',()=>{
  const games=demoLibrary();
  assert.deepEqual(parseImport(JSON.stringify({version:1,games})),games);
  const {tags,metadataSource,...minimal}=games[0];
  assert.equal(parseImport(JSON.stringify([minimal]))[0].metadataSource,'Custom');
  assert.throws(()=>parseImport('{broken'));
  assert.throws(()=>parseImport(JSON.stringify({version:99,games})));
  assert.throws(()=>parseImport(' '.repeat(5_000_001)));
  assert.equal(mergeLibrary(games,[{...games[0],title:'Updated'}]).length,30);
  assert.equal(mergeLibrary(games,[{...games[0],title:'Updated'}])[0].title,'Updated');
});
test('Steam uses minute playtime, estimates and unknown costs without demo account statuses',()=>{
  const imported=parseSteam({response:{games:[{appid:1245620,name:'Elden Ring',playtime_forever:90},{appid:123456,name:'Unknown game',playtime_forever:0}]}},demoLibrary());
  assert.equal(imported[0].playtimeHours,1.5);
  assert.equal(imported[0].status,'Backlog');
  assert.equal(imported[0].priceKnown,false);
  assert.equal(costPerHour(imported[0]),null);
  assert.equal(imported[1].timeToBeatHours,null);
  assert.equal(imported[1].metacritic,null);
  assert.throws(()=>parseSteam({response:{}},[]));
  assert.throws(()=>parseSteam({response:{games:[{appid:1,name:'x',playtime_forever:-1}]}},[]));
});
test('Steam preserves user-managed fields for existing non-demo games',()=>{
  const game={...demoLibrary()[0],metadataSource:'Custom',tags:['weekend'],status:'Completed'};
  const [imported]=parseSteam({response:{games:[{appid:game.appId,name:game.title,playtime_forever:120}]}},[game]);
  assert.equal(imported.status,'Completed');assert.deepEqual(imported.tags,['weekend']);assert.equal(imported.priceKnown,true);
});
test('Steam refresh keeps explicit user edits made to demo games',()=>{
  const game={...demoLibrary()[0],status:'Dropped',userManaged:true};
  const [imported]=parseSteam({response:{games:[{appid:game.appId,name:game.title,playtime_forever:120}]}},[game]);
  assert.equal(imported.status,'Dropped');assert.equal(imported.priceKnown,false);
});
