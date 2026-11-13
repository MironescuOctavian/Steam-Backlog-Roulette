import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseFeatured,createNewsService} from '../server/news.mjs';
test('featured parses embedded events, extracts capsule images, and caches the feed',async()=>{
 const html='data-initialEvents="'+JSON.stringify({events:[
  {gid:'123',appid:70,event_name:'Update',rtime32_start_time:1700000000,clan_steamid:'103582791433958877',jsondata:JSON.stringify({localized_capsule_image:['cap123.jpg']}),announcement_body:{body:'Release &mdash; notes'}},
 ]}).replaceAll('"','&quot;')+'"';
 assert.equal(parseFeatured(html)[0].appid,70);assert.throws(()=>parseFeatured('unavailable'));
 let calls=0;const news=createNewsService({request:async()=>{calls++;return new Response(html);}});
 const items=await news('featured');
 assert.equal(items[0].url,'https://store.steampowered.com/news/app/70/view/123');
 assert.deepEqual(items[0].images,['https://clan.akamai.steamstatic.com/images/4437469/cap123.jpg']);
 assert.equal(items[0].summary,'Release — notes');
 await news('featured');assert.equal(calls,1);await assert.rejects(news('invalid'));
});
