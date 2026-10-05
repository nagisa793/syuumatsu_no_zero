'use strict';
// Meaning is assembled from independent entities, actions, references and conditions.
// Unresolved conditions are rejected, never silently dropped from an instruction.
const memoryNumbers={},families={sword:/sword|ソド|ソウド|そど|剣/,wing:/wing|ウィング|ウイング|ういんぐ|翼/,guns:/guns?|ガン[ズスツヅ図]|がんず|ガンず|バスタ|buster|銃/,shield:/shield|シルド|しるど|盾/,area:/area|エリア|えりあ/,gravity:/gravity|グラビティ|ぐらびてぃ|重力/};
// Corrections are constrained to the six file slots. Do not fuzzy-match free
// speech, conditions, negations, or numbers to a different instruction.
const speechFamilies={
 sword:['ソード','ソウド','ソート','ソルト','sword'],
 guns:['ガンズ','ガンス','ガンツ','ガンヅ','ガン図','ガンず','ガムズ','guns','gun','buster','バスター'],
 shield:['シールド','シルド','シルト','シード','shield'],
 wing:['ウィング','ウイング','ウィンク','ウイングス','wing'],
 gravity:['グラビティ','グラヴィティ','グラフィティ','クラビティ','gravity'],
 area:['エリア','エリヤ','area']
};
const speechLabels={sword:'ソード',guns:'ガンズ',shield:'シールド',wing:'ウィング',gravity:'グラビティ',area:'エリア'};
function speechFold(t){return String(t).normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[ァィゥェォッャュョ]/g,c=>({'ァ':'ア','ィ':'イ','ゥ':'ウ','ェ':'エ','ォ':'オ','ッ':'ツ','ャ':'ヤ','ュ':'ユ','ョ':'ヨ'})[c]).replace(/[\sー:：;；、。・!！]/g,'')}
function speechDistance(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=0;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[a.length][b.length]}
const speechLexicon=Object.entries(speechFamilies).map(([key,aliases])=>[key,aliases.map(speechFold)]);
const speechBoundary=/^\s*(?:[、。!！:：;；]|no\b|no\.?\d|number|ナンバー?|なんばー?|番号|[0-9０-９〇○零一二三四五六七八九十]|ゼロ|ぜろ|ツー?|つー?|ワン|one|two|three|four|five|six|seven|eight|nine|ten|を|の|は|で|$)/i;
function speechFamilyAt(raw,start,explicit){
 const candidates=[];
 for(let end=start+2;end<=Math.min(raw.length,start+16);end++){
  const token=raw.slice(start,end),rest=raw.slice(end);if(!/^[ぁ-ゖァ-ヺーa-zA-Z図\s]+$/.test(token)||!(speechBoundary.test(rest)||new RegExp('^'+numberSource).test(normalizedCommand(rest))))continue;
  const folded=speechFold(token);if(folded.length<2)continue;
  for(const [file,aliases] of speechLexicon){const score=Math.min(...aliases.map(a=>speechDistance(folded,a)/Math.max(folded.length,a.length)));if(score<=(explicit?.51:.26))candidates.push({file,end,score})}
 }
 candidates.sort((a,b)=>a.score-b.score||b.end-a.end);const best=candidates[0];if(!best)return null;
 const other=candidates.find(c=>c.file!==best.file);return other&&other.score-best.score<.08?null:best;
}
const speechCorrectionCache=new Map();
function correctVoiceCommand(value){
 const raw=String(value).normalize('NFKC');if(speechCorrectionCache.has(raw))return speechCorrectionCache.get(raw);
 let out='',i=0;
 while(i<raw.length){let found=null;
  // ファイブ sounds close to ファイル, but a valid remaining number wins.
  if(typeof spokenNumber==='function'&&spokenNumber(raw.slice(i))!==null){out+=raw.slice(i);break}
  if(/[フふハはパぱfF]/.test(raw[i])){
   for(let end=i+3;end<=Math.min(raw.length,i+7);end++){
    const prefix=speechFold(raw.slice(i,end)),distance=Math.min(...['フアイル','パイル','file','fail'].map(p=>speechDistance(prefix,p)));
    if(distance>1)continue;
    const skip=/^[\s:：;；、。!！]*/.exec(raw.slice(end))[0].length;
    const family=speechFamilyAt(raw,end+skip,true);
    if(family){const score=distance*.4+family.score;if(!found||score<found.score)found={end:family.end,text:'ファイル'+speechLabels[family.file],score}}
    else if(end===raw.length&&(!found||distance*.4<found.score))found={end,text:'ファイル',score:distance*.4};
   }
  }
  if(!found&&(i===0||/[\s、。:：]/.test(raw[i-1]))){const family=speechFamilyAt(raw,i,false);if(family)found={end:family.end,text:speechLabels[family.file]}}
  if(found){out+=found.text;i=found.end}else out+=raw[i++];
 }
 if(speechCorrectionCache.size>128)speechCorrectionCache.clear();speechCorrectionCache.set(raw,out);return out;
}
// One token may mix kanji, digits and spoken English: ゼロゼロ二 / 0ゼロツー.
const digitWords=[['0','ゼロ','レイ','zero'],['1','イチ','ワン','one'],['2','ニ','ツー','two'],['3','サン','スリー','three'],['4','ヨン','フォー','four'],['5','ゴ','ファイブ','five'],['6','ロク','シックス','six'],['7','ナナ','シチ','セブン','seven'],['8','ハチ','エイト','eight'],['9','キュウ','ナイン','nine'],['十','ジュウ','テン','ten']];
const digitAliases=Object.fromEntries(digitWords.flatMap(([digit,...aliases])=>aliases.flatMap(a=>[a,a.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))]).map(a=>[normalizedCommand(a),digit])));
const digitWordSource=Object.keys(digitAliases).sort((a,b)=>b.length-a.length).map(word=>word==='に'?'に(?!して|する|しろ|変更|切り替|決め|戻|なっ|なり|なら)':word).join('|');
const numberSource='(?:(?:'+digitWordSource+'|[0-9〇○零一二三四五六七八九十百千]))+';
spokenNumber=function(raw){let t=normalizedCommand(raw).replace(/^(?:no|number|ナンバ|なんば|番号)/,'').replace(/番$/,'');
 t=t.replace(new RegExp(digitWordSource,'g'),word=>digitAliases[word]).replace(/[〇○零一二三四五六七八九]/g,c=>({'〇':0,'○':0,'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9})[c]);
 if(/^\d+$/.test(t))return Number(t);if(!/^[0-9十百千]+$/.test(t))return null;let total=0,part='';for(const c of t){if(/\d/.test(c))part+=c;else{total+=(Number(part)||1)*({十:10,百:100,千:1000}[c]);part=''}}return total+Number(part||0);
};
function namedFamily(t){const found=Object.entries(families).map(([file,re])=>({file,m:re.exec(t)})).filter(x=>x.m).sort((a,b)=>a.m.index-b.m.index);return found[0]||null}
function describedTarget(t){
 let choices=bugs.filter(b=>b.hp>0);const species=Object.keys(bugTypes).find(k=>bugTypes[k].aliases.some(a=>t.includes(a)));
 if(species)choices=choices.filter(b=>b.type===species);
 if(/空中の|飛んでいる|飛行型/.test(t))choices=choices.filter(b=>b.layer);if(/地上の|地面の/.test(t))choices=choices.filter(b=>!b.layer);
 const near=b=>Math.abs(b.c-col)+Math.abs(b.r-row)*1.5+(b.layer!==layer?3:0);
 const score=/弱|hp.*少|体力.*少/.test(t)?b=>b.hp:/強|hp.*多|体力.*多/.test(t)?b=>-b.hp:/遠/.test(t)?b=>-near(b):/上の敵|一番上/.test(t)?b=>pos(b.c,b.r,b.layer).y:/下の敵|一番下/.test(t)?b=>-pos(b.c,b.r,b.layer).y:/右の敵/.test(t)?b=>-b.c:/左の敵/.test(t)?b=>b.c:near;
 if(species||/(?:近|遠|弱|強)い敵|一番.*敵|空中の|地上の|上の敵|下の敵|右の敵|左の敵/.test(t))return choices.sort((a,b)=>score(a)-score(b))[0]?.id??null;
 return /そいつ|その敵|同じ敵|今の敵|現在の標的/.test(t)?targetId:null;
}
function interpretInstruction(raw){
 const t=normalizedCommand(correctVoiceCommand(raw)).replace(new RegExp('('+numberSource+')(回|発|度)(?:だけ)?(?:じゃなくて|ではなくて|ではなく)('+numberSource+')\\2'),'$3$2');let work=t,target=null,spec={count:1};if(!t)return{kind:'empty'};
 if(/^(?:オトモド|自動モド|オトで戦って|自動で戦って|オト戦闘)$/.test(t))return{kind:'automode'};
 for(const re of [new RegExp('(?:タゲット|たげっと|target|標的|敵|バグ)(?:は|の|を)?(?:no|number|ナンバ|なんば|番号)?('+numberSource+')'),new RegExp('(?:no|ナンバ|番号)?('+numberSource+')(?:番|号)?(?:の|を)?(?:敵|バグ|標的|タゲット)')]){const m=re.exec(work);if(m){target=spokenNumber(m[1]);work=work.replace(m[0],'');break}}
 target??=describedTarget(t);
 const count=new RegExp('('+numberSource+')(?:回|発|度)(?:だけ|ずつ|連続)?').exec(work);if(count){spec.count=spokenNumber(count[1]);spec.explicitLimit=true;work=work.replace(count[0],'')}
 const delay=new RegExp('('+numberSource+')(秒|分)(?:後|経ってから)').exec(work);if(delay){spec.delay=spokenNumber(delay[1])*(delay[2]==='分'?60:1);work=work.replace(delay[0],'')}
 const duration=new RegExp('('+numberSource+')(秒間?|分間?)').exec(work);if(duration){spec.seconds=spokenNumber(duration[1])*(duration[2].startsWith('分')?60:1);work=work.replace(duration[0],'')}
 const cond=/(hp|体力|充電|バッテリ|電池)(?:が|は)?([0-9]+)(?:%|パセント)?(以下|未満|以上|より少|より多)(?:になったら|なら|の時|になってから)?/.exec(work);if(cond){spec.condition={stat:/hp|体力/.test(cond[1])?'hp':'battery',value:Number(cond[2]),comparison:/以下|未満|より少/.test(cond[3])?'lte':'gte'};work=work.replace(cond[0],'')}
 const until=/(?:倒す|倒れる|倒しきる|倒せる|倒し終わる|撃破する|撃破できる|撃破|削除する|削除|消える|消滅する|いなくなる|やっつける|死ぬ|hpが0|体力が0)(?:時|なる)?まで|(?:倒れる|消える|倒した|倒せた|いなくなった)ら(?:止|終了|やめ)/.test(work);
 if(until){if(/全部|全員|全て|すべて|みんな/.test(work))spec.untilAll=true;else spec.untilTarget=target??targetId;if(!spec.untilAll&&!spec.untilTarget)return{kind:'clarify',message:'どの敵を狙う？'}}
 if(!count&&!duration&&!until&&/ずっと|続け|繰り返|連射|連続|止めるまで|継続/.test(work))spec.continuous=true;
 if(!Number.isFinite(spec.count)||spec.count<1)return{kind:'clarify',message:'回数を確認できなかったよ。'};
 const family=namedFamily(work),file=family?.file;
 if(/再開|再始動|resume|動いていい|戦闘に戻/.test(t)&&!file)return{kind:'resume'};
 if(/一時停止|ポズ|pause|戦闘.*止|時間.*止/.test(t))return{kind:'pause'};
 if(!until&&/使わない|使うな|使わず|撃たない|撃つな|攻撃しない|やめ|中止|取り消|キャンセル|解除|cancel/.test(work))return{kind:'cancel',file,noAttack:/撃|攻撃|射撃/.test(work),all:/全部|全て|すべて/.test(work)};
 if(/動かない|動くな|移動.*止|そこで待|その場|止まって|待機/.test(t)&&!file)return{kind:'hold',seconds:spec.seconds};
 if(/回避に専念|避け続|逃げ回|攻撃せず.*避け/.test(t))return{kind:'evade'};
 if(/着地|ちゃくち|地上に戻|地面に降|降りて|降りろ|降下|ダウン|戻って|戻れ|帰って|降りる|おりて|おりろ|land/.test(t)&&!file)return{kind:'land'};
 if(/通常攻撃|通常射撃|普通の.*(?:銃|攻撃)|ノマル|素手/.test(t))return{kind:'basic',target,spec};
 const move=/(右|左|上|下)(?:に|へ)?([0-9一二三])?(?:マス)?(?:移動|動い|進ん|ずれ|避け)/.exec(t);if(move&&!file)return{kind:'move',direction:move[1],distance:spokenNumber(move[2]||'1')};
 let card=Object.values(files).flat().sort((a,b)=>b.name.length-a.name.length).find(c=>work.includes(normalizedCommand(c.name)));
 if(file&&!card){const after=work.slice(family.m.index+family.m[0].length),before=work.slice(0,family.m.index);const m=new RegExp('^(?:ファイル|file|の|は|を|で|番号|ナンバ|no|number|第)*('+numberSource+')').exec(after)||new RegExp('(?:no|number|ナンバ|なんば|番号|第)('+numberSource+')').exec(work)||new RegExp('('+numberSource+')(?:番|号)?(?:の)?$').exec(before);const n=spokenNumber(m?.[1]||'');if(n!==null){if(n<1||n>files[file].length)return{kind:'clarify',message:'そのナンバーの技は登録されていないよ。'};card=files[file][n-1]}
  else if(/弱い|弱め|一番安|省エネ|軽い/.test(work))card=[...files[file]].sort((a,b)=>a.cost-b.cost)[0];else if(/強い|強め|最強|最大|一番強/.test(work))card=[...files[file]].sort((a,b)=>b.cost-a.cost)[0];
  else if(/同じ|前の|さっき|今の|それ/.test(work)&&memoryNumbers[file])card=files[file][memoryNumbers[file]-1];
 }
 if(!card&&!file&&(/もう一|もう[0-9一二三]|あと[0-9一二三]|さっき|先ほど|前の技|同じ技|それ|その技|今の技/.test(t)||(count||duration||until||spec.continuous)&&/使|撃|攻撃|続け/.test(work)))card=lastOrderSpec?.card;
 if(!card&&!file&&voiceFile&&commandClock<voiceFileUntil){const m=new RegExp('(?:no|number|ナンバ|なんば|番号)?('+numberSource+')').exec(work),n=spokenNumber(m?.[1]||'');if(n>=1&&n<=files[voiceFile].length)card=files[voiceFile][n-1];else if(n!==null)return{kind:'clarify',message:'そのナンバーの技は登録されていないよ。'}}
 if(!card&&!file){if(/飛んで|飛べ|飛行して|空に上が|浮いて|上空へ/.test(work))card=files.wing[(memoryNumbers.wing||1)-1];else if(/防御して|防御しろ|守って|ガドして/.test(work))card=files.shield[(memoryNumbers.shield||1)-1]}
 if(card){if(/何%|何パセント|消費.*(?:いくつ|教え|どのくらい)|使える|性能|どんな技/.test(t))return{kind:'info',card};if(/もし|たら|なら/.test(work)&&!spec.condition&&!until)return{kind:'clarify',message:'実行する条件を確認できなかったよ。'};return{kind:'technique',card,target,spec}}
 if(file)return{kind:'family',file};
 if(/攻撃して|撃って|戦って|攻撃再開|射撃して/.test(t)||until&&/攻撃|撃/.test(work))return{kind:'basic',target,spec};
 if(state==='target'||/タゲット|たげっと|target|標的|狙/.test(t)){if(target===null){const m=new RegExp('^(?:no|number|ナンバ|なんば|番号)?('+numberSource+')(?:番|にして|で|を|だよ|お願い|に変更|を狙って)*$').exec(t);if(m)target=spokenNumber(m[1])}if(target!==null)return{kind:'target',target};if(/タゲット|たげっと|target|標的/.test(t))return{kind:'selectTarget'}}
 if(target!==null)return{kind:'target',target};return{kind:'clarify',message:state==='target'?'TARGET':'聞き取りをうまく補正できなかったよ。表示を確認して、続けるか「リセット」で消してね。'};
}
parseCommand=function(raw,current=null){const f=voiceFile,u=voiceFileUntil;voiceFile=current||f;voiceFileUntil=commandClock+30;const i=interpretInstruction(raw);voiceFile=f;voiceFileUntil=u;return i.kind==='technique'?{file:i.card.file,num:i.card.num}:i.kind==='family'?{file:i.file,num:null}:null};
function splitInstructions(raw){
 const parts=[];
 for(const phrase of correctVoiceCommand(raw).split(/それから|その後|してから|続いて|次に|そして/).filter(Boolean)){
  const families=[...phrase.matchAll(/(?:ファイル\s*|file\s*[:：;\s]*)?(?:ウィング|ウイング|ソード|ガンズ|ガンス|ガンツ|シールド|エリア|グラビティ|wing|sword|guns|shield|area|gravity)/gi)];
  if(families.length<2){parts.push(phrase.trim());continue}
  let start=0;
  for(const next of families.slice(1)){
   const part=phrase.slice(start,next.index).trim();if(part)parts.push(part);
   start=next.index;
  }
  const last=phrase.slice(start).trim();if(last)parts.push(last);
 }
 return parts.filter(Boolean);
}
function selectVoiceTranscript(result,prefix=''){
 let best=result[0]?.transcript||'',bestScore=-Infinity;
 if(/(?:リセット|りせっと|reset|エンタ|えんた|enter)$/.test(normalizedCommand(best)))return best;
 for(let i=0;i<Math.min(result.length||1,5);i++){
  const text=result[i]?.transcript;if(!text)continue;
  const intents=splitInstructions(prefix+' '+text).map(interpretInstruction);
  const score=intents.some(x=>x.kind==='clarify')?-10:intents.some(x=>x.kind==='technique'||x.kind==='target')?3:intents.some(x=>x.kind==='family')?1:2;
  // Never replace an understood denial, cancellation or partial family with
  // an alternative attack just because the attack looks more complete.
  if(i===0&&score>=0)return text;
  if(score>bestScore){bestScore=score;best=text}
 }
 return best;
}
runCommand=function(raw){if(!String(raw).trim())return false;if(state==='intro'){introCommands.push(String(raw));return true}if(!['battle','target','lock','paused'].includes(state))return false;
 const intents=splitInstructions(raw).map(interpretInstruction);
 const bad=intents.find(i=>i.kind==='clarify');if(bad){msg(bad.message);commandFeedback(bad.message);return false}if(state==='paused'&&intents.some(i=>!['resume','info','cancel'].includes(i.kind)))return false;
 if(intents.some(i=>i.kind!=='automode')&&autoTechniqueMode){autoTechniqueMode=false;if(activeOrder?.automaticMode)cancelOrders('オートモード終了');updateHud()}
 commandFeedback(state==='target'?'TARGET':'認識：'+raw);let result=true;for(let n=0;n<intents.length;n++)result=dispatchIntent(intents[n],n>0)&&result;return result;
};
function dispatchIntent(i,append=false){
 switch(i.kind){
 case 'empty':return false;
 case 'automode':autoTechniqueMode=true;attackEnabled=true;movementEnabled=true;if(state==='target')cancelTarget();autoThink=0;msg('オートモード開始。指示があるまでゼロが技を選んで戦うよ。');updateHud();return true;
 case 'pause':if(state!=='paused')pause();return true;
 case 'resume':if(state==='paused')pause();attackEnabled=movementEnabled=true;holdTime=0;return true;
 case 'selectTarget':return beginTarget();
 case 'target':if(!bugs.some(b=>b.hp>0&&b.id===i.target)){msg('その標的はもういないよ。');return false}if(activeOrder?.untilTarget&&activeOrder.untilTarget!==i.target)cancelOrders('標的を変更');if(activeOrder)activeOrder.target=i.target;return lockTarget(i.target);
 case 'family':voiceFile=i.file;voiceFileUntil=commandClock+30;commandFeedback(state==='target'?'TARGET':fileMeta[i.file].jp+' · ナンバーは？');return true;
 case 'info':msg(i.card.name+'：'+i.card.desc+'。消費'+i.card.cost+'%。');return true;
 case 'cancel':if(state==='target'&&!i.file)return cancelTarget();if(!i.file||activeOrder?.card.file===i.file)cancelOrders('指示を解除',!i.all);else orderQueue=orderQueue.filter(o=>o.card.file!==i.file);if(i.noAttack)attackEnabled=false;return true;
 case 'hold':movementEnabled=false;holdTime=i.seconds||0;manualDestination=null;msg('この位置で待機');return true;
 case 'evade':cancelOrders('回避に専念');attackEnabled=false;movementEnabled=true;return true;
 case 'land':if(state==='battle')land();return true;
 case 'move':{const [dx,dy]={右:[1,0],左:[-1,0],上:[0,-1],下:[0,1]}[i.direction],c=col+dx*i.distance,r=row+dy*i.distance;if(!canUsePanel('zero',c,r,layer)){msg('その位置へは移動できないよ。');return false}manualDestination={c,r};movementEnabled=true;return true}
 case 'basic':case 'technique':
  if(i.target!==null){if(!bugs.some(b=>b.hp>0&&b.id===i.target)){msg('その標的はもういないよ。');return false}targetId=i.target;targetPinned=true;if(state==='target')lockTarget(i.target)}
  if(i.kind==='basic'&&!i.spec.explicitLimit&&!i.spec.seconds&&!i.spec.untilTarget&&!i.spec.untilAll&&!i.spec.delay&&!i.spec.condition){cancelOrders('通常射撃に戻る');attackEnabled=true;return true}
  if(i.card)memoryNumbers[i.card.file]=i.card.num;return submitOrder(i.card||basicCard,{...i.spec,target:i.target??targetId,append});
 default:return false;
 }
}
