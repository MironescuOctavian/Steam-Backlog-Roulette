import {RouletteSession} from '../../roulette-controls';
import {BulkActions} from '../../bulk-actions';
import {LibraryViewToggle,LibraryFilterSummary,LibraryFilterRecovery} from '../../library-toolbar';
import {GameTags} from '../../game-tags';
import {GameDetails} from '../../game-details';
import {usePlayerCounts,PlayerCountBadge} from '../../player-counts';
import {usePrices,PriceBadge} from '../../game-prices';
import {HeroDeck} from '../../hero-deck';
import {createEffect,createSignal,For,onCleanup,Show} from 'solid-js';
import {useHref} from '@solidjs/router';
import {paginationPages} from '../../activity-model';
import {coverUrl,costPerHour,statuses,type Game} from '../../library';
import {defaultFilters,exclusionReason,recommendationReasons,rankValue} from '../../planner';
import {Roulette} from '../../roulette';
import {createRouletteSound} from '../../sound';
import {DataTools} from '../../data-tools';
import {ProfileLookup} from '../../profile-lookup';
import {loadRandomCuratorSample,type CuratorSampleInfo} from '../../sample-library';
import {catalogSource,catalogUpdatedAt} from '../../catalog';
import {useLibrary} from '../../library-state';

export default function BacklogPage(){
  const {library,games,loaded,profile,saveMessage,saveFailed,filters,setFilters,worstValue,setWorstValue,weeklyHours,setWeeklyHours,soundEnabled,setSoundEnabled,activeGames,stats,filtered,libraryRows,rouletteGames,skipGame,recordPick,preferences,setPreference,toggleExcluded,removeGame,undo,canUndo,changeFilter,backlog,hoursLeft,applyLibrary,updateGame,disconnectProfile,clearLibrary}=useLibrary();
  const libraryHref=useHref(()=>'/#library'),rouletteHref=useHref(()=>'/#roulette');
  const [expanded,setExpanded]=createSignal(false);
  const [selecting,setSelecting]=createSignal(false),[selected,setSelected]=createSignal<number[]>([]);
  const [sampleCurator,setSampleCurator]=createSignal<CuratorSampleInfo|null>(null);
  let selectionScope='';
  createEffect(()=>[profile()?.steamId??'local',games().map(g=>g.appId).join(',')].join('|'),scope=>{if(scope===selectionScope)return;selectionScope=scope;setSelected([]);setSelecting(false);});
  createEffect(()=>loaded(),isLoaded=>{if(!isLoaded)setSampleCurator(null);});
  function toggleSelection(id:number){setSelected(ids=>ids.includes(id)?ids.filter(n=>n!==id):[...ids,id]);}
  let openDataTools:((tab:'custom'|'json')=>void)|undefined;
  async function loadSample(){
    const {games:next,curator}=await loadRandomCuratorSample(sampleCurator()?.slot);
    if(applyLibrary(next,null)){
      setSampleCurator(curator);
      setFilters({...defaultFilters});
    }
  }
  function clearSample(){if(clearLibrary()){setSampleCurator(null);setFilters({...defaultFilters});}}
  const hasCustomFilters=()=>filters().search!==''||filters().state!=='backlog'||filters().genre!==''||filters().score!==0||filters().maxHours!==200||filters().time!=='all';
  function focusProfile(){document.querySelector<HTMLButtonElement>('.switch-profile')?.click();requestAnimationFrame(()=>{const input=document.getElementById('steam-profile') as HTMLInputElement|null;input?.focus();input?.select();});}
  const clearedBacklog=()=>loaded()&&backlog().length===0&&games().length>0&&filters().state!=='all';
  const [libraryPage,setLibraryPage]=createSignal(1);
  const libraryPageCount=()=>Math.max(1,Math.ceil(libraryRows().length/24));
  const currentLibraryPage=()=>Math.min(libraryPage(),libraryPageCount());
  createEffect(()=>JSON.stringify([filters(),preferences().librarySort,loaded(),profile()?.steamId]),()=>{setLibraryPage(1);});
  const visibleGames=()=>loaded()?libraryRows().slice((currentLibraryPage()-1)*24,currentLibraryPage()*24):expanded()?libraryRows():libraryRows().slice(0,6);
  function turnLibraryPage(page:number,bottom=false){setLibraryPage(Math.max(1,Math.min(page,libraryPageCount())));if(bottom)requestAnimationFrame(()=>{const title=document.getElementById('library-title');title?.focus({preventScroll:true});title?.scrollIntoView({block:'start',behavior:'instant'});});}
  const libraryPagination=(bottom=false)=><div class="library-pagination"><p role="status">Showing {libraryRows().length?(currentLibraryPage()-1)*24+1:0}–{Math.min(currentLibraryPage()*24,libraryRows().length)} of {libraryRows().length.toLocaleString()} games · roulette uses all matches</p><nav aria-label={bottom?'Bottom library pages':'Library pages'}><button disabled={currentLibraryPage()===1} aria-label="Previous library page" onClick={()=>turnLibraryPage(currentLibraryPage()-1,bottom)}>‹</button><For each={paginationPages(libraryPageCount(),currentLibraryPage())}>{page=>typeof page==='number'?<button aria-label={`Library page ${page}`} aria-current={currentLibraryPage()===page?'page':undefined} onClick={()=>turnLibraryPage(page,bottom)}>{page}</button>:<span aria-hidden="true">…</span>}</For><button disabled={currentLibraryPage()===libraryPageCount()} aria-label="Next library page" onClick={()=>turnLibraryPage(currentLibraryPage()+1,bottom)}>›</button></nav></div>;
  const counts=usePlayerCounts(()=>visibleGames().map(g=>g.appId)),prices=usePrices(()=>loaded()?[]:visibleGames().map(g=>g.appId));
  const [detailsId,setDetailsId]=createSignal<number|null>(null);
  const detailGame=()=>activeGames().find(g=>g.appId===detailsId())??null;
  const [winner, setWinner] = createSignal<Game | null>(null);
  const [spinFilters,setSpinFilters]=createSignal({...filters()});
  const [spinRequest,setSpinRequest]=createSignal(0);
  function reroll(skip=false,untilTomorrow=false){const game=winnerGame();if(skip&&game)skipGame(game.appId,untilTomorrow);winnerDialog.close();setSpinRequest(n=>n+1);requestAnimationFrame(()=>{const button=document.querySelector<HTMLButtonElement>('.spin-button');if(button&&!button.disabled)button.focus({preventScroll:true});else document.getElementById('restore-skipped')?.focus({preventScroll:true});});}
  const sound=createRouletteSound();
  let winnerDialog!: HTMLDialogElement;
  const winnerGame=()=>games().find(g=>g.appId===winner()?.appId) ?? winner();
  function celebrate(game: Game) {
    setWinner(game);recordPick(game.appId);
    if(soundEnabled())sound.win();
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)window.confetti?.({particleCount:100,spread:70,origin:{y:.65},colors:['#ffbf00','#ffdd70','#eeeeee'],disableForReducedMotion:true});
    requestAnimationFrame(()=>{if(!winnerDialog.open)winnerDialog.showModal();});
  }
  onCleanup(()=>sound.close());
  return <div class={["backlog-page",{"library-loaded":loaded()}]}>

        <section class={["hero",{"hero-loaded":loaded()}]} aria-labelledby="hero-title">
          <div class="hero-copy">
            <p class="eyebrow"><span class="status-dot" /> YOUR LIBRARY. YOUR NEXT ADVENTURE.</p>
            <h1 id="hero-title"><Show when={loaded()} fallback={<>Less deciding.<br /><span>More playing.</span></>}>Make time <span>for play.</span></Show></h1>
            <p class="hero-description">{loaded()?games().length.toLocaleString()+' games. Your next adventure is already here.':'Your next game is already waiting. Load your Steam library and let’s find it.'}</p>
            <Show when={!loaded()}><div class="loaded-actions"><a class="pick-tonight" href={rouletteHref()}>Try a spin</a></div></Show>
            <ProfileLookup profile={profile()} games={games()} hasGames={loaded()} sampleInfo={sampleCurator()} disabled={Boolean(library.warning)} onSample={loadSample} onClearSample={clearSample} onDisconnect={()=>{if(disconnectProfile()){setSampleCurator(null);setFilters({...defaultFilters});}}} onImport={()=>openDataTools?.('json')} onLoad={(next,p)=>{const sameProfile=profile()?.steamId===p.steamId;if(!applyLibrary(next,p))return false;setSampleCurator(null);if(!sameProfile)setFilters(current=>({...current,search:''}));return true;}} />
            <Show when={loaded()}><div class="loaded-actions"><a class="pick-tonight" href={rouletteHref()}><span class="i-lucide-shuffle" aria-hidden="true" />Pick for tonight</a><a class="browse-library" href={libraryHref()}><span class="i-lucide-library" aria-hidden="true" />Browse library</a></div></Show>
            <Show when={library.warning}><p class="storage-warning" role="alert">{library.warning}</p></Show>
          </div>
          <HeroDeck />
        </section>

        <div id="roulette" class="roulette-area"><p class="pool-label">{loaded()?`Picking only from ${profile()?.name ? profile()!.name+"’s" : sampleCurator() ? sampleCurator()!.name + ' sample' : 'your loaded'} library. The Top 250 is no longer in this pool.`:'Discover from 250 top-rated games. No profile is loaded.'}</p><label class="sound-toggle"><input type="checkbox" checked={soundEnabled()} onChange={e=>setSoundEnabled(e.currentTarget.checked)} /> Roulette sound</label><For each={[loaded()?`personal:${profile()?.steamId??'local'}`:'catalog']}>{()=> <Roulette discovery={!loaded()} games={rouletteGames()} spinRequest={spinRequest()} onWinner={celebrate} onStart={()=>{setSpinFilters({...filters()});if(soundEnabled())void sound.start();}} onTick={()=>{if(soundEnabled())sound.tick();}} />}</For><RouletteSession onDetails={setDetailsId} /></div>

        <Show when={loaded()}>
        <section id="insights" class="insights-section" aria-labelledby="insights-title">
          <div class="section-heading"><div><p class="eyebrow">A LITTLE PERSPECTIVE</p><h2 id="insights-title">{profile()?profile()!.name+'’s backlog':sampleCurator()?`${sampleCurator()!.name} sample`:'Your backlog'}, at a glance.</h2></div><span class="section-note">{profile()?`Last synced ${new Date(profile()!.updatedAt).toLocaleString()}`:sampleCurator()?`Steam Curator · ${sampleCurator()!.theme}`:'Imported library · Saved on this device'}</span></div>
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

        <section id="library" class="library-section" aria-labelledby="library-title">
          <div class="section-heading">
            <div><p class="eyebrow">LESS COLLECTING. MORE COMPLETING.</p><h2 id="library-title" tabindex={-1}>{loaded()?profile()?profile()!.name+'’s library':sampleCurator()?`Sample · ${sampleCurator()!.name}`:'Your local library':'Explore the Top 250'}</h2></div>
            <Show when={loaded()}><span class="section-note">{activeGames().length} games · Saved on this device</span></Show>
            <div class="library-heading-actions">
              <label class="library-sort">Sort library<select value={preferences().librarySort} onChange={e=>setPreference({librarySort:e.currentTarget.value})}><option value="default">Original order</option><option value="title">Title</option><option value="remaining">Remaining time</option><option value="playtime">Most played</option></select></label>
              <LibraryViewToggle />
              <Show when={loaded()}><button class="select-games" aria-pressed={selecting()?'true':'false'} disabled={Boolean(library.warning)} onClick={()=>{setSelecting(!selecting());setSelected([]);}}>Select games</button></Show>
              <DataTools canUndo={canUndo()} onUndo={undo} games={games()} onReady={fn=>{openDataTools=fn;}} onApply={next=>{if(!applyLibrary(next,null))return false;setSampleCurator(null);setFilters(current=>({...current,search:''}));return true;}} readOnly={Boolean(library.warning)} />
            </div>
          </div>
          <div class="library-toolbar-row">
            <label class="library-search"><span class="sr-only">{loaded()?'Search this library':'Search Top 250'}</span><input type="search" maxlength="300" placeholder={loaded()?'Find a game…':'Search Top 250…'} value={filters().search} onInput={e => changeFilter({search:e.currentTarget.value})} /></label>
            <button type="button" class="library-reset" disabled={!hasCustomFilters()} onClick={() => setFilters({...defaultFilters})}>Reset filters</button>
          </div>
          <LibraryFilterSummary />
          <Show when={selecting()}><BulkActions selected={selected()} visible={visibleGames().map(g=>g.appId)} onSelect={setSelected} onClose={()=>{setSelecting(false);setSelected([]);}} /></Show>
          <Show when={!loaded()}><p class="demo-note">Ranking: <a href={catalogSource} target="_blank" rel="noopener noreferrer">Steam 250 ↗</a> · Snapshot {new Date(catalogUpdatedAt).toLocaleDateString()}. Based on Steam player reviews; not an official Valve ranking. These are recommendations, not games you own.</p></Show>
          <Show when={loaded()&&sampleCurator()}><p class="demo-note">{sampleCurator()!.live?'Public curator picks from ':'Illustrative offline sample inspired by '}<a href={sampleCurator()!.url} target="_blank" rel="noopener noreferrer">{sampleCurator()!.name} ↗</a> ({sampleCurator()!.theme}). Playtime, status and prices paid are demo values, not a real person’s library.</p></Show>
          <Show when={loaded()&&!sampleCurator()}><p class="demo-note">Playtime comes from the loaded library. Prices paid and completion times are unknown unless supplied; unknown values are excluded from planning and value calculations.</p></Show>
          <p class={["save-message", {"save-error": saveFailed()}]} role="status" aria-live="polite">{saveMessage()}</p>

          <Show when={loaded()}>{libraryPagination()}</Show>
          <ul class={["game-grid",{"list-view":preferences().libraryView==='list'}]} id="library-grid" aria-label="Game library">
            <For each={visibleGames()} keyed={item=>item.appId}>{game => <li class={["game-card",{"discovery-card":!loaded()}]}>
              <div class="game-cover"><Show when={selecting()&&loaded()}><label class="bulk-check"><input type="checkbox" aria-label={'Select '+game().title} checked={selected().includes(game().appId)} onChange={()=>toggleSelection(game().appId)} /><span class="sr-only">Select {game().title}</span></label></Show>
                <span class="cover-fallback" aria-hidden="true">{game().title}</span>
                <img src={game().image??coverUrl(game().appId)} alt="" loading="lazy" width="460" height="215" onError={event => { event.currentTarget.style.visibility = "hidden"; }} onLoad={event=>{event.currentTarget.style.visibility="visible";}} />
                <Show when={!loaded()}><span class="catalog-rank">#{game().rank} in Steam 250</span></Show>
                <span class="score-badge">{game().steamPositivePercent!==undefined?`${game().steamPositivePercent}% positive`:game().metacritic!==null?`MC ${game().metacritic}`:'Score unknown'}</span>
              </div>
              <div class="game-content">
                <div class="game-title-row"><h3>{game().title}</h3></div><Show when={exclusionReason(game(),preferences())}><p class="excluded-label">{exclusionReason(game(),preferences())} · {loaded()?'still in this library':'discovery only'}</p></Show>
                <Show when={!loaded()} fallback={<><p class="game-genres">{game().genres.join(" · ")}</p><PlayerCountBadge count={counts()[game().appId]} /></>}>
                  <div class="card-genre-pills" aria-label="Genres"><For each={game().genres.slice(0,4)}>{genre=><span class="genre-pill">{genre}</span>}</For></div>
                  <div class="meta-tray">
                    <div class="meta-cell"><span class="meta-k">US Price</span><PriceBadge price={prices()[game().appId]} placeholder /></div>
                    <div class="meta-cell"><span class="meta-k">Playing Now</span><PlayerCountBadge count={counts()[game().appId]} compact /></div>
                  </div>
                </Show>
                <Show when={loaded()}>
                <div class="game-hours"><span>{game().playtimeHours}h played</span><Show when={game().timeToBeatHours!==null}><span>~{game().timeToBeatHours}h to beat</span></Show></div>
                <Show when={game().timeToBeatHours!==null}><progress class="game-progress" aria-label={`${game().title}: playtime relative to estimated completion time, not actual completion`} max={Math.max(1, game().timeToBeatHours??1)} value={Math.min(game().playtimeHours, Math.max(1, game().timeToBeatHours??1))} /></Show>
                <div class="game-controls">
                  <label class="status-label">Status
                    <select value={game().status} disabled={Boolean(library.warning)} onChange={event => {
                      const select = event.currentTarget;
                      if (!updateGame(game().appId, { status: select.value as Game["status"] })) select.value = game().status;
                    }} aria-label={`Status for ${game().title}`}>
                      <For each={statuses}>{status => <option value={status}>{status}</option>}</For>
                    </select>
                  </label>
                </div>
                </Show>
                <a class="game-store" href={`https://store.steampowered.com/app/${game().appId}/`} target="_blank" rel="noopener noreferrer">View on Steam ↗</a>
                <button class="game-details-button" onClick={e=>{e.currentTarget.focus({preventScroll:true});setDetailsId(game().appId);}}>Game details <span aria-hidden="true">＋</span></button>
              </div>
            </li>}</For>
          </ul>
          <Show when={loaded()&&libraryRows().length>24}>{libraryPagination(true)}</Show>
          <Show when={!loaded()&&filtered().length>6}><div class="discovery-expand"><button type="button" aria-controls="library-grid" aria-expanded={expanded()?'true':'false'} onClick={()=>{const collapse=expanded();setExpanded(!collapse);if(collapse)document.getElementById('library')?.scrollIntoView();}}>{expanded()?'Show fewer games':`Show all ${filtered().length} games`}</button><span>Showing {visibleGames().length} of {filtered().length} matches · roulette uses every matching game</span></div></Show>
          <Show when={activeGames().length > 0 && filtered().length === 0}><div class="library-empty" role="status"><span class="i-lucide-library" aria-hidden="true" /><h3>{clearedBacklog()?'Your backlog is clear.':'No games match these filters.'}</h3><p>{clearedBacklog()?'Your saved games are completed or dropped. You can still browse them.':filters().time!=='all'||filters().maxHours<200?'Time filters only include games with known completion estimates. Try Any length to include the rest.':'Try clearing your search or switching back to All games.'}</p><LibraryFilterRecovery /><button onClick={() => setFilters({...defaultFilters,...(clearedBacklog()?{state:'all'}:{})})}>{clearedBacklog()?'View all saved games':'Reset filters'}</button></div></Show>
          <Show when={loaded()&&games().length === 0}><div class="library-empty"><h3>This library has no games.</h3><p>Look up another profile, or add games and import a JSON library using the controls above.</p><button onClick={focusProfile}>Look up another profile</button></div></Show>
        </section>

      <GameDetails compact={!loaded()} game={detailGame()} owned={loaded()} onClose={()=>setDetailsId(null)}><Show when={detailGame()}>{game=><><Show when={loaded()}><GameTags game={game()} disabled={Boolean(library.warning)} onSave={tags=>updateGame(game().appId,{tags})} /><span class="value-badge">{game().priceKnown===false?'Purchase cost unknown':costPerHour(game())===null?'Cost per hour unavailable until played':'$'+costPerHour(game())!.toFixed(2)+'/h'}</span></Show><p class="metadata-label">Source: {game().metadataSource}</p><label class="exclude-game"><input type="checkbox" checked={preferences().excludedIds.includes(game().appId)} onChange={()=>toggleExcluded(game().appId)} /> Exclude from roulette</label><Show when={loaded()}><button class="remove-game" onClick={()=>{removeGame(game().appId);setDetailsId(null);}}>Remove from this list</button></Show></>}</Show></GameDetails>
      <dialog class="modal winner-modal" ref={winnerDialog} onClose={()=>setWinner(null)} aria-labelledby="winner-title">
        <button class="modal-close" onClick={()=>winnerDialog.close()} aria-label="Close winner spotlight">✕</button>
        <Show when={winnerGame()}><div>
          <p class="eyebrow">FATE HAS EXCELLENT TASTE</p><h2 id="winner-title">{winnerGame()?.title}</h2>
          <img class="winner-cover" src={coverUrl(winnerGame()?.appId ?? 0)} alt={winnerGame()?.title ?? ""} onError={e=>{e.currentTarget.style.display='none';}} />
          <p class="winner-reason">{winnerGame()?recommendationReasons(winnerGame()!,spinFilters(),loaded()):''}</p><p class="demo-note">{winnerGame()?.genres.join(' · ')} · {winnerGame()?.metadataSource}</p>
          <div class="winner-choice"><button class="winner-reroll" onClick={()=>reroll()}>Reroll</button><button class="winner-skip" onClick={()=>reroll(true)}>Not tonight</button><button class="winner-skip" onClick={()=>reroll(true,true)}>Skip until tomorrow</button></div><div class="tool-actions"><Show when={loaded()}><a class="winner-launch" href={`steam://run/${winnerGame()?.appId}`}>Launch in Steam ↗</a></Show><a href={`https://store.steampowered.com/app/${winnerGame()?.appId}/`} target="_blank" rel="noopener noreferrer">Store page ↗</a><Show when={loaded()}><button class="winner-playing" disabled={Boolean(library.warning) || winnerGame()?.status==='Playing'} onClick={()=>{const game=winnerGame();if(game)updateGame(game.appId,{status:'Playing'});}}>Mark currently playing</button></Show></div>
          <dl class="winner-stats"><Show when={loaded()}><div><dt>Played</dt><dd>{winnerGame()?.playtimeHours}h</dd></div></Show><div><dt>Completion time</dt><dd>{winnerGame()?.timeToBeatHours==null?'Unknown':`~${winnerGame()?.timeToBeatHours}h`}</dd></div><div><dt>Reviews</dt><dd>{winnerGame()?.steamPositivePercent!==undefined?`${winnerGame()?.steamPositivePercent}% positive`:winnerGame()?.metacritic??'Unknown'}</dd></div><Show when={loaded()}><div><dt>Status</dt><dd>{winnerGame()?.status}</dd></div></Show></dl>
          <p class="demo-note">Launching requires the Steam desktop app. Completion times are estimates.</p>
          <p role="status">{saveMessage()}</p>
        </div></Show>
      </dialog>
  </div>;
}
