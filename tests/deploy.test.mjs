import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {deploy} from '../scripts/deploy.mjs';

test('deployment passes only the Steam build secret through a temporary JSON file and removes it',()=>{
  let file;
  const key='test-only-$literal-secret';
  const code=deploy((command,args,options)=>{
    assert.equal(command,process.execPath);
    assert.deepEqual(args.slice(0,4),['node_modules/cf/bin/cf','deploy','--prebuilt','--dry-run']);
    assert.ok(!args.join(' ').includes(key));
    assert.equal(options.stdio,'inherit');
    file=args[args.indexOf('--secrets-file')+1];
    assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),{STEAM_API_KEY:key});
    return {status:0};
  },{STEAM_API_KEY:key,UNRELATED_SECRET:'must not be uploaded'},['--dry-run']);
  assert.equal(code,0);assert.equal(existsSync(file),false);assert.equal(existsSync(path.dirname(file)),false);
});
test('deployment preserves existing Worker secrets when no build key is supplied',()=>{
  assert.equal(deploy((_command,args)=>{assert.ok(!args.includes('--secrets-file'));return {status:7};},{},[]),7);
});
test('temporary secret is removed when the deploy process fails to start',()=>{
  let file;
  assert.throws(()=>deploy((_command,args)=>{file=args.at(-1);return {error:Error('spawn failed')};},{STEAM_API_KEY:'test-only'},[]),/spawn failed/);
  assert.equal(existsSync(file),false);
});
