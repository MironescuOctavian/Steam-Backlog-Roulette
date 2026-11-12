import {createEffect,createSignal,onCleanup,Show,type ParentProps} from 'solid-js';
import {coverUrl,type Game} from './library';
import {validateGameInfo,type GameInfo} from './game-details-model';
const cache=new Map<number,GameInfo>();
export function GameDetails(props:{game:Game|null;owned?:boolean;onClose:()=>void;children?:ParentProps['children']}){
  let dialog!:HTMLDialogElement;
  const [info,setInfo]=createSignal<GameInfo|null>(null),[loading,setLoading]=createSignal(false),[failed,setFailed]=createSignal(false);
  const [revision,setRevision]=createSignal(0);
  createEffect(()=>[props.game?.appId,revision()] as const,([id])=>{
    if(!id){if(dialog.open)dialog.close();return;}
    const saved=cache.get(id);setInfo(saved??null);setFailed(false);setLoading(false);
    const frame=requestAnimationFrame(()=>{if(!dialog.open)dialog.showModal();});
    const controller=new AbortController();
    if(location.protocol!=='file:'&&(!saved||Date.now()-Date.parse(saved.capturedAt)>300000)){
      setLoading(true);void fetch('/api/game-details?ids='+id,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Unavailable');const value=validateGameInfo(await response.json());if(value.appId!==id)throw Error('Invalid game');if(controller.signal.aborted)return;cache.set(id,value);setInfo(value);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    }
    return ()=>{cancelAnimationFrame(frame);controller.abort();};
  });
  onCleanup(()=>{if(dialog.open)dialog.close();});
  return <dialog class="modal game-details-modal" ref={dialog} aria-labelledby="game-info-title" onClose={props.onClose} onClick={e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}><button class="modal-close" aria-label="Close game details" onClick={()=>dialog.close()}>×</button><Show when={props.game}>{game=><><img class="details-cover" src={game().image??coverUrl(game().appId)} alt="" width="460" height="215" /><div class="details-body"><p class="eyebrow">{props.owned?'IN YOUR LIBRARY':'DISCOVER ON STEAM'}</p><h2 id="game-info-title">{game().title}</h2><p class="details-description">{info()?.description||'Explore this game on Steam for its full description and latest store information.'}</p><p class="details-loading" role="status">{loading()?'Loading details from Steam…':failed()?'Steam details are unavailable. Your library is unchanged.':location.protocol==='file:'?'Live details are available in the hosted app.':info()?'Steam data checked '+new Date(info()!.capturedAt).toLocaleString():''}</p><Show when={failed()}><button onClick={()=>setRevision(n=>n+1)}>Retry details</button></Show><dl class="details-stats"><div><dt>Playing now</dt><dd>{info()?.playersNow?.toLocaleString()??'Unavailable'}</dd></div><div><dt>Steam reviews</dt><dd>{game().steamPositivePercent!==undefined?game().steamPositivePercent+'% positive':'Unavailable'}</dd></div><div><dt>Release date</dt><dd>{info()?.releaseDate||'Unavailable'}</dd></div><div><dt>Current US store price</dt><dd>{info()?.price??'Unavailable'}</dd></div></dl><div class="details-facts"><p><strong>Developer</strong><span>{info()?.developers.join(', ')||'Unavailable'}</span></p><p><strong>Genres</strong><span>{info()?.genres.join(' · ')||game().genres.join(' · ')||'Unavailable'}</span></p><p><strong>Platforms</strong><span>{info()?.platforms.join(' · ')||'Unavailable'}</span></p></div><Show when={props.owned}><p class="details-owned"><strong>{game().playtimeHours}h</strong> played · <strong>{game().status}</strong>{game().timeToBeatHours!==null?' · ~'+game().timeToBeatHours+'h to beat':''}</p></Show><a class="steam-button" href={`https://store.steampowered.com/app/${game().appId}/`} target="_blank" rel="noopener noreferrer">View on Steam</a><Show when={props.owned}><a class="details-launch" href={`steam://run/${game().appId}`}>Launch game</a></Show><div class="details-library-tools">{props.children}</div></div></>}</Show></dialog>;
}
