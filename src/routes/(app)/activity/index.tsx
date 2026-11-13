import {useNavigate} from '@solidjs/router';
import {SteamActivity} from '../../../activity';
import {useLibrary} from '../../../library-state';
import {defaultFilters} from '../../../planner';
import type {Game} from '../../../library';
import {createEffect,createSignal,Show} from 'solid-js';

export default function ActivityPage(){
  const {activity,setActivity,loadActivity,games,loaded,library,setFilters}=useLibrary();
  const [error,setError]=createSignal('');
  let disposed=false;
  async function load(){setError('');try{await loadActivity();}catch{if(!disposed)setError('Steam pulse could not load. Please try again.');}}
  createEffect(()=>true,()=>{void load();return ()=>{disposed=true;};});
  const navigate=useNavigate();
  function openBacklog(game?:Game){
    if(game)setFilters({...defaultFilters,search:game.title,state:'all'});
    navigate(game?'/#library':'/#roulette');
  }
  return <Show when={activity()} fallback={<section class="activity-loading" aria-live="polite"><p class="eyebrow">STEAM PULSE</p><h1>{error()?'Unable to load activity':'Loading Steam pulse…'}</h1><p>{error()||'Getting the latest saved ranking ready.'}</p><Show when={error()}><button onClick={()=>location.reload()}>Reload page</button></Show></section>}>{data=><SteamActivity data={data()} onData={setActivity} games={games()} loaded={loaded()} readOnly={Boolean(library.warning)} onBacklog={openBacklog} />}</Show>;
}
