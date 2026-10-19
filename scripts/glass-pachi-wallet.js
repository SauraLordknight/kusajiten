/* One shared grass balance per player; machine balls never share a storage field. */
(function(root){'use strict';
 const profilesKey='kusaPachiProfilesV1',journalKey='glassGirlWalletJournalV1';
 function recover(storage){try{const j=JSON.parse(storage.getItem(journalKey)||'null');if(!j)return true;if(j.version!==1||!Array.isArray(j.entries)||j.entries.length!==2||j.entries[0].key!==profilesKey||!j.entries[1].key.startsWith('glassGirlMachineV1:'))return false;for(const entry of j.entries){const value=entry[j.phase==='committed'?'after':'before'];if(value===null)storage.removeItem(entry.key);else storage.setItem(entry.key,value);}storage.removeItem(journalKey);return true;}catch{return false;}}
 function exchange({game,playerId,amount,direction,storage=root.localStorage}){
  if(!recover(storage))return{ok:false,reason:'recovery'};
  if(!game||!game.canChangeRate)return{ok:false,reason:'busy'};
  if(!KusaAmounts.valid(amount)||KusaAmounts.cmp(amount,0)<=0||!['toGrass','toBalls'].includes(direction))return{ok:false,reason:'invalid'};
  if(!game.save())return{ok:false,reason:'save'};
  let profiles,beforeProfiles,beforeGame;
  try{beforeProfiles=storage.getItem(profilesKey);beforeGame=storage.getItem(game.key);profiles=JSON.parse(beforeProfiles||'[]');}catch{return{ok:false,reason:'save'};}
  const p=Array.isArray(profiles)&&profiles.find(p=>p.rankingId===playerId);if(!p||!KusaAmounts.valid(p.grass))return{ok:false,reason:'player'};
  const delta=KusaAmounts.mul(amount,direction==='toGrass'?-1:1),newBalls=KusaAmounts.add(game.state.balls,delta),newGrass=KusaAmounts.sub(p.grass,delta);
  if(!KusaAmounts.valid(newBalls)||!KusaAmounts.valid(newGrass))return{ok:false,reason:'balance'};
  p.grass=newGrass;const afterGame=JSON.stringify({...game.state,balls:newBalls});
  const journal={version:1,phase:'prepared',entries:[{key:profilesKey,before:beforeProfiles,after:JSON.stringify(profiles)},{key:game.key,before:beforeGame,after:afterGame}]};
  try{storage.setItem(journalKey,JSON.stringify(journal));for(const e of journal.entries)storage.setItem(e.key,e.after);journal.phase='committed';storage.setItem(journalKey,JSON.stringify(journal));}
  catch{const restored=recover(storage);return{ok:false,reason:restored?'save':'recovery'};}
  game.state.balls=newBalls;try{storage.removeItem(journalKey);}catch{/* A committed journal is completed before the next exchange/load. */}
  return{ok:true,profiles,grass:newGrass,balls:newBalls};
 }
 const api={exchange,recover,journalKey};if(typeof module!=='undefined')module.exports=api;root.GlassPachiWallet=api;
 try{if(root.localStorage)recover(root.localStorage);}catch{/* UI reports unavailable storage when used. */}
})(typeof window!=='undefined'?window:globalThis);
