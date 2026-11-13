import {createEffect,createMemo,createSignal,For,onCleanup,type ParentProps,Show} from 'solid-js';
import {coverUrl,type Game} from './library';
import {paginationPages,sortActivity,validateActivity,type ActivityData,type ActivityGame} from './activity-model';
import './activity.css';
import {GameDetails} from './game-details';
import {usePlayerCounts} from './player-counts';
import {useLibrary} from './library-state';
import {validateGameHistories} from './charts';

export function SteamActivity(props:{data:ActivityData;onData:(data:ActivityData)=>void;games:Game[];loaded:boolean;readOnly:boolean;onBacklog:(game?:Game)=>void}) {
  const {preferences,setPreference,gameHistory,setGameHistory}=useLibrary();
  const [historyFailed,setHistoryFailed]=createSignal(false);
  const [historyRevision,setHistoryRevision]=createSignal(0);
  const search=()=>preferences().pulseSearch,setSearch=(value:string)=>setPreference({pulseSearch:value});
  const ownedOnly=()=>props.loaded&&preferences().pulseOwned,setOwnedOnly=(value:boolean)=>setPreference({pulseOwned:value});
  const sort=()=>preferences().pulseSort,setSort=(value:string)=>setPreference({pulseSort:value});
  const page=()=>preferences().pulsePage,setPage=(value:number)=>setPreference({pulsePage:value});
  const [busy,setBusy]=createSignal(false);
  const [refreshFailed,setRefreshFailed]=createSignal(false);
  const [message,setMessage]=createSignal('Showing a captured Steam snapshot.');
  let request:AbortController|undefined;let disposed=false;let timer:ReturnType<typeof setInterval>|undefined;
  const libraryById=createMemo(()=>new Map(props.games.map(g=>[g.appId,g])));
  const own=(id:number)=>libraryById().get(id);
  const unfinished=(g:Game)=>g.status!=='Completed'&&g.status!=='Dropped';
  const rows=createMemo(()=>sortActivity(props.data.games.filter(g=>g.title.toLowerCase().includes(search().trim().toLowerCase())&&(!ownedOnly()||Boolean(own(g.appId)&&unfinished(own(g.appId)!)))),sort()));
  const pageCount=()=>Math.max(1,Math.ceil(rows().length/50));
  const currentPage=()=>Math.min(page(),pageCount());
  const visibleRows=()=>rows().slice((currentPage()-1)*50,currentPage()*50);
  const releasePlayers=usePlayerCounts(()=>props.data.releases.slice(0,10).map(g=>g.appId));
  createEffect(()=>historyRevision()+'|'+visibleRows().map(g=>g.appId).join(','),key=>{
    if(location.protocol==='file:')return;
    const ids=key.split('|')[1]!.split(',').filter(Boolean).map(Number).filter(id=>!gameHistory()[id]||Date.parse(gameHistory()[id]!.capturedAt)<Date.now()-3600000),controller=new AbortController();
    void (async()=>{
      setHistoryFailed(false);let batchFailed=false;
      for(let i=0;i<ids.length;i+=8){
        const batch=ids.slice(i,i+8);
        try{
          const response=await fetch('/api/game-history?ids='+batch.join(','),{signal:controller.signal});if(!response.ok)throw Error('unavailable');
          const entries=validateGameHistories(await response.json());if(entries.length>8||entries.some(g=>!batch.includes(g.appId)))throw Error('invalid');
          if(controller.signal.aborted)return;
          setGameHistory(current=>({...current,...Object.fromEntries(entries.map(g=>[g.appId,g]))}));
        }catch{if(controller.signal.aborted)return;batchFailed=true;}
      }
      if(!controller.signal.aborted&&batchFailed)setHistoryFailed(true);
    })();
    return ()=>controller.abort();
  });

  function goToPage(next:number,fromBottom=false){
    setPage(Math.max(1,Math.min(next,pageCount())));
    if(fromBottom)requestAnimationFrame(()=>{const heading=document.getElementById('ranking-title');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'instant'});});
  }
  const pagination=(bottom=false)=><div class="pulse-pagination" id={bottom?undefined:'pulse-results'}><p role="status">Showing <strong>{rows().length?(currentPage()-1)*50+1:0}–{Math.min(currentPage()*50,rows().length)}</strong> of <strong>{rows().length.toLocaleString()}</strong> games</p><nav aria-label={bottom?'Bottom ranking pages':'Ranking pages'}><button aria-label="Previous page" disabled={currentPage()===1} onClick={()=>goToPage(currentPage()-1,bottom)}>‹</button><For each={paginationPages(pageCount(),currentPage())}>{n=>typeof n==='number'?<button aria-label={`Page ${n}`} aria-current={currentPage()===n?'page':undefined} onClick={()=>goToPage(n,bottom)}>{n}</button>:<span aria-hidden="true">…</span>}</For><button aria-label="Next page" disabled={currentPage()===pageCount()} onClick={()=>goToPage(currentPage()+1,bottom)}>›</button></nav></div>;
  const [chosen,setChosen]=createSignal<ActivityGame|null>(null);
  const popupGame=createMemo(()=>{const g=chosen();if(!g)return null;return own(g.appId)??{appId:g.appId,title:g.title,genres:['Unknown'],playtimeHours:0,timeToBeatHours:null,metacritic:null,pricePaid:0,priceKnown:false,status:'Unplayed' as const,tags:[],metadataSource:'Steam' as const,...(g.image?{image:g.image}:{}),...(g.reviewPercent!==null?{steamPositivePercent:g.reviewPercent}:{})};});
  const peakToday=(g:ActivityGame)=>{
    const values=[g.peakToday,gameHistory()[g.appId]?.peakToday,g.playersNow].filter((n):n is number=>n!==null&&n!==undefined);
    return values.length?Math.max(...values):null;
  };
  const peakAllTime=(g:ActivityGame)=>{
    const values=[gameHistory()[g.appId]?.peakAllTime,gameHistory()[g.appId]?.peakToday,g.peakToday,g.playersNow].filter((n):n is number=>n!==null&&n!==undefined);
    return values.length?Math.max(...values):null;
  };
  function openGame(game:ActivityGame,button:HTMLButtonElement){button.focus({preventScroll:true});setChosen(game);}
  async function refresh(){
    if(busy())return;
    if(location.protocol==='file:'){setMessage('This standalone file contains a dated snapshot. Open the hosted app for refreshed activity.');return;}
    setBusy(true);setRefreshFailed(false);const controller=new AbortController();request=controller;
    const timeout=setTimeout(()=>controller.abort(),45000);
    try{const response=await fetch('/api/activity',{signal:request.signal});if(!response.ok)throw new Error('Could not refresh Steam activity. Your last snapshot is still available.');const data=validateActivity(await response.json());if(!disposed){props.onData(data);setRefreshFailed(data.stale);setMessage(data.stale?'Steam is unavailable; showing the last successful observation.':'Steam activity refreshed. Cached for five minutes.');}}
    catch(e){if(!disposed){setRefreshFailed(true);setMessage(controller.signal.aborted?'Refresh timed out. Your saved counts are still available. Retry when your connection is ready.':e instanceof Error?e.message:'Steam is unavailable. Your saved counts are still available.');}}
    finally{clearTimeout(timeout);if(!disposed)setBusy(false);}
  }
  createEffect(()=>true,()=>{void refresh();timer=setInterval(()=>{if(!document.hidden)void refresh();},300000);});
  onCleanup(()=>{disposed=true;request?.abort();if(timer)clearInterval(timer);});
  const action=(game:ActivityGame)=><a class="pulse-store" href={`https://store.steampowered.com/app/${game.appId}/`} target="_blank" rel="noopener noreferrer">Steam ↗</a>;
  const brief=(title:string,kicker:string,games:ActivityGame[],metric:(g:ActivityGame)=>ParentProps['children'],empty:string)=><section class="pulse-brief"><p class="eyebrow">{kicker}</p><h2>{title}</h2><ul><For each={games.slice(0,10)}>{g=><li><button class="brief-game-open" data-game-id={g.appId} data-game-title={g.title} data-game-image={g.image??coverUrl(g.appId)} data-game-score={g.reviewPercent??undefined} data-game-players={(releasePlayers()[g.appId]?.playersNow??g.playersNow)??undefined} onClick={e=>openGame(g,e.currentTarget)}><img src={g.image??coverUrl(g.appId)} alt="" loading="lazy" width="70" height="33" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><strong class="brief-game-title">{g.title}</strong><span class="brief-game-metric">{metric(g)}</span></button>{action(g)}</li>}</For></ul><Show when={!games.length}><p class="pulse-empty">{empty}</p></Show></section>;
  return <div class="activity-page">
    <div class="activity-heading"><div><p class="eyebrow">CHARTS · A LITTLE CONTEXT FOR YOUR NEXT PICK</p><h1>See the crowd.<br /><span>Find your next game.</span></h1><p>Player activity can spark an idea. Your unfinished library is still the place to start.</p></div></div>
    <section id="overview" class="steam-online" aria-labelledby="online-title"><div class="pulse-section-heading"><div><p class="eyebrow">THE PLATFORM AT A GLANCE</p><h2 id="online-title">Concurrent Steam users</h2></div><Show when={props.data.online} fallback={<p class="pulse-empty">Steam’s online-user count is unavailable. Refresh to try again.</p>}><div class="online-values"><span><strong>{props.data.online!.samples.at(-1)?.[1].toLocaleString()}</strong> online now</span><span><strong>{Math.max(...props.data.online!.samples.map(p=>p[1])).toLocaleString()}</strong> 48h peak</span></div></Show></div><p class="pulse-caption">Source: Steam’s public online-user feed (latest snapshot and 48-hour peak). Global in-game totals and multi-week history are unavailable from this source.</p><div class="activity-toolbar"><div><span class="pulse-date">Steam update {new Date(props.data.sampledAt).toLocaleString()}</span><Show when={props.data.extendedCapturedAt}><p>Extended ranking captured {new Date(props.data.extendedCapturedAt!).toLocaleString()} · hourly refresh</p></Show><p role="status" class={refreshFailed()?'refresh-error':''}>{message()}</p></div><button disabled={busy()} onClick={()=>void refresh()}>{busy()?'Refreshing…':refreshFailed()?'Retry refresh':'Refresh activity'}</button></div></section>
    <For each={props.data.warnings}>{warning=><p class="pulse-warning">{warning}</p>}</For>
    <div id="briefs" class="pulse-briefs">
      {brief('Where everyone is playing','01 / LIVE CROWD',props.data.games,g=>g.playersNow!==null?<><b class="brief-num brief-num-players">{g.playersNow.toLocaleString()}</b> <span class="brief-label">playing now</span></>:<span class="brief-label">Count unavailable</span>,'Current player counts are unavailable.')}
      {brief('Moving up the weekly chart','02 / GAINING GROUND',props.data.movers,g=>g.weeklyChange!==null?<><b class="brief-num brief-num-gain">↑ {g.weeklyChange}</b> <span class="brief-label">places this week</span></>:<span class="brief-label">Rank unavailable</span>,'No rank gainers are available from this snapshot.')}
      {brief('Fresh from the store','03 / NEW ARRIVALS',props.data.releases,g=>{const players=()=>releasePlayers()[g.appId]?.playersNow??g.playersNow;return <><span class="release-player-count">{players()!==null&&players()!==undefined?<><b class="brief-num brief-num-players">{players()!.toLocaleString()}</b> <span class="brief-label">playing now</span></>:<span class="brief-label">Count unavailable</span>}</span>{g.price?<><b class="brief-num brief-num-price">{g.price}</b> <span class="brief-label">US store price</span></>:<span class="brief-label">Price unavailable</span>}</>;},'Steam’s new-release feed is unavailable.')}
      {brief('Crowd-approved picks','04 / REVIEW FAVORITES',props.data.acclaimed,g=>g.reviewPercent!==null?<><b class="brief-num brief-num-score">{g.reviewPercent}%</b> <span class="brief-label">positive</span> <span class="brief-sep" aria-hidden="true">·</span> <b class="brief-num brief-num-reviews">{g.reviewCount?.toLocaleString()??'0'}</b> <span class="brief-label">reviews</span></>:<span class="brief-label">Reviews unavailable</span>,'Review summaries are unavailable or have fewer than 50 reviews.')}
    </div>
    <section id="ranking" class="pulse-ranking" aria-labelledby="ranking-title"><div class="pulse-section-heading"><div><p class="eyebrow">TOP 1,000 · REPORTED PLAYER COUNTS</p><h2 id="ranking-title" tabindex={-1}>Find familiar names in the crowd</h2></div><button class="backlog-link" onClick={()=>props.onBacklog()}>Go to my backlog →</button></div><div class="pulse-table-filters"><label>Search games<input type="search" maxlength="300" value={search()} onInput={e=>{setSearch(e.currentTarget.value);setPage(1);}} placeholder="Find a game in the top 1,000…" /></label><label>Sort by<select value={sort()} onChange={e=>{setSort(e.currentTarget.value);setPage(1);}}><option value="players">Players now</option><option value="peak">Peak today</option><option value="name">Title</option></select></label><label class="owned-filter"><input type="checkbox" checked={ownedOnly()} disabled={!props.loaded} onChange={e=>{setOwnedOnly(e.currentTarget.checked);setPage(1);}} /> Loaded library only · unfinished</label></div>
      <p class="pulse-caption">{rows().length} results</p><p class="pulse-caption">All-time peaks use Steam Charts records and fall back to highest observed Steam counts when unavailable. — means unavailable. <Show when={historyFailed()}><button onClick={()=>setHistoryRevision(n=>n+1)}>Retry game history</button></Show></p>
      {pagination()}<div class="pulse-table-scroll"><table class="pulse-table"><thead><tr><th scope="col">Game</th><th scope="col">Players now</th><th scope="col">Peak today</th><th scope="col">All-time peak</th><th scope="col">Loaded library</th><th scope="col">Steam</th></tr></thead><tbody><For each={visibleRows()}>{g=><tr class={own(g.appId)?'owned-row':''}><th scope="row"><button class="pulse-game-cell pulse-game-open" data-game-id={g.appId} data-game-title={g.title} data-game-image={g.image??coverUrl(g.appId)} data-game-score={g.reviewPercent??undefined} data-game-players={g.playersNow??undefined} onClick={e=>openGame(g,e.currentTarget)}><span class="pulse-rank">#{g.rank}</span><img src={g.image??coverUrl(g.appId)} alt="" loading="lazy" width="100" height="47" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><span><strong>{g.title}</strong><small>{g.reviewPercent!==null?`${g.reviewPercent}% positive Steam reviews`:'Review score unavailable'}</small></span></button></th><td class="numeric">{g.playersNow?.toLocaleString()??'—'}</td><td class="numeric muted-number">{peakToday(g)?.toLocaleString()??'—'}</td><td class="numeric all-time-peak" title={gameHistory()[g.appId]?.peakAllTime!==null&&gameHistory()[g.appId]?.peakAllTime!==undefined?'Steam Charts record · checked '+new Date(gameHistory()[g.appId]!.capturedAt).toLocaleString():'Highest observed Steam count · Steam Charts record unavailable'}>{peakAllTime(g)?.toLocaleString()??'—'}</td><td><Show when={own(g.appId)} fallback={<span class="pulse-unowned">{props.loaded?'Not in this library':'Load a profile to match'}</span>}><div class="pulse-owned-actions"><span>{own(g.appId)?.status}</span><button class="pulse-link" onClick={()=>props.onBacklog(own(g.appId))}>Open backlog</button></div></Show></td><td>{action(g)}</td></tr>}</For></tbody></table></div>{pagination(true)}
      <Show when={!rows().length}><div class="pulse-empty"><h3>{ownedOnly()?'No unfinished library games match this ranking.':'No matching games in this top 1,000.'}</h3><p>{ownedOnly()?'Your library can include great games outside this chart. Try clearing the ownership filter.':'Try a shorter title or clear your search to see the ranking again.'}</p><div class="empty-actions"><button onClick={()=>{setSearch('');setOwnedOnly(false);setPage(1);}}>Clear search & filters</button><button onClick={()=>props.onBacklog()}>Return to backlog</button></div></div></Show>
    </section>
    <GameDetails game={popupGame()} owned={Boolean(chosen()&&own(chosen()!.appId))} initialTab="players" fallback={chosen()?{playersNow:chosen()!.playersNow,peakToday:peakToday(chosen()!),peakAllTime:peakAllTime(chosen()!)}:undefined} onClose={()=>setChosen(null)}><Show when={chosen()&&own(chosen()!.appId)}><button class="popup-backlog" onClick={()=>{const game=chosen();setChosen(null);if(game)props.onBacklog(own(game.appId));}}>Open in my backlog</button></Show></GameDetails>
    <p class="pulse-sources">Sources: <a href="https://store.steampowered.com/charts/mostplayed" target="_blank" rel="noopener noreferrer">Steam</a> and <a href="https://steamcharts.com/top" target="_blank" rel="noopener noreferrer">Steam Charts</a>. Official Steam counts and today’s peaks refresh every five minutes for Steam’s top 100; extended counts come from an hourly Steam Charts snapshot. The combined list is sorted by reported player counts. Today’s peak uses Steam’s official count where reported and Steam Charts or current observed counts elsewhere. Review favorites use this list and the new-release feed, with at least 50 reviews. US store prices are asking prices, not prices paid. Observed history records this app’s Steam top-100 counts. All-time peaks use Steam Charts records and fall back to highest observed Steam counts when unavailable.</p>
  </div>;
}

