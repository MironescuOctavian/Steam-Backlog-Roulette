import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createMetadataService} from '../server/metadata.mjs';
const source='https://steam250.com/top250';
const response=await fetch(source,{signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error('Ranking source unavailable; existing snapshot is unchanged.');
const html=await response.text();
const decode=text=>text.replace(/<[^>]*>/g,'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&apos;',"'").replaceAll('&nbsp;',' ').trim();
const games=[];
for(const row of html.matchAll(/<div id=(\d+)>([\s\S]*?)(?=<div id=\d+>|<\/section>)/g)){
  const rank=Number(row[1]);if(rank<1||rank>250)continue;
  const body=row[2];
  const appId=Number(body.match(/href=https:\/\/club\.steam250\.com\/app\/(\d+)/)?.[1]);
  const title=decode(body.match(/class=title><div><a[^>]*>([\s\S]*?)<\/a>/)?.[1]??'');
  const genre=decode(body.match(/class="g3 tag"[^>]*>([\s\S]*?)<\/a>/)?.[1]??'');
  const positivePercent=Number(body.match(/class="meter rating"[^>]*>[\s\S]*?<\/span>\s*(\d+)%/)?.[1]);
  assert.ok(Number.isSafeInteger(appId)&&appId>0&&title&&positivePercent>=0&&positivePercent<=100,'Invalid ranking entry');
  games.push({rank,appId,title,genres:genre?[genre]:[],positivePercent});
}
assert.equal(games.length,250,'Source structure changed; snapshot not written');
assert.equal(new Set(games.map(g=>g.appId)).size,250,'Duplicate Steam IDs');
assert.ok(games.every((g,i)=>g.rank===i+1),'Ranking must be contiguous');
const metadata=createMetadataService();
for(let i=0;i<games.length;i+=50){const details=await metadata(games.slice(i,i+50).map(g=>g.appId));for(const detail of details){const game=games.find(g=>g.appId===detail.appId);Object.assign(game,{appType:detail.appType,multiplayerOnly:detail.multiplayerOnly,...(detail.image?{image:detail.image}:{})});}}
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile('src/data/top250.json',JSON.stringify({source,updatedAt:new Date().toISOString(),games},null,2)+'\n');
console.log('Updated 250 verified ranking entries from Steam 250.');
