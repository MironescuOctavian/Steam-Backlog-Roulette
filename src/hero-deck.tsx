import {createEffect,createSignal,For} from 'solid-js';
import {top250} from './catalog';
import {coverUrl} from './library';
export function HeroDeck(){
  const [offset,setOffset]=createSignal(0),[paused,setPaused]=createSignal(false);
  let deck!:HTMLElement;
  const examples=()=>Array.from({length:4},(_,i)=>top250[(offset()+i)%top250.length]!);
  createEffect(()=>true,()=>{const timer=setInterval(()=>{if(!paused()&&!document.hidden&&!deck.matches(':hover,:focus-within')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)setOffset(n=>(n+4)%top250.length);},7000);return ()=>clearInterval(timer);});
  return <aside ref={deck} class="feature-art hero-deck fixed-deck" aria-label="Game discoveries from Steam 250"><div class="deck-cards"><For each={examples()}>{(game,index)=><article class="deck-card" aria-label={game.title} data-slot={index()} style={{'--slot':index()}} data-game-id={game.appId} data-game-title={game.title} data-game-image={game.image??coverUrl(game.appId)} data-game-score={game.steamPositivePercent}><div class="deck-card-inner"><img class="deck-cover" src={game.image??coverUrl(game.appId)} alt="" width="460" height="215"/><div class="deck-caption"><strong>{game.title}</strong><a class="deck-visit" target="_blank" rel="noopener noreferrer" href={'https://store.steampowered.com/app/'+game.appId+'/'}>Visit on Steam <span class="i-lucide-arrow-up-right" aria-hidden="true"/></a></div></div></article>}</For></div><div class="deck-bottom"><span>YOUR NEXT GAMES</span><button class="deck-pause" onClick={()=>setPaused(v=>!v)} aria-pressed={paused()?'true':'false'} aria-label={paused()?'Resume hero rotation':'Pause hero rotation'}><span class={paused()?'i-lucide-play':'i-lucide-pause'} aria-hidden="true"/>{paused()?'Resume':'Pause'}</button></div></aside>;
}
