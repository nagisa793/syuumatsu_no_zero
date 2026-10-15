'use strict';

// Drawn animation cels and number-specific equipment are independent layers.
const animationSheets={};
const ZERO_SCALE=1.15,ZERO_SIZE=72*ZERO_SCALE;
function zeroVisualPosition(){
 const target=pos(col,row,layer),lift=(ZERO_SIZE-72)*layer;
 if(!moveAnim)return{x:target.x,y:target.y+lift};
 const t=Math.min(1,moveAnim.age/moveAnim.duration),e=moveAnim.vertical?t*t*(3-2*t):1-(1-t)**3;
 const sourceLayer=Math.max(0,Math.min(1,(pos(0,moveAnim.sourceR??row).y-moveAnim.from.y)/84));
 const sourceY=moveAnim.from.y+(ZERO_SIZE-72)*sourceLayer;
 return{x:moveAnim.from.x+(target.x-moveAnim.from.x)*e,y:sourceY+(target.y+lift-sourceY)*e};
}
let swordStrike=null;
const SWORD_MOTION=Object.freeze({windup:.24,duration:.30,hitAt:.06});
let transformation=null,appearance={body:'base',sword:1,guns:1,wing:0,shield:0},shieldVisualTime=0;
let defeatAge=0,zeroDefeatOrigin=null;
const idleOrder=[0,1,2,3,2,1];
const transitionFrames={sword:[0,9,10,11],guns:[0,5,6,7],wing:[0,12,13,14],shield:[0,4,5,6],area:[0,4,5,6],gravity:[0,8,9,10]};
const sheetSpecs={spiderZero:['zero-spider-bound-v1',4,2],insectBomb:['insect-bomb-v1',4,1],insectBlast:['insect-blast-v1',4,2],webSilk:['insect-silk-v1',4,1],basicMotion:['zero-basic-gun-v1',3,1],defeat:['zero-defeat-v1',3,1],motion:['zero-motion-v9',4,4],loops:['zero-loops-v9',4,4],bugWasp:['bug-wasp-v2',4,2],bugDragonfly:['bug-dragonfly-v2',4,2],bugSpider:['bug-spider-v3',4,2],bugCentipede:['bug-centipede-v3',4,2],wing:['wings-3-v1',3,1],gunsMotion:['zero-guns-integrated-v2',3,3],swordEdge:['zero-sword-edge-v3',4,2],swordWide:['zero-sword-wide-v3',4,2],swordLong:['zero-sword-long-v4',4,2],gravity:['gravity-10',5,2]};

function pruneCelFragments(pixels,w,h,paired=false,decorations=false,strict=false){
 const d=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),parts=[];
 for(let start=0;start<w*h;start++){
  if(seen[start]||d[start*4+3]<12)continue;
  let head=0,tail=1;queue[0]=start;seen[start]=1;let l=w,t=h,r=0,b=0;
  const add=j=>{if(j>=0&&j<w*h&&!seen[j]&&d[j*4+3]>=12){seen[j]=1;queue[tail++]=j}};
  while(head<tail){const j=queue[head++],x=j%w,y=Math.floor(j/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   // Eight-connected outlines keep diagonal feather tips and fine limbs intact.
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)add(j+dy*w+dx);
  }
  parts.push({ids:queue.slice(0,tail),l,t,r,b,size:tail});
 }
 parts.sort((a,b)=>b.size-a.size);if(!parts.length)return;
 const primary=parts[0],keep=[primary],mask=new Uint8Array(w*h),gap=Math.max(3,Math.round(Math.min(w,h)*.009));
 if(paired&&parts[1]?.size>primary.size*.2)keep.push(parts[1]);
 for(const p of keep)for(const j of p.ids)mask[j]=1;
 for(const p of parts.slice(1)){
  if(keep.includes(p))continue;
  if(strict)continue;
  const closeBox=keep.some(q=>Math.hypot(Math.max(0,q.l-p.r,p.l-q.r),Math.max(0,q.t-p.b,p.t-q.b))<=gap);
  let near=false;
  if(closeBox)for(const j of p.ids){const x=j%w,y=Math.floor(j/w);for(let dy=-gap;dy<=gap&&!near;dy++)for(let dx=-gap;dx<=gap;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&mask[j+dy*w+dx]){near=true;break}if(near)break}
  const internal=decorations&&p.l>=primary.l-gap*4&&p.r<=primary.r+gap*4&&p.t>=primary.t-gap*4&&p.b<=primary.b+gap*4;
  if(near||internal){keep.push(p);for(const j of p.ids)mask[j]=1}

 }
 seen.fill(0);for(const p of keep)for(const j of p.ids)seen[j]=1;
 for(let j=0;j<w*h;j++)if(!seen[j])d[j*4+3]=0;
}

function splitSheet(image,cols,rows,key){
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
 const frames=[];
 for(let index=0;index<cols*rows;index++){
  const bands={bugs:[0,375,710,1024],gravity:[0,480,1024]}[key],rowIndex=Math.floor(index/cols);
  const columns=key==='gravity'?[0,300,614,845,1220,1536]:key==='wing'?[0,550,1120,2048]:null;const columnBasis=key==='wing'?2048:1536;
  let x0=columns?Math.round(columns[index%cols]*width/columnBasis):Math.floor(index%cols*width/cols),y0=bands?Math.round(bands[rowIndex]*height/1024):Math.round(rowIndex*height/rows),w=(columns?Math.round(columns[index%cols+1]*width/columnBasis):Math.floor((index%cols+1)*width/cols))-x0,h=(bands?Math.round(bands[rowIndex+1]*height/1024):Math.round((rowIndex+1)*height/rows))-y0;
  // The large shoulder windup overlaps nominal grid boundaries. Isolate each
  // complete character, then discard disconnected pieces of neighbouring cels.
  if(key.startsWith('sword')){const regions=[[0,0,480,536],[420,0,392,536],[776,0,392,536],[1120,0,416,536],[0,536,480,488],[420,536,392,488],[776,536,392,488],[1120,536,416,488]],a=regions[index];x0=Math.round(a[0]*width/1536);y0=Math.round(a[1]*height/1024);w=Math.round(a[2]*width/1536);h=Math.round(a[3]*height/1024)}
  const cellW=w,cellH=h,pad=['motion','loops','gunsMotion','basicMotion','defeat','spiderZero','gravity'].includes(key)||key.startsWith('bug')||key.startsWith('sword')?8:0;
  x0-=pad;y0-=pad;w+=pad*2;h+=pad*2;
  const c=document.createElement('canvas');c.width=w;c.height=h;const t=c.getContext('2d');t.drawImage(image,x0,y0,w,h,0,0,w,h);
  const pixels=t.getImageData(0,0,w,h),d=pixels.data,visited=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const genuineAlpha=['spiderZero','insectBomb','insectBlast','webSilk'].includes(key)||key.startsWith('bug')||['sword','bugs','motion','loops','extra','gunsMotion','basicMotion','defeat','wing'].includes(key)||key.startsWith('sword'),neutralKey=['wing','guns','shield'].includes(key),solidKey=['motion','loops','gravity'].includes(key);
  const magenta=(r,gg,b)=>r>70&&b>70&&Math.abs(r-b)<55&&gg<Math.min(r,b)*.55;
  function add(i){if(i<0||i>=w*h||visited[i])return;visited[i]=1;const k=i*4,r=d[k],gg=d[k+1],b=d[k+2];if(d[k+3]<8||(!genuineAlpha&&((solidKey?magenta(r,gg,b):r>170&&b>160&&gg<110)||(neutralKey&&r>180&&Math.max(r,gg,b)-Math.min(r,gg,b)<15)))){queue[tail++]=i;d[k+3]=0}}
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
  while(head<tail){const i=queue[head++];if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w)}
  // Remove key backgrounds before grouping the artwork, retaining thin outlines.
  if(key==='motion'||key==='loops')for(let j=0;j<w*h;j++){const k=j*4;if(magenta(d[k],d[k+1],d[k+2]))d[k+3]=0}
  // Some generated atlases contain a thin rectangular cell border. Erase only
  // long neutral border lines; keep character pixels and recover edge tips.
  if(key.startsWith('bug')){
   const ink=j=>{const k=j*4;return d[k+3]>12&&Math.max(d[k],d[k+1],d[k+2])<45&&Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2])<10};
   for(const edge of [pad,pad+cellW-1])for(let off=-8;off<=8;off++){const xx=edge+off;if(xx<0||xx>=w)continue;let count=0;for(let yy=pad;yy<pad+cellH;yy++)if(ink(yy*w+xx))count++;if(count>cellH*.7)for(let yy=0;yy<h;yy++)for(let dx=-2;dx<=2;dx++){const x=xx+dx;if(x<0||x>=w)continue;const k=(yy*w+x)*4;if(!dx||(Math.max(d[k],d[k+1],d[k+2])<75&&Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2])<25))d[k+3]=0}}
   for(const edge of [pad,pad+cellH-1])for(let off=-8;off<=8;off++){const yy=edge+off;if(yy<0||yy>=h)continue;let count=0;for(let xx=pad;xx<pad+cellW;xx++)if(ink(yy*w+xx))count++;if(count>cellW*.7)for(let xx=0;xx<w;xx++)d[(yy*w+xx)*4+3]=0}
  }
  const unitArt=key.startsWith('bug')||['motion','loops','gunsMotion','basicMotion','defeat','spiderZero','gravity'].includes(key)||key.startsWith('sword');
  if(unitArt)pruneCelFragments(pixels,w,h,false,['motion','loops','gunsMotion','basicMotion','defeat','spiderZero'].includes(key),key.startsWith('sword'));
  if(key==='wing'&&index===2)for(let j=0;j<w*h;j++){const k=j*4;if(d[k]>100&&d[k]>d[k+1]*1.5&&d[k]>d[k+2]*1.7)d[k+3]=0}
  if(key==='wing')pruneCelFragments(pixels,w,h,true);
  let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if((key==='motion'||key==='loops')?magenta(d[i],d[i+1],d[i+2]):!genuineAlpha&&d[i]>180&&d[i+2]>170&&d[i+1]<90)d[i+3]=0;if(d[i+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
  if(left>right||top>bottom)throw new Error('Empty animation cel '+index);
  t.putImageData(pixels,0,0);const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;crop.getContext('2d').drawImage(c,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
  let footLeft=w,footRight=0;for(let y=Math.max(top,bottom-Math.round((bottom-top)*.08));y<=bottom;y++)for(let x=left;x<=right;x++)if(d[(y*w+x)*4+3]>96){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x)}
  let redLeft=w,redRight=0,redBottom=0;
  if(['motion','loops','gunsMotion','basicMotion','defeat','spiderZero'].includes(key)||key.startsWith('sword')){
   for(let yy=top;yy<=bottom;yy++)for(let xx=left;xx<=right;xx++){const k=(yy*w+xx)*4;if(d[k+3]>96&&d[k]>130&&d[k+1]<85&&d[k+2]<100)redBottom=Math.max(redBottom,yy)}
   for(let yy=Math.max(top,redBottom-(bottom-top)*.30|0);yy<=redBottom;yy++)for(let xx=left;xx<=right;xx++){const k=(yy*w+xx)*4;if(d[k+3]>96&&d[k]>130&&d[k+1]<85&&d[k+2]<100){redLeft=Math.min(redLeft,xx);redRight=Math.max(redRight,xx)}}
   if(redLeft<=redRight){footLeft=redLeft;footRight=redRight}
  }
  let scaleHeight=null,foot=crop.height;
  if(key.startsWith('sword')){
   const center=(footLeft+footRight)/2;let hairTop=redBottom;
   for(let yy=top;yy<redBottom;yy++)for(let xx=Math.max(left,center-w*.20|0);xx<=Math.min(right,center+w*.12|0);xx++){const k=(yy*w+xx)*4;if(d[k+3]>96&&d[k]<60&&d[k+1]<60&&d[k+2]<75)hairTop=Math.min(hairTop,yy)}
   scaleHeight=Math.max(40,redBottom-hairTop+1);foot=redBottom-top+1;
  }
  const mount=key==='gunsMotion'?[[141,225],[141,225],[104,228],[139,228],[134,231],[100,233],[138,225],[134,227],[102,231]][index]:key==='basicMotion'?[[174,350],[175,348],[168,349]][index]:null;
  const basis=key==='gunsMotion'?418:724;
  const wingMount=mount?{x:mount[0]*cellW/basis+pad-left,y:mount[1]*cellH/basis+pad-top}:null;
  let silkMouth=null;
  if(key==='bugSpider'){
   // The needle now aims to the side. Anchor silk at its silver eyelet rather
   // than reusing offsets measured on the former frontal poses.
   const limit=left+(right-left)*.12,metal=(xx,yy)=>{const k=(yy*w+xx)*4;return d[k+3]>96&&Math.min(d[k],d[k+1],d[k+2])>95&&Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2])<55};
   let tipX=w;for(let yy=top;yy<=bottom;yy++)for(let xx=left;xx<=limit;xx++)if(metal(xx,yy))tipX=Math.min(tipX,xx);
   let sum=0,count=0;for(let yy=top;yy<=bottom;yy++)for(let xx=tipX;xx<=Math.min(right,tipX+12);xx++)if(metal(xx,yy)){sum+=yy;count++}
   if(!count)throw new Error('Spider needle eyelet missing in cel '+index);
   silkMouth={x:tipX+6-left,y:sum/count-top};
  }
  frames.push({scaleHeight,footWidth:Math.max(1,footRight-footLeft+1),silkMouth,wingMount,image:crop,width:crop.width,height:crop.height,anchor:key==='bugs'?(w*.5-left)/crop.width:((footLeft+footRight)/2-left)/crop.width,foot:key==='bugs'?([330,680,985][rowIndex]*height/1024-y0-top):foot,white:null});
 }
 // One scale throughout the swing: the sword may rise above the head, and a
 // hunched follow-through must not enlarge Zero to fill his standing height.
 if(key.startsWith('sword'))for(const f of frames)f.scaleHeight=frames[0].scaleHeight;
 return {frames,columns:cols,maxWidth:Math.max(...frames.map(f=>f.width)),maxHeight:Math.max(...frames.map(f=>f.height)),rowHeights:Array.from({length:rows},(_,r)=>Math.max(...frames.slice(r*cols,(r+1)*cols).map(f=>f.height)))};
}
const animationQueue=Object.entries(sheetSpecs);let animationLoading=false;
function loadNextAnimationSheet(){if(animationLoading||!animationQueue.length)return;animationLoading=true;const [key,[name,cols,rows]]=animationQueue.shift(),image=new Image();image._requiredAsset=requiredBattleArt.includes(key);image.onerror=function(){const retrying=this._retried;assetError.call(this);if(retrying){animationLoading=false;loadNextAnimationSheet()}};image.onload=()=>{try{animationSheets[key]=splitSheet(image,cols,rows,key);assetReady(false)}catch(e){console.error(e);image._retried=true;assetError.call(image)}animationLoading=false;loadNextAnimationSheet()};image.src=`assets/animation/${name}.png`}
function loadAnimationSheets(){loadNextAnimationSheet()}

const immediateActivate=activate,engineTick=tick,engineReset=reset,engineMove=beginMove,engineHud=updateHud;
activate=function(c){
 if(phaseTransition||state!=='battle'||hurtTime>0||zeroBound())return false;
 if(techniqueLock||moveAnim||attackPoseActive()||actionLock>0)return false;
 if(transformation){msg('ファイル展開中。構えが整うまで待って！');return false}
 if(!c||files[c.file]?.[c.num-1]?.id!==c.id)return false;
 if(techniqueUsesLeft(c)<=0){msg('この技は3回使い切ったよ。');return false}
 if(groundTrapped()&&c.file!=='wing'){msg(tacticalBlock(c));return false}
 if(energy<c.cost){canActivate(c);return false}
 transformation={card:c,age:0,duration:c.file==='sword'?SWORD_MOTION.windup:c.file==='wing'?.58:.5};
 techniqueLock={card:c,stage:'windup',col,row,layer};
 actionLock=transformation.duration+.02;holding=false;charge=0;pendingMove=pendingShot=null;
 equipped=c;quickFiles[c.file]=c;
 msg(`${fileMeta[c.file].label} ${String(c.num).padStart(3,'0')} — 展開！`);sfx('select');updateHud();return true;
};
beginMove=function(c,r,l=layer){const vertical=l!==layer;if(!engineMove(c,r,l))return false;if(vertical){moveAnim.duration=.34;moveAnim.vertical=true;actionLock=Math.max(actionLock,.34)}return true};
reset=function(){swordStrike=null;defeatAge=0;zeroDefeatOrigin=null;transformation=null;techniqueLock=null;appearance={body:'base',sword:1,guns:1,wing:0,shield:0};shieldVisualTime=0;engineReset()};
tick=function(dt){
 const before=simTime;engineTick(dt);const step=simTime-before;
 if(step>0&&state==='battle'&&!phaseTransition)tickSwordStrike(step);
 if(state==='lose')defeatAge=Math.min(2,defeatAge+dt);
 if(state==='lose'||state==='win')return;
 if(step<=0)return;
 shieldVisualTime=Math.max(0,shieldVisualTime-step);tickEquipment();
 if(transformation){transformation.age+=step;if(transformation.age>=transformation.duration){const c=transformation.card;transformation=null;
   if(techniqueLock?.card===c)techniqueLock.stage='ready';
   applyEquipment(c);
  }}
 if(techniqueLock?.stage==='recovery'&&poseTime<=0&&actionLock<=0&&!moveAnim)techniqueLock=null;
};
updateHud=function(){engineHud()};


function frameWhite(frame){if(frame.white)return frame.white;const c=document.createElement('canvas');c.width=frame.width;c.height=frame.height;const t=c.getContext('2d');t.drawImage(frame.image,0,0);t.globalCompositeOperation='source-in';t.fillStyle='#edfff7';t.fillRect(0,0,c.width,c.height);return frame.white=c}
function drawCel(sheet,index,x,feet,size=76,alpha=1,smear=false,white=false){
 const data=animationSheets[sheet],f=data?.frames[index];if(!f)return;
 const scale=size/(f.scaleHeight||data.rowHeights[Math.floor(index/(data.columns||4))]||data.maxHeight),w=Math.round(f.width*scale),h=Math.round(f.height*scale),left=Math.round(x-w*f.anchor),top=Math.round(feet-f.foot*scale);
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
 if(state==='lose')return{sheet:'defeat',frame:defeatAge<.25?0:defeatAge<.62?1:2,phase:0};
 if(hurtTime>0)return{sheet:'motion',frame:hurtTime>.18?15:13,phase:0};
 const beat=idleOrder[Math.floor(simTime/.22)%idleOrder.length];
 if(transformation?.card.file==='sword'){const t=transformation.age/transformation.duration;return{sheet:['swordEdge','swordWide','swordLong'][transformation.card.num-1],frame:t<.25?0:t<.55?1:2,phase:3}}
 if(pose==='sword'&&poseTime>0){const age=Math.max(0,SWORD_MOTION.duration-poseTime);return{sheet:['swordEdge','swordWide','swordLong'][(swordStrike?.card.num||appearance.sword)-1],frame:age<.025?2:age<.055?3:age<.09?4:age<.16?5:age<.23?6:7,phase:3}}
 if(transformation?.card.file==='guns'&&animationSheets.gunsMotion){const t=transformation.age/transformation.duration;if(t>.2)return{sheet:'gunsMotion',frame:(transformation.card.num-1)*3+(t>.7?1:0),phase:3}}
 if(pose==='shoot'&&appearance.body==='guns'&&animationSheets.gunsMotion)return{sheet:'gunsMotion',frame:(appearance.guns-1)*3+(poseTime>.12?2:1),phase:3};
 if(transformation){const phase=Math.min(3,Math.floor(transformation.age/transformation.duration*4));return{sheet:'motion',frame:transitionFrames[transformation.card.file][phase],phase}}
 if(groundTrapped())return{sheet:'loops',frame:12+beat,phase:0};
 if(moveAnim?.vertical)return{sheet:'motion',frame:14,phase:3};
 if(pose==='wing')return{sheet:'loops',frame:8+beat,phase:3};
 if(pose==='basic')return animationSheets.basicMotion?{sheet:'basicMotion',frame:poseTime>.19?0:poseTime>.06?2:1,phase:3}:{sheet:'motion',frame:poseTime>.19?5:poseTime>.06?6:7,phase:3};
 if(pose==='shoot')return{sheet:'loops',frame:beat,phase:3};
 if(pose==='gravity')return{sheet:'motion',frame:9,phase:0};
 if(pose==='transfer')return{sheet:'motion',frame:5,phase:0};
 if(layer)return{sheet:'loops',frame:8+beat,phase:3};
 return{sheet:'motion',frame:beat,phase:0};
}
function zeroWingMount(cel,x,y){
 const data=animationSheets[cel.sheet],f=data?.frames[cel.frame];
 if(!f?.wingMount)return {x:x-7*ZERO_SCALE,y:y-43*ZERO_SCALE};
 const scale=ZERO_SIZE/(f.scaleHeight||data.rowHeights[Math.floor(cel.frame/data.columns)]||data.maxHeight),w=Math.round(f.width*scale);
 return {x:Math.round(x-w*f.anchor)+f.wingMount.x*scale,y:Math.round(y-f.foot*scale)+f.wingMount.y*scale};
}
function drawZeroAnimated(){
 if(state==='lose'){drawZeroDefeated();return}
 const target=pos(col,row,layer),t=moveAnim?Math.min(1,moveAnim.age/moveAnim.duration):1,ease=moveAnim?.vertical?t*t*(3-2*t):1-(1-t)**3;
 const p=zeroVisualPosition();
 const cel=zeroAnimationFrame(),c=transformation?.card,progress=transformation?transformation.age/transformation.duration:1;
 const bob=layer?Math.round(Math.sin(simTime*3)*1.5):0,recoil=pose==='shoot'?-Math.round(poseTime*12):hurtTime>0?-Math.round(10*Math.sin(hurtTime/.5*Math.PI)):0;
 const x=p.x+recoil,y=p.y+12+bob,alpha=invuln>0&&Math.floor(simTime*20)%2?.4:1;
 g.save();if(zeroFacing<0){g.translate(p.x*2,0);g.scale(-1,1)}
 if(hurtTime>0){g.translate(p.x,p.y+12);g.rotate(-.32*Math.sin(Math.min(1,hurtTime/.5)*Math.PI));g.translate(-p.x,-p.y-12)}
 const wingNum=c?.file==='wing'?c.num:appearance.wing;
 const wingVisible=(layer&&flight>0)||moveAnim?.vertical||(c?.file==='wing'&&progress>.25);
 if(wingVisible&&wingNum){const reveal=c?.file==='wing'?Math.min(1,Math.max(0,(progress-.25)/.5)):1;const flap=Math.sin(simTime*3)*.035,mount=zeroWingMount(cel,x,y);drawEquipment('wing',wingNum,mount.x,mount.y,(layer||wingRequested?112:68)*ZERO_SCALE,(layer||wingRequested?74:44)*ZERO_SCALE,alpha,reveal,flap)}
 if(moveAnim&&!moveAnim.vertical&&t<.8)drawCel(cel.sheet,cel.frame,moveAnim.from.x,moveAnim.from.y+12+(ZERO_SIZE-72)*Math.max(0,Math.min(1,(pos(0,moveAnim.sourceR??row).y-moveAnim.from.y)/84)),ZERO_SIZE,(1-t)*.2,true);
 drawCel(cel.sheet,cel.frame,x,y,ZERO_SIZE,alpha,!!moveAnim&&!moveAnim.vertical&&moveAnim.age<=1/60+.001);
 let weapon=poseTime>0?appearance.body:'base';
 if(c&&(c.file==='sword'||c.file==='guns'))weapon=progress>.25?c.file:'base';
 const guard=c?.file==='shield'?c.num:appearance.shield;
 const guardLive=shield>0&&shieldTime>0,guardDeploy=c?.file==='shield'&&progress>.25;
 if(guard&&(guardLive||guardDeploy))drawShieldBubble(guard,x,y-35*ZERO_SCALE,guardDeploy?Math.min(1,(progress-.25)/.5):1);
 if(transformation){ring(x,y-2,17+Math.sin(progress*Math.PI)*8,'#93ffdf',.7);for(let n=0;n<5;n++){g.fillStyle='#acffed';const yy=Math.round(y-10-progress*48+n%2*5);g.fillRect(Math.round(x-18+n*9),yy,2,3)}}
 if(charge>.15){ring(x,y-30*ZERO_SCALE,(17+Math.sin(simTime*20)*3)*ZERO_SCALE,charge>=.8?'#ffdf81':'#77f6e6');for(let n=0;n<5;n++){const ang=n*1.256+simTime*8;g.fillStyle=charge>=.8?'#fff6c4':'#87fcea';g.fillRect(Math.round(x+Math.cos(ang)*18*ZERO_SCALE),Math.round(y-32*ZERO_SCALE+Math.sin(ang)*18*ZERO_SCALE),2,2)}}
 g.restore();if(guardLive&&guard!==3)drawShieldCapacity(guard||1,p.x,y+20*ZERO_SCALE);
}
const shieldColors=['#65ff91','#ffdf5e','#ff626f'];
function shieldPath(num,x,y,r){
 g.beginPath();
 if(num!==3){g.arc(x,y,r,0,Math.PI*2);return}
 for(let i=0;i<12;i++){
  const a=(i+.5)*Math.PI/6-Math.PI/2;
  const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
  if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
 }
 g.closePath();
}
function drawShieldBubble(num,x,y,reveal=1){
 const color=shieldColors[num-1]||shieldColors[0],r=40*ZERO_SCALE*Math.max(.1,reveal);
 g.save();g.globalAlpha=.12*reveal;g.fillStyle=color;shieldPath(num,x,y,r);g.fill();
 shieldPath(num,x,y,r-1);g.clip();
 g.globalAlpha=.23*reveal;g.strokeStyle=color;g.lineWidth=1;
 for(let dy=-40*ZERO_SCALE;dy<=40*ZERO_SCALE;dy+=3){const half=Math.sqrt(Math.max(0,r*r-dy*dy));g.beginPath();g.moveTo(Math.round(x-half),Math.round(y+dy));g.lineTo(Math.round(x+half),Math.round(y+dy));g.stroke()}
 g.restore();g.save();g.strokeStyle=color;g.globalAlpha=.8*reveal;g.lineWidth=1.5;shieldPath(num,x,y,r);g.stroke();
 g.strokeStyle='#eafff0';g.globalAlpha=.7*reveal;g.lineWidth=2;
 if(num===3){g.beginPath();g.moveTo(x-r*.83,y-r*.42);g.lineTo(x-r*.66,y-r*.7);g.lineTo(x-r*.37,y-r*.93)}
 else{g.beginPath();g.arc(x,y,r-3,Math.PI*1.12,Math.PI*1.50)}
 g.stroke();g.restore();
}
function drawShieldCapacity(num,x,y){
 const value=String(Math.ceil(shield)),width=Math.max(28,value.length*9+10),color=shieldColors[num-1]||shieldColors[0];
 g.save();g.fillStyle='#061720e8';g.fillRect(Math.round(x-width/2),Math.round(y-12),width,17);g.strokeStyle=color;g.lineWidth=1;g.strokeRect(Math.round(x-width/2)+.5,Math.round(y-12)+.5,width-1,16);textPixel(value,x,y+1,color,13,'center');g.restore();
}
function beginZeroDefeat(){
 zeroDefeatOrigin=zeroVisualPosition();defeatAge=0;
 for(const b of bugs){if(b.bindAge!==undefined){delete b.bindAge;delete b.bindPulses;b.attack=null}if(b.type==='error'&&b.attack==='biteStrike'){b.attack='recover';b.attackAge=0}}
 snared=0;
 moveAnim=null;transformation=null;techniqueLock=null;pendingMove=pendingShot=null;
 pose='defeated';poseTime=0;hurtTime=invuln=0;charge=0;holding=false;
 shield=shieldTime=shieldVisualTime=0;appearance.body='base';loadout.weapon=null;
}
function drawZeroDefeated(){
 const origin=zeroDefeatOrigin||pos(col,row,layer),ground=pos(col,row,0),drop=Math.min(1,defeatAge/.55),ease=drop*drop*(3-2*drop);
 const x=origin.x+(ground.x-origin.x)*ease,y=origin.y+(ground.y-origin.y)*ease+12;
 const frame=defeatAge<.25?0:defeatAge<.62?1:2;
 g.save();if(zeroFacing<0){g.translate(x*2,0);g.scale(-1,1)}
 if(animationSheets.defeat)drawCel('defeat',frame,x,y,ZERO_SIZE,1);
 else{g.translate(x,y);g.rotate(-Math.min(1,defeatAge/.62)*Math.PI*.48);drawCel('motion',15,0,0,ZERO_SIZE,1)}
 g.restore();
}
function drawBugAnimated(b,x,y,size,flashWhite=false){const rect=insectSpriteGeometry(b,x,y);if(!rect)return;g.drawImage(rect.f.image,Math.round(rect.left),Math.round(rect.top),Math.round(rect.w),Math.round(rect.h))}

window.zeroBattle={...window.zeroBattle,reset,activate,readAnimation:()=>({transformation:transformation?{file:transformation.card.file,num:transformation.card.num,age:transformation.age}:null,appearance:{...appearance},cel:zeroAnimationFrame()})};
loadAnimationSheets();

const legacyDrawBug=drawBugAnimated;
function insectAnimationFrame(b){
 const a=b.attackMotion;
 if(b.type==='spider'&&typeof spiderBind!=='undefined'&&spiderBind?.source===b.id&&spiderBind.releaseAge===null)return 6;
 if(b.stun>0)return 7;
 if(a){
  if(a.kind==='bomb'){
   const times=[0,1,2,3,4,5].filter(c=>panelOwners[cellId(c,a.r)]==='zero'&&c<=a.startC).map(c=>(a.startC-c)/a.speed);
   if(times.some(t=>a.age>=t-.075&&a.age<t))return 5;
   if(a.lastDropAge!==undefined&&a.age<a.lastDropAge+.13)return 6;
   return insectWorldCol(b)<0?7:4;
  }
  if(a.kind==='web')return a.age<.18?5:a.age<.96?6:7;
  return a.age<.13?4:a.age<.25?5:a.age<.66?6:7;
 }
 if(b.tell>0)return b.tell>bugTypes[b.type].tell*.4?4:5;
 if(b.recoverWait>0)return 7;
 if(b.motion&&!bugCanFly(b))return Math.min(3,Math.floor(b.motion.age/b.motion.duration*4));
 // Ground insects hold their resting cel; wings beat five frames a second.
 return bugCanFly(b)?[0,1,2,3,2,1][Math.floor(simTime/.20)%6]:0;
}
function insectSpriteGeometry(b,x=bugPosition(b).x,y=bugPosition(b).y+12){
 const key={bee:'bugWasp',fly:'bugDragonfly',spider:'bugSpider',beetle:'bugCentipede'}[b.type],data=animationSheets[key];if(!data)return null;
 const frame=insectAnimationFrame(b),f=data.frames[frame],maxW={bee:87.5,fly:113.75,spider:82.5,beetle:70}[b.type],maxH={bee:68.75,fly:75,spider:63.75,beetle:37.5}[b.type];
 const scale=b.type==='beetle'?maxW/data.maxWidth:Math.min(maxW/data.maxWidth,maxH/data.maxHeight),w=f.width*scale,h=f.height*scale;
 return {f,scale,w,h,left:x-w*.5,top:y-h};
}
drawBugAnimated=function(b,x,y,size,flashWhite=false){
 if(b.offscreen)return;const rect=insectSpriteGeometry(b,x,y);
 if(!rect)return;
 g.save();g.globalAlpha=flashWhite||b.hit>.08?.65:1;
 g.drawImage(rect.f.image,Math.round(rect.left),Math.round(rect.top),Math.round(rect.w),Math.round(rect.h));g.restore();
};
