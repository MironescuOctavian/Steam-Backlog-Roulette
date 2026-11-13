import {createSignal,For} from 'solid-js';
import {useLibrary} from '../../../library-state';
import {sampleLibrary} from '../../../sample-library';
import {GameInsights} from '../../../game-insights';
export default function NewsPage(){
  const {games}=useLibrary();
  const choices=()=>games().length?games():sampleLibrary();
  const [selected,setSelected]=createSignal(choices()[0]!.appId);
  const current=()=>choices().find(g=>g.appId===selected())??choices()[0]!;
  return <section class="discovery-page" aria-labelledby="news-title"><div class="discovery-heading"><div><p class="eyebrow">OFFICIAL STEAM ANNOUNCEMENTS</p><h1 id="news-title">News / Patches</h1><p>Updates, patch notes and announcements from your games.</p></div></div><div class="discovery-toolbar"><label>Choose a game<select value={current().appId} onChange={e=>setSelected(Number(e.currentTarget.value))}><For each={choices()}>{g=><option value={g.appId}>{g.title}</option>}</For></select></label><p>{games().length?'Your loaded library':'Sample games · load your library for your own games'}</p></div><GameInsights appId={current().appId} view="updates" /></section>;
}
