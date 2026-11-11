import type {RouteSectionProps} from '@solidjs/router';
import {useHref,useLocation} from '@solidjs/router';
import {LibraryProvider,useLibrary} from '../library-state';
import {createEffect,createSignal,Show} from 'solid-js';

function AppShell(props:RouteSectionProps){
  const {preferences,setPreference,preferenceWarning,canUndo,undo,saveMessage,changeRevision}=useLibrary();
  const location=useLocation();
  const [noticeVisible,setNoticeVisible]=createSignal(false);
  createEffect(()=>changeRevision(),revision=>{if(!revision)return;setNoticeVisible(true);const timer=setTimeout(()=>setNoticeVisible(false),10000);return ()=>clearTimeout(timer);});
  createEffect(()=>location.pathname+location.hash,route=>{if(/^\/(?:activity|top250)?(?:#(?:main|roulette|library))?$/.test(route)&&route!==preferences().lastRoute)setPreference({lastRoute:route});});
  createEffect(()=>location.pathname,pathname=>{document.title=pathname==='/activity'?'Steam pulse · Steam Backlog':pathname==='/top250'?'Top 250 · Steam Backlog':'Steam Backlog · Time-to-Beat Planner';});
  const home=useHref(()=>'/#main'),roulette=useHref(()=>'/#roulette'),library=useHref(()=>'/#library'),activity=useHref(()=>'/activity'),discovery=useHref(()=>'/top250');
  const active=(page:string)=>page==='top250'?location.pathname==='/top250':location.pathname==='/'&&(page==='roulette'?location.hash==='#roulette':location.hash!=='#roulette');
  return <>
    <a class="skip-link" href={home()}>Skip to content</a>
    <header class="site-header"><div class="header-inner flex items-center justify-between gap-4">
      <a class="brand flex items-center gap-3" href={home()} aria-label="Steam Backlog home"><span class="brand-emblem"><img class="brand-icon" src="/brand-mark.webp" alt="" /></span><span>Steam Backlog<span class="brand-period">.</span></span></a>
      <nav class="flex items-center gap-3" aria-label="Main navigation"><a href={home()} class={location.pathname==='/'?'nav-active':''}>Backlog</a><a href={activity()} class={location.pathname==='/activity'?'nav-active':''}><span class="i-lucide-activity" aria-hidden="true" />Steam pulse</a></nav>
      <span class="header-note">PUBLIC LIBRARIES · NO LOGIN</span>
    </div></header>
    <div class="app-layout">
      <aside class="app-sidebar"><p class="eyebrow">MAKE TIME FOR PLAY</p><nav aria-label="Backlog navigation">
        <a href={home()} class={active('backlog')?'sidebar-active':''} aria-current={active('backlog')?'page':undefined}><span class="sidebar-symbol i-lucide-layout-dashboard" aria-hidden="true" /><span class="sidebar-copy"><strong>Backlog</strong><small>Your games, your next adventure</small></span><span class="sidebar-number" aria-hidden="true">01</span></a>
        <a href={roulette()} class={active('roulette')?'sidebar-active':''} aria-current={active('roulette')?'location':undefined}><span class="sidebar-symbol i-lucide-shuffle" aria-hidden="true" /><span class="sidebar-copy"><strong>Roulette</strong><small>Let the next game find you</small></span><span class="sidebar-number" aria-hidden="true">02</span></a>
        <a href={discovery()} class={active('top250')?'sidebar-active':''} aria-current={active('top250')?'page':undefined}><span class="sidebar-symbol i-lucide-library" aria-hidden="true" /><span class="sidebar-copy"><strong>Top 250</strong><small>Discover the community favorites</small></span><span class="sidebar-number" aria-hidden="true">03</span></a>
      </nav></aside>
      <main id="main" class="page-wrap"><Show when={preferenceWarning()}><p class="storage-warning" role="status">{preferenceWarning()}</p></Show>{props.children}</main>
    </div>
    <footer class="site-footer">
      <div class="footer-intro"><div><a class="footer-brand" href={home()}><img src="/brand-mark.webp" alt="" width="48" height="48" /><span>Steam Backlog<span class="brand-period">.</span></span></a><p>Good games deserve your time.</p></div><span class="footer-signoff">A little less choosing.<br /><strong>A little more playing.</strong></span></div>
      <div class="footer-destinations" aria-label="Explore Steam Backlog">
        <a href={library()}><span class="i-lucide-library" aria-hidden="true" /><span><strong>Make a little progress</strong><small>Return to your library and pick up where you left off.</small></span><b aria-hidden="true">↗</b></a>
        <a href={roulette()}><span class="i-lucide-shuffle" aria-hidden="true" /><span><strong>Leave it to chance</strong><small>Your filters. Your games. One less decision.</small></span><b aria-hidden="true">↗</b></a>
        <a href={discovery()}><span class="i-lucide-layout-dashboard" aria-hidden="true" /><span><strong>Find a future favorite</strong><small>Browse 250 games loved by the Steam community.</small></span><b aria-hidden="true">↗</b></a>
      </div>
      <div class="footer-bottom"><div class="footer-links"><span class="eyebrow">PROJECT & SOURCES</span><a href={activity()}>Steam pulse</a><a href="https://store.steampowered.com/" target="_blank" rel="noopener noreferrer">Steam ↗</a><a href="https://steam250.com/top250" target="_blank" rel="noopener noreferrer">Steam 250 ↗</a><a href="https://github.com/MironescuOctavian/Steam-Backlog-Roulette" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><a class="footer-credit" href="https://octavianmironescu.com/en/" target="_blank" rel="noopener noreferrer">Built by Mironescu Octavian. ↗</a><small>Independent project. Not affiliated with Valve or Steam.</small></div>
    </footer>
    <Show when={canUndo()&&noticeVisible()}><aside class="undo-toast" aria-label="Recent library change"><span role="status">{saveMessage()}</span><button onClick={undo}>Undo</button><button class="undo-dismiss" aria-label="Dismiss change notice" onClick={()=>setNoticeVisible(false)}>×</button></aside></Show>
  </>;
}
export default function AppLayout(props:RouteSectionProps){return <LibraryProvider><AppShell {...props} /></LibraryProvider>;}
