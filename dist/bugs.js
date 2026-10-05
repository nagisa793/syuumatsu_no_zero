'use strict';
const bugTypes={
 bee:{name:'ニードルビー',aliases:['蜂','ハチ','ビイ'],flying:true,size:53,hp:20,kind:'needle',cool:3.3,tell:.7,speed:5.5,damage:20},
 fly:{name:'アシッドフライ',aliases:['ハエ','はえ','フライ'],flying:true,size:52,hp:30,kind:'acid',cool:3.8,tell:1,speed:4,damage:20},
 spider:{name:'スレッドスパイダー',aliases:['蜘蛛','クモ','くも','スパイダ'],flying:false,size:46,hp:40,kind:'web',cool:3.7,tell:.85,speed:3.7,damage:20},
 mantis:{name:'ブレードマンティス',aliases:['カマキリ','かまきり','マンティス'],flying:false,size:56,hp:50,kind:'scythe',cool:3.2,tell:.8,speed:6,damage:25},
 beetle:{name:'ホーンビートル',aliases:['カブトムシ','かぶとむし','ビトル'],flying:false,size:49,hp:60,kind:'horn',cool:4.5,tell:1.05,speed:8,damage:30},
 moth:{name:'パルスモス',aliases:['蛾','モス'],flying:true,size:55,hp:40,kind:'powder',cool:4.2,tell:1,speed:3.2,damage:15}
};
Object.assign(bugNames,Object.fromEntries(Object.entries(bugTypes).map(([t,b])=>[t,b.name])));
function createBattleBugs(){const roster=[['bee',3,0,1],['fly',5,1,1],['spider',3,2,0],['mantis',4,1,0],['beetle',5,0,0],['moth',4,2,1]];
 for(let i=roster.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[roster[i],roster[j]]=[roster[j],roster[i]]}
 return roster.slice(0,3).map(([type,c,r,layer],i)=>({id:i+1,type,c,r,layer,hp:bugTypes[type].hp,max:bugTypes[type].hp,cd:1.2+i*.55,tell:0,hit:0,stun:0,attackPose:0,motion:null,decision:.2+i*.17,stepWait:.8+i*.2,cycle:0,burst:0,evadeWait:0,aimRow:r,targetLayer:layer}))}
bugCanFly=b=>!!bugTypes[b.type]?.flying;
bugPosition=function(b){const p=pos(b.c,b.r,b.layer);if(b.layer){let height=bugTypes[b.type].size;if(b.type==='grenade'&&animationSheets.boss)height=Math.max(...animationSheets.boss.frames.slice(4).map(f=>f.height*114/animationSheets.boss.frames[0].width));p.y+=height-72-(b.type==='grenade'?8:0)}let out=p;if(b.motion){const t=Math.min(1,b.motion.age/b.motion.duration),e=t*t*(3-2*t);out={x:b.motion.from.x+(p.x-b.motion.from.x)*e,y:b.motion.from.y+(p.y-b.motion.from.y)*e}}if(b.type==='beetle'&&b.attackPose>0)out={x:out.x-24*Math.sin(Math.PI*(1-b.attackPose/.5)),y:out.y};return out};
bugShot=function(b){const m=bugTypes[b.type],dir=Math.sign(col-b.c)||-1,rows=m.kind==='powder'?[b.aimRow,...[b.aimRow-1,b.aimRow+1].filter(r=>r>=0&&r<3)]:[b.aimRow];for(const r of rows)bullets.push({c:b.c+.2*dir,r,layer:b.targetLayer,sourceLayer:b.layer,speed:m.speed,damage:m.damage,enemy:true,dir,kind:m.kind});b.attackPose=.5;tone(m.kind==='needle'?580:m.kind==='horn'?95:220,.09,'triangle')};
tickBugs=function(dt){
 for(const b of bugs){
  if(b.hp<=0)continue;const m=bugTypes[b.type];if(!m.flying&&b.layer){b.layer=0;b.motion=null}b.hit=Math.max(0,b.hit-dt);b.attackPose=Math.max(0,(b.attackPose||0)-dt);
  if(b.motion){b.motion.age+=dt;if(b.motion.age>=b.motion.duration)b.motion=null}if(b.stun>0){b.stun=Math.max(0,b.stun-dt);continue}if(!enemyAutomationEnabled)continue;
  b.cd-=dt;b.stepWait-=dt;b.decision-=dt;b.evadeWait=Math.max(0,b.evadeWait-dt);
  if(b.burst>0){b.burst-=dt;if(b.burst<=0){bugShot(b);b.stepWait=.65}continue}
  if(b.tell>0){b.tell-=dt;if(b.tell<=0){bugShot(b);b.cycle++;if(b.type==='bee')b.burst=.22;b.cd=m.cool*(.8+Math.random()*.4);b.stepWait=.7}continue}
  if(b.motion||b.decision>0)continue;b.decision=.2;
  if(b.cd<=0){if(bugs.filter(o=>o.hp>0&&o.tell>0).length>=2){b.cd=.3;continue}b.aimRow=b.r;b.targetLayer=b.type==='fly'?0:b.layer;b.tell=m.tell;b.stepWait=1.2;continue}
  if(b.stepWait>0)continue;
  const moves=[[b.c-1,b.r],[b.c+1,b.r],[b.c,b.r-1],[b.c,b.r+1]].filter(([c,r])=>bugCanMove(b,c,r));
  if(moves.length){const [c,r]=moves[Math.floor(Math.random()*moves.length)];moveBug(b,c,r)}
  b.stepWait=(m.flying?.5:.65)+Math.random()*.4;
 }
};
