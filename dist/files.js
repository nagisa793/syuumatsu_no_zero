'use strict';
const fileMeta={sword:{label:'SWORD',jp:'ソード'},wing:{label:'WING',jp:'ウィング'},guns:{label:'GUNS',jp:'ガンズ'},shield:{label:'SHIELD',jp:'シールド'},area:{label:'AREA',jp:'エリア'},gravity:{label:'GRAVITY',jp:'グラビティ'}};
const make=(name,desc,cost,cool,extra)=>({name,desc,cost,cool,...extra});
const files={
 sword:[
  make('エッジ','同階層・前方1マス / 20',1,1,{damage:20,range:1}),
  make('ワイドエッジ','同階層・前方Y軸3マス / 15',2,1.4,{damage:15,range:1,wide:true}),
  make('ロングエッジ','同階層・前方X軸3マス / 10',2,1.8,{damage:10,range:3})],
 wing:[
  make('アオサギの翼','アオサギの翼で飛行を維持・通常速度',1,.7,{flight:1,speed:1}),
  make('悪魔の翼','悪魔の翼で飛行を維持・移動速度アップ小',2,.7,{flight:1,speed:1.15}),
  make('サモトラケの翼','サモトラケのニケの石翼で飛行を維持・移動速度アップ中',3,.7,{flight:1,speed:1.35})],
 guns:[
  make('パルス','同階層・直線弾 / 10',1,.7,{damage:10,projectile:true}),
  make('ヘビーパルス','同階層・直線弾 / 25',3,2,{damage:25,projectile:true}),
  make('ピアス','同階層・1行を貫通 / 15',2,1.8,{damage:15,projectile:true,pierce:true})],
 shield:[
  make('ガード','5秒間・60ダメージを吸収',1,6,{shield:60,duration:5}),
  make('ヘビーガード','8秒間・120ダメージを吸収',3,10,{shield:120,duration:8}),
  make('パリィ','1.2秒間・被弾を防いで同階層へ反撃 / 15',2,3,{shield:999,duration:1.2,reflect:15})],
 area:[
  make('エリアスナッチ','敵の最前列の空きパネルを最大1マス奪う',1,1,{steal:1}),
  make('エリアダブル','敵の最前列の空きパネルを最大2マス奪う',2,1.5,{steal:2}),
  make('エリアトリプル','敵の最前列の空きパネルを最大3マス奪う',3,2,{steal:3}),
  make('ホールアウト','誰もいないパネルを10秒間、穴にする。残り3秒で点滅',5,10,{holes:10})],
 gravity:[
  make('怒れるサボテン','標的の頭上から怒れるサボテン / 両階層・5',1,1,{damage:5,drop:true}),
  make('モアイ像','標的の頭上からモアイ像 / 両階層・15',2,1.3,{damage:15,drop:true}),
  make('自由の女神像','標的の頭上から自由の女神像 / 両階層・20＋停止0.6秒',3,1.5,{damage:20,drop:true,stun:.6})]
};
for(const c of files.gravity)Object.assign(c,{target:'both',requireGround:true});
for(const [file,list] of Object.entries(files))list.forEach((x,i)=>Object.assign(x,{file,num:i+1,id:`${file}-${i+1}`}));
