import {For,Show} from 'solid-js';
import {useLibrary} from './library-state';
import {filterChips,filterRecovery,unknownTimeMatches} from './library-filters';

export function LibraryViewToggle(){
  const {preferences,setPreference}=useLibrary();
  return <div class="library-view-toggle" role="group" aria-label="Library view"><button aria-pressed={preferences().libraryView==='grid'?'true':'false'} onClick={()=>setPreference({libraryView:'grid'})}><span class="i-lucide-layout-grid" aria-hidden="true" />Grid</button><button aria-pressed={preferences().libraryView==='list'?'true':'false'} onClick={()=>setPreference({libraryView:'list'})}><span class="i-lucide-list" aria-hidden="true" />List</button></div>;
}
export function LibraryFilterSummary(){
  const {activeGames,filters,filtered,changeFilter}=useLibrary();
  const unknown=()=>unknownTimeMatches(activeGames(),filters());
  return <div class="library-filter-summary"><div class="active-filter-chips" aria-label="Active library filters"><For each={filterChips(filters())}>{chip=><button onClick={()=>changeFilter(chip.patch)} aria-label={'Remove filter: '+chip.label}>{chip.label}<span class="i-lucide-x" aria-hidden="true" /></button>}</For></div><p role="status"><strong>{filtered().length.toLocaleString()} matches</strong><Show when={unknown()>0}> · {unknown().toLocaleString()} otherwise matching games excluded because completion time is unknown. <button onClick={()=>changeFilter({time:'all',maxHours:200})}>Include unknown times</button></Show></p></div>;
}
export function LibraryFilterRecovery(){
  const {activeGames,filters,changeFilter}=useLibrary();
  const recovery=()=>filterRecovery(activeGames(),filters());
  return <Show when={recovery()}>{r=><button class="filter-recovery" onClick={()=>changeFilter(r().patch)}>Remove “{r().label}” · show {r().count} games</button>}</Show>;
}
