import {createSignal,For,onCleanup,Show} from 'solid-js';
import {parseSteam} from '../../../imports';
import {validateProfile,coverUrl,type Game,type SteamProfile} from '../../../library';
import {validatePrices,type GamePrice} from '../../../game-details-model';
import {backlogRoast,calculatorSummary,priceCents} from '../../../calculator-model';

export default function Calculator(){
  const [query,setQuery]=createSignal(''),[busy,setBusy]=createSignal(false),[error,setError]=createSignal('');
  const [profile,setProfile]=createSignal<SteamProfile|null>(null),[games,setGames]=createSignal<Game[]>([]);
  const [prices,setPrices]=createSignal<Record<number,GamePrice>>({}),[checked,setChecked]=createSignal(0);
  const [ready,setReady]=createSignal(false),[warning,setWarning]=createSignal('');
  let controller:AbortController|undefined;
  onCleanup(()=>controller?.abort());
  const summary=()=>calculatorSummary(games(),prices());
  const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
  const dustCollectors=()=>games().filter(g=>g.playtimeHours<5/60&&priceCents(prices()[g.appId])!==null).sort((a,b)=>(priceCents(prices()[b.appId])??0)-(priceCents(prices()[a.appId])??0)).slice(0,10);
  async function calculate(event:SubmitEvent){
    event.preventDefault();if(busy())return;
    const input=String(new FormData(event.currentTarget as HTMLFormElement).get('profile')??'').trim();
    if(location.protocol==='file:'){setError('Profile calculation is available in the hosted app.');return;}
    controller=new AbortController();const request=controller;
    setBusy(true);setError('');setWarning('');setReady(false);setProfile(null);setGames([]);setPrices({});setChecked(0);
    try{
      const response=await fetch('/api/steam/profile?'+new URLSearchParams({profile:input}),{signal:request.signal});
      const payload=await response.json();
      if(!response.ok)throw Error(typeof payload.error==='string'?payload.error:'Could not load this public profile.');
      const owner=validateProfile(payload.profile);if(!owner)throw Error('Invalid Steam profile.');
      const library=parseSteam(payload.steam,[]).map((game,index)=>({...game,playtimeHours:payload.steam.response.games[index].playtime_forever/60}));
      setProfile(owner);setGames(library);
      let failed=false;
      for(let i=0;i<library.length;i+=24){
        const ids=library.slice(i,i+24).map(g=>g.appId);
        try{
          const result=await fetch('/api/game-prices?ids='+ids.join(','),{signal:request.signal});
          if(!result.ok)throw Error('Prices unavailable');
          const rows=validatePrices(await result.json());if(rows.some(p=>!ids.includes(p.appId)))throw Error('Invalid price IDs');
          if(request.signal.aborted)return;
          setPrices(current=>({...current,...Object.fromEntries(rows.map(p=>[p.appId,p]))}));
        }catch(e){if(request.signal.aborted)throw e;failed=true;}
        setChecked(Math.min(i+24,library.length));
      }
      if(failed)setWarning('Some Steam price requests failed. Unavailable prices are excluded; submit again to retry.');
      setReady(true);
    }catch(e){setError(request.signal.aborted?'Calculation cancelled.':e instanceof Error?e.message:'Steam is unavailable.');}
    finally{setBusy(false);}
  }
  return <section class="calculator-page" aria-labelledby="calculator-title">
    <div class="calculator-heading"><p class="eyebrow">THE DAMAGE REPORT</p><h1 id="calculator-title">Your library has value.<br/><span>So does your free time.</span></h1><p class="calculator-intro">A financial report your backlog didn’t ask for.</p></div>
    <form class="calculator-form" onSubmit={calculate} aria-busy={busy()?'true':'false'}>
      <label for="calculator-profile">Public Steam profile URL, custom handle, or Steam64 ID</label>
      <div><input id="calculator-profile" name="profile" value={query()} onInput={e=>setQuery(e.currentTarget.value)} required maxlength="300" placeholder="steamcommunity.com/id/your-handle" disabled={busy()}/><button class="calculator-submit" disabled={busy()}>{busy()?'Calculating…':'Roast me'}</button><Show when={busy()}><button type="button" onClick={()=>controller?.abort()}>Cancel</button></Show></div>
      <p>No login needed. Profile and Game details must be public. This lookup does not replace your saved backlog.</p>
    </form>
    <Show when={busy()}><p class="calculator-progress" role="status">{profile()?`Checking current US prices · ${checked()} / ${games().length} games`:'Loading public Steam library…'}</p></Show>
    <Show when={error()}><p class="calculator-error" role="alert">{error()}</p></Show>
    <Show when={ready()&&profile()}>
      <div class="calculator-results" id="calculator-overview">
        <div class="calculator-profile"><Show when={profile()!.avatar}><img src={profile()!.avatar} alt="" width="48" height="48"/></Show><div><h2>{profile()!.name}’s damage report</h2><a href={profile()!.url} target="_blank" rel="noopener noreferrer">View public Steam profile ↗</a></div></div>
        <p class="calculator-roast">{backlogRoast(summary().total,summary().unplayed)}</p>
        <article class="calculator-value"><p>LIBRARY VALUE AT TODAY’S US STORE PRICES</p><strong>{summary().priced?money(summary().value):'Unavailable'}</strong><p>Current catalogue value, not money you actually spent.</p><small>{summary().priced} / {summary().total} games priced · {summary().total-summary().priced} unavailable and excluded. Free games contribute $0.</small></article>
        <Show when={warning()}><p class="calculator-error" role="status">{warning()}</p></Show>
        <div class="calculator-stats"><article><span>Games owned</span><strong>{summary().total.toLocaleString()}</strong></article><article><span>Hours played</span><strong>{summary().hours.toLocaleString(undefined,{maximumFractionDigits:1})}</strong></article><article><span>Catalogue value / hour</span><strong>{summary().hours>0&&summary().priced?money(summary().value/summary().hours):'—'}</strong></article></div>
        <article class="calculator-shame" id="calculator-shame"><h2>The pile of shame</h2><p><strong>{summary().unplayed.toLocaleString()}</strong> unplayed games · {summary().total?Math.round(summary().unplayed/summary().total*100):0}% of this library</p><div class="calculator-meter" role="img" aria-label={`${summary().unplayed} of ${summary().total} games unplayed`}><span style={{width:(summary().total?summary().unplayed/summary().total*100:0)+'%'}}/></div><p>{summary().priced?money(summary().unplayedValue):'Value unavailable'} in priced games with less than five minutes played.</p></article>
        <section class="calculator-games" id="calculator-games"><h2>Most expensive dust collectors</h2><Show when={dustCollectors().length} fallback={<p>No priced unplayed games to report.</p>}><ol><For each={dustCollectors()}>{game=><li><img src={coverUrl(game.appId)} alt="" loading="lazy" width="92" height="43"/><a href={'https://store.steampowered.com/app/'+game.appId+'/'} target="_blank" rel="noopener noreferrer">{game.title}</a><strong>{money(priceCents(prices()[game.appId])!)}</strong></li>}</For></ol></Show></section>
        <p class="calculator-note">US store prices may include current discounts. Bundles, gifts, delisted games and regional pricing can change the comparison. Actual spending and historical lows are not available here.</p>
      </div>
    </Show>
  </section>;
}
