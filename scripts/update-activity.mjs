import fs from 'node:fs/promises';
import {createActivityService} from '../server/activity.mjs';
const snapshot=await createActivityService({historyFile:null})();
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile('src/data/activity.json',JSON.stringify(snapshot,null,2)+'\n');
console.log(`Saved real Steam activity snapshot: ${snapshot.games.length} ranked apps, ${snapshot.releases.length} releases. Observed ${snapshot.sampledAt}.`);
