import {createMemo,For,Show} from 'solid-js';
import {useLibrary} from './library-state';
import {coverUrl} from './library';
export function RouletteModes(){
  const {loaded,filters,changeFilter}=useLibrary();
  const modes=[{state:'backlog',title:'All matches',detail:'Let chance decide'},{state:'never',title:'Start something new',detail:'Zero hours played'},{state:'started',title:'Continue playing',detail:'Unfinished games you started'},{state:'next',title:'From Play Next',detail:'Your personal shortlist'}];
  const active=()=>['never','started','next'].includes(filters().state)?filters().state:'backlog';
  return <div class="roulette-modes" role="group" aria-label="Roulette mode"><For each={modes}>{mode=><button disabled={!loaded()&&mode.state!=='backlog'} aria-pressed={active()===mode.state?'true':'false'} onClick={()=>changeFilter({state:mode.state})}><strong>{mode.title}</strong><small>{mode.detail}</small></button>}</For><p>Modes update the shared library filter. Length filters describe completion time, not session length.</p></div>;
}
export function RouletteSession(props:{onDetails:(id:number)=>void}){
  const {activeGames,sessionSkipped,restoreSkipped,recentPicks}=useLibrary();
  const games=createMemo(()=>new Map(activeGames().map(g=>[g.appId,g])));
  const recent=createMemo(()=>recentPicks().filter(p=>games().has(p.appId)));
  return <div class="roulette-session"><Show when={sessionSkipped().length}><div class="session-skips"><p><strong>{sessionSkipped().length} skipped this visit.</strong> These games are still in your library.</p><button id="restore-skipped" onClick={()=>restoreSkipped()}>Restore skipped games</button></div></Show><Show when={recent().length}><div class="recent-heading"><h3>Recent picks <span>this visit</span></h3><p>Recent picks step aside while other matching games remain.</p></div><ul class="recent-picks"><For each={recent()}>{pick=><li><button onClick={e=>{e.currentTarget.focus({preventScroll:true});props.onDetails(pick.appId);}}><img src={games().get(pick.appId)!.image??coverUrl(pick.appId)} alt="" width="64" height="30" loading="lazy" /><span><strong>{games().get(pick.appId)!.title}</strong><small>{new Date(pick.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></span></button></li>}</For></ul></Show><p class="session-footnote">Skipped games and recent picks last for this visit and reset when you switch profiles or reload.</p></div>;
}
