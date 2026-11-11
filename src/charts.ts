export type GameHistory={appId:number;peakAllTime:number|null;samples:[number,number][];capturedAt:string;unavailable:boolean};
export function nearestSample(samples:readonly (readonly [number,number])[],at:number){
  if(!samples.length)return undefined;
  let low=0,high=samples.length-1;
  while(low<high){const middle=Math.floor((low+high)/2);if(samples[middle]![0]<at)low=middle+1;else high=middle;}
  const right=samples[low]!,left=samples[Math.max(0,low-1)]!;
  return at-left[0]<=right[0]-at?left:right;
}
export function validateGameHistories(value:unknown):GameHistory[]{
  if(!Array.isArray(value)||value.length>1000)throw Error('Invalid game history response.');
  return value.map(g=>{if(!g||!Number.isSafeInteger(g.appId)||g.appId<1||!(g.peakAllTime===null||Number.isSafeInteger(g.peakAllTime)&&g.peakAllTime>=0)||typeof g.unavailable!=='boolean'||!Number.isFinite(Date.parse(g.capturedAt))||!Array.isArray(g.samples)||g.samples.length>336||g.samples.some((p:unknown)=>!Array.isArray(p)||p.length!==2||!Number.isSafeInteger(p[0])||p[0]<1||!Number.isSafeInteger(p[1])||p[1]<0))throw Error('Invalid game history.');return {appId:g.appId,peakAllTime:g.peakAllTime,samples:g.samples.map((p:[number,number])=>[...p] as [number,number]).sort((a:[number,number],b:[number,number])=>a[0]-b[0]),capturedAt:g.capturedAt,unavailable:g.unavailable};});
}
export function seriesPath(samples:readonly (readonly [number,number])[],width=100,height=30){
  if(samples.length<2)return '';const first=samples[0]![0],span=Math.max(1,samples.at(-1)![0]-first),max=Math.max(1,...samples.map(p=>p[1]));
  return samples.map((p,i)=>`${i===0||p[0]-samples[i-1]![0]>6*3600000?'M':'L'}${(p[0]-first)/span*width},${height-3-p[1]/max*(height-6)}`).join(' ');
}
