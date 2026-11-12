import {defaultFilters,type Filters} from './planner.ts';
export const preferencesKey='steam-backlog.preferences.v1';
export type Preferences={filters:Filters;librarySort:string;pulseSort:string;pulsePage:number;pulseSearch:string;pulseOwned:boolean;hideMultiplayer:boolean;hideSoftware:boolean;hideDemos:boolean;excludedIds:number[];lastRoute:string;sound:boolean;weeklyHours:number;worstValue:boolean};
export const defaultPreferences:Preferences={filters:{...defaultFilters},librarySort:'default',pulseSort:'players',pulsePage:1,pulseSearch:'',pulseOwned:false,hideMultiplayer:false,hideSoftware:false,hideDemos:false,excludedIds:[],lastRoute:'/',sound:false,weeklyHours:5,worstValue:false};
export function validatePreferences(value:unknown):Preferences{
  const p=value as Preferences,f=p?.filters;
  if(!p||!f||typeof f.search!=='string'||f.search.length>300||!['all','quick','medium','epic'].includes(f.time)||!['all','backlog','never','under2','next'].includes(f.state)||typeof f.genre!=='string'||f.genre.length>100||!Number.isFinite(f.score)||f.score<0||f.score>100||!Number.isFinite(f.maxHours)||f.maxHours<0||f.maxHours>200||!['default','title','remaining','playtime','priority'].includes(p.librarySort)||!['players','peak','name'].includes(p.pulseSort)||!Number.isInteger(p.pulsePage)||p.pulsePage<1||p.pulsePage>20||typeof p.pulseSearch!=='string'||p.pulseSearch.length>300||![p.pulseOwned,p.hideMultiplayer,p.hideSoftware,p.hideDemos,p.sound,p.worstValue].every(v=>typeof v==='boolean')||!Array.isArray(p.excludedIds)||p.excludedIds.length>20000||!p.excludedIds.every(v=>Number.isSafeInteger(v)&&v>0)||!/^\/(?:activity|top250)?(?:#(?:main|roulette|library|overview|briefs|comparison|ranking))?$/.test(p.lastRoute)||!Number.isFinite(p.weeklyHours)||p.weeklyHours<1||p.weeklyHours>168)throw new Error('Invalid preferences.');
  return {...p,filters:{...f},excludedIds:[...new Set(p.excludedIds)]};
}
export function loadPreferences(storage:Pick<Storage,'getItem'>){
  try{const raw=storage.getItem(preferencesKey);return {value:raw===null?validatePreferences(defaultPreferences):validatePreferences(JSON.parse(raw)),warning:''};}
  catch{return {value:validatePreferences(defaultPreferences),warning:'Saved preferences could not be read. Using defaults without overwriting them.'};}
}
