import {For} from 'solid-js';
export function EmberBackground(){
 return <div class="ember-background" aria-hidden="true"><div class="ember-glow ember-glow-left" /><div class="ember-glow ember-glow-right" /><div class="ember-motifs" /><For each={Array.from({length:20},(_,i)=>i)}>{i=><i class="ember-particle" style={{left:(i%2===0?(i*7)%24:76+(i*11)%24)+'%',top:(50+(i*13)%50)+'%','animation-delay':(-i*1.7)+'s','animation-duration':(12+i%7)+'s'}} />}</For></div>;
}
