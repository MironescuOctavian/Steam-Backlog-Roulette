import {spawnSync} from 'node:child_process';

function run(file,args=[],env=process.env){
  const result=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
if(!process.argv.includes('--cloudflare-only')){
  run('node_modules/vite-plus/bin/vp',['build'],{...process.env,CLOUDFLARE_BUILD:'0'});
  run('scripts/singlefile.mjs');
}
run('node_modules/vite-plus/bin/vp',['build'],{...process.env,CLOUDFLARE_BUILD:'1'});
