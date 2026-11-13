import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseFeatured,createNewsService} from '../server/news.mjs';
test('featured parses embedded events and caches the feed',async()=>{
 const html='data-initialEvents="'+JSON.stringify({events:[{gid:'123',appid:70,event_name:'Update',rtime32_start_time:1700000000}]}).replaceAll('"','&quot;')+'"';
 assert.equal(parseFeatured(html)[0].appid,70);assert.throws(()=>parseFeatured('unavailable'));
 let calls=0;const news=createNewsService({request:async()=>{calls++;return new Response(html);}});
 assert.equal((await news('featured'))[0].url,'https://store.steampowered.com/news/app/70/view/123');await news('featured');assert.equal(calls,1);await assert.rejects(news('invalid'));
});
