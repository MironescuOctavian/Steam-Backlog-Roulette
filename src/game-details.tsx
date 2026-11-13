import {createEffect,createSignal,onCleanup,Show,type ParentProps} from 'solid-js';
import {coverUrl,type Game} from './library';
import {validateGameInfo,type GameInfo} from './game-details-model';
import {GameInsights} from './game-insights';
const cache=new Map<number,GameInfo>();
export function GameDetails(props:{game:Game|null;owned?:boolean;compact?:boolean;initialTab?:string;fallback?:{playersNow?:number|null|undefined;peakToday?:number|null|undefined;peakAllTime?:number|null|undefined}|undefined;onClose:()=>void;children?:ParentProps['children']}){
  let dialog!:HTMLDialogElement;
  const [tab,setTab]=createSignal(props.initialTab??'overview');
  const [research,setResearch]=createSignal(false);
  const [info,setInfo]=createSignal<GameInfo|null>(null),[loading,setLoading]=createSignal(false),[failed,setFailed]=createSignal(false);
  const [revision,setRevision]=createSignal(0);
  const playersNow=()=>info()?.playersNow??props.fallback?.playersNow??null;
  function selectTab(next:string){setTab(next);if(next!=='overview')setResearch(true);}
  createEffect(()=>[props.game?.appId,revision()] as const,([id])=>{
    if(!id){if(dialog.open)dialog.close();return;}
    selectTab(props.initialTab??'overview');setResearch((props.initialTab??'overview')!=='overview');
    const saved=cache.get(id);setInfo(saved??null);setFailed(false);setLoading(false);
    const anchor=props.compact?document.activeElement?.closest('.game-card'):null;
    const position=()=>{
      dialog.classList.toggle('card-details-modal',Boolean(anchor));
      if(!anchor)return;
      const rect=anchor.getBoundingClientRect(),width=Math.min(rect.width+420,920,window.innerWidth-24);
      dialog.style.width=width+'px';
      dialog.style.left=Math.max(12,Math.min(rect.left+(rect.width-width)/2,window.innerWidth-width-12))+'px';
      dialog.style.top=Math.max(12,Math.min(rect.top,window.innerHeight-dialog.offsetHeight-12))+'px';
    };
    const frame=requestAnimationFrame(()=>{if(!dialog.open)dialog.showModal();dialog.querySelector('.details-body')?.scrollTo(0,0);position();});
    const observer=new ResizeObserver(position);observer.observe(dialog);
    window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
    const controller=new AbortController();
    if(location.protocol!=='file:'&&(!saved||Date.now()-Date.parse(saved.capturedAt)>300000)){
      setLoading(true);void fetch('/api/game-details?ids='+id,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Unavailable');const value=validateGameInfo(await response.json());if(value.appId!==id)throw Error('Invalid game');if(controller.signal.aborted)return;if(cache.size>=100)cache.clear();cache.set(id,value);setInfo(value);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    }
    return ()=>{cancelAnimationFrame(frame);controller.abort();observer.disconnect();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);dialog.style.removeProperty('width');dialog.style.removeProperty('left');dialog.style.removeProperty('top');};
  });
  onCleanup(()=>{if(dialog.open)dialog.close();});
  return <dialog class="modal game-details-modal" ref={dialog} aria-labelledby="game-info-title" onClose={props.onClose} onClick={e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}>
    <Show when={props.game}>{game=><>
      <header class="details-header">
        <div class="details-identity"><img class="details-cover" src={game().image??coverUrl(game().appId)} alt="" width="120" height="56" /><div><p class="eyebrow">{props.owned?'IN YOUR LIBRARY':'DISCOVER ON STEAM'}</p><h2 id="game-info-title">{game().title}</h2></div></div>
        <div class="details-header-actions"><a class="steam-button" href={`https://store.steampowered.com/app/${game().appId}/`} target="_blank" rel="noopener noreferrer"><span class="i-lucide-external-link" aria-hidden="true" /> View on Steam</a><button class="modal-close" aria-label="Close game details" onClick={()=>dialog.close()}>×</button></div>
        <div class="details-tabs" role="group" aria-label="Game information"><button aria-pressed={tab()==='overview'?'true':'false'} onClick={()=>selectTab('overview')}>Overview</button><button aria-pressed={tab()==='players'?'true':'false'} onClick={()=>selectTab('players')}>Players</button><button aria-pressed={tab()==='prices'?'true':'false'} onClick={()=>selectTab('prices')}>Prices</button><button aria-pressed={tab()==='updates'?'true':'false'} onClick={()=>selectTab('updates')}>Updates</button></div>
      </header>
      <div class="details-body">
        <div hidden={tab()!=='overview'} class="details-overview">
          <div class="details-about"><h3>About the game</h3><p class="details-description">{info()?.description||'Explore this game on Steam for its full description and latest store information.'}</p><p class="details-loading" role="status">{loading()?'Loading details from Steam…':failed()?'Steam details are unavailable. Your library is unchanged.':location.protocol==='file:'?'Live details are available in the hosted app.':info()?'Steam data checked '+new Date(info()!.capturedAt).toLocaleString():''}</p><Show when={failed()}><button onClick={()=>setRevision(n=>n+1)}>Retry details</button></Show><div class="details-facts"><p><strong>Developer</strong><span>{info()?.developers.join(', ')||'Unavailable'}</span></p><p><strong>Genres</strong><span>{info()?.genres.join(' · ')||game().genres.join(' · ')||'Unavailable'}</span></p><p><strong>Platforms</strong><span>{info()?.platforms.join(' · ')||'Unavailable'}</span></p></div></div>
          <aside class="details-at-glance"><h3>At a glance</h3><dl class="details-stats"><div><dt>Playing now</dt><dd>{playersNow()?.toLocaleString()??'Unavailable'}</dd></div><div><dt>Steam reviews</dt><dd>{game().steamPositivePercent!==undefined?game().steamPositivePercent+'% positive':'Unavailable'}</dd></div><div><dt>Release date</dt><dd>{info()?.releaseDate||'Unavailable'}</dd></div><div><dt>Current US store price</dt><dd>{info()?.price??'Unavailable'}</dd></div></dl><Show when={props.owned}><p class="details-owned"><strong>{game().playtimeHours}h</strong> played · <strong>{game().status}</strong>{game().timeToBeatHours!==null?' · ~'+game().timeToBeatHours+'h to beat':''}</p><a class="details-launch" href={`steam://run/${game().appId}`}><span class="i-lucide-gamepad-2" aria-hidden="true" /> Launch game</a></Show><div class="details-library-tools">{props.children}</div></aside>
        </div>
        <Show when={research()}><div hidden={tab()==='overview'}><GameInsights appId={game().appId} view={tab()} playersNow={playersNow()} fallbackPeakToday={props.fallback?.peakToday} fallbackPeakAllTime={props.fallback?.peakAllTime} /></div></Show>
      </div>
    </>}</Show>
  </dialog>;
}
