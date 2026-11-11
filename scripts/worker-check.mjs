import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(fs.realpathSync('node_modules/@cloudflare/vite-plugin/package.json'));
const {Miniflare}=require('miniflare');
const root=path.resolve('.cloudflare/output/v0/workers/default');
const runtime=new Miniflare({workers:[{config:{
  name:'steam-backlog-roulette',compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],
  manifest:{mainModule:'index.js',modulesRoot:path.join(root,'bundle'),modules:{'index.js':{type:'esm',contents:fs.readFileSync(path.join(root,'bundle/index.js'),'utf8')}}},
  env:{ASSETS:{type:'assets'},HISTORY:{type:'kv'}},
  assets:{directory:path.join(root,'assets'),hasUserWorker:true,notFoundHandling:'single-page-application',runWorkerFirst:['/api/*']},
}}]});
try{
  const home=await runtime.dispatchFetch('https://app.test/');assert.equal(home.status,200);assert.match(await home.text(),/id="app"/);
  const activity=await runtime.dispatchFetch('https://app.test/activity',{headers:{Accept:'text/html'}});assert.equal(activity.status,200);assert.match(await activity.text(),/id="app"/);
  const discovery=await runtime.dispatchFetch('https://app.test/top250',{headers:{Accept:'text/html'}});assert.equal(discovery.status,200);assert.match(await discovery.text(),/id="app"/);
  assert.equal((await runtime.dispatchFetch('https://app.test/api/activity',{method:'POST'})).status,405);
  assert.equal((await runtime.dispatchFetch('https://app.test/api/steam/profile?profile=76561198000000001')).status,503);
  console.log('PASS: Cloudflare workerd serves assets, clean SPA routes and API validation.');
}finally{await runtime.dispose();}
