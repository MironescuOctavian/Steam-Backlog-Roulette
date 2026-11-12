import {defaultFilters,filterGames,type Filters} from './planner.ts';
import type {Game} from './library.ts';
export function filterChips(f:Filters){
  const chips:{key:keyof Filters;label:string;patch:Partial<Filters>}[]=[];
  if(f.search.trim())chips.push({key:'search',label:'Search: '+f.search.trim(),patch:{search:''}});
  if(f.state!==defaultFilters.state)chips.push({key:'state',label:({never:'Never played',under2:'Under 2 hours played',started:'Already started',next:'Play Next',all:'All library'} as Record<string,string>)[f.state]??f.state,patch:{state:defaultFilters.state}});
  if(f.genre)chips.push({key:'genre',label:f.genre,patch:{genre:''}});
  if(f.time!=='all')chips.push({key:'time',label:({quick:'Under 10h to finish',medium:'10–30h to finish',epic:'50h+ to finish'} as Record<string,string>)[f.time]??f.time,patch:{time:'all'}});
  if(f.score)chips.push({key:'score',label:'Reviews '+f.score+'%+',patch:{score:0}});
  if(f.maxHours<200)chips.push({key:'maxHours',label:'At most '+f.maxHours+'h remaining',patch:{maxHours:200}});
  return chips;
}
export function filterRecovery(games:Game[],f:Filters){
  for(const chip of filterChips(f)){const count=filterGames(games,{...f,...chip.patch}).length;if(count)return {...chip,count};}
  return null;
}
export function unknownTimeMatches(games:Game[],f:Filters){
  return f.time!=='all'||f.maxHours<200?filterGames(games,{...f,time:'all',maxHours:200}).filter(g=>g.timeToBeatHours===null).length:0;
}
