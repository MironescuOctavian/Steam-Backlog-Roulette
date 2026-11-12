import {createMemo,createSignal,For,Show} from 'solid-js';
import {TimeChart} from './time-chart';
import {seriesPath} from './charts';

export function PlatformChart(props:{samples:[number,number][]}){
  const [bounds,setBounds]=createSignal<[number,number]>([0,1000]);
  const [range,setRange]=createSignal('max');
  const first=()=>props.samples[0]![0],last=()=>props.samples.at(-1)![0];
  const span=()=>Math.max(1,last()-first());
  const timestamp=(position:number)=>first()+span()*position/1000;
  const visible=createMemo(()=>props.samples.filter(p=>p[0]>=timestamp(bounds()[0])&&p[0]<=timestamp(bounds()[1])));
  const ranges=[{label:'12h',hours:12},{label:'24h',hours:24},{label:'48h',hours:48},{label:'1w',hours:168},{label:'1m',hours:720},{label:'1y',hours:8760},{label:'Max',hours:0}];
  function choose(label:string,hours:number){setRange(label);setBounds(hours?[Math.max(0,1000-hours*3600000/span()*1000),1000]:[0,1000]);}
  function download(){const csv='timestamp_utc,online_users\n'+visible().map(([at,count])=>new Date(at).toISOString()+','+count).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='steam-online-users.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div class="platform-chart">
    <div class="chart-controls"><div class="chart-ranges" aria-label="Chart time range"><span>Zoom</span><For each={ranges}>{r=><button disabled={r.hours>0&&span()<r.hours*3600000*.95} title={r.hours>0&&span()<r.hours*3600000*.95?'Not enough recorded history for this range':undefined} aria-pressed={range()===r.label?'true':'false'} onClick={()=>choose(r.label,r.hours)}>{r.label}</button>}</For></div><button class="chart-download" onClick={download} aria-label="Download visible online-user data as CSV">↓ CSV</button></div>
    <Show when={visible().length>=2} fallback={<p class="pulse-empty">No recorded samples in this selection. Widen the selected range.</p>}><TimeChart class="online-series" label="Steam users logged in" series={[{name:'Online',color:'#ffbf00',samples:visible()}]} /></Show>
    <div class="chart-navigator" aria-label="Select the visible history window"><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d={seriesPath(props.samples)} fill="none" stroke="#ffbf00" stroke-width="1.5" /></svg><span class="navigator-selection" style={{left:bounds()[0]/10+'%',width:(bounds()[1]-bounds()[0])/10+'%'}} /><label class="sr-only" for="chart-start">History window start</label><input id="chart-start" aria-label="History window start" type="range" min="0" max="1000" value={bounds()[0]} onInput={e=>{setRange('custom');setBounds([Math.min(Number(e.currentTarget.value),bounds()[1]-20),bounds()[1]]);}} /><label class="sr-only" for="chart-end">History window end</label><input id="chart-end" aria-label="History window end" type="range" min="0" max="1000" value={bounds()[1]} onInput={e=>{setRange('custom');setBounds([bounds()[0],Math.max(Number(e.currentTarget.value),bounds()[0]+20)]);}} /></div>
    <div class="navigator-dates"><span>{new Date(timestamp(bounds()[0])).toLocaleString('en-GB',{timeZone:'UTC'})}</span><span>{new Date(timestamp(bounds()[1])).toLocaleString('en-GB',{timeZone:'UTC'})}</span></div>
    <div class="platform-legend"><span><i />Online users</span><span class="unavailable-series">In-game history unavailable</span><span>{visible().length.toLocaleString()} recorded samples · UTC</span></div>
  </div>;
}
