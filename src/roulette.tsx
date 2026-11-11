import { createSignal, For, onCleanup } from 'solid-js';
import { coverUrl, type Game } from './library';
import { buildReel } from './roulette-model';
import './roulette.css';

export function Roulette(props: { games: Game[]; discovery?:boolean; onWinner: (game: Game) => void; onTick?: () => void; onStart?: () => void }) {
  const [spinning,setSpinning]=createSignal(false);
  const [cards,setCards]=createSignal<Game[]>([]);
  const [result,setResult]=createSignal('');
  let viewport!: HTMLDivElement;
  let track!: HTMLDivElement;
  let animation: Animation | undefined;
  let frame=0;
  let disposed=false;
  const pool=()=>props.games.filter(g=>g.status!=='Completed' && g.status!=='Dropped');
  async function spin() {
    if(spinning() || pool().length===0)return;
    const reel=buildReel(pool());
    setCards(reel.cards);
    setSpinning(true);
    setResult('Spinning… Your matching games are locked in for this spin.');
    props.onStart?.();
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    if(disposed)return;
    const destination=()=>viewport.clientWidth/2-90-reel.winnerIndex*192;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    animation=track.animate([{transform:'translateX(0px)'},{transform:`translateX(${destination()}px)`}],{
      duration:reduced ? 80 : 5200,easing:'cubic-bezier(.12,.7,.15,1)',fill:'forwards',
    });
    let lastCard=-1;
    const tick=()=>{
      if(!animation || disposed)return;
      const x=new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
      const current=Math.floor((viewport.clientWidth/2-x)/192);
      if(current!==lastCard){lastCard=current;props.onTick?.();}
      frame=requestAnimationFrame(tick);
    };
    if(!reduced)frame=requestAnimationFrame(tick);
    try {
      await animation.finished;
      if(disposed)return;
      track.style.transform=`translateX(${destination()}px)`;
      animation.cancel();
      setResult(`Selected: ${reel.winner.title}`);
      props.onWinner(reel.winner);
    } catch {
      if(!disposed)setResult('Spin interrupted. Try again.');
    } finally {
      cancelAnimationFrame(frame);
      if(!disposed)setSpinning(false);
    }
  }
  onCleanup(()=>{disposed=true;animation?.cancel();cancelAnimationFrame(frame);});
  return <section class="roulette-panel" aria-labelledby="spin-title">
    <div class="filter-heading"><div><p class="eyebrow">THE DECISION-FREE ZONE</p><h2 id="spin-title">Leave your next game to chance.</h2></div><span class="section-note">{pool().length} eligible games</span></div>
    <div class="roulette-viewport" ref={viewport} aria-hidden="true">
      <div class="roulette-pointer" />
      <div class="roulette-track" ref={track}><For each={cards().length ? cards() : pool().slice(0,8)}>{g=><div class="reel-card"><img src={coverUrl(g.appId)} alt="" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><span>{g.title}</span></div>}</For></div>
    </div>
    <div class="reel-footer"><span>{pool().length ? props.discovery?'Top-rated games. Your filters. Equal chances.':'This library. Your filters. Equal chances.' : 'No eligible games. Adjust your filters above.'}</span><button type="button" class="spin-button ready" disabled={spinning() || pool().length===0} onClick={spin}>{spinning() ? 'SPINNING…' : 'SPIN THE ROULETTE'}<span class="i-lucide-shuffle" aria-hidden="true" /></button></div>
    <p class="roulette-result" role="status" aria-live="polite">{result()}</p>
  </section>;
}
