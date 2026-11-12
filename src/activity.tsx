import {createEffect,createMemo,createSignal,For,onCleanup,Show} from 'solid-js';
import {coverUrl,type Game} from './library';
import {paginationPages,sortActivity,validateActivity,type ActivityData,type ActivityGame} from './activity-model';
import './activity.css';
import {TimeChart} from './time-chart';
import {useLibrary} from './library-state';
import {validateGameHistories} from './charts';

export function SteamActivity(props:{data:ActivityData;onData:(data:ActivityData)=>void;games:Game[];loaded:boolean;readOnly:boolean;onBacklog:(game?:Game)=>void;onPriority:(appId:number)=>boolean}) {
  const {preferences,setPreference,gameHistory,setGameHistory,profile}=useLibrary();
  const [historyFailed,setHistoryFailed]=createSignal(false);
  const [historyRevision,setHistoryRevision]=createSignal(0);
  const search=()=>preferences().pulseSearch,setSearch=(value:string)=>setPreference({pulseSearch:value});
  const ownedOnly=()=>props.loaded&&preferences().pulseOwned,setOwnedOnly=(value:boolean)=>setPreference({pulseOwned:value});
  const sort=()=>preferences().pulseSort,setSort=(value:string)=>setPreference({pulseSort:value});
  const page=()=>preferences().pulsePage,setPage=(value:number)=>setPreference({pulsePage:value});
  const [selected,setSelected]=createSignal<number[]>(props.data.games.slice(0,3).map(g=>g.appId));
  const [chart,setChart]=createSignal('compare');
  const [range,setRange]=createSignal(24);
  const [busy,setBusy]=createSignal(false);
  const [refreshFailed,setRefreshFailed]=createSignal(false);
  const [message,setMessage]=createSignal('Showing a captured Steam snapshot.');
  const [notice,setNotice]=createSignal('');
  let request:AbortController|undefined;let disposed=false;let timer:ReturnType<typeof setInterval>|undefined;
  const libraryById=createMemo(()=>new Map(props.games.map(g=>[g.appId,g])));
  const own=(id:number)=>libraryById().get(id);
  const unfinished=(g:Game)=>g.status!=='Completed'&&g.status!=='Dropped';
  const ownedCount=()=>props.data.games.filter(g=>{const saved=own(g.appId);return saved&&unfinished(saved);}).length;
  const waiting=()=>props.games.filter(unfinished).length;
  const rows=createMemo(()=>sortActivity(props.data.games.filter(g=>g.title.toLowerCase().includes(search().trim().toLowerCase())&&(!ownedOnly()||Boolean(own(g.appId)&&unfinished(own(g.appId)!)))),sort()));
  const pageCount=()=>Math.max(1,Math.ceil(rows().length/50));
  const currentPage=()=>Math.min(page(),pageCount());
  const visibleRows=()=>rows().slice((currentPage()-1)*50,currentPage()*50);
  createEffect(()=>historyRevision()+'|'+visibleRows().map(g=>g.appId).join(','),key=>{
    if(location.protocol==='file:')return;
    const ids=key.split('|')[1]!.split(',').filter(Boolean).map(Number).filter(id=>!gameHistory()[id]||Date.parse(gameHistory()[id]!.capturedAt)<Date.now()-3600000),controller=new AbortController();
    void (async()=>{
      setHistoryFailed(false);
      for(let i=0;i<ids.length;i+=8){
        const batch=ids.slice(i,i+8),response=await fetch('/api/game-history?ids='+batch.join(','),{signal:controller.signal});if(!response.ok)throw Error('unavailable');
        const entries=validateGameHistories(await response.json());if(entries.length>8||entries.some(g=>!batch.includes(g.appId)))throw Error('invalid');
        if(controller.signal.aborted)return;setGameHistory(current=>({...current,...Object.fromEntries(entries.map(g=>[g.appId,g]))}));
      }
    })().catch(()=>{if(!controller.signal.aborted)setHistoryFailed(true);});
    return ()=>controller.abort();
  });

  function goToPage(next:number,fromBottom=false){
    setPage(Math.max(1,Math.min(next,pageCount())));
    if(fromBottom)requestAnimationFrame(()=>{const heading=document.getElementById('ranking-title');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'instant'});});
  }
  const pagination=(bottom=false)=><div class="pulse-pagination" id={bottom?undefined:'pulse-results'}><p role="status">Showing <strong>{rows().length?(currentPage()-1)*50+1:0}–{Math.min(currentPage()*50,rows().length)}</strong> of <strong>{rows().length.toLocaleString()}</strong> games</p><nav aria-label={bottom?'Bottom ranking pages':'Ranking pages'}><button aria-label="Previous page" disabled={currentPage()===1} onClick={()=>goToPage(currentPage()-1,bottom)}>‹</button><For each={paginationPages(pageCount(),currentPage())}>{n=>typeof n==='number'?<button aria-label={`Page ${n}`} aria-current={currentPage()===n?'page':undefined} onClick={()=>goToPage(n,bottom)}>{n}</button>:<span aria-hidden="true">…</span>}</For><button aria-label="Next page" disabled={currentPage()===pageCount()} onClick={()=>goToPage(currentPage()+1,bottom)}>›</button></nav></div>;
  const comparison=()=>props.data.games.filter(g=>selected().includes(g.appId));
  const scale=()=>Math.max(1,...comparison().flatMap(g=>[g.playersNow??0,g.peakToday??0]));
  const history=()=>props.data.history.filter(p=>Date.parse(p.at)>=Date.parse(props.data.sampledAt)-range()*3600000);
  const observedComparison=()=>comparison().filter(g=>history().filter(p=>p.counts[String(g.appId)]!==undefined).length>=2);
  const colors=['#ffbf00','#91cbb6','#c3b1ee'];
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
  function toggle(id:number){setSelected(current=>current.includes(id)?current.filter(value=>value!==id):current.length<3?[...current,id]:current);}
  function priority(id:number){setNotice(props.onPriority(id)?'Saved to Play Next in your backlog.':'Could not save. Your previous backlog is unchanged.');}
  const action=(game:ActivityGame)=><Show when={own(game.appId)} fallback={<a class="pulse-store" href={`https://store.steampowered.com/app/${game.appId}/`} target="_blank" rel="noopener noreferrer">Steam ↗</a>}><button class="pulse-link" onClick={()=>props.onBacklog(own(game.appId))}>In loaded library ↗</button></Show>;
  const brief=(title:string,kicker:string,games:ActivityGame[],metric:(g:ActivityGame)=>string,empty:string)=><section class="pulse-brief"><p class="eyebrow">{kicker}</p><h2>{title}</h2><ul><For each={games.slice(0,10)}>{g=><li><img src={g.image??coverUrl(g.appId)} alt="" loading="lazy" width="70" height="33" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><div><strong>{g.title}</strong><span>{metric(g)}</span></div>{action(g)}</li>}</For></ul><Show when={!games.length}><p class="pulse-empty">{empty}</p></Show></section>;
  return <div class="activity-page">
    <div class="activity-heading"><div><p class="eyebrow">STEAM PULSE · A LITTLE CONTEXT FOR YOUR NEXT PICK</p><h1>See the crowd.<br /><span>Find your next game.</span></h1><p>Player activity can spark an idea. Your unfinished library is still the place to start.</p></div><aside class="backlog-first"><span class="i-lucide-library" aria-hidden="true" /><Show when={props.loaded}><p class="pulse-profile">{profile()?'Viewing '+profile()!.name+'’s library':'Viewing a local library'}</p></Show><h2>{props.loaded?`${waiting()} ${waiting()===1?'game':'games'} already waiting`:'Your backlog comes first'}</h2><p>{props.loaded?`${ownedCount()} unfinished ${ownedCount()===1?'game':'games'} from your library ${ownedCount()===1?'appears':'appear'} in the current 1,000-game ranking.`:'Load a public profile to see which popular games you already own.'}</p><button onClick={()=>props.onBacklog()}>Back to backlog & roulette →</button></aside></div>
    <section id="overview" class="steam-online" aria-labelledby="online-title"><div class="pulse-section-heading"><div><p class="eyebrow">THE PLATFORM AT A GLANCE</p><h2 id="online-title">Concurrent Steam users</h2></div><Show when={props.data.online}><div class="online-values"><span><strong>{props.data.online!.samples.at(-1)?.[1].toLocaleString()}</strong> online</span><span><strong>{Math.max(...props.data.online!.samples.map(p=>p[1])).toLocaleString()}</strong> period peak</span></div></Show></div><Show when={props.data.online} fallback={<p class="pulse-empty">Steam’s online-user history is unavailable. Refresh to try again.</p>}>{online=><TimeChart class="online-series" label="Steam users logged in" series={[{name:'Online',color:'#ffbf00',samples:online().samples}]} />}</Show><p class="pulse-caption">Source: Steam’s public online-user feed. A global in-game total is not supplied by this source.</p></section>
    <div class="activity-toolbar"><div><span class="pulse-date">Steam update {new Date(props.data.sampledAt).toLocaleString()}</span><Show when={props.data.extendedCapturedAt}><p>Extended ranking captured {new Date(props.data.extendedCapturedAt!).toLocaleString()} · hourly refresh</p></Show><p role="status" class={refreshFailed()?'refresh-error':''}>{message()}</p></div><button disabled={busy()} onClick={()=>void refresh()}>{busy()?'Refreshing…':refreshFailed()?'Retry refresh':'Refresh activity'}</button></div>
    <For each={props.data.warnings}>{warning=><p class="pulse-warning">{warning}</p>}</For>
    <div id="briefs" class="pulse-briefs">
      {brief('Where everyone is playing','01 / LIVE CROWD',props.data.games,g=>`${g.playersNow?.toLocaleString()??'Unknown'} playing now`,'Current player counts are unavailable.')}
      {brief('Moving up the weekly chart','02 / GAINING GROUND',props.data.movers,g=>`↑ ${g.weeklyChange} places in Steam’s weekly ranking`,'No rank gainers are available from this snapshot.')}
      {brief('Fresh from the store','03 / NEW ARRIVALS',props.data.releases,g=>g.price?`${g.price} · US store price`:'Price unavailable','Steam’s new-release feed is unavailable.')}
      {brief('Crowd-approved picks','04 / REVIEW FAVORITES',props.data.acclaimed,g=>`${g.reviewPercent}% positive · ${g.reviewCount?.toLocaleString()} reviews`,'Review summaries are unavailable or have fewer than 50 reviews.')}
    </div>
    <section id="comparison" class="pulse-chart" aria-labelledby="comparison-title"><div class="pulse-section-heading"><div><p class="eyebrow">CONTEXT, NOT A COMPLETION CHECKLIST</p><h2 id="comparison-title">A closer look at the crowd</h2></div><div class="pills"><button aria-pressed={chart()==='compare'?'true':'false'} onClick={()=>setChart('compare')}>Now / today’s peak</button><button aria-pressed={chart()==='history'?'true':'false'} onClick={()=>setChart('history')}>Observed history</button></div></div>
      <p class="pulse-caption">Select up to three games in the table to compare them. Player counts are concurrent users, not owners or sales.</p>
      <Show when={chart()==='compare'}><div class="comparison-legend"><span>● Playing now</span><span>▰ Peak today</span></div><div class="comparison-bars"><For each={comparison()}>{g=><div class="comparison-row"><div><strong>{g.title}</strong><span>{g.playersNow?.toLocaleString()??'Unknown'} now / {g.peakToday?.toLocaleString()??'Unknown'} peak</span></div><div class="bar-track" title={`${g.title}: ${g.playersNow?.toLocaleString()??'Unknown'} now / ${g.peakToday?.toLocaleString()??'Unknown'} peak today`} role="img" aria-label={`${g.title}: ${g.playersNow??'unknown'} players now, ${g.peakToday??'unknown'} peak today`}><span class="peak-bar" style={{width:`${(g.peakToday??0)/scale()*100}%`}} /><span class="current-bar" style={{width:`${(g.playersNow??0)/scale()*100}%`}} /></div></div>}</For></div></Show>
      <Show when={chart()==='history'}><div class="pills"><button aria-pressed={range()===24?'true':'false'} onClick={()=>setRange(24)}>24 hours</button><button aria-pressed={range()===168?'true':'false'} onClick={()=>setRange(168)}>7 days</button></div><Show when={observedComparison().length>0} fallback={<div class="history-empty"><strong>No tracked history for these games yet.</strong><p>History currently records Steam’s official top 100 at five-minute refreshes. Other games still show their current reported player counts. Earlier counts are never invented.</p></div>}><TimeChart label="Observed concurrent players for selected games" gap={15*60000} series={observedComparison().map((g,index)=>({name:g.title,color:colors[index]!,samples:history().filter(p=>p.counts[String(g.appId)]!==undefined).map(p=>[Date.parse(p.at),p.counts[String(g.appId)]!] as [number,number])}))} /><p class="pulse-caption">Shared player-count scale. Missing samples are not zeros; gaps over 15 minutes are not connected. Hover to inspect the exact recorded values.</p><div class="comparison-legend"><For each={observedComparison()}>{(g,index)=><span style={{color:colors[index()]}}>{g.title}</span>}</For></div></Show></Show>
      <Show when={!comparison().length}><p class="pulse-empty">Select a game below to chart its activity.</p></Show>
    </section>
    <section id="ranking" class="pulse-ranking" aria-labelledby="ranking-title"><div class="pulse-section-heading"><div><p class="eyebrow">TOP 1,000 · REPORTED PLAYER COUNTS</p><h2 id="ranking-title" tabindex={-1}>Find familiar names in the crowd</h2></div><button class="backlog-link" onClick={()=>props.onBacklog()}>Go to my backlog →</button></div><div class="pulse-table-filters"><label>Search games<input type="search" maxlength="300" value={search()} onInput={e=>{setSearch(e.currentTarget.value);setPage(1);}} placeholder="Find a game in the top 1,000…" /></label><label>Sort by<select value={sort()} onChange={e=>{setSort(e.currentTarget.value);setPage(1);}}><option value="players">Players now</option><option value="peak">Peak today</option><option value="name">Title</option></select></label><label class="owned-filter"><input type="checkbox" checked={ownedOnly()} disabled={!props.loaded} onChange={e=>{setOwnedOnly(e.currentTarget.checked);setPage(1);}} /> Loaded library only · unfinished</label></div>
      <p class="pulse-caption">{rows().length} results · {selected().length}/3 comparison slots · Only games in the loaded library can be added to Play Next.</p><p class="pulse-notice" role="status">{notice()}</p><p class="pulse-caption">All-time peaks are reported by Steam Charts and checked on demand. — means unavailable. <Show when={historyFailed()}><button onClick={()=>setHistoryRevision(n=>n+1)}>Retry game history</button></Show></p>
      {pagination()}<div class="pulse-table-scroll"><table class="pulse-table"><thead><tr><th scope="col">Compare</th><th scope="col">Game</th><th scope="col">Players now</th><th scope="col">Peak today</th><th scope="col">All-time peak</th><th scope="col">Loaded library</th></tr></thead><tbody><For each={visibleRows()}>{g=><tr class={own(g.appId)?'owned-row':''}><td><input type="checkbox" aria-label={`Compare ${g.title}`} checked={selected().includes(g.appId)} disabled={!selected().includes(g.appId)&&selected().length>=3} onChange={()=>toggle(g.appId)} /></td><th scope="row"><div class="pulse-game-cell"><span class="pulse-rank">#{g.rank}</span><img src={g.image??coverUrl(g.appId)} alt="" loading="lazy" width="100" height="47" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><div><a href={`https://store.steampowered.com/app/${g.appId}/`} target="_blank" rel="noopener noreferrer">{g.title} ↗</a><small>{g.reviewPercent!==null?`${g.reviewPercent}% positive Steam reviews`:'Review score unavailable'}</small></div></div></th><td class="numeric">{g.playersNow?.toLocaleString()??'—'}</td><td class="numeric muted-number">{g.peakToday?.toLocaleString()??'—'}</td><td class="numeric all-time-peak" title={gameHistory()[g.appId]?'Steam Charts record · checked '+new Date(gameHistory()[g.appId]!.capturedAt).toLocaleString():'Steam Charts record unavailable or not loaded yet'}>{gameHistory()[g.appId]?.peakAllTime?.toLocaleString()??'—'}</td><td><Show when={own(g.appId)} fallback={<span class="pulse-unowned">{props.loaded?'Not in this library':'Load a profile to match'}</span>}><div class="pulse-owned-actions"><span>{own(g.appId)?.status}</span><button disabled={props.readOnly||!unfinished(own(g.appId)!)} aria-pressed={own(g.appId)?.playNext?'true':'false'} onClick={()=>priority(g.appId)}>{own(g.appId)?.playNext?'✓ Play Next':'+ Play Next'}</button><button class="pulse-link" onClick={()=>props.onBacklog(own(g.appId))}>Open backlog</button></div></Show></td></tr>}</For></tbody></table></div>{pagination(true)}
      <Show when={!rows().length}><div class="pulse-empty"><h3>{ownedOnly()?'No unfinished library games match this ranking.':'No matching games in this top 1,000.'}</h3><p>{ownedOnly()?'Your library can include great games outside this chart. Try clearing the ownership filter.':'Try a shorter title or clear your search to see the ranking again.'}</p><div class="empty-actions"><button onClick={()=>{setSearch('');setOwnedOnly(false);setPage(1);}}>Clear search & filters</button><button onClick={()=>props.onBacklog()}>Return to backlog</button></div></div></Show>
    </section>
    <p class="pulse-sources">Sources: <a href="https://store.steampowered.com/charts/mostplayed" target="_blank" rel="noopener noreferrer">Steam</a> and <a href="https://steamcharts.com/top" target="_blank" rel="noopener noreferrer">Steam Charts</a>. Official Steam counts and today’s peaks refresh every five minutes for Steam’s top 100; extended counts come from an hourly Steam Charts snapshot. The combined list is sorted by reported player counts. Today’s peak is unknown outside the official feed. Review favorites use this list and the new-release feed, with at least 50 reviews. US store prices are asking prices, not prices paid. Observed history records this app’s Steam top-100 counts. All-time peaks are Steam Charts records, not estimates.</p>
  </div>;
}
