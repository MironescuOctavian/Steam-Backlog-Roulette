import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function deploy(run=spawnSync,env=process.env,args=process.argv.slice(2)){
  let directory,file;
  try{
    const options=['node_modules/cf/bin/cf','deploy','--prebuilt',...args];
    if(env.STEAM_API_KEY?.trim()){
      directory=mkdtempSync(path.join(tmpdir(),'steamnext-secrets-'));
      file=path.join(directory,'secrets.json');
      writeFileSync(file,JSON.stringify({STEAM_API_KEY:env.STEAM_API_KEY.trim()}),{mode:0o600});
      options.push('--secrets-file',file);
    }
    const result=run(process.execPath,options,{stdio:'inherit',env});
    if(result.error)throw result.error;
    return result.status??1;
  }finally{
    if(file)unlinkSync(file);
    if(directory)rmdirSync(directory);
  }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))process.exitCode=deploy();
