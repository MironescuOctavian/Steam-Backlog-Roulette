import {createEffect,createSignal,For} from 'solid-js';
import {coverUrl} from './library';

const featured=[{appId:1145360,title:'Hades',icon:'8a3fca36a00883e8066263ad35dd15d77a1f9abc',header:''},{appId:367520,title:'Hollow Knight',icon:'f6ab055c2366237200b1a31cccbd6cf81e436d72',header:'3c3489495136b26b34f8a9543c7f5645b99d388c/'},{appId:413150,title:'Stardew Valley',icon:'35d1377200084a4034238c05b0c8930451e2fb40',header:''},{appId:620,title:'Portal 2',icon:'25a5a16b2423bf7487ac5340b5b0948cef48c5f8',header:'faffc0f560786e2f05104a8d2fac837c6969bf13/'}];
export function HeroDeck(props:{paused:boolean;onResume:()=>void}){
  const [front,setFront]=createSignal(0);
  const [paused,setPaused]=createSignal(false);
  const [autoPaused,setAutoPaused]=createSignal(false);
  const stopped=()=>autoPaused()||props.paused;
  function toggleMotion(){if(stopped()){setAutoPaused(false);props.onResume();}else setAutoPaused(true);}
  let reduced=false;
  createEffect(()=>true,()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{reduced=preference.matches;};update();preference.addEventListener('change',update);
    const timer=setInterval(()=>{if(!reduced&&!paused()&&!stopped()&&!document.hidden)setFront(n=>(n+1)%4);},5000);
    return ()=>{clearInterval(timer);preference.removeEventListener('change',update);};
  });
  return <aside class="feature-art hero-deck" aria-label="Four featured Steam games" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusIn={()=>setPaused(true)} onFocusOut={()=>setPaused(false)}><div class="orbit orbit-one" /><div class="orbit orbit-two" /><div class="deck-cards"><For each={featured}>{(game,index)=>{const depth=()=>((index()-front()+4)%4);return <article class="deck-card" style={{'--depth':depth(),'z-index':4-depth()}} aria-label={game.title}><img class="deck-cover" src={coverUrl(game.appId).replace('header.jpg',game.header+'header.jpg')} alt={game.title} width="460" height="215" /><div class="deck-caption"><img class="deck-icon" src={'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/'+game.appId+'/'+game.icon+'.jpg'} alt="" /><div><strong>{game.title}</strong><span>{depth()===0?'YOUR NEXT FAVORITE?':'ANOTHER WORLD AWAITS'}</span></div><span class="i-lucide-arrow-up-right" aria-hidden="true" /></div></article>;}}</For></div><div class="deck-bottom"><span>Good games don’t expire.</span><div class="deck-controls"><button type="button" class="deck-pause" aria-pressed={stopped()?"true":"false"} onClick={toggleMotion}>{stopped()?"Resume motion":"Pause motion"}</button><button type="button" aria-label="Shuffle featured games" onClick={()=>setFront(n=>(n+1)%4)}><span class="i-lucide-shuffle" aria-hidden="true" />Shuffle</button></div></div></aside>;
}
