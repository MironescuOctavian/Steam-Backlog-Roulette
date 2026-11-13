import {createEffect,createSignal,Show} from 'solid-js';
import {validatePrices,type GamePrice} from './game-details-model';
export function usePrices(ids:()=>number[]){
  const [prices,setPrices]=createSignal<Record<number,GamePrice>>({});
  createEffect(()=>ids().join(','),key=>{
    if(location.protocol==='file:')return;
    const requested=key.split(',').filter(Boolean).map(Number).filter(id=>!prices()[id]),controller=new AbortController();
    void(async()=>{for(let i=0;i<requested.length;i+=24){const batch=requested.slice(i,i+24),response=await fetch('/api/game-prices?ids='+batch.join(','),{signal:controller.signal});if(!response.ok)throw Error('Prices unavailable');const entries=validatePrices(await response.json());if(entries.some(g=>!batch.includes(g.appId)))throw Error('Invalid price IDs');if(controller.signal.aborted)return;setPrices(current=>({...current,...Object.fromEntries(entries.map(g=>[g.appId,g]))}));}})().catch(()=>{});
    return ()=>controller.abort();
  });return prices;
}
export function PriceBadge(props:{price:GamePrice|undefined}){
  return <Show when={props.price}>{price=><p class="card-price" title="US store price from Steam">
    <Show when={price().price} fallback={<span>{price().free?'Free to play':'Price unavailable'}</span>}>
      <Show when={price().discountPercent>0}><span class="price-discount">-{price().discountPercent}%</span><s>{price().initial}</s></Show><strong>{price().price}</strong>
    </Show>
  </p>}</Show>;
}
