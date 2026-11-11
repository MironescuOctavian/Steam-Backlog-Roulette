export function createRouletteSound() {
  let audio: AudioContext | undefined;
  const tone=(frequency:number,at=0,length=.035)=>{
    if(!audio || audio.state!=='running')return;
    const oscillator=audio.createOscillator();
    const gain=audio.createGain();
    const start=audio.currentTime+at;
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(.035,start);
    gain.gain.exponentialRampToValueAtTime(.001,start+length);
    oscillator.connect(gain);gain.connect(audio.destination);
    oscillator.start(start);oscillator.stop(start+length);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  };
  return {
    start:async()=>{try{audio??=new AudioContext();await audio.resume();}catch{/* Audio is optional when blocked by the browser. */}},
    tick:()=>tone(650),
    win:()=>[523.25,659.25,783.99,1046.5].forEach((note,i)=>tone(note,i*.12,.28)),
    close:()=>{void audio?.close().catch(()=>{});},
  };
}
