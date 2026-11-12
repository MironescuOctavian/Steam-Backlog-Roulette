import {GameTags} from '../../game-tags';
import {GameDetails} from '../../game-details';
import {usePlayerCounts,PlayerCountBadge} from '../../player-counts';
import {HeroDeck} from '../../hero-deck';
import {createEffect,createSignal,For,onCleanup,Show} from 'solid-js';
import {useHref} from '@solidjs/router';
import {paginationPages} from '../../activity-model';
import {coverUrl,costPerHour,remainingHours,statuses,type Game} from '../../library';
import {defaultFilters,exclusionReason,recommendationReasons,rankValue} from '../../planner';
import {Roulette} from '../../roulette';
import {createRouletteSound} from '../../sound';
import {DataTools} from '../../data-tools';
import {ProfileLookup} from '../../profile-lookup';
import {catalogSource,catalogUpdatedAt} from '../../catalog';
import {useLibrary} from '../../library-state';

export default function BacklogPage(){
  const {library,games,loaded,profile,saveMessage,saveFailed,filters,setFilters,worstValue,setWorstValue,weeklyHours,setWeeklyHours,soundEnabled,setSoundEnabled,activeGames,stats,filtered,libraryRows,eligible,preferences,setPreference,toggleExcluded,removeGame,undo,canUndo,metadataMessage,genres,changeFilter,backlog,hoursLeft,applyLibrary,updateGame}=useLibrary();
  const pulseHref=useHref(()=>'/activity');
  const [expanded,setExpanded]=createSignal(false);
  function focusProfile(){const input=document.getElementById('steam-profile') as HTMLInputElement|null;input?.focus();input?.select();}
  const clearedBacklog=()=>loaded()&&backlog().length===0&&games().length>0&&filters().state!=='all';
  const [libraryPage,setLibraryPage]=createSignal(1);
  const libraryPageCount=()=>Math.max(1,Math.ceil(libraryRows().length/24));
  const currentLibraryPage=()=>Math.min(libraryPage(),libraryPageCount());
  createEffect(()=>JSON.stringify([filters(),preferences().librarySort,loaded(),profile()?.steamId]),()=>{setLibraryPage(1);});
  const visibleGames=()=>loaded()?libraryRows().slice((currentLibraryPage()-1)*24,currentLibraryPage()*24):expanded()?libraryRows():libraryRows().slice(0,6);
  function turnLibraryPage(page:number,bottom=false){setLibraryPage(Math.max(1,Math.min(page,libraryPageCount())));if(bottom)requestAnimationFrame(()=>{const title=document.getElementById('library-title');title?.focus({preventScroll:true});title?.scrollIntoView({block:'start',behavior:'instant'});});}
  const libraryPagination=(bottom=false)=><div class="library-pagination"><p role="status">Showing {libraryRows().length?(currentLibraryPage()-1)*24+1:0}–{Math.min(currentLibraryPage()*24,libraryRows().length)} of {libraryRows().length.toLocaleString()} games · roulette uses all matches</p><nav aria-label={bottom?'Bottom library pages':'Library pages'}><button disabled={currentLibraryPage()===1} aria-label="Previous library page" onClick={()=>turnLibraryPage(currentLibraryPage()-1,bottom)}>‹</button><For each={paginationPages(libraryPageCount(),currentLibraryPage())}>{page=>typeof page==='number'?<button aria-label={`Library page ${page}`} aria-current={currentLibraryPage()===page?'page':undefined} onClick={()=>turnLibraryPage(page,bottom)}>{page}</button>:<span aria-hidden="true">…</span>}</For><button disabled={currentLibraryPage()===libraryPageCount()} aria-label="Next library page" onClick={()=>turnLibraryPage(currentLibraryPage()+1,bottom)}>›</button></nav></div>;
  const counts=usePlayerCounts(()=>visibleGames().map(g=>g.appId));
  const [detailsId,setDetailsId]=createSignal<number|null>(null);
  const detailGame=()=>activeGames().find(g=>g.appId===detailsId())??null;
  const [winner, setWinner] = createSignal<Game | null>(null);
  const [spinFilters,setSpinFilters]=createSignal({...filters()});
  const sound=createRouletteSound();
  let winnerDialog!: HTMLDialogElement;
  const winnerGame=()=>games().find(g=>g.appId===winner()?.appId) ?? winner();
  function celebrate(game: Game) {
    setWinner(game);
    if(soundEnabled())sound.win();
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)window.confetti?.({particleCount:100,spread:70,origin:{y:.65},colors:['#ffbf00','#ffdd70','#eeeeee'],disableForReducedMotion:true});
    requestAnimationFrame(()=>{if(!winnerDialog.open)winnerDialog.showModal();});
  }
  onCleanup(()=>sound.close());
  return <div class="backlog-page">

        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-copy">
            <p class="eyebrow"><span class="status-dot" /> YOUR LIBRARY. YOUR NEXT ADVENTURE.</p>
            <h1 id="hero-title">Less deciding.<br /><span>More playing.</span></h1>
            <p class="hero-description">Your next game is already waiting. Load your Steam library and let’s find it.</p>
            <ProfileLookup profile={profile()} games={games()} disabled={Boolean(library.warning)} onLoad={(next,p)=>{const sameProfile=profile()?.steamId===p.steamId;if(!applyLibrary(next,p))return false;if(!sameProfile)setFilters(current=>({...current,search:''}));return true;}} />
            <Show when={library.warning}><p class="storage-warning" role="alert">{library.warning}</p></Show>
          </div>
          <HeroDeck />
        </section>

        <DataTools canUndo={canUndo()} onUndo={undo} games={games()} onApply={next=>{if(!applyLibrary(next,null))return false;setFilters(current=>({...current,search:''}));return true;}} readOnly={Boolean(library.warning)} />
          <section id="roulette" class="filter-panel" aria-label="What should I play tonight?">
            <div class="filter-heading"><h3>What should I play tonight?</h3><button onClick={() => setFilters({...defaultFilters})}>Reset filters</button></div>
            <div class="roulette-search"><label>{loaded()?'Search this library':'Search Top 250'}<input type="search" maxlength="300" placeholder="Find a game…" value={filters().search} onInput={e => changeFilter({search:e.currentTarget.value})} /></label></div>
            <div class="quick-filters pills" aria-label="Quick roulette filters">
              <button disabled={!loaded()} aria-pressed={filters().state==='never'?'true':'false'} onClick={()=>changeFilter({state:filters().state==='never'?'backlog':'never'})}>Never played</button>
              <button aria-pressed={filters().time==='quick'?'true':'false'} onClick={()=>changeFilter({time:filters().time==='quick'?'all':'quick',maxHours:200})}>Under 10 hours</button>
              <button disabled={!loaded()} aria-pressed={filters().state==='next'?'true':'false'} onClick={()=>changeFilter({state:filters().state==='next'?'backlog':'next'})}>Play Next</button>
            </div>
            <details class="advanced-filters"><summary>Advanced filters <span>Genre, reviews & playtime</span></summary><div class="filter-fields">
              <Show when={loaded()}><label>Playtime state<select value={filters().state} onChange={e => changeFilter({state:e.currentTarget.value})}><option value="backlog">All backlog</option><option value="never">Never played (0 hours)</option><option value="under2">Under 2 hours</option><option value="next">Play Next</option><option value="all">All library, including finished</option></select></label></Show>
              <label>Minimum review score: {filters().score || "Any"}<input type="range" min="0" max="100" step="5" value={filters().score} onInput={e => changeFilter({score:Number(e.currentTarget.value)})} /></label>
              <label>Maximum remaining: {filters().maxHours===200?'Any':filters().maxHours+'h'}<input type="range" min="0" max="200" step="1" value={filters().maxHours} onInput={e => changeFilter({maxHours:Number(e.currentTarget.value)})} /></label>
            </div>
            <div class="pills" aria-label="Remaining time presets"><For each={[["all","Any length"],["quick","Quick · under 10h"],["medium","Medium · 10–30h"],["epic","Epic · 50h+"]]}>{item => <button aria-pressed={filters().time === item[0] ? "true" : "false"} onClick={() => changeFilter({time:item[0]!})}>{item[1]}</button>}</For></div>
            <div class="pills" aria-label="Genres"><button aria-pressed={!filters().genre ? "true" : "false"} onClick={() => changeFilter({genre:""})}>All genres</button><For each={genres()}>{genre => <button aria-pressed={filters().genre === genre ? "true" : "false"} onClick={() => changeFilter({genre})}>{genre}</button>}</For></div>
            <fieldset class="roulette-exclusions"><legend>Keep out of roulette</legend><label><input type="checkbox" checked={preferences().hideMultiplayer} onChange={e=>setPreference({hideMultiplayer:e.currentTarget.checked})} /> Multiplayer-only</label><label><input type="checkbox" checked={preferences().hideSoftware} onChange={e=>setPreference({hideSoftware:e.currentTarget.checked})} /> Software</label><label><input type="checkbox" checked={preferences().hideDemos} onChange={e=>setPreference({hideDemos:e.currentTarget.checked})} /> Demos</label><p>Known classifications only. Unknown games stay eligible. {metadataMessage()}</p></fieldset>
            </details><p class="demo-note">Time filters exclude unknown completion times. Review score uses Steam positive reviews where available, otherwise Metacritic. <strong aria-live="polite">{filtered().length} matching games · {eligible().filter(g=>g.status!=='Completed'&&g.status!=='Dropped').length} eligible for roulette</strong></p>
          </section>
        <div class="roulette-area"><p class="pool-label">{loaded()?`Picking only from ${profile()?.name ? profile()!.name+"’s" : 'your loaded'} library. The Top 250 is no longer in this pool.`:'Discover from 250 top-rated games. No profile is loaded.'}</p><label class="sound-toggle"><input type="checkbox" checked={soundEnabled()} onChange={e=>setSoundEnabled(e.currentTarget.checked)} /> Roulette sound</label><For each={[loaded()?`personal:${profile()?.steamId??'local'}`:'catalog']}>{()=> <Roulette discovery={!loaded()} games={eligible()} onWinner={celebrate} onStart={()=>{setSpinFilters({...filters()});if(soundEnabled())void sound.start();}} onTick={()=>{if(soundEnabled())sound.tick();}} />}</For></div>

        <Show when={loaded()}>
        <section id="insights" class="insights-section" aria-labelledby="insights-title">
          <div class="section-heading"><div><p class="eyebrow">A LITTLE PERSPECTIVE</p><h2 id="insights-title">{profile()?profile()!.name+'’s backlog':'Your backlog'}, at a glance.</h2></div><span class="section-note">{profile()?`Last synced ${new Date(profile()!.updatedAt).toLocaleString()}`:'Imported library · Saved on this device'}</span></div>
          <div class="kpi-grid">
            <article class="kpi"><span class="i-lucide-library kpi-icon" aria-hidden="true" /><h3>Games in backlog</h3><p>{backlog().length}<small>excludes completed and dropped</small></p></article>
            <article class="kpi"><span class="i-lucide-clock-3 kpi-icon" aria-hidden="true" /><h3>Known remaining hours</h3><p>{stats().unknownTimes===backlog().length&&backlog().length>0?'—':`~${Math.round(hoursLeft()).toLocaleString()}`}<small>{stats().unknownTimes} games have unknown completion times</small></p></article>
            <article class="kpi"><span class="i-lucide-gamepad-2 kpi-icon" aria-hidden="true" /><h3>Pile of shame</h3><p>{stats().unplayedPercent.toFixed(0)}%<small>zero hours across all games</small></p></article>
            <Show when={stats().averageCost!==null}><article class="kpi"><span class="i-lucide-chart-no-axes-combined kpi-icon" aria-hidden="true" /><h3>Average cost / hour</h3><p>${stats().averageCost?.toFixed(2)}<small>known costs · played games only</small></p></article></Show>
          </div>
          <Show when={hoursLeft()>0}><div class="session-plan"><label>My weekly gaming budget<input type="number" min="1" max="168" value={weeklyHours()} onInput={e => {const n=Number(e.currentTarget.value); if(Number.isFinite(n)&&n>=1&&n<=168)setWeeklyHours(n);}} />hours</label><p>At {weeklyHours()}h/week: approximately {Math.ceil(hoursLeft()/weeklyHours()).toLocaleString()} weeks for games with known completion estimates. {stats().unknownTimes} games excluded because time-to-beat is unknown.</p></div></Show>
          <Show when={games().some(g=>g.priceKnown!==false)}>
          <section class="leaderboard" aria-labelledby="value-title"><div class="filter-heading"><h3 id="value-title">Cost per hour · {worstValue() ? "Worst value" : "Best value"}</h3><button onClick={() => setWorstValue(!worstValue())}>Show {worstValue() ? "best" : "worst"} value</button></div>
            <p class="demo-note">Unknown purchase costs are excluded. Unplayed games have no cost/hour yet; worst value puts them first by purchase price. Best value includes played games only.</p>
            <ol><For each={rankValue(games(),worstValue()).slice(0,8)}>{(game,index) => <li><div class="rank-row"><strong>{game.title}</strong><span>{game.playtimeHours === 0 ? `$${game.pricePaid.toFixed(2)} · Unplayed` : `$${costPerHour(game)!.toFixed(2)}/h`}</span></div><div class="rank-meter" aria-hidden="true"><span style={{width:`${100-index()*10}%`}} /></div></li>}</For></ol>
            <Show when={rankValue(games(),worstValue()).length===0}><p>No played games to rank yet.</p></Show>
          </section>
          </Show>
        </section>
        </Show>

        <aside class="pulse-home-teaser"><div><p class="eyebrow">A LITTLE INSPIRATION · YOUR BACKLOG STILL COMES FIRST</p><h2>What’s being played on Steam?</h2><p>Explore 1,000 popular games and see which ones are already in your library. Rankings load when you open Steam pulse.</p></div><a href={pulseHref()}>Explore Steam pulse →</a></aside>
        <section id="library" class="library-section" aria-labelledby="library-title">
          <div class="section-heading"><div><p class="eyebrow">LESS COLLECTING. MORE COMPLETING.</p><h2 id="library-title" tabindex={-1}>{loaded()?profile()?profile()!.name+'’s library':'Your local library':'Explore the Top 250'}</h2></div><Show when={loaded()}><span class="section-note">{activeGames().length} games · Saved on this device</span></Show><label class="library-sort">Sort library<select value={preferences().librarySort} onChange={e=>setPreference({librarySort:e.currentTarget.value})}><option value="default">Original order</option><option value="title">Title</option><option value="remaining">Remaining time</option><option value="playtime">Most played</option><option value="priority">Play Next first</option></select></label></div>
          <Show when={!loaded()}><p class="demo-note">Ranking: <a href={catalogSource} target="_blank" rel="noopener noreferrer">Steam 250 ↗</a> · Snapshot {new Date(catalogUpdatedAt).toLocaleDateString()}. Based on Steam player reviews; not an official Valve ranking. These are recommendations, not games you own.</p></Show>
          <Show when={loaded()}><p class="demo-note">Playtime comes from the loaded library. Prices paid and completion times are unknown unless supplied; unknown values are excluded from planning and value calculations.</p></Show>
          <p class={["save-message", {"save-error": saveFailed()}]} role="status" aria-live="polite">{saveMessage()}</p>

          <Show when={loaded()}>{libraryPagination()}</Show>
          <ul class="game-grid" id="library-grid" aria-label="Game library">
            <For each={visibleGames()} keyed={item=>item.appId}>{game => <li class="game-card">
              <div class="game-cover">
                <span class="cover-fallback" aria-hidden="true">{game().title}</span>
                <img src={game().image??coverUrl(game().appId)} alt="" loading="lazy" width="460" height="215" onError={event => { event.currentTarget.style.visibility = "hidden"; }} onLoad={event=>{event.currentTarget.style.visibility="visible";}} />
                <span class="score-badge">{game().steamPositivePercent!==undefined?`Steam ${game().steamPositivePercent}%`:game().metacritic!==null?`MC ${game().metacritic}`:'Score unknown'}</span>
              </div>
              <div class="game-content">
                <div class="game-title-row"><h3>{game().title}</h3></div><Show when={exclusionReason(game(),preferences())}><p class="excluded-label">{exclusionReason(game(),preferences())} · {loaded()?'still in this library':'discovery only'}</p></Show>
                <p class="game-genres">{game().genres.join(" · ")}</p><PlayerCountBadge count={counts()[game().appId]} />
                <Show when={loaded()}>
                <div class="game-hours"><span>{game().playtimeHours}h played</span><span>{game().timeToBeatHours===null?'Completion time unknown':`~${game().timeToBeatHours}h to beat`}</span></div>
                <Show when={game().timeToBeatHours!==null}><progress class="game-progress" aria-label={`${game().title}: playtime relative to estimated completion time, not actual completion`} max={Math.max(1, game().timeToBeatHours??1)} value={Math.min(game().playtimeHours, Math.max(1, game().timeToBeatHours??1))} /></Show>
                <p class="card-reason">{recommendationReasons(game(),filters(),true)}</p><p class="remaining-note">{game().status === "Completed" ? "Completed" : game().status === "Dropped" ? "Dropped · excluded from plan" : remainingHours(game())===null?'Remaining time unknown':`~${Number(remainingHours(game())?.toFixed(1))}h remaining (estimate)`}</p>
                <div class="game-controls">
                  <label class="status-label">Status
                    <select value={game().status} disabled={Boolean(library.warning)} onChange={event => {
                      const select = event.currentTarget;
                      if (!updateGame(game().appId, { status: select.value as Game["status"] })) select.value = game().status;
                    }} aria-label={`Status for ${game().title}`}>
                      <For each={statuses}>{status => <option value={status}>{status}</option>}</For>
                    </select>
                  </label>
                  <button type="button" class={["play-next", {"is-next": game().playNext}]} aria-pressed={game().playNext ? "true" : "false"} aria-label={`Play next: ${game().title}`} disabled={Boolean(library.warning)} onClick={() => updateGame(game().appId, { playNext: !game().playNext })}>{game().playNext ? "✓ Play Next" : "+ Play Next"}</button>
                </div>

                </Show>
                <Show when={!loaded()}><p class="catalog-rank">#{game().rank} in Steam 250</p></Show>
                <a class="game-store" href={`https://store.steampowered.com/app/${game().appId}/`} target="_blank" rel="noopener noreferrer">View on Steam</a>
                <button class="game-details-button" onClick={e=>{e.currentTarget.focus({preventScroll:true});setDetailsId(game().appId);}}>Game details <span aria-hidden="true">＋</span></button>
              </div>
            </li>}</For>
          </ul>
          <Show when={loaded()&&libraryRows().length>24}>{libraryPagination(true)}</Show>
          <Show when={!loaded()&&filtered().length>6}><div class="discovery-expand"><button type="button" aria-controls="library-grid" aria-expanded={expanded()?'true':'false'} onClick={()=>{const collapse=expanded();setExpanded(!collapse);if(collapse)document.getElementById('library')?.scrollIntoView();}}>{expanded()?'Show fewer games':`Show all ${filtered().length} games`}</button><span>Showing {visibleGames().length} of {filtered().length} matches · roulette uses every matching game</span></div></Show>
          <Show when={activeGames().length > 0 && filtered().length === 0}><div class="library-empty" role="status"><span class="i-lucide-library" aria-hidden="true" /><h3>{clearedBacklog()?'Your backlog is clear.':filters().state==='next'?'No Play Next games match.':'No games match these filters.'}</h3><p>{clearedBacklog()?'Your saved games are completed or dropped. You can still browse them.':filters().state==='next'?'Add games with + Play Next to build your short list, or broaden your filters.':filters().time!=='all'||filters().maxHours<200?'Time filters only include games with known completion estimates. Try Any length to include the rest.':'Try clearing your search, choosing another genre, or lowering the review score.'}</p><button onClick={() => setFilters({...defaultFilters,...(clearedBacklog()?{state:'all'}:{})})}>{clearedBacklog()?'View all saved games':'Reset filters'}</button></div></Show>
          <Show when={loaded()&&games().length === 0}><div class="library-empty"><h3>This library has no games.</h3><p>Look up another profile, or add games and import a JSON library using the controls above.</p><button onClick={focusProfile}>Look up another profile</button></div></Show>
        </section>

      <GameDetails game={detailGame()} owned={loaded()} onClose={()=>setDetailsId(null)}><Show when={detailGame()}>{game=><><Show when={loaded()}><GameTags game={game()} disabled={Boolean(library.warning)} onSave={tags=>updateGame(game().appId,{tags})} /><span class="value-badge">{game().priceKnown===false?'Purchase cost unknown':costPerHour(game())===null?'Cost per hour unavailable until played':'$'+costPerHour(game())!.toFixed(2)+'/h'}</span></Show><p class="metadata-label">Source: {game().metadataSource}</p><label class="exclude-game"><input type="checkbox" checked={preferences().excludedIds.includes(game().appId)} onChange={()=>toggleExcluded(game().appId)} /> Exclude from roulette</label><Show when={loaded()}><button class="remove-game" onClick={()=>{removeGame(game().appId);setDetailsId(null);}}>Remove from this list</button></Show></>}</Show></GameDetails>
      <dialog class="modal winner-modal" ref={winnerDialog} onClose={()=>setWinner(null)} aria-labelledby="winner-title">
        <button class="modal-close" onClick={()=>winnerDialog.close()} aria-label="Close winner spotlight">✕</button>
        <Show when={winnerGame()}><div>
          <p class="eyebrow">FATE HAS EXCELLENT TASTE</p><h2 id="winner-title">{winnerGame()?.title}</h2>
          <img class="winner-cover" src={coverUrl(winnerGame()?.appId ?? 0)} alt={winnerGame()?.title ?? ""} onError={e=>{e.currentTarget.style.display='none';}} />
          <p class="winner-reason">{winnerGame()?recommendationReasons(winnerGame()!,spinFilters(),loaded()):''}</p><p class="demo-note">{winnerGame()?.genres.join(' · ')} · {winnerGame()?.metadataSource}</p>
          <dl class="winner-stats"><Show when={loaded()}><div><dt>Played</dt><dd>{winnerGame()?.playtimeHours}h</dd></div></Show><div><dt>Completion time</dt><dd>{winnerGame()?.timeToBeatHours==null?'Unknown':`~${winnerGame()?.timeToBeatHours}h`}</dd></div><div><dt>Reviews</dt><dd>{winnerGame()?.steamPositivePercent!==undefined?`${winnerGame()?.steamPositivePercent}% positive`:winnerGame()?.metacritic??'Unknown'}</dd></div><Show when={loaded()}><div><dt>Status</dt><dd>{winnerGame()?.status}</dd></div></Show></dl>
          <div class="tool-actions"><Show when={loaded()}><a href={`steam://run/${winnerGame()?.appId}`}>Launch in Steam ↗</a></Show><a href={`https://store.steampowered.com/app/${winnerGame()?.appId}/`} target="_blank" rel="noopener noreferrer">Store page ↗</a><Show when={loaded()}><button disabled={Boolean(library.warning) || winnerGame()?.status==='Playing'} onClick={()=>{const game=winnerGame();if(game)updateGame(game.appId,{status:'Playing'});}}>Mark currently playing</button></Show></div>
          <p class="demo-note">Launching requires the Steam desktop app. Completion times are estimates.</p>
          <p role="status">{saveMessage()}</p>
        </div></Show>
      </dialog>
  </div>;
}
