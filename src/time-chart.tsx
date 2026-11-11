import {createMemo,createSignal,For,Show} from 'solid-js';
import {nearestSample} from './charts';

type Series={name:string;color:string;samples:readonly (readonly [number,number])[]};
const dateLabel=(at:number)=>new Date(at).toLocaleString('en-GB',{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
export function TimeChart(props:{series:Series[];label:string;mini?:boolean;class?:string;gap?:number}){
  const [cursor,setCursor]=createSignal<number|null>(null);
  const samples=createMemo(()=>props.series.flatMap(s=>s.samples));
  const start=createMemo(()=>Math.min(...samples().map(p=>p[0])));
  const end=createMemo(()=>Math.max(start()+1,...samples().map(p=>p[0])));
  const ceiling=createMemo(()=>{const max=Math.max(1,...samples().map(p=>p[1])),step=10**Math.floor(Math.log10(max))/2;return Math.ceil(max/step)*step;});
  const x=(at:number)=>(at-start())/(end()-start())*100;
  const y=(count:number)=>100-count/ceiling()*100;
  const points=()=>props.series.map(s=>({...s,point:cursor()===null?undefined:nearestSample(s.samples,cursor()!)}));
  const active=()=>points().find(s=>s.point)?.point;
  const ticks=()=>Array.from({length:5},(_,i)=>start()+(end()-start())*i/4);
  function move(e:PointerEvent){const rect=e.currentTarget instanceof HTMLElement?e.currentTarget.getBoundingClientRect():null;if(rect)setCursor(start()+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*(end()-start()));}
  function key(e:KeyboardEvent){if(!['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){setCursor(null);return;}const reference=props.series.find(s=>s.samples.length)?.samples??[];if(!reference.length)return;const index=reference.findIndex(p=>p===nearestSample(reference,cursor()??end()));setCursor(reference[e.key==='Home'?0:e.key==='End'?reference.length-1:Math.max(0,Math.min(reference.length-1,index+(e.key==='ArrowRight'?1:-1)))]![0]);}
  return <div class={`time-chart ${props.mini?'is-mini':''} ${props.class??''}`}>
    <div class="time-plot" tabindex={0} role="group" aria-label={`${props.label}. Use left and right arrows to inspect samples.`} onPointerMove={move} onPointerDown={move} onPointerLeave={()=>setCursor(null)} onFocus={()=>setCursor(end())} onBlur={()=>setCursor(null)} onKeyDown={key}>
      <svg class={props.mini?'game-sparkline':props.class==='online-series'?'online-chart':'history-chart'} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <Show when={!props.mini}><For each={[0,1,2,3,4]}>{i=><line x1="0" x2="100" y1={i*25} y2={i*25} stroke="currentColor" opacity=".13" />}</For><For each={ticks()}>{at=><line x1={x(at)} x2={x(at)} y1="0" y2="100" stroke="currentColor" opacity=".07" />}</For></Show>
        <For each={props.series}>{s=><path d={s.samples.map((p,i)=>`${!i||p[0]-s.samples[i-1]![0]>(props.gap??6*3600000)?'M':'L'}${x(p[0])},${y(p[1])}`).join(' ')} fill="none" stroke={s.color} stroke-width={props.mini?1.5:2} />}</For>
      </svg>
      <Show when={!props.mini}><div class="time-y-axis" aria-hidden="true"><For each={[1,.75,.5,.25,0]}>{fraction=><span>{Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(ceiling()*fraction)}</span>}</For></div></Show>
      <Show when={active()}>{point=><><span class="time-crosshair" style={{left:`${x(point()[0])}%`}} /><For each={points()}>{s=><Show when={s.point}><span class="time-point" style={{left:`${x(s.point![0])}%`,top:`${y(s.point![1])}%`,background:s.color}} /></Show>}</For><div class={`chart-tooltip ${x(point()[0])>50?'align-right':''}`} style={{left:`${x(point()[0])}%`}} role="status"><strong>{dateLabel(point()[0])}</strong><For each={points()}>{s=><Show when={s.point}><span><i style={{background:s.color}} />{s.name}: <b>{s.point![1].toLocaleString()}</b><Show when={s.point![0]!==point()[0]}><small>{dateLabel(s.point![0])}</small></Show></span></Show>}</For></div></>}</Show>
    </div>
    <Show when={!props.mini}><div class="time-x-axis" aria-hidden="true"><For each={ticks()}>{at=><span>{new Date(at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})}</span>}</For></div><p class="time-hint">UTC · Hover, touch, or use ← → to inspect recorded players</p></Show>
  </div>;
}
