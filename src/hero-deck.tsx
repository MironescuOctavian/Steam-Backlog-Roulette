import {createEffect,createSignal,For} from 'solid-js';
import snapshot from './data/hero.json';
import {coverUrl} from './library';
type HeroGame={appId:number;title:string;rank:number;image?:string;playersNow:number|null};
export function HeroDeck(){
  const [pool,setPool]=createSignal<HeroGame[]>(snapshot.games);
  const [cards,setCards]=createSignal<HeroGame[]>(snapshot.games.slice(0,4));
  const [sampledAt,setSampledAt]=createSignal(snapshot.sampledAt);
  const [changing,setChanging]=createSignal(false);
  let scene!:HTMLElement;
  createEffect(()=>true,()=>{
    const controller=new AbortController(),timeouts:ReturnType<typeof setTimeout>[]=[];
    let next=4,visible=true;
    const observer=new IntersectionObserver(entries=>{visible=Boolean(entries[0]?.isIntersecting);});observer.observe(scene);
    if(location.protocol!=='file:')void fetch('/api/hero',{signal:controller.signal}).then(async response=>{if(!response.ok)return;const data=await response.json();if(!Number.isFinite(Date.parse(data?.sampledAt))||!Array.isArray(data.games)||data.games.length!==25||data.games.some((g:HeroGame)=>!Number.isSafeInteger(g.appId)||g.appId<1||typeof g.title!=='string'||(!Number.isInteger(g.rank)||g.rank<1||g.rank>25)||!(g.playersNow===null||Number.isSafeInteger(g.playersNow)&&g.playersNow>=0)||g.image&&!/^https:\/\/shared\.(?:akamai|cloudflare|fastly)\.steamstatic\.com\/store_item_assets\//.test(g.image)))return;setPool(data.games);setCards(data.games.slice(0,4));setSampledAt(data.sampledAt);}).catch(()=>{});
    const timer=setInterval(()=>{
      if(document.hidden||!visible||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      setChanging(true);
      for(let slot=0;slot<4;slot++){const game=pool()[(next+slot)%pool().length]!;timeouts.push(setTimeout(()=>setCards(current=>current.map((old,i)=>i===slot?game:old)),400+slot*100));}
      next=(next+4)%pool().length;timeouts.push(setTimeout(()=>setChanging(false),1300));
    },6500);
    return ()=>{controller.abort();observer.disconnect();clearInterval(timer);timeouts.forEach(clearTimeout);};
  });
  return <aside class={['feature-art','hero-deck','fixed-deck',{'changing':changing()}]} ref={scene} aria-label="Four featured games from Steam’s 25 most-played games"><div class="orbit orbit-one" /><div class="orbit orbit-two" /><div class="deck-cards"><For each={[0,1,2,3]}>{slot=><a class="deck-card" target="_blank" rel="noopener noreferrer" href={`https://store.steampowered.com/app/${cards()[slot]?.appId}/`} data-slot={slot} style={{'--slot':slot}} aria-label={cards()[slot]?.title}><img class="deck-cover" src={cards()[slot]?.image??coverUrl(cards()[slot]?.appId??0)} alt={cards()[slot]?.title} width="460" height="215" onError={e=>{e.currentTarget.style.visibility='hidden';}} onLoad={e=>{e.currentTarget.style.visibility='visible';}} /><span class="deck-rank">#{cards()[slot]?.rank}</span><div class="deck-caption"><div><strong>{cards()[slot]?.title}</strong><span>{cards()[slot]?.playersNow?.toLocaleString()??'—'} PLAYING · STEAM</span></div></div></a>}</For></div><div class="deck-bottom"><span>25 MOST-PLAYED · AUTOMATIC ROTATION</span><span>Snapshot {new Date(sampledAt()).toLocaleDateString()}</span></div></aside>;
}
