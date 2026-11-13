import type {RouteSectionProps} from '@solidjs/router';
import {useHref,useLocation} from '@solidjs/router';
import {LibraryProvider,useLibrary} from '../library-state';
import {createEffect,createSignal,For,Show} from 'solid-js';
import {BrandMark} from '../brand-mark';

function AppShell(props:RouteSectionProps){
  const {preferences,setPreference,preferenceWarning,canUndo,undo,saveMessage,changeRevision,profile,loaded}=useLibrary();
  const location=useLocation();
  const [visibleSection,setVisibleSection]=createSignal('main');
  function jumpToSection(event:MouseEvent,id:string){
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    setVisibleSection(id);requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'}));
  }
  createEffect(()=>location.pathname,pathname=>{
    let frame=0;
    const measure=()=>{frame=0;let current='main';for(const id of pathname==='/activity'?['overview','briefs','ranking']:pathname==='/'?['main','roulette','library']:[]){const section=document.getElementById(id);if(section&&section.getBoundingClientRect().top<=160)current=id;}setVisibleSection(current);};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    schedule();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  });
  const [noticeVisible,setNoticeVisible]=createSignal(false);
  createEffect(()=>changeRevision(),revision=>{if(!revision)return;setNoticeVisible(true);const timer=setTimeout(()=>setNoticeVisible(false),10000);return ()=>clearTimeout(timer);});
  createEffect(()=>location.pathname+location.hash,route=>{if(/^\/(?:activity|top250|news)?(?:#(?:main|roulette|library|overview|briefs|comparison|ranking))?$/.test(route)&&route!==preferences().lastRoute)setPreference({lastRoute:route});});
  createEffect(()=>location.pathname,pathname=>{document.title=pathname==='/activity'?'Charts · SteamNext':pathname==='/top250'?'Top 250 · SteamNext':pathname==='/news'?'News · SteamNext':'SteamNext · Time-to-Beat Planner';});
  const home=useHref(()=>'/#main'),roulette=useHref(()=>'/#roulette'),activity=useHref(()=>'/activity'),news=useHref(()=>'/news'),discovery=useHref(()=>'/top250'),libraryHref=useHref(()=>'/#library');
  const isPulse=()=>location.pathname==='/activity';
  const pulseLinks=[
    {id:'overview',href:useHref(()=>'/activity#overview'),title:'Overview',icon:'i-lucide-activity'},
    {id:'briefs',href:useHref(()=>'/activity#briefs'),title:'Highlights',icon:'i-lucide-layout-dashboard'},
    {id:'ranking',href:useHref(()=>'/activity#ranking'),title:'Top 1,000',icon:'i-lucide-library'},
  ];
  const pulseActive=(id:string)=>(['overview','briefs','ranking'].includes(visibleSection())?visibleSection():'overview')===id;
  const active=(page:string)=>page==='top250'?location.pathname==='/top250':location.pathname==='/'&&(page==='roulette'?visibleSection()==='roulette':visibleSection()!=='roulette');
  return <>
    <a class="skip-link" href={home()}>Skip to content</a>
    <header class="site-header"><div class="header-inner flex items-center justify-between gap-4">
      <a class="brand flex items-center gap-3" href={home()} aria-label="SteamNext home"><span class="brand-emblem"><BrandMark class="brand-icon" /></span><span>SteamNext<span class="brand-period">.</span></span></a>
      <nav class="flex items-center gap-3" aria-label="Main navigation"><a href={home()} class={location.pathname==='/'?'nav-active':''}>Backlog</a><a href={activity()} class={location.pathname==='/activity'?'nav-active':''}><span class="i-lucide-activity" aria-hidden="true" />Charts</a><a href={news()} class={location.pathname==='/news'?'nav-active':''}>News</a></nav>
      <Show when={profile()} fallback={<span class="header-note">{loaded()?'LOCAL LIBRARY':'PUBLIC LIBRARIES · NO LOGIN'}</span>}><a class="header-profile" href={home()} title="View loaded library"><Show when={profile()?.avatar}><img src={profile()?.avatar} alt="" width="32" height="32" /></Show><span><small>VIEWING LIBRARY</small><strong>{profile()?.name}</strong></span></a></Show>
    </div></header>
    <div class="app-layout">
      <aside class={["app-sidebar",{"pulse-sidebar":isPulse()}]}><p class="eyebrow">{isPulse()?"CHARTS":"MAKE TIME FOR PLAY"}</p><Show when={isPulse()} fallback={<nav aria-label="Backlog navigation">
        <a onClick={e=>jumpToSection(e,'library')} href={libraryHref()} class={active('backlog')?'sidebar-active':''} aria-current={active('backlog')?'page':undefined}><span class="sidebar-symbol i-lucide-layout-dashboard" aria-hidden="true" /><span class="sidebar-copy"><strong>Library</strong></span></a>
        <a onClick={e=>jumpToSection(e,'roulette')} href={roulette()} class={active('roulette')?'sidebar-active':''} aria-current={active('roulette')?'location':undefined}><span class="sidebar-symbol i-lucide-shuffle" aria-hidden="true" /><span class="sidebar-copy"><strong>Roulette</strong></span></a>
        <a href={discovery()} class={active('top250')?'sidebar-active':''} aria-current={active('top250')?'page':undefined}><span class="sidebar-symbol i-lucide-library" aria-hidden="true" /><span class="sidebar-copy"><strong>Top 250</strong></span></a>
      </nav>}><nav aria-label="Charts navigation"><For each={pulseLinks}>{link=><a onClick={e=>jumpToSection(e,link.id)} href={link.href()} class={pulseActive(link.id)?"sidebar-active":""} aria-current={pulseActive(link.id)?"location":undefined}><span class={"sidebar-symbol "+link.icon} aria-hidden="true" /><span class="sidebar-copy"><strong>{link.title}</strong></span></a>}</For></nav></Show></aside>
      <main id="main" class="page-wrap"><Show when={preferenceWarning()}><p class="storage-warning" role="status">{preferenceWarning()}</p></Show>{props.children}</main>
    </div>
    <footer class="site-footer">
      <div class="footer-intro"><div><a class="footer-brand" href={home()}><BrandMark class="footer-brand-icon" /><span>SteamNext<span class="brand-period">.</span></span></a><p>Good games deserve your time.</p></div><span class="footer-signoff">A little less choosing.<br /><strong>A little more playing.</strong></span></div>
      <div class="footer-bottom"><div class="footer-links"><span class="eyebrow">PROJECT & SOURCES</span><a href={activity()}>Charts</a><a href={news()}>News</a><a href="https://store.steampowered.com/" target="_blank" rel="noopener noreferrer">Steam ↗</a><a href="https://steam250.com/top250" target="_blank" rel="noopener noreferrer">Steam 250 ↗</a><a href="https://github.com/MironescuOctavian/Steam-Next" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><a class="footer-credit" href="https://octavianmironescu.com/en/" target="_blank" rel="noopener noreferrer">Built by Mironescu Octavian. ↗</a><small>Independent project. Not affiliated with Valve or Steam.</small></div>
    </footer>
    <Show when={canUndo()&&noticeVisible()}><aside class="undo-toast" aria-label="Recent library change"><span role="status">{saveMessage()}</span><button onClick={undo}>Undo</button><button class="undo-dismiss" aria-label="Dismiss change notice" onClick={()=>setNoticeVisible(false)}>×</button></aside></Show>
  </>;
}
export default function AppLayout(props:RouteSectionProps){return <LibraryProvider><AppShell {...props} /></LibraryProvider>;}
