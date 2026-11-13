import {createEffect,createSignal,For,Show} from 'solid-js';
import {useLibrary} from './library-state';
import {GameInsights} from './game-insights';
import {steamNewsImage} from './steam-news-image';
type Story={title:string;appId:number;url:string;date:string;summary?:string;images?:string[]};
export default function NewsPage(){
 const {games,profile}=useLibrary();
 const [section,setSection]=createSignal('featured'),[items,setItems]=createSignal<Story[]>([]),[busy,setBusy]=createSignal(false),[error,setError]=createSignal(''),[revision,setRevision]=createSignal(0),[selected,setSelected]=createSignal(0);
 const choices=()=>profile()?games().filter(g=>g.playtimeHours>=3):[];
 const current=()=>choices().find(g=>g.appId===selected())??choices()[0];
 createEffect(()=>section()+'|'+revision(),()=>{
  setItems([]);setError('');setBusy(false);if(section()==='yours')return;
  const c=new AbortController();setBusy(true);
  void fetch('/api/news?section='+section(),{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data)||data.some(n=>!n||typeof n.title!=='string'||!Number.isSafeInteger(n.appId)||n.appId<1||!Number.isFinite(Date.parse(n.date))||!new RegExp('^https://store\\.steampowered\\.com/news/app/'+n.appId+'/view/[0-9]+$').test(n.url)))throw Error();if(!c.signal.aborted)setItems(data);}).catch(()=>{if(!c.signal.aborted)setError('Steam news could not load. Please try again.');}).finally(()=>{if(!c.signal.aborted)setBusy(false);});return ()=>c.abort();
 });
 return <section class="discovery-page" aria-labelledby="news-title"><div class="discovery-heading"><div><p class="eyebrow">FROM AROUND STEAM</p><h1 id="news-title">News / Patches</h1><p>Featured stories, Steam announcements and updates for the games you play.</p></div></div>
 <div class="news-tabs" aria-label="News sections"><For each={[['featured','Featured'],['official','Steam Official'],['yours','Your News']]}>{entry=><button aria-pressed={section()===entry[0]?'true':'false'} disabled={entry[0]==='yours'&&!profile()} onClick={()=>setSection(entry[0]!)}>{entry[1]}{entry[0]==='yours'&&!profile()?' Â· Locked':''}</button>}</For></div>
 <Show when={!profile()}><p class="insight-caption">Load a Steam profile to unlock Your News for games with at least three hours played. <a href="/#main">Add a profile â†—</a></p></Show>
 <Show when={busy()}><p role="status">Loading Steam newsâ€¦</p></Show><Show when={error()}><p role="status">{error()}</p><button onClick={()=>setRevision(n=>n+1)}>Retry</button></Show>
 <Show when={section()!=='yours'}><div class="news-grid news-list"><For each={items()}>{n=><article class="news-card"><img src={steamNewsImage(n.images?.[0])??'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/'+n.appId+'/header.jpg'} alt="" loading="lazy" /><div><time>{new Date(n.date).toLocaleDateString()}</time><h2><a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a></h2><p>{n.summary}</p><a href={n.url} target="_blank" rel="noopener noreferrer">Read on Steam â†—</a></div></article>}</For></div><Show when={!busy()&&!error()&&!items().length}><p>No stories are available right now.</p></Show></Show>
 <Show when={section()==='yours'&&profile()}><Show when={current()} fallback={<p>No games in this profile have reached three hours of playtime yet.</p>}>{game=><><div class="discovery-toolbar"><label>Choose a game<select value={game().appId} onChange={e=>setSelected(Number(e.currentTarget.value))}><For each={choices()}>{g=><option value={g.appId}>{g.title}</option>}</For></select></label><p>Games with at least three hours played</p></div><GameInsights appId={game().appId} view="updates" /></>}</Show></Show></section>;
}


