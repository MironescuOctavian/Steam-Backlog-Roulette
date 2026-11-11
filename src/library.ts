export const statuses = ["Unplayed", "Backlog", "Playing", "Completed", "Dropped"] as const;
export type Game = {
  appId: number; title: string; genres: string[]; playtimeHours: number;
  timeToBeatHours: number | null; metacritic: number | null; pricePaid: number;
  status: (typeof statuses)[number]; tags: string[]; playNext: boolean;
  metadataSource: "Demo estimates" | "Estimated" | "Custom" | "Steam 250 snapshot" | "Steam";
  rank?: number;
  steamPositivePercent?: number;
  priceKnown?: boolean;
  userManaged?: boolean;
  appType?: 'game'|'software'|'demo'|'other';
  multiplayerOnly?: boolean;
  image?: string;
};
export const coverUrl = (appId: number) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
export const remainingHours = (g: Game) => g.status === "Completed" || g.status === "Dropped" ? 0 : g.timeToBeatHours === null ? null : Math.max(0,g.timeToBeatHours-g.playtimeHours);
export const costPerHour = (g: Game) => g.playtimeHours === 0 || g.priceKnown === false ? null : g.pricePaid/g.playtimeHours;

const KEY = "steam-backlog-roulette.library.v1";
type StorageAccess = Pick<Storage,"getItem"|"setItem">;
const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 50 && v.every(s => typeof s === "string" && s.length <= 100);
export function validateLibrary(value: unknown): Game[] {
  if (!Array.isArray(value) || value.length > 20000) throw new Error("Invalid library size.");
  const ids = new Set<number>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid game.");
    const g = item as { [K in keyof Game]: unknown };
    if (!Number.isSafeInteger(g.appId) || !nonnegative(g.appId) || g.appId === 0 || ids.has(g.appId)
      || typeof g.title !== "string" || !g.title.trim() || g.title.length > 300
      || !strings(g.genres) || !strings(g.tags) || typeof g.playNext !== "boolean"
      || !nonnegative(g.playtimeHours) || !(g.timeToBeatHours === null || nonnegative(g.timeToBeatHours)) || !nonnegative(g.pricePaid)
      || !(g.metacritic === null || (nonnegative(g.metacritic) && g.metacritic <= 100))
      || !statuses.includes(g.status as Game["status"])
      || !(g.priceKnown === undefined || typeof g.priceKnown === 'boolean')
      || !(g.userManaged === undefined || typeof g.userManaged === 'boolean')
      || !(g.appType===undefined||['game','software','demo','other'].includes(String(g.appType)))
      || !(g.multiplayerOnly===undefined||typeof g.multiplayerOnly==='boolean')
      || !(g.image===undefined||typeof g.image==='string'&&/^https:\/\/shared\.(?:akamai|cloudflare|fastly)\.steamstatic\.com\/store_item_assets\//.test(g.image))
      || !(g.rank === undefined || (nonnegative(g.rank) && Number.isInteger(g.rank) && g.rank>=1 && g.rank<=250))
      || !(g.steamPositivePercent === undefined || (nonnegative(g.steamPositivePercent) && g.steamPositivePercent<=100))
      || !["Demo estimates","Estimated","Custom","Steam 250 snapshot","Steam"].includes(g.metadataSource as string)) throw new Error("Invalid game data.");
    ids.add(g.appId);
    return {appId:g.appId,title:g.title.trim(),genres:[...g.genres],tags:[...g.tags],playNext:g.playNext,...(g.appType===undefined?{}:{appType:g.appType as NonNullable<Game['appType']>}),...(g.multiplayerOnly===undefined?{}:{multiplayerOnly:g.multiplayerOnly}),...(g.image===undefined?{}:{image:g.image as string}),
      playtimeHours:g.playtimeHours,timeToBeatHours:g.timeToBeatHours,pricePaid:g.pricePaid,
      metacritic:g.metacritic,status:g.status as Game["status"],metadataSource:g.metadataSource as Game["metadataSource"],...(g.priceKnown === undefined ? {} : {priceKnown:g.priceKnown}),...(g.userManaged === undefined ? {} : {userManaged:g.userManaged}),...(g.rank === undefined ? {} : {rank:g.rank}),...(g.steamPositivePercent === undefined ? {} : {steamPositivePercent:g.steamPositivePercent})};
  });
}
export type SteamProfile = {steamId:string;name:string;avatar:string;url:string;updatedAt:string};
export function validateProfile(value:unknown):SteamProfile|null {
  if(value===undefined || value===null)return null;
  const p=value as SteamProfile;
  if(!/^\d{17}$/.test(p.steamId) || typeof p.name!=='string' || p.name.length>100 || typeof p.avatar!=='string' || (p.avatar!=='' && !/^https:\/\/avatars\.(?:steamstatic|akamai\.steamstatic)\.com\//.test(p.avatar)) || typeof p.url!=='string' || !/^https:\/\/steamcommunity\.com\/(?:id|profiles)\//.test(p.url) || !Number.isFinite(Date.parse(p.updatedAt)))throw new Error('Invalid profile data.');
  return {steamId:p.steamId,name:p.name,avatar:p.avatar,url:p.url,updatedAt:p.updatedAt};
}
export function saveLibrary(storage: StorageAccess,games: Game[],profile:SteamProfile|null=null,loaded=true): void {
  storage.setItem(KEY,JSON.stringify({version:1,kind:loaded?'personal':'discovery',games:validateLibrary(games),profile:validateProfile(profile)}));
}
export function loadLibrary(storage: StorageAccess): {games:Game[];warning:string|null;loaded:boolean;profile:SteamProfile|null} {
  try {
    const raw = storage.getItem(KEY);
    if (raw === null) {
      return {games:[],warning:null,loaded:false,profile:null};
    }
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) throw new Error("Unsupported library version.");
    const saved=validateLibrary(data.games);
    const games=data.kind==='personal' ? saved : saved.filter(g=>g.metadataSource!=='Demo estimates' || g.userManaged);
    return {games,warning:null,loaded:data.kind==='personal'||games.length>0,profile:validateProfile(data.profile)};
  } catch {
    return {games:[],loaded:false,profile:null,warning:"Saved data could not be loaded or browser storage is unavailable. Your existing saved data has not been overwritten. You can still explore the Top 250."};
  }
}
