import snapshot from './data/top250.json';
import {validateLibrary,type Game} from './library';
export const catalogSource=snapshot.source;
export const catalogUpdatedAt=snapshot.updatedAt;
export const top250:Game[]=validateLibrary(snapshot.games.map(g=>({
  ...g,steamPositivePercent:g.positivePercent,playtimeHours:0,timeToBeatHours:null,
  metacritic:null,pricePaid:0,priceKnown:false,status:'Unplayed',tags:[],playNext:false,metadataSource:'Steam 250 snapshot',
})));
