'use strict';
let loadout={weapon:null,wing:null,shield:null},wingRequested=false,supportRequested={};
let equipmentUses={},lastEquipmentUse=null;
function resetEquipment(){loadout={weapon:null,wing:null,shield:null};wingRequested=false;equipmentUses={};lastEquipmentUse=null}
function applyEquipment(c){equipped=c;quickFiles[c.file]=c;if(activeOrder?.card.id===c.id){activeOrder.phase='ready';return true}return executeEquipped(c)}
function tickEquipment(){if(poseTime<=0){appearance.body='base';loadout.weapon=null}if(!flight&&!layer){loadout.wing=null;appearance.wing=0}if(loadout.shield&&((loadout.shield.shield&&(shield<=0||shieldTime<=0))||shieldVisualTime<=0)){loadout.shield=null;appearance.shield=0;shieldVisualTime=0}}
function equipmentBlocked(c){return unavailable(c)}
function attackLayerMatches(c,b){if(!b)return false;if((c.requireAir||c.target==='down')&&!layer)return false;if((c.requireGround||c.target==='up')&&layer)return false;return c.target==='both'||(c.target==='up'||c.target==='air'?b.layer===1:c.target==='down'?b.layer===0:b.layer===layer)}
function executeEquipped(c){
 const committed=techniqueLock?.card===c&&techniqueLock.stage==='ready';
 if(!committed&&equipmentBlocked(c))return false;const target=orderTarget();if(target)zeroFacing=Math.sign(target.c-col)||zeroFacing;
 if(techniqueLock?.card===c)techniqueLock.stage='executing';
 if(!immediateActivate(c,{automatic:true,committed})){if(techniqueLock?.card===c)techniqueLock.stage='ready';return false}
 equipmentUses[c.id]=(equipmentUses[c.id]||0)+1;lastEquipmentUse=c.id;if(c.file!=='wing')appearance[c.file]=c.num;
 if(['guns','sword'].includes(c.file)&&c.damage){appearance.body=c.file;loadout.weapon=c}
 if(c.file==='wing'){loadout.wing=c;appearance.wing=c.num;checkGroundTrap()}
 if(c.file==='shield'){loadout.shield=c;shieldVisualTime=Math.max(c.duration||0,c.phase||0,c.regen||0)}
 if(!c.damage){pose='transfer';poseTime=.28}if(techniqueLock?.card===c)techniqueLock.stage='recovery';recordOrderUse(c);updateHud();return true;
}
function wingAttack(){return null}
function autoSupport(){return false}
function equippedAttackCandidates(){return activeOrder?.card.damage?[activeOrder.card]:[]}
function currentCombatCard(){return activeOrder?.card||null}
