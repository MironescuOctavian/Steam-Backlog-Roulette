import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthlySeries,recentGameSamples,chartDate,windowDate,seriesPath} from '../src/charts.ts';

test('long-term charts use named calendar months and separate averages from peaks',()=>{
  const rows=[{month:'October 2026',average:100.5,peak:300},{month:'Last 30 Days',average:111,peak:500},{month:'September 2012',average:10,peak:40},{month:'Invalid 2020',average:0,peak:0}];
  const points=monthlySeries(rows);
  assert.deepEqual(points,[{at:Date.UTC(2012,8,1),average:10,peak:40},{at:Date.UTC(2026,9,1),average:100.5,peak:300}]);
  assert.equal(rows[0].month,'October 2026');
});
test('recent game charts exclude the older coarse tail and preserve real gaps',()=>{
  const hour=3600000,points=[[1,900],[30*hour,800],[60*hour,100],[61*hour,110],[62*hour,90]];
  assert.deepEqual(recentGameSamples(points),points.slice(2));
  assert.deepEqual(recentGameSamples([]),[]);
  assert.equal(points.length,5);
  assert.match(seriesPath([[10,10],[20,20]],100,30,100,[0,40]),/^M25,.*L50,/);
});
test('chart date labels scale with the selected time range',()=>{
  const at=Date.UTC(2026,10,12,14,30);
  assert.match(chartDate(at,86400000),/14:30/);
  assert.doesNotMatch(chartDate(at,7*86400000),/:/);
  assert.match(chartDate(at,365*86400000),/Nov 2026/);
  assert.equal(chartDate(at,10*365*86400000),'2026');
});

test('window date labels include UTC time for short windows and date only for multi-day windows',()=>{
  const at=Date.UTC(2026,10,12,14,30);
  assert.match(windowDate(at,48*3600000),/12 Nov 2026, 14:30/);
  assert.doesNotMatch(windowDate(at,7*86400000),/:/);
  assert.match(windowDate(at,7*86400000),/12 Nov 2026/);
});
