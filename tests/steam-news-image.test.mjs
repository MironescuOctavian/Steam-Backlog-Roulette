import {test} from 'node:test';
import assert from 'node:assert/strict';
import {steamNewsImage,extractNewsImage} from '../src/steam-news-image.ts';
test('official announcement artwork accepts Steam images and clan placeholders',()=>{
  const expected='https://clan.akamai.steamstatic.com/images/1/update.jpg';
  assert.equal(extractNewsImage('[img]{STEAM_CLAN_IMAGE}/1/update.jpg[/img]'),expected);
  assert.equal(extractNewsImage('<img alt="Update" src="'+expected+'">'),expected);
  assert.equal(extractNewsImage('[img]https://evil.test/tracker[/img][img]'+expected+'[/img]'),expected);
  assert.equal(extractNewsImage('A text-only announcement'),undefined);
  for(const url of ['javascript:alert(1)','http://clan.akamai.steamstatic.com/x','https://clan.akamai.steamstatic.com.evil.test/x','https://user@clan.akamai.steamstatic.com/x','https://clan.akamai.steamstatic.com:8443/x'])assert.equal(steamNewsImage(url),undefined);
});
