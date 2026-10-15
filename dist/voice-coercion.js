'use strict';
// Raw speech remains intact. Matching and execution use an independent reading
// of each word, with no confidence threshold and no unknown-word rejection.
let voiceReadings=null,voiceForceReady=false,voiceReadingLoad=null;
const voiceWords=[
 ['enter','エンター',['エンター','エンタ','enter']],['reset','リセット',['リセット','reset']],
 ['file','ファイル',['ファイル','file']],['number','ナンバー',['ナンバー','番号','number','no']],
 ...Object.entries(speechFamilies).map(([file,words])=>[file,speechLabels[file],words]),
 ['target','ターゲット',['ターゲット','標的','target']],['land','ダウン',['ダウン','降りて','降りる','戻って','着地','land']],
 ['automode','オートモード',['オートモード','自動モード','auto mode']]
];
const voiceExactWords=voiceWords.flatMap(([kind,label,aliases])=>aliases.map(alias=>({kind,label,pattern:new RegExp('^'+Array.from(alias).map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*'),'i')})));
const voiceKana=Object.fromEntries([
 ['アイウエオ','a i u e o'],['カキクケコ','ka ki ku ke ko'],['ガギグゲゴ','ga gi gu ge go'],['サシスセソ','sa shi su se so'],['ザジズゼゾ','za ji zu ze zo'],['タチツテト','ta chi tsu te to'],['ダヂヅデド','da ji zu de do'],['ナニヌネノ','na ni nu ne no'],['ハヒフヘホ','ha hi fu he ho'],['バビブベボ','ba bi bu be bo'],['パピプペポ','pa pi pu pe po'],['マミムメモ','ma mi mu me mo'],['ヤユヨ','ya yu yo'],['ラリルレロ','ra ri ru re ro'],['ワヲンッ','wa o n t'],['ァィゥェォ','a i u e o'],['ャュョ','ya yu yo'],['ヴ','vu']
].flatMap(([chars,readings])=>[...chars].map((c,i)=>[c,readings.split(' ')[i]])));
const voiceKanaPairs={'ウィ':'wi','ウイ':'wi','ウェ':'we','ウォ':'wo','ファ':'fa','フア':'fa','フィ':'fi','フェ':'fe','フォ':'fo','ヴァ':'va','ヴィ':'vi','ヴェ':'ve','ヴォ':'vo','ティ':'ti','テイ':'ti','ディ':'di','デイ':'di','トゥ':'tu','ドゥ':'du','シェ':'she','チェ':'che','ジェ':'je'};
function voicePhonetic(value){
 const raw=String(value).normalize('NFKC').replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[\sー\p{P}\p{S}]/gu,'');let out='';
 for(let i=0;i<raw.length;i++){
  const pair=raw.slice(i,i+2);if(voiceKanaPairs[pair]){out+=voiceKanaPairs[pair];i++;continue}
  const base=voiceKana[raw[i]];if(base?.endsWith('i')&&/[ャュョ]/.test(raw[i+1]||'')){out+=base.slice(0,-1)+({'ャ':'ya','ュ':'yu','ョ':'yo'})[raw[++i]];continue}
  out+=base||raw[i].toLowerCase();
 }return out;
}
function voiceReading(text){
 let out='';const raw=String(text).replace(/\s/g,'');
 for(let i=0;i<raw.length;){let word=null;if(voiceReadings)for(let end=Math.min(raw.length,i+24);end>i;end--)if(Object.hasOwn(voiceReadings,raw.slice(i,end))){word=raw.slice(i,end);break}
  if(word){out+=voiceReadings[word];i+=word.length}else out+=raw[i++];
 }return voicePhonetic(out);
}
function closestVoiceWord(raw,candidates=voiceWords){
 const read=voiceReading(raw);let best=null;
 for(const [kind,label,aliases] of candidates){const score=Math.min(...aliases.map(alias=>{const a=voiceReading(alias);return speechDistance(read,a)+Math.abs(read.length-a.length)*.15}));if(!best||score<best.score)best={kind,label,score}}
 return best;
}
const liveDigitWords=digitWords.flatMap(([digit,...aliases])=>[digit,...aliases,...aliases.map(a=>a.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)))]).sort((a,b)=>b.length-a.length);
const liveNumberPattern=new RegExp('^(?:(?:'+liveDigitWords.join('|')+'|[0-9０-９〇○零一二三四五六七八九十百千]))+','i');
const voiceGrammar=/^(?:(?:倒す|倒れる|倒しきる|倒せる|倒し終わる|撃破する|撃破できる|撃破|削除する|削除|消える|消滅する|いなくなる|やっつける|死ぬ)\s*(?:時|なる)?\s*まで|(?:hp|HP|体力|充電|バッテリー|電池)\s*(?:が|は)?\s*[0-9０-９]+\s*(?:%|パーセント)?\s*(?:以下|未満|以上|より少|より多)(?:になったら|なら|の時|になってから)?|(?:全部|全員|全て|すべて|みんな)|ずっと|繰り返して|繰り返す|繰り返し|継続|連続|続けて|(?:[0-9０-９〇○零一二三四五六七八九十百千]+|ゼロ|ワン|ツー|スリー|フォー|ファイブ|one|two|three)\s*(?:回|発|度|秒間?|分間?)(?:だけ|ずつ|後|経ってから)?)/i;
function forcedVoiceUnits(value,expectFamily=false){
 const raw=String(value),units=[];let i=0;
 while(i<raw.length){const rest=raw.slice(i),connector=/^(?:それから|その後|してから|続いて|次に|そして)/.exec(rest);if(connector){i+=connector[0].length;continue}const space=/^[\s、。,.;；:：!！?？→⇒➜-]+/.exec(rest);if(space){i+=space[0].length;continue}
  let token=voiceGrammar.exec(rest);if(token){units.push({kind:'grammar',text:token[0],start:i,end:i+token[0].length});i+=token[0].length;continue}
  // Match known terms before the dictionary segmentation (ガン + ズ must not
  // become two instructions). Control offsets still point into original text.
  let exact=null;for(const candidate of voiceExactWords){const match=candidate.pattern.exec(rest);if(match&&(!exact||match[0].replace(/\s/g,'').length>exact.text.replace(/\s/g,'').length))exact={kind:candidate.kind,label:candidate.label,text:match[0]}}
  if(exact){
   if(['enter','reset'].includes(exact.kind)){
    let end=exact.text.length;while(end<rest.length&&/[\p{L}ー]/u.test(rest[end])){if(voiceExactWords.some(c=>c.pattern.test(rest.slice(end))))break;end++}
    const extended=rest.slice(0,end);if(end>exact.text.length&&closestVoiceWord(extended).kind===exact.kind)exact.text=extended;
   }
   units.push({...exact,start:i,end:i+exact.text.length});i+=exact.text.length;expectFamily=exact.kind==='file';continue;
  }
  token=liveNumberPattern.exec(rest);if(token){const text=rest.slice(0,token[0].length);units.push({kind:'digit',num:spokenNumber(text),text,start:i,end:i+text.length});i+=text.length;expectFamily=false;continue}
  token=/^(?:を|が|は|に|の|で|と|から|ください|お願い|使って|使え|発動して|撃って|攻撃して)/.exec(rest);if(token){units.push({kind:'grammar',text:token[0],start:i,end:i+token[0].length});i+=token[0].length;continue}
  let word=null;if(voiceReadings)for(let end=Math.min(raw.length,i+24);end>i;end--)if(Object.hasOwn(voiceReadings,raw.slice(i,end).replace(/\s/g,''))){word=raw.slice(i,end);break}
  word??=/^[\p{L}ー]+/u.exec(rest)?.[0]||raw[i];
  const closest=closestVoiceWord(word,expectFamily?voiceWords.filter(([kind])=>files[kind]):voiceWords);units.push({...closest,text:word,start:i,end:i+word.length});i+=word.length;expectFamily=false;
 }return units;
}
const preciseVoiceControls=voiceControlMatches;
voiceControlMatches=function(raw){
 const exact=preciseVoiceControls(raw);if(!voiceForceReady)return exact;
 const expectFamily=voiceFragments.length&&forcedVoiceUnits(voiceFragments.join(' ')).at(-1)?.kind==='file';
 for(const u of forcedVoiceUnits(raw,expectFamily))if(['enter','reset'].includes(u.kind)){
  const overlap=exact.find(m=>m.start<u.end&&m.end>u.start);
  if(overlap?.kind===u.kind)overlap.end=Math.max(overlap.end,u.end);else if(!overlap)exact.push({start:u.start,end:u.end,kind:u.kind});
 }
 return exact.sort((a,b)=>a.start-b.start);
};
function nearestVoiceNumber(num,file){
 const allowed=file?files[file].map(c=>c.num):bugs.filter(b=>b.hp>0).map(b=>b.id);
 if(!allowed.length)return 1;return allowed.reduce((best,n)=>Math.abs(n-num)<Math.abs(best-num)?n:best,allowed[0]);
}
function voiceInstructionEvidence(raw){
 const units=forcedVoiceUnits(raw),numbers=[],limits=[];
 const actions=units.filter(u=>files[u.kind]||['target','land','automode'].includes(u.kind));
 for(let i=0;i<units.length;i++){
  const u=units[i];
  if(u.kind==='digit'){let n=String(u.num);while(Number(n)===0&&units[i+1]?.kind==='digit')n+=String(units[++i].num);numbers.push(Number(n))}
  if(u.kind==='grammar'&&/回|発|度|秒|分|まで|ずっと|継続|連続|続け|hp|体力|充電|電池|バッテリー|以上|以下|未満/i.test(u.text))limits.push(instructionText(u.text));
 }
 return {actions,signature:JSON.stringify([numbers,limits]),cost:units.reduce((n,u)=>n+(u.score||0),0)};
}
function chooseVoiceInstruction(primary,candidates=[]){
 // Alternatives are consulted only after submission. Raw hearing/display
 // stays primary; explicit numbers, conditions and known actions cannot change.
 const original=voiceInstructionEvidence(primary);let best=primary,score=original.cost;
 for(const candidate of candidates||[]){
  if(!candidate||candidate===primary)continue;const evidence=voiceInstructionEvidence(candidate);
  if(evidence.signature!==original.signature||evidence.actions.length!==original.actions.length)continue;
  if(original.actions.some((u,i)=>u.score===undefined&&u.kind!==evidence.actions[i].kind))continue;
  if(evidence.cost<score){best=candidate;score=evidence.cost}
 }return best;
}
function forceVoiceInstruction(raw){
 const units=forcedVoiceUnits(raw),commands=[];let family=voiceFile||latestPendingOrder()?.card.file||lastOrderSpec?.card.file||'guns';if(!files[family])family='guns';
 const defaultNum=f=>memoryNumbers[f]||1,newTech=f=>{const o={kind:'technique',file:f,num:null,tail:[]};commands.push(o);return o};
 let current=null,prefix=false;
 for(let i=0;i<units.length;i++){const u=units[i];
  if(u.kind==='file'){prefix=true;continue}if(u.kind==='number')continue;
  if(files[u.kind]){family=u.kind;current=newTech(family);prefix=false;continue}
  if(u.kind==='digit'){
   let digits=String(u.num);while(Number(digits)===0&&units[i+1]?.kind==='digit'){digits+=String(units[++i].num);if(Number(digits))break}
   const n=Number(digits);
   if(current?.kind==='target'&&current.num===null){current.num=nearestVoiceNumber(n,null);continue}
   if(!current&&state==='target'&&!prefix&&!voiceFile){current={kind:'target',num:nearestVoiceNumber(n,null),tail:[]};commands.push(current);continue}
   if(!current||current.kind!=='technique'||current.num!==null)current=newTech(family);
   current.num=nearestVoiceNumber(n,family);prefix=false;continue;
  }
  if(u.kind==='grammar'){if(current)current.tail.push(u.text);else commands.push({kind:'modifier',text:u.text});continue}
  if(u.kind==='target'){
   let n=null;if(units[i+1]?.kind==='number')i++;if(units[i+1]?.kind==='digit')n=units[++i].num;
   if(current?.kind==='technique'&&units[i+1]?.kind==='grammar'&&/まで/.test(units[i+1].text)){current.tail.push('ターゲット'+nearestVoiceNumber(n??targetId??1,null),units[++i].text);continue}
   current={kind:'target',num:n===null?null:nearestVoiceNumber(n,null),tail:[]};commands.push(current);continue;
  }
  if(['land','automode'].includes(u.kind)){current={kind:u.kind,tail:[]};commands.push(current);prefix=false;continue}
 }
 if(prefix)newTech(family);
 if(!commands.length)return 'ファイル'+speechLabels[family]+'No.'+defaultNum(family);
 const rendered=commands.map(o=>o.kind==='technique'?'ファイル'+speechLabels[o.file]+'No.'+(o.num??defaultNum(o.file))+' '+o.tail.join(' '):o.kind==='target'?'ターゲット'+(o.num??'')+' '+o.tail.join(' '):o.kind==='land'?'ダウン':o.kind==='automode'?'オートモード':o.text);
 return rendered.join(' それから ');
}
function loadVoiceReadings(){
 if(voiceReadingLoad)return voiceReadingLoad;
 voiceReadingLoad=fetch('assets/voice/readings.json').then(r=>{if(!r.ok)throw Error('Voice reading dictionary');return r.json()}).then(data=>{voiceReadings=data;voiceForceReady=true;return data}).catch(error=>{voiceReadingLoad=null;throw error});return voiceReadingLoad;
}
