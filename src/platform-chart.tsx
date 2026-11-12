import {createMemo,createSignal,For,Show} from 'solid-js';
import {TimeChart} from './time-chart';
import {seriesPath,monthlySeries,recentGameSamples,windowDate,type MonthlyPlayers} from './charts';

export function PlatformChart(props:{samples:[number,number][];kind?:'game';monthly?:MonthlyPlayers[]}){
  const recent=createMemo(()=>props.kind==='game'?recentGameSamples(props.samples):props.samples);
  const months=createMemo(()=>monthlySeries(props.monthly??[]));
  const first=()=>Math.min(recent()[0]?.[0]??Infinity,months()[0]?.at??Infinity);
  const last=()=>Math.max(recent().at(-1)?.[0]??0,months().at(-1)?.at??0);
  const span=()=>Math.max(1,last()-first());
  const recentSpan=()=>recent().length>1?recent().at(-1)![0]-recent()[0]![0]:0;
  const isGame=()=>props.kind==='game';
  const unavailable=(hours:number)=>hours>0&&span()<hours*3600000*.95;
  const fullLabel=()=>isGame()?'Max':'All';
  const ranges=()=>[{label:'12h',hours:12},{label:'24h',hours:24},{label:'48h',hours:48},{label:'1w',hours:168},{label:'1m',hours:720},{label:'1y',hours:8760},{label:fullLabel(),hours:0}];
  const initialRange=()=>isGame()?(recentSpan()>=7*86400000*.95?'1w':'Max'):(!unavailable(48)&&unavailable(168)&&span()<=50*3600000?'48h':'All');
  const [range,setRange]=createSignal(initialRange());
  const [customBounds,setCustomBounds]=createSignal<[number,number]>([0,1000]);
  const bounds=createMemo<[number,number]>(()=>{
    if(range()==='custom')return customBounds();
    const preset=ranges().find(r=>r.label===range());
    if(!preset||!preset.hours)return [0,1000];
    return [Math.max(0,1000-preset.hours*3600000/span()*1000),1000];
  });
  const timestamp=(position:number)=>first()+span()*position/1000;
  const windowSpan=()=>timestamp(bounds()[1])-timestamp(bounds()[0]);
  const monthly=()=>isGame()&&months().length>0&&(timestamp(bounds()[0])<(recent()[0]?.[0]??Infinity)||windowSpan()>45*86400000);
  const gap=()=>monthly()?35*86400000:timestamp(bounds()[0])<last()-60*86400000?36*3600000:6*3600000;
  const overviewGap=()=>months().length?35*86400000:span()>60*86400000?36*3600000:6*3600000;
  const series=createMemo(()=>{
    const within=(at:number)=>at>=timestamp(bounds()[0])&&at<=timestamp(bounds()[1]);
    if(monthly())return [{name:'Monthly average',color:'#ffbf00',samples:months().filter(p=>within(p.at)).map(p=>[p.at,p.average] as [number,number])},{name:'Monthly peak',color:'#66c0f4',samples:months().filter(p=>within(p.at)).map(p=>[p.at,p.peak] as [number,number])}];
    return [{name:isGame()?'Recorded players':'Online',color:'#ffbf00',samples:recent().filter(p=>within(p[0]))}];
  });
  const overview=()=>months().length?months().map(p=>[p.at,p.average] as [number,number]):recent();
  function choose(label:string){setRange(label);}
  function download(){
    const csv='timestamp_utc,measurement,players\n'+series().flatMap(s=>s.samples.map(([at,count])=>new Date(at).toISOString()+','+s.name+','+count)).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=isGame()?'steam-game-players.csv':'steam-online-users.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const date=(at:number)=>new Date(at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  return <div class="platform-chart">
    <div class="chart-controls"><div class="chart-ranges" aria-label="Chart time range"><span>Zoom</span><For each={ranges()}>{r=><button disabled={unavailable(r.hours)} title={unavailable(r.hours)?(isGame()?'Unavailable: recorded history begins '+date(first()):'Unavailable: Steam’s public feed returns 48h; archived history begins '+windowDate(first(),span())+' UTC'):(r.hours===0&&!isGame()?'All archived Steam online-user observations':undefined)} aria-pressed={range()===r.label?'true':'false'} onClick={()=>choose(r.label)}>{r.label}</button>}</For></div><button class="chart-download" onClick={download} aria-label="Download visible chart measurements as CSV">↓ CSV</button></div>
    <p class="chart-coverage"><strong>{monthly()?'Monthly averages & peaks':'Recorded observations'}</strong> · Available {windowDate(first(),span())}–{windowDate(last(),span())} UTC<Show when={ranges().some(r=>unavailable(r.hours))}>{isGame()?' · Dimmed ranges need more recorded history.':' · Steam’s public feed only supplies the last 48 hours; longer ranges unlock as this app archives observations.'}</Show><Show when={isGame()}> Max begins at the first available record, which may be after release.</Show></p>
    <Show when={series().some(s=>s.samples.length>0)} fallback={<p class="pulse-empty">No recorded samples in this selection. Widen the selected range.</p>}><TimeChart class="online-series" label={monthly()?'Monthly average and peak concurrent players':isGame()?'Recorded concurrent players':'Steam users logged in'} domain={[timestamp(bounds()[0]),timestamp(bounds()[1])]} monthly={monthly()} gap={gap()} series={series()} /></Show>
    <div class="chart-navigator" aria-label="Select the visible history window"><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d={seriesPath(overview(),100,30,overviewGap(),[first(),last()])} fill="none" stroke="#ffbf00" stroke-width="1.5" /></svg><span class="navigator-selection" style={{left:bounds()[0]/10+'%',width:(bounds()[1]-bounds()[0])/10+'%'}} /><label class="sr-only" for={isGame()?'game-chart-start':'chart-start'}>History window start</label><input id={isGame()?'game-chart-start':'chart-start'} aria-label="History window start" type="range" step="0.01" min="0" max="1000" value={bounds()[0]} onInput={e=>{const current=bounds();setRange('custom');setCustomBounds([Math.min(Number(e.currentTarget.value),current[1]-0.01),current[1]]);}} /><label class="sr-only" for={isGame()?'game-chart-end':'chart-end'}>History window end</label><input id={isGame()?'game-chart-end':'chart-end'} aria-label="History window end" type="range" step="0.01" min="0" max="1000" value={bounds()[1]} onInput={e=>{const current=bounds();setRange('custom');setCustomBounds([current[0],Math.max(Number(e.currentTarget.value),current[0]+0.01)]);}} /></div>
    <div class="navigator-dates"><span>{windowDate(timestamp(bounds()[0]),windowSpan())}</span><span>{windowDate(timestamp(bounds()[1]),windowSpan())}</span></div>
    <div class="platform-legend"><For each={series()}>{s=><span><i style={{background:s.color}} />{s.name}</span>}</For><Show when={!isGame()}><span class="unavailable-series">In-game history unavailable</span></Show><span>{series()[0]?.samples.length.toLocaleString()} {monthly()?'monthly records':'recorded samples'} · UTC</span></div>
  </div>;
}
