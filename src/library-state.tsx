import {createContext,createSignal,useContext,type ParentProps} from 'solid-js';
import {loadLibrary,remainingHours,saveLibrary,type Game,type SteamProfile} from './library';
import {analytics,defaultFilters,filterGames,type Filters} from './planner';
import {top250} from './catalog';
import {validateActivity,type ActivityData} from './activity-model';
import activitySnapshot from './data/activity.json';

function createLibraryState(){
  const storage:Pick<Storage,'getItem'|'setItem'>={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
  const library=loadLibrary(storage);
  const [games,setGames]=createSignal(library.games);
  const [loaded,setLoaded]=createSignal(library.loaded);
  const [profile,setProfile]=createSignal<SteamProfile|null>(library.profile);
  const [activity,setActivity]=createSignal<ActivityData>(validateActivity(activitySnapshot));
  const [saveMessage,setSaveMessage]=createSignal('');
  const [saveFailed,setSaveFailed]=createSignal(false);
  const [filters,setFilters]=createSignal<Filters>({...defaultFilters});
  const [worstValue,setWorstValue]=createSignal(false);
  const [weeklyHours,setWeeklyHours]=createSignal(5);
  const [soundEnabled,setSoundEnabled]=createSignal(true);
  const activeGames=()=>loaded()?games():top250;
  const stats=()=>analytics(games());
  const filtered=()=>filterGames(activeGames(),filters());
  const genres=()=>[...new Set(activeGames().flatMap(g=>g.genres))].sort();
  const changeFilter=(patch:Partial<Filters>)=>setFilters(current=>({...current,...patch}));
  const backlog=()=>games().filter(g=>g.status!=='Completed'&&g.status!=='Dropped');
  const hoursLeft=()=>backlog().reduce((sum,g)=>sum+(remainingHours(g)??0),0);
  function applyLibrary(next:Game[],nextProfile:SteamProfile|null=profile()):boolean{
    if(library.warning)return false;
    try{saveLibrary(storage,next,nextProfile);setGames(next);setProfile(nextProfile);setLoaded(true);setSaveFailed(false);setSaveMessage('Library saved on this device.');return true;}
    catch{setSaveFailed(true);setSaveMessage('Could not save this change. Your previous library is unchanged. Check browser storage and try again.');return false;}
  }
  function updateGame(appId:number,patch:Partial<Pick<Game,'status'|'playNext'|'tags'>>):boolean{
    return applyLibrary(games().map(g=>g.appId===appId?{...g,...patch,userManaged:true}:g));
  }
  return {library,games,loaded,profile,activity,setActivity,saveMessage,saveFailed,filters,setFilters,worstValue,setWorstValue,weeklyHours,setWeeklyHours,soundEnabled,setSoundEnabled,activeGames,stats,filtered,genres,changeFilter,backlog,hoursLeft,applyLibrary,updateGame};
}
const LibraryContext=createContext<ReturnType<typeof createLibraryState>>();
export function LibraryProvider(props:ParentProps){return <LibraryContext value={createLibraryState()}>{props.children}</LibraryContext>;}
export const useLibrary=()=>useContext(LibraryContext);
