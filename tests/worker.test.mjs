import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';

test('Worker routes static assets and validates API requests without credentials',async()=>{
  const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)}};
  assert.equal(await (await worker.fetch(new Request('https://app.test/activity'),env)).text(),'/activity');
  assert.equal((await worker.fetch(new Request('https://app.test/api/activity',{method:'POST'}),env)).status,405);
  assert.equal((await worker.fetch(new Request('https://app.test/api/missing'),env)).status,404);
  assert.equal((await worker.fetch(new Request('https://app.test/api/steam/profile?profile=https://evil.test'),env)).status,400);
  const missing=await worker.fetch(new Request('https://app.test/api/steam/profile?profile=76561198000000001'),env);
  assert.equal(missing.status,503);assert.match((await missing.json()).error,/not configured/);
});
