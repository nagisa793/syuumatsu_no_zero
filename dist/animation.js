'use strict';

// Drawn animation cels and number-specific equipment are independent layers.
const animationSheets={};
let transformation=null,appearance={body:'base',sword:1,guns:1,wing:0,shield:0},shieldVisualTime=0;
const idleOrder=[0,1,2,3,2,1];
const transitionFrames={sword:[0,9,10,11],guns:[0,5,6,7],wing:[0,12,13,14],shield:[0,4,5,6],area:[0,4,5,6],gravity:[0,8,9,10]};
const sheetSpecs={motion:['zero-motion-v9',4,4],loops:['zero-loops-v9',4,4],bugs:['bugs-motion',4,3],extra:['bugs-extra-v9',4,3],wing:['wings-10',5,2],gunsMotion:['zero-guns-integrated',3,3],sword:['swords-10',5,2],shield:['shields-10',5,2],gravity:['gravity-10',5,2]};

function splitSheet(image,cols,rows,key){
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
 const frames=[];
 for(let index=0;index<cols*rows;index++){
  const bands={bugs:[0,375,710,1024],gravity:[0,480,1024]}[key],rowIndex=Math.floor(index/cols);
  const columns=key==='gravity'?[0,300,614,845,1220,1536]:null;
  const x0=columns?Math.round(columns[index%cols]*width/1536):Math.floor(index%cols*width/cols),y0=bands?Math.round(bands[rowIndex]*height/1024):Math.round(rowIndex*height/rows),w=(columns?Math.round(columns[index%cols+1]*width/1536):Math.floor((index%cols+1)*width/cols))-x0,h=(bands?Math.round(bands[rowIndex+1]*height/1024):Math.round((rowIndex+1)*height/rows))-y0;
  const c=document.createElement('canvas');c.width=w;c.height=h;const t=c.getContext('2d');t.drawImage(image,x0,y0,w,h,0,0,w,h);
  const pixels=t.getImageData(0,0,w,h),d=pixels.data,visited=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const genuineAlpha=['sword','bugs','motion','loops','extra','gunsMotion'].includes(key),neutralKey=['wing','guns','shield'].includes(key),solidKey=['motion','loops','gravity'].includes(key);
  const magenta=(r,gg,b)=>r>70&&b>70&&Math.abs(r-b)<55&&gg<Math.min(r,b)*.55;
  function add(i){if(i<0||i>=w*h||visited[i])return;visited[i]=1;const k=i*4,r=d[k],gg=d[k+1],b=d[k+2];if(d[k+3]<8||(!genuineAlpha&&((solidKey?magenta(r,gg,b):r>170&&b>160&&gg<110)||(neutralKey&&r>180&&Math.max(r,gg,b)-Math.min(r,gg,b)<15)))){queue[tail++]=i;d[k+3]=0}}
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
  while(head<tail){const i=queue[head++];if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w)}
  let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if((key==='motion'||key==='loops')?magenta(d[i],d[i+1],d[i+2]):!genuineAlpha&&d[i]>180&&d[i+2]>170&&d[i+1]<90)d[i+3]=0;if(d[i+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
  if(left>right||top>bottom)throw new Error('Empty animation cel '+index);
  t.putImageData(pixels,0,0);const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;crop.getContext('2d').drawImage(c,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
  let footLeft=w,footRight=0;for(let y=Math.max(top,bottom-Math.round((bottom-top)*.08));y<=bottom;y++)for(let x=left;x<=right;x++)if(d[(y*w+x)*4+3]>96){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x)}
  frames.push({image:crop,width:crop.width,height:crop.height,anchor:key==='bugs'?(w*.5-left)/crop.width:((footLeft+footRight)/2-left)/crop.width,foot:key==='bugs'?([330,680,985][rowIndex]*height/1024-y0-top):crop.height,white:null});
 }
 return {frames,columns:cols,maxHeight:Math.max(...frames.map(f=>f.height)),rowHeights:Array.from({length:rows},(_,r)=>Math.max(...frames.slice(r*cols,(r+1)*cols).map(f=>f.height)))};
}
const animationQueue=Object.entries(sheetSpecs);let animationLoading=false;
function loadNextAnimationSheet(){if(animationLoading||!animationQueue.length)return;animationLoading=true;const [key,[name,cols,rows]]=animationQueue.shift(),image=new Image();image._requiredAsset=false;image.onerror=function(){const retrying=this._retried;assetError.call(this);if(retrying){animationLoading=false;loadNextAnimationSheet()}};image.onload=()=>{try{animationSheets[key]=splitSheet(image,cols,rows,key);assetReady(false)}catch(e){console.error(e);image._retried=true;assetError.call(image)}animationLoading=false;loadNextAnimationSheet()};image.src=`assets/animation/${name}.png`}
function loadAnimationSheets(){loadNextAnimationSheet()}

const immediateActivate=activate,engineTick=tick,engineReset=reset,engineMove=beginMove,engineHud=updateHud;
activate=function(c){
 if(state!=='battle'||hurtTime>0||zeroBound())return false;
 if(techniqueLock||moveAnim||attackPoseActive()||actionLock>0)return false;
 if(transformation){msg('ファイル展開中。構えが整うまで待って！');return false}
 if(!c||files[c.file]?.[c.num-1]?.id!==c.id)return false;
 if(groundTrapped()&&c.file!=='wing'){msg(tacticalBlock(c));return false}
 if(energy<c.cost){canActivate(c);return false}
 transformation={card:c,age:0,duration:c.file==='wing'?.58:.5};
 techniqueLock={card:c,stage:'windup',col,row,layer};
 actionLock=transformation.duration+.02;holding=false;charge=0;pendingMove=pendingShot=null;
 equipped=c;quickFiles[c.file]=c;
 msg(`${fileMeta[c.file].label} ${String(c.num).padStart(3,'0')} — 展開！`);sfx('select');updateHud();return true;
};
beginMove=function(c,r,l=layer){const vertical=l!==layer;if(!engineMove(c,r,l))return false;if(vertical){moveAnim.duration=.34;moveAnim.vertical=true;actionLock=Math.max(actionLock,.34)}return true};
reset=function(){transformation=null;techniqueLock=null;appearance={body:'base',sword:1,guns:1,wing:0,shield:0};shieldVisualTime=0;engineReset()};
tick=function(dt){
 const before=simTime;engineTick(dt);const step=simTime-before;
 if(state==='lose'||state==='win')return;
 if(step<=0)return;
 shieldVisualTime=Math.max(0,shieldVisualTime-step);tickEquipment();
 if(transformation){transformation.age+=step;if(transformation.age>=transformation.duration){const c=transformation.card;transformation=null;
   if(techniqueLock?.card===c)techniqueLock.stage='ready';
   applyEquipment(c);
  }}
 if(techniqueLock?.stage==='recovery'&&poseTime<=0&&actionLock<=0&&!moveAnim)techniqueLock=null;
};
updateHud=function(){engineHud();if(transformation)setText('equippedstate','展開中')};


function frameWhite(frame){if(frame.white)return frame.white;const c=document.createElement('canvas');c.width=frame.width;c.height=frame.height;const t=c.getContext('2d');t.drawImage(frame.image,0,0);t.globalCompositeOperation='source-in';t.fillStyle='#edfff7';t.fillRect(0,0,c.width,c.height);return frame.white=c}
function drawCel(sheet,index,x,feet,size=76,alpha=1,smear=false,white=false){
 const data=animationSheets[sheet],f=data?.frames[index];if(!f){const fallback=sheet==='bugs'?'bug-bee':sheet==='extra'?'bug-spider':index===10||index===11?'zero-sword':index===5||index===6||index===7?'zero-shoot':'zero-idle';if(sprites[fallback])drawSprite(fallback,x,feet,size,size,alpha,smear);return}
 const scale=size/(data.rowHeights[Math.floor(index/(data.columns||4))]||data.maxHeight),w=Math.round(f.width*scale),h=Math.round(f.height*scale),left=Math.round(x-w*f.anchor),top=Math.round(feet-f.foot*scale);
 g.save();g.globalAlpha=alpha;
 if(smear){for(const [off,a] of [[-12,.13],[-6,.22],[6,.22],[12,.13]]){g.globalAlpha=alpha*a;g.drawImage(f.image,left,top+off,w,h)}g.globalAlpha=alpha*.65;g.drawImage(f.image,left,top-10,w,h+20)}
 else{g.drawImage(f.image,left,top,w,h);if(white){g.globalAlpha=alpha*.8;g.drawImage(frameWhite(f),left,top,w,h)}}g.restore();
}
function drawEquipment(kind,num,x,y,width,height,alpha=1,reveal=1,angle=0){
 const f=animationSheets[kind]?.frames[num-1];if(!f)return;
 const fit=Math.min(width/f.width,height/f.height),w=Math.round(f.width*fit),h=Math.round(f.height*fit);
 g.save();g.translate(Math.round(x),Math.round(y));g.rotate(angle);g.globalAlpha=alpha;
 if(reveal<1){g.beginPath();g.rect(-w/2,-h/2,w*reveal,h);g.clip()}
 g.drawImage(f.image,-Math.round(w/2),-Math.round(h/2),w,h);g.restore();
}
function zeroAnimationFrame(){
 if(hurtTime>0)return{sheet:'motion',frame:hurtTime>.18?15:13,phase:0};
 const beat=idleOrder[Math.floor(simTime/.22)%idleOrder.length];
 if(transformation?.card.file==='guns'&&animationSheets.gunsMotion){const t=transformation.age/transformation.duration;if(t>.2)return{sheet:'gunsMotion',frame:(transformation.card.num-1)*3+(t>.7?1:0),phase:3}}
 if(pose==='shoot'&&appearance.body==='guns'&&animationSheets.gunsMotion)return{sheet:'gunsMotion',frame:(appearance.guns-1)*3+(poseTime>.12?2:1),phase:3};
 if(transformation){const phase=Math.min(3,Math.floor(transformation.age/transformation.duration*4));return{sheet:'motion',frame:transitionFrames[transformation.card.file][phase],phase}}
 if(groundTrapped())return{sheet:'loops',frame:12+beat,phase:0};
 if(moveAnim?.vertical)return{sheet:'motion',frame:14,phase:3};
 if(pose==='wing')return{sheet:'loops',frame:8+beat,phase:3};
 if(pose==='basic')return{sheet:'motion',frame:poseTime>.19?5:poseTime>.06?6:7,phase:3};
 if(pose==='shoot')return{sheet:'loops',frame:beat,phase:3};
 if(pose==='sword')return{sheet:'motion',frame:poseTime>.18?10:11,phase:3};
 if(pose==='gravity')return{sheet:'motion',frame:9,phase:0};
 if(pose==='transfer')return{sheet:'motion',frame:5,phase:0};
 if(layer)return{sheet:'loops',frame:8+beat,phase:3};
 return{sheet:'motion',frame:beat,phase:0};
}
function drawZeroAnimated(){
 const target=pos(col,row,layer),t=moveAnim?Math.min(1,moveAnim.age/moveAnim.duration):1,ease=moveAnim?.vertical?t*t*(3-2*t):1-(1-t)**3;
 const p=moveAnim?{x:moveAnim.from.x+(target.x-moveAnim.from.x)*ease,y:moveAnim.from.y+(target.y-moveAnim.from.y)*ease}:target;
 const cel=zeroAnimationFrame(),c=transformation?.card,progress=transformation?transformation.age/transformation.duration:1;
 const bob=layer?Math.round(Math.sin(simTime*3)*1.5):0,recoil=pose==='shoot'?-Math.round(poseTime*12):hurtTime>0?-Math.round(10*Math.sin(hurtTime/.5*Math.PI)):0;
 const x=p.x+recoil,y=p.y+12+bob,alpha=invuln>0&&Math.floor(simTime*20)%2?.4:1;
 g.save();if(zeroFacing<0){g.translate(p.x*2,0);g.scale(-1,1)}
 if(hurtTime>0){g.translate(p.x,p.y+12);g.rotate(-.32*Math.sin(Math.min(1,hurtTime/.5)*Math.PI));g.translate(-p.x,-p.y-12)}
 const wingNum=c?.file==='wing'?c.num:appearance.wing;
 const wingVisible=(layer&&flight>0)||moveAnim?.vertical||(c?.file==='wing'&&progress>.25);
 if(wingVisible&&wingNum){const reveal=c?.file==='wing'?Math.min(1,Math.max(0,(progress-.25)/.5)):1;const flap=Math.sin(simTime*3)*.035;drawEquipment('wing',wingNum,x-7,y-43,layer||wingRequested?112:68,layer||wingRequested?74:44,alpha,reveal,flap)}
 if(moveAnim&&!moveAnim.vertical&&t<.8)drawCel(cel.sheet,cel.frame,moveAnim.from.x,moveAnim.from.y+12,72,(1-t)*.2,true);
 drawCel(cel.sheet,cel.frame,x,y,72,alpha,!!moveAnim&&!moveAnim.vertical&&moveAnim.age<=1/60+.001);
 let weapon=poseTime>0?appearance.body:'base';
 if(c&&(c.file==='sword'||c.file==='guns'))weapon=progress>.25?c.file:'base';
 if(weapon==='sword'){
  const num=c?.file===weapon?c.num:appearance[weapon],reveal=c?.file===weapon?Math.min(1,Math.max(0,(progress-.25)/.5)):1;
  {const swing=pose==='sword'?Math.max(0,.5-poseTime)*.65-.1:0;drawEquipment('sword',num,x+10,y-90,65,60,alpha,reveal,swing)}
 }
 const guard=c?.file==='shield'?c.num:appearance.shield;
 if(guard&&(shieldVisualTime>0||(c?.file==='shield'&&progress>.25))){const [w,h]=[[23,41],[34,58],[47,77]][guard-1];drawEquipment('shield',guard,x+35,y-37,w,h,.9,c?.file==='shield'?Math.min(1,progress*1.5):1)}
 if(transformation){ring(x,y-2,17+Math.sin(progress*Math.PI)*8,'#93ffdf',.7);for(let n=0;n<5;n++){g.fillStyle='#acffed';const yy=Math.round(y-10-progress*48+n%2*5);g.fillRect(Math.round(x-18+n*9),yy,2,3)}}
 if(charge>.15){ring(x,y-30,17+Math.sin(simTime*20)*3,charge>=.8?'#ffdf81':'#77f6e6');for(let n=0;n<5;n++){const ang=n*1.256+simTime*8;g.fillStyle=charge>=.8?'#fff6c4':'#87fcea';g.fillRect(Math.round(x+Math.cos(ang)*18),Math.round(y-32+Math.sin(ang)*18),2,2)}}
 g.restore();if(shield>0)textPixel(Math.ceil(shield),x-24,y-22,'#a8ffe2',8,'center');
}
function drawBugAnimated(b,x,y,size,flashWhite=false){const extra=['mantis','beetle','moth'].includes(b.type),rowIndex={bee:0,fly:1,spider:2,mantis:0,beetle:1,moth:2}[b.type],speed=bugCanFly(b)?.17:.28;let index=b.stun>0?0:idleOrder[(Math.floor(simTime/speed)+rowIndex)%idleOrder.length];if(extra&&b.type!=='moth')index=b.attackPose>0?2:b.tell>0?1:Math.floor(simTime/.4)%2?3:0;const sheet=extra?'extra':'bugs';if(!animationSheets[sheet]){const fallback={bee:'bug-bee',fly:'bug-fly',spider:'bug-spider',mantis:'bug-bee',beetle:'bug-spider',moth:'bug-fly'}[b.type];if(sprites[fallback])drawSprite(fallback,x,y,size,size,1,!!flashWhite||b.hit>.08);return}drawCel(sheet,rowIndex*4+index,x,y,size,1,false,flashWhite||b.hit>.08)}

$('begin').onclick=()=>{if(loadedAssets===REQUIRED_ASSETS)reset()};$('retry').onclick=reset;$('restartPause').onclick=reset;
window.zeroBattle={...window.zeroBattle,reset,activate,readAnimation:()=>({transformation:transformation?{file:transformation.card.file,num:transformation.card.num,age:transformation.age}:null,appearance:{...appearance},cel:zeroAnimationFrame()})};
loadAnimationSheets();
