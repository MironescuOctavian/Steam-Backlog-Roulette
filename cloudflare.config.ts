import {bindings,defineConfig} from 'cf/config';

export default defineConfig({worker:{
  name:'steam-backlog-roulette',
  entrypoint:'./server/worker.mjs',
  compatibilityDate:'2026-10-01',
  compatibilityFlags:['nodejs_compat'],
  assets:{notFoundHandling:'single-page-application',runWorkerFirst:['/api/*']},
  env:{ASSETS:bindings.assets(),STEAM_API_KEY:bindings.secret(),HISTORY:bindings.kv()},
  observability:{enabled:true},
}});
