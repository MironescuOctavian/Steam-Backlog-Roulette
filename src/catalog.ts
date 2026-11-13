import snapshot from './data/top250.json' with {type:'json'};
import {validateLibrary,type Game} from './library.ts';
export const catalogSource=snapshot.source;
export const catalogUpdatedAt=snapshot.updatedAt;
export const top250:Game[]=validateLibrary(snapshot.games.map(g=>({
  ...g,steamPositivePercent:g.positivePercent,playtimeHours:0,timeToBeatHours:null,
  metacritic:null,pricePaid:0,priceKnown:false,status:'Unplayed',tags:[],metadataSource:'Steam 250 snapshot',
})));
