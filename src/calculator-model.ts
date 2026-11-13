import type {Game} from './library.ts';
import type {GamePrice} from './game-details-model.ts';

export function priceCents(price:GamePrice|undefined):number|null{
  if(!price)return null;
  if(price.free)return 0;
  const match=price.price?.match(/^\$(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})$/);
  if(!match)return null;
  const cents=Number(match[1]!.replaceAll(',',''))*100+Number(match[2]);
  return Number.isSafeInteger(cents)?cents:null;
}
export function calculatorSummary(games:Game[],prices:Record<number,GamePrice>){
  let value=0,unplayedValue=0,priced=0,hours=0,unplayed=0;
  for(const game of games){
    const neverPlayed=game.playtimeHours<5/60;
    hours+=game.playtimeHours;if(neverPlayed)unplayed++;
    const cents=priceCents(prices[game.appId]);
    if(cents!==null){priced++;value+=cents;if(neverPlayed)unplayedValue+=cents;}
  }
  return {value,unplayedValue,priced,hours,unplayed,total:games.length};
}
export function backlogRoast(total:number,unplayed:number){
  if(!total)return 'An empty library. Your wallet has achieved inner peace.';
  if(unplayed/total>=.6)return `${unplayed} unplayed games. Your favourite game is apparently “Add to cart”.`;
  if(unplayed/total>=.3)return 'You don’t have a backlog. You have a digital retirement plan.';
  return 'You actually play your games. The Steam sale algorithm is deeply disappointed.';
}
