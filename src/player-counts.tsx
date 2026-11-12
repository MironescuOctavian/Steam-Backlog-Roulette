import {createEffect,createSignal,Show} from 'solid-js';
import {validatePlayers,type PlayerCount} from './game-details-model';
export function usePlayerCounts(ids:()=>number[]){
  const [counts,setCounts]=createSignal<Record<number,PlayerCount>>({});
  createEffect(()=>ids().join(','),key=>{
    if(location.protocol==='file:')return;
    const requested=key.split(',').filter(Boolean).map(Number).filter(id=>!counts()[id]||Date.now()-Date.parse(counts()[id]!.capturedAt)>300000),controller=new AbortController();
    void(async()=>{for(let i=0;i<requested.length;i+=24){const batch=requested.slice(i,i+24),response=await fetch('/api/game-players?ids='+batch.join(','),{signal:controller.signal});if(!response.ok)throw Error('Player counts unavailable');const entries=validatePlayers(await response.json());if(entries.some(g=>!batch.includes(g.appId)))throw Error('Invalid player IDs');if(controller.signal.aborted)return;setCounts(current=>({...current,...Object.fromEntries(entries.map(g=>[g.appId,g]))}));}})().catch(()=>{});
    return ()=>controller.abort();
  });return counts;
}
export function PlayerCountBadge(props:{count:PlayerCount|undefined}){return <p class="card-players" title={props.count?'Steam · checked '+new Date(props.count.capturedAt).toLocaleString():'Counts load for the visible games in the hosted app'}><span class="status-dot" /><Show when={props.count?.playersNow!==null&&props.count?.playersNow!==undefined} fallback={<span>Player count unavailable</span>}><strong>{props.count?.playersNow?.toLocaleString()}</strong><span>playing · checked {props.count?new Date(props.count.capturedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}</span></Show></p>;}
