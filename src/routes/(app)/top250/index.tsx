import {createEffect,createMemo,createSignal,For,Show} from 'solid-js';
import {useHref} from '@solidjs/router';
import {top250,catalogSource,catalogUpdatedAt} from '../../../catalog';
import {coverUrl} from '../../../library';
import {useLibrary} from '../../../library-state';
import {GameDetails} from '../../../game-details';
import {usePlayerCounts,PlayerCountBadge} from '../../../player-counts';
import {usePrices,PriceBadge} from '../../../game-prices';

export default function Top250(){
  const {games,loaded}=useLibrary();
  const [search,setSearch]=createSignal(''),[expanded,setExpanded]=createSignal(false);
  const matches=createMemo(()=>top250.filter(g=>g.title.toLowerCase().includes(search().trim().toLowerCase())));
  const visible=()=>expanded()?matches():matches().slice(0,6);
  const counts=usePlayerCounts(()=>visible().map(g=>g.appId)),prices=usePrices(()=>visible().map(g=>g.appId));
  const [detailsId,setDetailsId]=createSignal<number|null>(null);
  const owned=createMemo(()=>new Set(games().map(g=>g.appId)));
  const home=useHref(()=>'/#library');
  createEffect(()=>true,()=>{requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));});
  return <section class="discovery-page" aria-labelledby="discovery-title">
    <div class="discovery-heading"><div><p class="eyebrow">COMMUNITY FAVORITES · TOP 250</p><h1 id="discovery-title">Your next <span>great discovery.</span></h1><p>A collection worth exploring. Browse the highest-rated games from Steam 250, without changing your loaded library.</p></div><a class="discovery-back" href={home()}>Back to my backlog →</a></div>
    <div class="discovery-toolbar"><label>Find a game<input type="search" maxlength="300" value={search()} onInput={e=>{setSearch(e.currentTarget.value);setExpanded(false);}} placeholder="Search the Top 250…" /></label><p role="status">{matches().length} games · <a href={catalogSource} target="_blank" rel="noopener noreferrer">Steam 250 ↗</a><br /><small>Snapshot {new Date(catalogUpdatedAt).toLocaleDateString()}</small></p></div>
    <ul class="game-grid discovery-grid" aria-label="Top 250 games"><For each={visible()}>{game=><li class="game-card"><div class="game-cover"><img src={game.image??coverUrl(game.appId)} alt="" loading="lazy" width="460" height="215" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><span class="catalog-rank">#{game.rank}</span><span class="score-badge">{game.steamPositivePercent}% positive</span></div><div class="game-content"><h2>{game.title}</h2><p class="game-genres">{game.genres.join(' · ')}</p><PriceBadge price={prices()[game.appId]} /><PlayerCountBadge count={counts()[game.appId]} /><Show when={loaded()&&owned().has(game.appId)}><p class="discovery-owned">✓ In your loaded library</p></Show><a class="discovery-store" href={`https://store.steampowered.com/app/${game.appId}/`} target="_blank" rel="noopener noreferrer">View on Steam</a><button class="game-details-button" onClick={e=>{e.currentTarget.focus({preventScroll:true});setDetailsId(game.appId);}}>Game details <span aria-hidden="true">＋</span></button></div></li>}</For></ul>
    <Show when={matches().length>6}><div class="discovery-expand"><button aria-expanded={expanded()?'true':'false'} onClick={()=>setExpanded(!expanded())}>{expanded()?'Show fewer games':`Explore all ${matches().length} games`}</button></div></Show>
    <Show when={!matches().length}><div class="library-empty"><h2>No matching games.</h2><button onClick={()=>setSearch('')}>Clear search</button></div></Show>
    <GameDetails compact game={top250.find(g=>g.appId===detailsId())??null} onClose={()=>setDetailsId(null)} />
  </section>;
}
