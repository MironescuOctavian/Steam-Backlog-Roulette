export function parseProfileInput(input) {
  if(typeof input!=='string' || input.length>300)throw new Error('Enter a Steam profile URL, custom handle, or Steam64 ID.');
  let value=input.trim();
  if(value.includes('steamcommunity.com')){
    let url;
    try{url=new URL(value.includes('://')?value:'https://'+value);}catch{throw new Error('Invalid Steam profile URL.');}
    if(!['http:','https:'].includes(url.protocol)||!['steamcommunity.com','www.steamcommunity.com'].includes(url.hostname)||url.username||url.password||url.port)throw new Error('Use a steamcommunity.com profile URL.');
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts.length!==2 || !['id','profiles'].includes(parts[0]))throw new Error('Use a /id/handle or /profiles/Steam64ID URL.');
    value=parts[1];
    if(parts[0]==='profiles'&&!/^\d{17}$/.test(value))throw new Error('Steam64 IDs have 17 digits.');
  }
  if(/^\d{17}$/.test(value))return {steamId:value};
  if(!/^[a-zA-Z0-9_-]{2,64}$/.test(value))throw new Error('Use a profile URL or custom handle. Display names are not unique.');
  return {vanity:value};
}

export async function fetchPublicProfile(input,key,request=fetch) {
  const identity=parseProfileInput(input);
  if(!key)throw new Error('Profile lookup is not configured on this server yet. You can explore the Top 250 or import a JSON library.');
  async function steam(method,params) {
    const version=method==='ISteamUser/GetPlayerSummaries'?'v0002':'v0001';
    const url=new URL('https://api.steampowered.com/'+method+'/'+version+'/');
    url.search=new URLSearchParams({key,...params}).toString();
    let response;
    try{response=await request(url,{signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new Error('Steam is unavailable. Please try again shortly.');}
    if(!response.ok)throw new Error('Steam could not load this profile. Please try again shortly.');
    try{return await response.json();}catch{throw new Error('Steam returned an unreadable response.');}
  }
  let steamId=identity.steamId;
  if(!steamId){
    const resolved=await steam('ISteamUser/ResolveVanityURL',{vanityurl:identity.vanity});
    if(resolved.response?.success!==1 || !/^\d{17}$/.test(resolved.response.steamid))throw new Error('No profile found for that custom handle. Try the full profile URL.');
    steamId=resolved.response.steamid;
  }
  const [summary,owned]=await Promise.all([
    steam('ISteamUser/GetPlayerSummaries',{steamids:steamId}),
    steam('IPlayerService/GetOwnedGames',{steamid:steamId,include_appinfo:'1',include_played_free_games:'1',format:'json'}),
  ]);
  const players=summary.response?.players;
  const player=Array.isArray(players)?players.find(p=>p?.steamid===steamId):null;
  if(!player)throw new Error('Steam profile not found. Check the profile URL or ID.');
  if(player.communityvisibilitystate!==3)throw new Error('This profile is private. Its owner must make their profile and Game details public.');
  if(!Array.isArray(owned.response?.games)){
    if(owned.response?.game_count===0)owned.response.games=[];
    else throw new Error('Game details are private or unavailable. The profile owner must set Game details to Public, then try again.');
  }
  const avatar=typeof player.avatarfull==='string'&&/^https:\/\/avatars\.(?:steamstatic|akamai\.steamstatic)\.com\//.test(player.avatarfull)?player.avatarfull:'';
  return {profile:{steamId,name:String(player.personaname??'Steam player').slice(0,100),avatar,url:`https://steamcommunity.com/profiles/${steamId}/`,updatedAt:new Date().toISOString()},steam:owned};
}
