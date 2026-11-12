import {test} from 'node:test';
import assert from 'node:assert/strict';
import {steamNewsImage,extractNewsImage,extractNewsImages} from '../src/steam-news-image.ts';
test('all included images keep their order, deduplicate and reject unsafe hosts',()=>{
  const first='https://clan.akamai.steamstatic.com/images/1/update.jpg',second='https://shared.cloudflare.steamstatic.com/store_item_assets/test.jpg';
  assert.deepEqual(extractNewsImages(`[img]${first}[/img]${'text '.repeat(500)}[img=wide]${second}[/img]<img src="${first}">[img]https://evil.test/pic.jpg[/img]`),[first,second]);
  assert.deepEqual(extractNewsImages(null),[]);
});
test('official announcement artwork accepts Steam images and clan placeholders',()=>{
  const expected='https://clan.akamai.steamstatic.com/images/1/update.jpg';
  assert.equal(extractNewsImage('[img]{STEAM_CLAN_IMAGE}/1/update.jpg[/img]'),expected);
  assert.equal(extractNewsImage('<img alt="Update" src="'+expected+'">'),expected);
  assert.equal(extractNewsImage('[img]https://evil.test/tracker[/img][img]'+expected+'[/img]'),expected);
  assert.equal(extractNewsImage('A text-only announcement'),undefined);
  for(const url of ['javascript:alert(1)','http://clan.akamai.steamstatic.com/x','https://clan.akamai.steamstatic.com.evil.test/x','https://user@clan.akamai.steamstatic.com/x','https://clan.akamai.steamstatic.com:8443/x'])assert.equal(steamNewsImage(url),undefined);
});
