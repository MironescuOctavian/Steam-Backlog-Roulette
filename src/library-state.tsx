import {rouletteCandidates,rememberPick,tomorrowSkips,nextMidnight,type RecentPick} from './roulette-model';
import {patchGames} from './game-patch';
import {createContext,createEffect,createMemo,createSignal,onCleanup,useContext,type ParentProps} from 'solid-js';
import {loadLibrary,remainingHours,saveLibrary,validateLibrary,type Game,type SteamProfile} from './library';
import {analytics,exclusionReason,filterGames,sortLibrary,type Filters} from './planner';
import {loadPreferences,preferencesKey,validatePreferences,type Preferences} from './preferences';
import {top250} from './catalog';
import {validateActivity,type ActivityData} from './activity-model';
import {validateGameHistories,type GameHistory} from './charts';

function createLibraryState(){
  const storage:Pick<Storage,'getItem'|'setItem'>={getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)};
  const library=loadLibrary(storage);
  const savedPreferences=loadPreferences(storage);
  let currentPreferences=savedPreferences.value;
  const [preferences,setPreferences]=createSignal(savedPreferences.value);
  const [preferenceWarning,setPreferenceWarning]=createSignal(savedPreferences.warning);
  function setPreference(patch:Partial<Preferences>){
    const next=validatePreferences({...currentPreferences,...patch});
    if(!savedPreferences.warning){try{storage.setItem(preferencesKey,JSON.stringify(next));}catch{setPreferenceWarning('Preferences work for this visit but could not be saved on this device.');}}
    currentPreferences=next;setPreferences(next);
  }
  const [games,setGames]=createSignal(library.games);
  const [loaded,setLoaded]=createSignal(library.loaded);
  const [profile,setProfile]=createSignal<SteamProfile|null>(library.profile);
  const [activity,setActivity]=createSignal<ActivityData|null>(null);
  const [gameHistory,setGameHistory]=createSignal<Record<number,GameHistory>>({});
  let activityRequest:Promise<void>|undefined;
  function loadActivity(){
    return activityRequest??=Promise.all([import('./data/activity.json'),import('./data/pulse-details.json')]).then(([module,details])=>{setGameHistory(Object.fromEntries(validateGameHistories(details.default).map(g=>[g.appId,g])));setActivity(validateActivity(module.default));}).catch(error=>{activityRequest=undefined;throw error;});
  }
  const [saveMessage,setSaveMessage]=createSignal('');
  const [saveFailed,setSaveFailed]=createSignal(false);
  const [changeRevision,setChangeRevision]=createSignal(0);
  const filters=()=>preferences().filters;
  const setFilters=(next:Filters|((current:Filters)=>Filters))=>setPreference({filters:typeof next==='function'?next(currentPreferences.filters):next});
  const worstValue=()=>preferences().worstValue,setWorstValue=(value:boolean)=>setPreference({worstValue:value});
  const weeklyHours=()=>preferences().weeklyHours,setWeeklyHours=(value:number)=>setPreference({weeklyHours:value});
  const soundEnabled=()=>preferences().sound,setSoundEnabled=(value:boolean)=>setPreference({sound:value});
  const [undoStack,setUndoStack]=createSignal<{games:Game[];profile:SteamProfile|null;loaded:boolean}[]>([]);
  const activeGames=()=>loaded()?games():top250;
  const stats=createMemo(()=>analytics(games()));
  const filtered=createMemo(()=>filterGames(activeGames(),filters()));
  const libraryRows=createMemo(()=>sortLibrary(filtered(),preferences().librarySort));
  const eligible=createMemo(()=>filtered().filter(g=>!exclusionReason(g,preferences())));
  const [sessionSkipped,setSessionSkipped]=createSignal<number[]>([]),[recentPicks,setRecentPicks]=createSignal<RecentPick[]>([]);
  const [savedSkips,setSavedSkips]=createSignal<RecentPick[]>([]);
  const [skipClock,setSkipClock]=createSignal(Date.now());
  const skipTimer=setInterval(()=>setSkipClock(Date.now()),1000);
  onCleanup(()=>clearInterval(skipTimer));
  let rouletteScope='';
  createEffect(()=>loaded()?'personal:'+(profile()?.steamId??'local'):'discovery',scope=>{if(scope===rouletteScope)return;rouletteScope=scope;setSessionSkipped([]);setRecentPicks([]);try{setSavedSkips(tomorrowSkips(JSON.parse(storage.getItem('steamnext.skips.'+scope)??'[]')));}catch{setSavedSkips([]);}});
  const skippedGames=createMemo(()=>[...new Set([...sessionSkipped(),...tomorrowSkips(savedSkips(),skipClock()).map(p=>p.appId)])]);
  const rouletteGames=createMemo(()=>rouletteCandidates(eligible(),skippedGames(),recentPicks()));
  function saveSkips(next:RecentPick[]){setSavedSkips(next);try{storage.setItem('steamnext.skips.'+rouletteScope,JSON.stringify(next));}catch{setSaveMessage('Skip works for this visit but could not be saved on this device.');}}
  const skipGame=(id:number,untilTomorrow=false)=>{if(untilTomorrow)saveSkips([...tomorrowSkips(savedSkips()).filter(p=>p.appId!==id),{appId:id,at:nextMidnight()}]);else setSessionSkipped(ids=>ids.includes(id)?ids:[...ids,id]);};
  const restoreSkipped=()=>{setSessionSkipped([]);saveSkips([]);};
  const recordPick=(id:number)=>{setRecentPicks(picks=>rememberPick(picks,id));};
  function toggleExcluded(id:number){setPreference({excludedIds:preferences().excludedIds.includes(id)?preferences().excludedIds.filter(n=>n!==id):[...preferences().excludedIds,id]});}
  const genres=()=>[...new Set(activeGames().flatMap(g=>g.genres))].sort();
  const changeFilter=(patch:Partial<Filters>)=>setFilters(current=>({...current,...patch}));
  const backlog=()=>games().filter(g=>g.status!=='Completed'&&g.status!=='Dropped');
  const hoursLeft=()=>backlog().reduce((sum,g)=>sum+(remainingHours(g)??0),0);
  function applyLibrary(next:Game[],nextProfile:SteamProfile|null=profile()):boolean{
    if(library.warning)return false;
    const previous={games:games(),profile:profile(),loaded:loaded()};
    try{const valid=validateLibrary(next);saveLibrary(storage,valid,nextProfile);setUndoStack(history=>[...history.slice(-19),previous]);setGames(valid);setProfile(nextProfile);setLoaded(true);setSaveFailed(false);setSaveMessage('Library saved on this device.');setChangeRevision(n=>n+1);return true;}
    catch{setSaveFailed(true);setSaveMessage('Could not save this change. Your previous library is unchanged. Check browser storage and try again.');return false;}
  }
  function updateGame(appId:number,patch:Partial<Pick<Game,'status'|'tags'>>):boolean{
    return updateGames([appId],patch);
  }
  function updateGames(ids:number[],patch:Partial<Pick<Game,'status'|'tags'>>){const next=patchGames(games(),ids,patch);return next!==games()&&applyLibrary(next);}
  function disconnectProfile():boolean{
    if(library.warning||!profile())return false;
    const previous={games:games(),profile:profile(),loaded:loaded()};
    try{saveLibrary(storage,[],null,false);setUndoStack(history=>[...history.slice(-19),previous]);setGames([]);setProfile(null);setLoaded(false);setSaveFailed(false);setSaveMessage('Profile disconnected. Its saved library was removed from this device.');setChangeRevision(n=>n+1);return true;}
    catch{setSaveFailed(true);setSaveMessage('Could not disconnect. Your saved profile is unchanged.');return false;}
  }
  function clearLibrary():boolean{
    if(library.warning)return false;
    const previous={games:games(),profile:profile(),loaded:loaded()};
    try{saveLibrary(storage,[],null,false);setUndoStack(history=>[...history.slice(-19),previous]);setGames([]);setProfile(null);setLoaded(false);setSaveFailed(false);setSaveMessage('Returned to Top 250 discovery.');setChangeRevision(n=>n+1);return true;}
    catch{setSaveFailed(true);setSaveMessage('Could not clear the library.');return false;}
  }
  function undo(){const previous=undoStack().at(-1);if(!previous)return;try{saveLibrary(storage,previous.games,previous.profile,previous.loaded);setGames(previous.games);setProfile(previous.profile);setLoaded(previous.loaded);setUndoStack(history=>history.slice(0,-1));setSaveFailed(false);setSaveMessage('Previous library restored.');setChangeRevision(n=>n+1);}catch{setSaveFailed(true);setSaveMessage('Undo could not be saved. Your current library is unchanged.');}}
  function removeGame(id:number){const game=games().find(g=>g.appId===id);if(game&&applyLibrary(games().filter(g=>g.appId!==id)))setSaveMessage(`Removed ${game.title} from this list. Steam ownership is unchanged.`);}
  const [metadataMessage,setMetadataMessage]=createSignal('');
  createEffect(()=>loaded()?(profile()?.steamId??'local')+'|'+games().map(g=>g.appId).join(','):'',ids=>{
    if(!ids||library.warning||location.protocol==='file:')return;
    const controller=new AbortController(),identity=profile()?.steamId;
    void (async()=>{
      const pending=games().filter(g=>g.appType===undefined).map(g=>g.appId);if(!pending.length)return;
      setMetadataMessage('Loading Steam classifications…');
      const metadata=new Map<number,{appType:Game['appType'];multiplayerOnly:boolean;image?:string}>();
      try{for(let i=0;i<pending.length;i+=50){
        const batch=pending.slice(i,i+50),response=await fetch('/api/steam/metadata?ids='+batch.join(','),{signal:controller.signal});if(!response.ok)throw Error('unavailable');
        const items=await response.json();if(!Array.isArray(items)||items.length>50)throw Error('invalid');
        for(const item of items.filter(item=>batch.includes(item?.appId)&&['game','demo','software','other'].includes(item?.appType)&&typeof item?.multiplayerOnly==='boolean'))metadata.set(item.appId,item);
        if(profile()?.steamId!==identity||controller.signal.aborted)return;
      }
        const next=validateLibrary(games().map(g=>{const item=metadata.get(g.appId);return item?{...g,appType:item.appType,multiplayerOnly:item.multiplayerOnly,...(typeof item.image==='string'?{image:item.image}:{})}:g;}));
        saveLibrary(storage,next,profile());setGames(next);
        setMetadataMessage('Steam classifications loaded. Unknown entries remain eligible.');}
      catch{if(!controller.signal.aborted)setMetadataMessage('Some Steam classifications are unavailable. Unknown entries remain eligible.');}
    })();
    return ()=>controller.abort();
  });
  return {library,games,loaded,profile,activity,setActivity,loadActivity,gameHistory,setGameHistory,saveMessage,saveFailed,changeRevision,filters,setFilters,worstValue,setWorstValue,weeklyHours,setWeeklyHours,soundEnabled,setSoundEnabled,activeGames,stats,filtered,libraryRows,eligible,rouletteGames,sessionSkipped:skippedGames,recentPicks,skipGame,restoreSkipped,recordPick,genres,changeFilter,backlog,hoursLeft,applyLibrary,updateGame,updateGames,disconnectProfile,clearLibrary,undo,canUndo:()=>undoStack().length>0,removeGame,preferences,setPreference,preferenceWarning,toggleExcluded,metadataMessage};
}
const LibraryContext=createContext<ReturnType<typeof createLibraryState>>();
export function LibraryProvider(props:ParentProps){return <LibraryContext value={createLibraryState()}>{props.children}</LibraryContext>;}
export const useLibrary=()=>useContext(LibraryContext);
