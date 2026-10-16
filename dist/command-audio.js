'use strict';
// Short electronic confirmations. No speech clips, model or downloads.
const ENCODE_SIGNAL_DURATION=.885333;
const commandSoundSources=new Set();
const techniqueSounds={
 sword:[784,1175,988],guns:[220,440,330],shield:[523,659,784],
 wing:[659,988,1318],gravity:[262,196,131],area:[392,587,784]
};
function stopCommandSound(){
 for(const source of commandSoundSources){try{source.stop()}catch{}}
 commandSoundSources.clear();
}
function syncCommandSoundVolume(){for(const source of commandSoundSources)source.commandGain.gain.value=source.commandLevel*sfxVolume}
function playCommandSound(notes,duration=.15,offset=0,accept=()=>true,level=.055){
 if(!sound||!notes?.length||offset>=duration||!accept())return null;
 unlockAudio(true);if(!audio)return null;
 stopCommandSound();
 const context=audio,source=context.createOscillator(),envelope=context.createGain(),gain=context.createGain(),at=context.currentTime,length=duration-offset;
 source.type='triangle';
 const first=Math.min(notes.length-1,Math.floor(offset/duration*notes.length));
 source.frequency.setValueAtTime(notes[first],at);
 for(let i=first+1;i<notes.length;i++)source.frequency.setValueAtTime(notes[i],at+i*duration/notes.length-offset);
 gain.gain.value=level*sfxVolume;
 envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(1,at+Math.min(.008,length/4));
 envelope.gain.setValueAtTime(.7,at+length*.42);envelope.gain.linearRampToValueAtTime(0,at+length);
 source.commandGain=gain;source.commandLevel=level;source.commandOffset=offset;
 source.connect(envelope);envelope.connect(gain);gain.connect(context.destination);
 source.onended=()=>{source.disconnect();envelope.disconnect();gain.disconnect();commandSoundSources.delete(source)};
 commandSoundSources.add(source);source.start(at);source.stop(at+length+.005);
 return {source,duration:length};
}
function playTechniqueSound(card){
 const notes=techniqueSounds[card?.file];if(!notes)return false;
 const pitch=2**((card.num-1)/12);
 return !!playCommandSound(notes.map(note=>note*pitch));
}
function playEncodeSound(offset=0,accept=()=>true){return playCommandSound([196,294,440,659,988,1318],ENCODE_SIGNAL_DURATION,offset,accept,.06)}
