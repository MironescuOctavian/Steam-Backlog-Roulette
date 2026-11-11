import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseChartPage,createExtendedChart} from '../server/extended-chart.mjs';
const pageHtml=page=>Array.from({length:25},(_,i)=>{const rank=(page-1)*25+i+1;return `<tr><td>${rank}.</td><td><a href="/app/${rank}">Game &amp; ${rank}</a></td><td class="num">${2000-rank}</td></tr>`;}).join('');
test('extended chart parser reads actual rank, ID, title and count fields',()=>{
  const rows=parseChartPage(pageHtml(1));assert.equal(rows.length,25);assert.deepEqual(rows[0],{appid:1,rank:1,name:'Game & 1',concurrent_in_game:1999});
  assert.throws(()=>parseChartPage('<html>unavailable</html>'));
});
test('extended ranking collects exactly 1000 unique entries and caches for an hour',async()=>{
  let now=Date.parse('2026-11-11T08:00:00Z');let calls=0;let invalid=false;
  const chart=createExtendedChart({now:()=>now,request:async input=>{calls++;const page=Number(String(input).split('.').at(-1));return {ok:true,text:async()=>pageHtml(invalid?1:page)};}});
  const data=await chart();assert.equal(data.ranks.length,1000);assert.equal(data.ranks.at(-1).rank,1000);assert.equal(calls,40);
  await chart();assert.equal(calls,40);
  now+=3600001;invalid=true;const stale=await chart();assert.equal(stale.stale,true);assert.equal(stale.ranks.length,1000);
  assert.equal(calls,80);await chart();assert.equal(calls,80,'failed sources are not retried on every request');
});
