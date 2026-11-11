import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProfileInput,fetchPublicProfile} from '../server/steam.mjs';
import {createApp} from '../server/index.mjs';
const id='76561198000000000';
test('profile lookup accepts IDs and vanity URLs and rejects other destinations',()=>{
  assert.deepEqual(parseProfileInput(id),{steamId:id});
  assert.deepEqual(parseProfileInput('steamcommunity.com/id/example-handle/'),{vanity:'example-handle'});
  assert.deepEqual(parseProfileInput('https://steamcommunity.com/profiles/'+id),{steamId:id});
  assert.deepEqual(parseProfileInput('example-handle'),{vanity:'example-handle'});
  for(const bad of ['https://evil.test/','https://steamcommunity.com.evil.test/id/test','https://user@steamcommunity.com/id/test','https://steamcommunity.com:123/id/test','https://steamcommunity.com/profiles/123','not a unique display name','../../etc/passwd'])assert.throws(()=>parseProfileInput(bad));
});
test('server resolves a handle and returns real playtime without exposing its key',async()=>{
  const urls=[];
  const fake=async url=>{urls.push(url.href);const data=url.pathname.includes('ResolveVanityURL')?{response:{success:1,steamid:id}}:url.pathname.includes('GetPlayerSummaries')?{response:{players:[{steamid:id,personaname:'Test player',communityvisibilitystate:3,avatarfull:'https://avatars.steamstatic.com/test.jpg'}]}}:{response:{games:[{appid:70,name:'Half-Life',playtime_forever:90}]}};return {ok:true,json:async()=>data};};
  const result=await fetchPublicProfile('example-handle','test-secret',fake);
  assert.equal(result.profile.steamId,id);assert.equal(result.steam.response.games[0].playtime_forever,90);
  assert.ok(urls.every(url=>url.startsWith('https://api.steampowered.com/')));
  assert.ok(urls.some(url=>url.includes('/GetPlayerSummaries/v0002/')));
  assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('private profiles, private games and unknown handles produce explicit errors',async()=>{
  const fake=visibility=>async url=>({ok:true,json:async()=>url.pathname.includes('GetPlayerSummaries')?{response:{players:[{steamid:id,communityvisibilitystate:visibility}]}}:{response:{}}});
  await assert.rejects(fetchPublicProfile(id,'key',fake(1)),/private/);
  await assert.rejects(fetchPublicProfile(id,'key',fake(3)),/Game details/);
  await assert.rejects(fetchPublicProfile('bad-handle','key',fake(3)),/No profile found/);
  await assert.rejects(fetchPublicProfile(id,'',fake(3)),/not configured/);
});
test('API caches lookups, rate limits, and does not expose server configuration',async()=>{
  let calls=0;
  const server=createApp({key:'secret-value',lookup:async()=>{calls++;return {profile:{steamId:id},steam:{response:{games:[]}}};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    assert.equal((await fetch(base+'/api/steam/profile?profile=bad%20name')).status,400);
    for(let i=0;i<2;i++){const response=await fetch(base+'/api/steam/profile?profile='+id);assert.equal(response.status,200);assert.ok(!(await response.text()).includes('secret-value'));}
    assert.equal(calls,1);
    for(let i=0;i<28;i++)await fetch(base+'/api/steam/profile?profile='+id);
    assert.equal((await fetch(base+'/api/steam/profile?profile='+id)).status,429);
    assert.equal((await fetch(base+'/.env')).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
