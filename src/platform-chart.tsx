import {createMemo,createSignal,For,Show} from 'solid-js';
import {TimeChart} from './time-chart';
import {seriesPath,monthlySeries,recentGameSamples,type MonthlyPlayers} from './charts';

export function PlatformChart(props:{samples:[number,number][];kind?:'game';monthly?:MonthlyPlayers[]}){
  const recent=createMemo(()=>props.kind==='game'?recentGameSamples(props.samples):props.samples);
  const months=createMemo(()=>monthlySeries(props.monthly??[]));
  const first=()=>Math.min(recent()[0]?.[0]??Infinity,months()[0]?.at??Infinity);
  const last=()=>Math.max(recent().at(-1)?.[0]??0,months().at(-1)?.at??0);
  const span=()=>Math.max(1,last()-first());
  const recentSpan=()=>recent().length>1?recent().at(-1)![0]-recent()[0]![0]:0;
  const week=props.kind==='game'&&recentSpan()>=7*86400000*.95;
  const [bounds,setBounds]=createSignal<[number,number]>([week?Math.max(0,1000-7*86400000/span()*1000):0,1000]);
  const [range,setRange]=createSignal(week?'1w':'Max');
  const timestamp=(position:number)=>first()+span()*position/1000;
  const monthly=()=>props.kind==='game'&&months().length>0&&(timestamp(bounds()[0])<(recent()[0]?.[0]??Infinity)||timestamp(bounds()[1])-timestamp(bounds()[0])>45*86400000);
  const series=createMemo(()=>{
    const within=(at:number)=>at>=timestamp(bounds()[0])&&at<=timestamp(bounds()[1]);
    if(monthly())return [{name:'Monthly average',color:'#ffbf00',samples:months().filter(p=>within(p.at)).map(p=>[p.at,p.average] as [number,number])},{name:'Monthly peak',color:'#66c0f4',samples:months().filter(p=>within(p.at)).map(p=>[p.at,p.peak] as [number,number])}];
    return [{name:props.kind==='game'?'Recorded players':'Online',color:'#ffbf00',samples:recent().filter(p=>within(p[0]))}];
  });
  const overview=()=>months().length?months().map(p=>[p.at,p.average] as [number,number]):recent();
  const ranges=[{label:'12h',hours:12},{label:'24h',hours:24},{label:'48h',hours:48},{label:'1w',hours:168},{label:'1m',hours:720},{label:'1y',hours:8760},{label:'Max',hours:0}];
  const unavailable=(hours:number)=>hours>0&&span()<hours*3600000*.95;
  function choose(label:string,hours:number){setRange(label);setBounds(hours?[Math.max(0,1000-hours*3600000/span()*1000),1000]:[0,1000]);}
  function download(){
    const csv='timestamp_utc,measurement,players\n'+series().flatMap(s=>s.samples.map(([at,count])=>new Date(at).toISOString()+','+s.name+','+count)).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=props.kind==='game'?'steam-game-players.csv':'steam-online-users.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const date=(at:number)=>new Date(at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  return <div class="platform-chart">
    <div class="chart-controls"><div class="chart-ranges" aria-label="Chart time range"><span>Zoom</span><For each={ranges}>{r=><button disabled={unavailable(r.hours)} title={unavailable(r.hours)?'Unavailable: recorded history begins '+date(first()):undefined} aria-pressed={range()===r.label?'true':'false'} onClick={()=>choose(r.label,r.hours)}>{r.label}</button>}</For></div><button class="chart-download" onClick={download} aria-label="Download visible chart measurements as CSV">↓ CSV</button></div>
    <p class="chart-coverage"><strong>{monthly()?'Monthly averages & peaks':'Recorded observations'}</strong> · Available {date(first())}–{date(last())}<Show when={ranges.some(r=>unavailable(r.hours))}> · Dimmed ranges need more recorded history.</Show><Show when={props.kind==='game'}> Max begins at the first available record, which may be after release.</Show></p>
    <Show when={series().some(s=>s.samples.length>0)} fallback={<p class="pulse-empty">No recorded samples in this selection. Widen the selected range.</p>}><TimeChart class="online-series" label={monthly()?'Monthly average and peak concurrent players':props.kind==='game'?'Recorded concurrent players':'Steam users logged in'} domain={[timestamp(bounds()[0]),timestamp(bounds()[1])]} monthly={monthly()} gap={monthly()?35*86400000:6*3600000} series={series()} /></Show>
    <div class="chart-navigator" aria-label="Select the visible history window"><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d={seriesPath(overview(),100,30,months().length?35*86400000:6*3600000,[first(),last()])} fill="none" stroke="#ffbf00" stroke-width="1.5" /></svg><span class="navigator-selection" style={{left:bounds()[0]/10+'%',width:(bounds()[1]-bounds()[0])/10+'%'}} /><label class="sr-only" for={props.kind==='game'?'game-chart-start':'chart-start'}>History window start</label><input id={props.kind==='game'?'game-chart-start':'chart-start'} aria-label="History window start" type="range" step="0.01" min="0" max="1000" value={bounds()[0]} onInput={e=>{setRange('custom');setBounds([Math.min(Number(e.currentTarget.value),bounds()[1]-0.01),bounds()[1]]);}} /><label class="sr-only" for={props.kind==='game'?'game-chart-end':'chart-end'}>History window end</label><input id={props.kind==='game'?'game-chart-end':'chart-end'} aria-label="History window end" type="range" step="0.01" min="0" max="1000" value={bounds()[1]} onInput={e=>{setRange('custom');setBounds([bounds()[0],Math.max(Number(e.currentTarget.value),bounds()[0]+0.01)]);}} /></div>
    <div class="navigator-dates"><span>{date(timestamp(bounds()[0]))}</span><span>{date(timestamp(bounds()[1]))}</span></div>
    <div class="platform-legend"><For each={series()}>{s=><span><i style={{background:s.color}} />{s.name}</span>}</For><Show when={props.kind!=='game'}><span class="unavailable-series">In-game history unavailable</span></Show><span>{series()[0]?.samples.length.toLocaleString()} {monthly()?'monthly records':'recorded samples'} · UTC</span></div>
  </div>;
}
