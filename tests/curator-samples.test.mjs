import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CURATOR_SOURCES,createCuratorSampleService,parseCuratorHtml} from '../server/curator-samples.mjs';
import {createApp} from '../server/index.mjs';
import {buildCuratorLibrary,loadRandomCuratorSample,pickCuratorSlot} from '../src/sample-library.ts';

const sampleHtml=`
<div class="recommendation" data-ds-appid="1245620">
  <a href="https://store.steampowered.com/app/1245620/Elden_Ring/">Elden Ring</a>
  <div data-price-final="5999"></div>
</div>
<div class="recommendation" data-ds-appid="1245620">
  <a href="https://store.steampowered.com/app/1245620/Elden_Ring/">Duplicate</a>
</div>
<div class="recommendation" data-ds-appid="999999">
  <a href="https://store.steampowered.com/app/999999/Upcoming_Game/">Upcoming</a>
</div>
<div class="recommendation" data-ds-appid="413150">
  <a href="https://store.steampowered.com/app/413150/Stardew_Valley/">Stardew</a>
  <div data-price-final="1499"></div>
</div>
<script>
  GStoreItemData.AddStoreItemDataSet({"rgApps":{"1245620":{"name":"Elden Ring &amp; Shadow","headerv5":"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg"},"999999":{"name":"Upcoming Game","coming_soon":true}}});
</script>`;

test('parseCuratorHtml extracts released games, deduplicates, decodes titles, and reads prices',()=>{
  const items=parseCuratorHtml(sampleHtml);
  assert.equal(items.length,2);
  assert.deepEqual(items[0],{
    appId:1245620,
    title:'Elden Ring & Shadow',
    pricePaid:59.99,
    priceKnown:true,
    image:'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
  });
  assert.deepEqual(items[1],{
    appId:413150,
    title:'Stardew Valley',
    pricePaid:14.99,
    priceKnown:true,
  });
});

test('createCuratorSampleService fetches curator HTML, caches per slot, and rejects empty feeds',async()=>{
  let calls=0;
  const service=createCuratorSampleService({
    ttlMs:60000,
    fetchImpl:async url=>{
      calls++;
      assert.match(url,/store\.steampowered\.com\/curator\/35411526\/ajaxgetcuratorrecommendations/);
      return {ok:true,json:async()=>({results_html:sampleHtml})};
    },
  });
  const first=await service(1);
  const second=await service(1);
  assert.equal(calls,1);
  assert.equal(first.curator.name,CURATOR_SOURCES[1].name);
  assert.equal(first.games.length,2);
  assert.equal(second,first);

  const failing=createCuratorSampleService({fetchImpl:async()=>({ok:false,status:503})});
  await assert.rejects(failing(0),/Steam curator HTTP 503/);
  const empty=createCuratorSampleService({fetchImpl:async()=>({ok:true,json:async()=>({results_html:'<div></div>'})})});
  await assert.rejects(empty(0),/No released games/);
});

test('pickCuratorSlot, buildCuratorLibrary, and loadRandomCuratorSample support live API and local fallback',async()=>{
  assert.equal(CURATOR_SOURCES.length,5);
  for(let exclude=0;exclude<5;exclude++){
    for(let i=0;i<15;i++){
      const slot=pickCuratorSlot(exclude);
      assert.ok(slot>=0&&slot<=4&&slot!==exclude);
    }
  }
  const built=buildCuratorLibrary([
    {appId:413150,title:'Stardew Valley',pricePaid:14.99,priceKnown:true},
    {appId:413150,title:'Stardew Valley'},
    {appId:1245620,title:'Elden Ring',pricePaid:59.99,priceKnown:true},
  ]);
  assert.equal(built.length,2);
  assert.equal(built[0].metadataSource,'Demo estimates');
  assert.ok(built[0].genres.length>0);

  const offline=await loadRandomCuratorSample(0);
  assert.equal(offline.curator.live,false);
  assert.notEqual(offline.curator.slot,0);
  assert.equal(offline.games.length,15);

  const prevLocation=globalThis.location;
  const prevFetch=globalThis.fetch;
  try{
    globalThis.location={protocol:'https:'};
    globalThis.fetch=async url=>{
      assert.match(String(url),/\/api\/sample-curator\?slot=\d/);
      return {
        ok:true,
        json:async()=>({
          curator:{slot:2,id:4771848,name:'/r/pcmasterrace Group',theme:'Community PC favorites',url:'https://store.steampowered.com/curator/4771848-r-pcmasterrace-Group/'},
          games:Array.from({length:12},(_,i)=>({appId:400+i,title:`Curator Game ${i+1}`,pricePaid:9.99,priceKnown:true})),
        }),
      };
    };
    const live=await loadRandomCuratorSample(0);
    assert.equal(live.curator.live,true);
    assert.equal(live.curator.name,'/r/pcmasterrace Group');
    assert.equal(live.games.length,12);
    assert.equal(live.games[0].metadataSource,'Demo estimates');
  }finally{
    globalThis.location=prevLocation;
    globalThis.fetch=prevFetch;
  }
});

test('/api/sample-curator validates method and slot and returns curator payload',async()=>{
  const server=createApp({
    curatorSamples:async slot=>({
      curator:CURATOR_SOURCES[slot],
      games:[{appId:413150,title:'Stardew Valley',pricePaid:14.99,priceKnown:true}],
      capturedAt:'2026-11-13T00:00:00.000Z',
    }),
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    assert.equal((await fetch(base+'/api/sample-curator',{method:'POST'})).status,405);
    for(const bad of ['-1','5','abc'])assert.equal((await fetch(base+'/api/sample-curator?slot='+bad)).status,400);
    const ok=await fetch(base+'/api/sample-curator?slot=3');
    assert.equal(ok.status,200);
    const body=await ok.json();
    assert.equal(body.curator.name,'Cynical Brit Gaming');
    assert.equal(body.games.length,1);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
