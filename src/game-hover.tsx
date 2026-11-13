import {createEffect,createSignal,For,onCleanup,Show} from 'solid-js';
import {coverUrl,type Game} from './library';
import {validateGameInfo,type GameInfo} from './game-details-model';
import {GameDetails} from './game-details';
import {useLibrary} from './library-state';
import {useLocation} from '@solidjs/router';

type Preview={appId:number;title:string;image:string;score:string;playersNow:number|null;anchor:HTMLElement};
export function GameHover(){
  const {games}=useLibrary();
  const route=useLocation();
  const [preview,setPreview]=createSignal<Preview|null>(null),[info,setInfo]=createSignal<GameInfo|null>(null);
  const [failed,setFailed]=createSignal(false),[videoFailed,setVideoFailed]=createSignal(false),[details,setDetails]=createSignal<{game:Game;playersNow:number|null}|null>(null);
  const cache=new Map<number,GameInfo>();
  let openTimer:ReturnType<typeof setTimeout>|undefined,closeTimer:ReturnType<typeof setTimeout>|undefined;
  let popup:HTMLDivElement|undefined,video:HTMLVideoElement|undefined;
  function close(){clearTimeout(openTimer);clearTimeout(closeTimer);video?.pause();setPreview(null);}
  createEffect(()=>route.pathname,()=>{close();});
  function schedule(anchor:HTMLElement){
    if(document.querySelector('dialog[open]'))return;
    clearTimeout(closeTimer);clearTimeout(openTimer);if(preview()?.anchor===anchor)return;
    openTimer=setTimeout(()=>{const appId=Number(anchor.dataset['gameId']);if(!anchor.isConnected||document.querySelector('dialog[open]')||!Number.isSafeInteger(appId)||appId<1)return;const rawPlayers=anchor.dataset['gamePlayers'];const playersNow=rawPlayers!==undefined&&rawPlayers!==''&&Number.isSafeInteger(Number(rawPlayers))&&Number(rawPlayers)>=0?Number(rawPlayers):null;setPreview({appId,title:anchor.dataset['gameTitle']??'',image:anchor.dataset['gameImage']??coverUrl(appId),score:anchor.dataset['gameScore']??'',playersNow,anchor});},300);
  }
  const leave=()=>{clearTimeout(openTimer);clearTimeout(closeTimer);closeTimer=setTimeout(close,250);};
  createEffect(()=>preview()?.appId,id=>{
    setInfo(null);setFailed(false);setVideoFailed(false);if(!id)return;
    const saved=cache.get(id);if(saved&&Date.now()-Date.parse(saved.capturedAt)<300000){setInfo(saved);return;}
    if(location.protocol==='file:'){setFailed(true);return;}
    const controller=new AbortController();
    void fetch('/api/game-details?ids='+id,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('Unavailable');const data=validateGameInfo(await response.json());if(data.appId!==id)throw Error('Invalid game');if(controller.signal.aborted)return;if(cache.size>=100)cache.clear();cache.set(id,data);setInfo(data);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
    return ()=>controller.abort();
  });
  const trailer=()=>!videoFailed()&&!matchMedia('(prefers-reduced-motion: reduce)').matches?info()?.microtrailer:null;
  function position(){
    const item=preview();if(!item||!popup)return;
    const rect=item.anchor.getBoundingClientRect(),width=popup.offsetWidth,height=popup.offsetHeight;
    let left=rect.right+12;if(left+width>innerWidth-12)left=rect.left-width-12;
    popup.style.left=Math.max(12,Math.min(left,innerWidth-width-12))+'px';
    popup.style.top=Math.max(12,Math.min(rect.top,innerHeight-height-12))+'px';
  }
  function attach(element:HTMLDivElement){popup=element;requestAnimationFrame(position);const observer=new ResizeObserver(position);observer.observe(element);onCleanup(()=>observer.disconnect());}
  createEffect(()=>true,()=>{
    const over=(event:PointerEvent)=>{if(event.pointerType==='touch')return;const anchor=(event.target as Element).closest<HTMLElement>('[data-game-id]');if(anchor&&!anchor.contains(event.relatedTarget as Node))schedule(anchor);};
    const out=(event:PointerEvent)=>{const anchor=(event.target as Element).closest('[data-game-id]');if(anchor&&!anchor.contains(event.relatedTarget as Node))leave();};
    const focus=(event:FocusEvent)=>{const anchor=(event.target as Element).closest<HTMLElement>('[data-game-id]');if(anchor&&!matchMedia('(hover: none)').matches)schedule(anchor);};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    const scroll=(event:Event)=>{if(!(event.target instanceof Node)||!popup?.contains(event.target))close();};
    const visibility=()=>{if(document.hidden)close();};
    document.addEventListener('pointerover',over);document.addEventListener('pointerout',out);document.addEventListener('focusin',focus);document.addEventListener('keydown',key);
    window.addEventListener('scroll',scroll,true);window.addEventListener('resize',close);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);document.removeEventListener('focusin',focus);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',close);close();};
  });
  function showDetails(){const item=preview();if(!item)return;setDetails({game:games().find(g=>g.appId===item.appId)??{appId:item.appId,title:item.title,image:item.image,genres:info()?.genres??[],playtimeHours:0,timeToBeatHours:null,metacritic:null,pricePaid:0,priceKnown:false,status:'Unplayed',tags:[],metadataSource:'Steam',...(item.score?{steamPositivePercent:Number(item.score)}:{})},playersNow:info()?.playersNow??item.playersNow});close();}
  return <><Show when={preview()}>{item=><div class="game-hover-card" ref={attach} role="region" aria-label={item().title+' quick preview'} onPointerEnter={()=>{clearTimeout(closeTimer);}} onPointerLeave={leave} onFocusIn={()=>clearTimeout(closeTimer)} onFocusOut={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))leave();}}>
    <div class="hover-media"><img src={item().image} alt="" width="460" height="215"/><Show when={trailer()}><video ref={video} src={trailer()!} poster={item().image} autoplay muted loop playsinline preload="none" onError={()=>setVideoFailed(true)}/></Show><button class="hover-close" aria-label="Close game preview" onClick={close}>×</button><Show when={item().score}><span class="score-badge">{item().score}% positive</span></Show></div>
    <div class="hover-content"><h3>{item().title}</h3><div class="card-genre-pills"><For each={(info()?.genres??[]).slice(0,4)}>{genre=><span class="genre-pill">{genre}</span>}</For></div>
    <div class="hover-facts"><p><span>Developer</span><strong>{info()?.developers.join(', ')||'Unavailable'}</strong></p><p><span>Release date</span><strong>{info()?.releaseDate??'Unavailable'}</strong></p><p class="hover-platforms"><span>Platforms</span><strong><For each={info()?.platforms??[]}>{platform=><span class={platform==='windows'?'i-lucide-monitor':platform==='mac'?'i-lucide-apple':'i-lucide-terminal'} aria-label={platform}/>}</For><Show when={!info()?.platforms.length}>Unavailable</Show></strong></p></div>
    <div class="meta-tray"><div class="meta-cell"><span class="meta-k">US Price</span><strong class="hover-price">{info()?.price??'Unavailable'}</strong></div><div class="meta-cell"><span class="meta-k">Playing now</span><strong class="hover-players">{(info()?.playersNow??item().playersNow)?.toLocaleString()??'Unavailable'}</strong></div></div>
    <p class="hover-loading" role="status">{!info()&&!failed()?'Loading Steam details…':failed()?'Live details unavailable.':trailer()?'Steam microtrailer · muted':'Steam store information'}</p><a class="discovery-store" href={'https://store.steampowered.com/app/'+item().appId+'/'} target="_blank" rel="noopener noreferrer">View on Steam <span class="i-lucide-arrow-up-right" aria-hidden="true"/></a><button class="game-details-button" onClick={showDetails}>Game details <span aria-hidden="true">＋</span></button></div>
  </div>}</Show><Show when={details()}>{entry=><GameDetails compact game={entry().game} fallback={entry().playersNow!==null?{playersNow:entry().playersNow}:undefined} onClose={()=>setDetails(null)}/>}</Show></>;
}
