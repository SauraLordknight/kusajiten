import {MedalSave} from './kusa-medal/medal-save.js';
import {confirmAction} from './kusa-action-ui.js';
import {FishingScene} from './kusa-fishing-scene.js';
import {FishingSoundscape} from './kusa-fishing-audio.js';
import {coffeeHit} from './kusa-fishing-coffee.js';
import {FishingDialogue} from './kusa-fishing-dialogue.js';
import {FishingCrystalEffect} from './kusa-fishing-crystal.js';
import {FishingPlantEffect} from './kusa-fishing-plant.js';
import {fishingPeriod,fishingTransaction,exchangeBait,startFishing,catchFishing,FISHING_RULES,fishingCardEffectDescription,activateCrystalBlessing,isCrystalCard,crystalBlessingRemaining} from './kusa-fishing-economy.js';
import {capsuleTotal,CAPSULES} from './kusa-medal/medal-capsule-economy.js';

const save=new MedalSave(),$=id=>document.getElementById(id),fmt=n=>KusaAmounts.format(n || 0);
const periods={day:'昼の水辺',sunset:'夕暮れの水辺',night:'夜の水辺',midnight:'深夜の水辺'};
const names={grass:'草',balls:'持ち球',chips:'チップ',bait:'餌',capsules:'カプセル'};
const icons={grass:'🌿',balls:'🔵',chips:'💠',bait:'🦐',capsules:'🎁'};
for(const quality of Object.keys(CAPSULES)){names[quality]=`${CAPSULES[quality].name}カプセル`;icons[quality]='🎁';}
const dialog=document.createElement('dialog');dialog.id='kusaFishingWindow';dialog.className='fishing-dialog theme-window';dialog.setAttribute('aria-labelledby','fishingTitle');
dialog.innerHTML=`<header class="theme-window-head fishing-head"><div><small>KUSA FISHING</small><h2 id="fishingTitle">草釣り</h2></div><div><button id="fishingSound" type="button" aria-pressed="true">音 ON</button><button id="fishingClose" type="button">× 閉じる</button></div></header>
<div class="fishing-hud" aria-label="現在の所持品">${['grass','balls','chips','bait','capsules'].map(k=>`<div data-fishing-resource="${k}"><span>${icons[k]} ${names[k]}</span><strong id="fishing-${k}">0</strong></div>`).join('')}</div>
<div class="fishing-info"><span id="fishingPlayer"></span><span id="fishingPeriod"></span></div>
<p id="fishingCrystalStatus" class="fishing-crystal-status" role="timer" aria-live="off" aria-label="結晶の加護の残り時間" hidden></p>
<div class="fishing-layout"><div class="fishing-main"><div class="fishing-stage"><canvas id="fishingCanvas" width="384" height="256" aria-label="木の家、川と海のある草釣りマップ"></canvas><div id="fishingMapLinks" class="fishing-map-links" hidden><button type="button" data-fishing-place="house" class="fishing-map-house">家に入る</button><button type="button" data-fishing-place="river" class="fishing-map-river">川で釣る</button><button type="button" data-fishing-place="sea" class="fishing-map-sea">海で釣る</button></div><div id="fishingParticles" class="fishing-particles" aria-hidden="true"></div></div>
<p id="fishingStatus" role="status" aria-live="polite">木の家で、ゆっくり支度をしましょう。</p><div class="fishing-actions"><button id="fishingAction" type="button">外へ出る</button><button id="fishingBack" type="button" hidden>マップに戻る</button></div></div>
<aside class="fishing-sidebar"><section><h3>釣りの支度</h3><p>餌1個で1回。<strong>！</strong>が出たら「釣る」をタップ。押すまで待っていてくれます。</p><button id="fishingExchangeOpen" type="button" aria-expanded="false">🪱 餌の交換所</button><button id="fishingCapsules" type="button">🎁 カプセルを開封</button></section>
<section id="fishingCharacter"><h3>主人公</h3><div class="fishing-character-options"><button type="button" data-fishing-character="boy" aria-pressed="true">男の子</button><button type="button" data-fishing-character="girl" aria-pressed="false">女の子</button></div><small>家でいつでも変更できます。</small></section>
<section><h3>ダブりカードのおまじない</h3><p>レアリティごとのチップ最低保証と追加報酬に、通常の釣り報酬、既存ルールのカプセルが加わります。</p><label for="fishingCard">使うカード（最後の1枚は残ります）</label><select id="fishingCard"><option value="">カードを使わない</option></select><label for="fishingCardCount">消費するダブり</label><select id="fishingCardCount"><option value="1">1枚：釣果2回分＋カプセル</option><option value="2">2枚：釣果3回分＋カプセル</option><option value="3">3枚：釣果5回分＋カプセル</option></select><button id="fishingCrystalUse" type="button" hidden>✧ 結晶の加護を使う</button><p id="fishingCardNote">カードの消費は釣果を受け取るときです。</p></section>
<section><h3>この釣り場での記録</h3><p id="fishingRecords">釣り上げ 0回</p><p id="fishingResult" aria-live="polite">水の音を聞きながら、のんびりどうぞ。</p></section></aside></div>
<section id="fishingExchange" class="fishing-exchange" hidden><h3>🪱 餌の交換所</h3><p>10草 → 餌1個 ／ 餌1個 → 5草</p><div class="fishing-exchange-columns">${['buy','sell'].map((k,i)=>`<div><h4>${i?'餌を草に戻す':'草で餌を用意する'}</h4><label for="fishingQuantity-${k}">餌の個数</label><input id="fishingQuantity-${k}" type="text" value="1" inputmode="numeric"><div><button type="button" data-fishing-quick="${k}:half">半分</button><button type="button" data-fishing-quick="${k}:all">すべて</button></div><p id="fishingPreview-${k}"></p><button type="button" data-fishing-exchange="${k}">${i?'餌を草に戻す':'草を餌に交換'}</button></div>`).join('')}</div><p id="fishingExchangeStatus" role="status"></p><button id="fishingExchangeClose" type="button">交換所を閉じる</button></section>`;
document.body.append(dialog);
// Legacy Windows emoji fonts do not contain the newer worm and coin glyphs.
for(const node of dialog.querySelectorAll('button,h3'))node.textContent=node.textContent.replaceAll('🪱','🦐');
new ResizeObserver(entries=>dialog.style.setProperty('--fishing-head-height',`${entries[0].target.getBoundingClientRect().height}px`)).observe(dialog.querySelector('.fishing-head'));
const scene=new FishingScene($('fishingCanvas'));
const soundscape=new FishingSoundscape();
const dialogue=new FishingDialogue(dialog.querySelector('.fishing-stage'),$('fishingStatus'),{changed:()=>{held.clear();scene.input(null);updateControls();},sound:name=>play(name)});
const windowPlant=document.createElement('button');windowPlant.type='button';windowPlant.id='fishingWindowPlant';windowPlant.className='fishing-window-plant';windowPlant.setAttribute('aria-label','窓辺の草を調べる');windowPlant.title='窓辺の草を調べる';dialog.querySelector('.fishing-stage').append(windowPlant);
const plantEffect=new FishingPlantEffect(dialog.querySelector('.fishing-stage'),{sound:(name,rate)=>play(name,rate),ended:()=>{stopPlantAudio();setPhase('idle');status('ハートがふわっと弾けた。');}});
let crystalResult=null;
const crystalEffect=new FishingCrystalEffect(dialog.querySelector('.fishing-stage'),{sound:(name,rate)=>play(name,rate),ended:()=>{if(!dialog.open)return;setPhase('idle');if(crystalResult){const result=crystalResult;crystalResult=null;rewardParticles(result.rewards);const summary=rewardSummary(result.rewards);$('fishingResult').textContent=summary;status(`結晶の加護が発動！ ${summary} 通常釣りでもカプセルが見つかるようになりました。`,{wait:true,sound:true});}}});
const controls=document.createElement('div');controls.className='fishing-walk-controls';controls.innerHTML='<div class="fishing-dpad" role="group" aria-label="移動"><button type="button" data-walk="up" aria-label="上へ歩く">▲</button><button type="button" data-walk="left" aria-label="左へ歩く">◀</button><button type="button" data-walk="down" aria-label="下へ歩く">▼</button><button type="button" data-walk="right" aria-label="右へ歩く">▶</button></div><p>矢印・WASD／方向ボタン長押しで歩く<br>水辺・家具・出口で「決定」。Enter・Spaceも使えます。</p>';dialog.querySelector('.fishing-actions').before(controls);
let playerId='',location='house',phase='idle',phaseAt=0,busy=false,timer=0,interval=0,castId='',sound=true,returnFocus=null;
let context=null,positionDirty=false,positionSaving=false,lastPositionSave=0;
const blocked=()=>busy||['plant','blessing'].includes(phase)||dialogue.locked||!dialog.open||!$('fishingExchange').hidden||!!document.querySelector('.kusa-action-dialog[open]');
scene.isBlocked=blocked;
scene.onMove=(p,next)=>{positionDirty=true;context=next;dialogue.hideNotice();if(!castId&&!['casting','waiting','bite','reeling','reward'].includes(phase))location=p.map==='house'?'house':next==='river'||next==='sea'?next:'map';soundscape.update({...p});updateControls();};
scene.onStep=surface=>soundscape.step(surface);
scene.onCoffeeSip=()=>soundscape.sip();
scene.onCoffeeEnd=()=>{soundscape.stopSip();setPhase('idle');status('あたたかいコーヒーで、ひと休みしました。');};
async function persistPosition(){if(!positionDirty||!playerId||busy||positionSaving)return;positionSaving=true;const id=playerId,nav=scene.snapshot();positionDirty=false;try{const r=await fishingTransaction(save,id,(p,a)=>{a.fishing.navigation=nav;});if(!r?.ok)positionDirty=true;}catch{positionDirty=true;}finally{positionSaving=false;lastPositionSave=Date.now();}}
const media=new Set();
const rewardSoundTimers=new Set();
function clearRewardEffects(){for(const timeout of rewardSoundTimers)clearTimeout(timeout);rewardSoundTimers.clear();dialog.querySelectorAll('.fishing-token').forEach(node=>node.remove());}
const audioFiles={cast:'cast.ogg',splash:'splash.ogg',bite:'bite-soft-v2.ogg',catch:'catch.ogg',reward:'reward.ogg',confirm:'reward.ogg',message:'bite-soft-v2.ogg',crunch:'plant-crack-v4.mp3',rainbow:'plant-rainbow.ogg',heart:'plant-heart.ogg',crystal:'crystal-blessing.ogg'};
function play(name,rate=1){
  if(!sound||document.hidden||!dialog.open||media.size>=8)return;
  const a=new Audio(new URL(`assets/fishing/audio/${audioFiles[name]}`,document.baseURI).href);a.volume=name==='crystal'?.22:name==='heart'?.13:name==='rainbow'?.23:name==='crunch'?.48:name==='message'?.12:name==='confirm'?.18:name==='bite'?.22:name==='reward'?.24:.3;a.playbackRate=rate;if(['crunch','rainbow','heart'].includes(name))a.dataset.plant='true';media.add(a);const clear=()=>media.delete(a);a.onended=clear;a.onerror=clear;a.play().catch(clear);
}
function stopPlantAudio(){for(const a of media)if(a.dataset.plant){a.pause();media.delete(a);}}
function stopAudio(){for(const a of media)a.pause();media.clear();soundscape.stop();}
function ambience(){
  if(sound&&dialog.open&&!document.hidden)soundscape.start(scene.snapshot());
}
function setPhase(value){phase=value;phaseAt=performance.now();scene.set({phase,phaseAt});updateControls();}
function status(text,options){dialogue.say(text,options);}
function current(){save.reload();return {p:save.getPlayer(),a:save.getAccount()};}
function refresh(){
  if(!dialog.open)return;
  const {p,a}=current(),id=save.selectedPlayerId;
  if(id!==playerId){dialogue.reset();plantEffect.stop();crystalEffect.stop();crystalResult=null;scene.endCoffee(false);clearTimeout(timer);clearRewardEffects();castId='';playerId=id;location='house';phase='idle';phaseAt=performance.now();context=null;held.clear();scene.input(null);stopAudio();scene.restore(a.fishing.navigation);positionDirty=false;
    $('fishingResult').textContent='水の音を聞きながら、のんびりどうぞ。';$('fishingExchangeStatus').textContent='';$('fishingCard').value='';delete $('fishingCard').dataset.signature;$('fishingCardCount').value='1';for(const direction of ['buy','sell'])$(`fishingQuantity-${direction}`).value='1';$('fishingExchange').hidden=true;$('fishingExchangeOpen').setAttribute('aria-expanded','false');
  }
  $('fishingPlayer').textContent=p?`${p.name} の釣り時間`:'育成・カード管理でデータを作成してください';
  const values={grass:p?.grass,balls:globalThis.KusaPlayerStore?.getBallBalances?.(id).total??p?.balls,chips:a.chips,bait:a.fishing.bait,capsules:capsuleTotal(a)};
  for(const [k,v] of Object.entries(values))$(`fishing-${k}`).textContent=fmt(v);
  $('fishingPeriod').textContent=periods[fishingPeriod()];$('fishingRecords').textContent=`釣り上げ ${fmt(a.fishing.catches)}回 ／ カード使用 ${fmt(a.fishing.cardsUsed)}枚`;
  scene.set({location,period:fishingPeriod(),character:a.fishing.character,phase,phaseAt});
  document.querySelectorAll('[data-fishing-character]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.fishingCharacter===a.fishing.character));b.disabled=busy||phase==='resting'||location!=='house'||!!a.fishing.pending;});
  const select=$('fishingCard'),previous=select.value,cards=globalThis.KusaGachaInventory?.listUsableCards()||[];
  const signature=JSON.stringify(cards.map(c=>[c.id,c.usable,c.title]));
  if(select.dataset.signature!==signature){select.dataset.signature=signature;select.replaceChildren(new Option('カードを使わない',''));for(const c of cards)select.append(new Option(`[${c.rarity}] ${c.title}（ダブり ${globalThis.KusaCardCounts.format(c.usable)}枚）`,c.id));select.value=cards.some(c=>c.id===previous)?previous:'';}
  if(a.fishing.pending&&castId!==a.fishing.pending.id){castId=a.fishing.pending.id;location=a.fishing.pending.location;if(scene.p.map!=='outdoor'||context!==location)scene.resume(location);resumePending(a.fishing.pending);}
  const remaining=crystalBlessingRemaining(a),badge=$('fishingCrystalStatus');badge.hidden=remaining<=0;const seconds=Math.ceil(remaining/1000);badge.textContent=`✧ 結晶の加護 発動中 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} ｜ 通常釣りで35%の確率でカプセル1〜3個`;
  updateExchange();updateControls();ambience();
}
function updateControls(){
  const locked=blocked()||['casting','waiting','bite','reeling','reward','resting','plant','blessing'].includes(phase);scene.state.locked=locked;scene.state.location=location;
  windowPlant.hidden=scene.p.map!=='house'||phase!=='idle'||!playerId||dialogue.locked;windowPlant.disabled=locked;
  if(locked)scene.input(null);for(const b of controls.querySelectorAll('[data-walk]'))b.disabled=locked||!playerId;
  $('fishingMapLinks').hidden=true;$('fishingBack').hidden=true;
  $('fishingAction').hidden=false;$('fishingAction').disabled=busy||!playerId||(!dialogue.locked&&(['casting','waiting','reeling','reward'].includes(phase)||(!context&&!['bite','plant','blessing'].includes(phase))));
  $('fishingAction').textContent=dialogue.choiceOpen?'選択を決定':dialogue.waiting?'次へ':['plant','blessing'].includes(phase)?'演出をスキップ':phase==='resting'?'立ち上がる':phase==='bite'?'！ 釣る':phase==='casting'?'投げています…':phase==='waiting'?'水面を眺めています…':phase==='reeling'?'釣り上げています…':context==='plant'?'窓辺の草を調べる':context==='coffee'?'机と椅子を調べる':context==='exit'?'外へ出る':context==='home'?'家に帰る':context==='river'?'川へ投げる（餌1個）':context==='sea'?'海へ投げる（餌1個）':'歩いて水辺や出口へ';
  $('fishingExchangeOpen').disabled=['resting','plant','blessing'].includes(phase)||dialogue.locked;$('fishingCapsules').disabled=['resting','plant','blessing'].includes(phase)||dialogue.locked;
  for(const b of dialog.querySelectorAll('[data-fishing-character]'))b.disabled=busy||dialogue.locked||['resting','plant','blessing'].includes(phase)||location!=='house'||!!castId;
  $('fishingCard').disabled=busy||dialogue.locked||['resting','plant','blessing'].includes(phase)||!!castId;$('fishingCardCount').disabled=busy||dialogue.locked||['resting','plant','blessing'].includes(phase)||!!castId||!$('fishingCard').value;
  const selectedCard=$('fishingCard').value?globalThis.KusaGachaInventory?.getCard($('fishingCard').value):null;
  const cardCount=selectedCard?Number($('fishingCardCount').value):0;
  const skill=$('fishingCrystalUse');skill.hidden=!isCrystalCard(selectedCard);skill.disabled=locked||!!castId||!playerId;
  const isCrystal=isCrystalCard(selectedCard);
  $('fishingCardNote').textContent=castId?'釣果を受け取るまでカードの選択は固定です。':selectedCard?`${fishingCardEffectDescription(selectedCard,cardCount,save.getAccount())}。${isCrystal?'「結晶の加護を使う」で即時に報酬を受け取り、カードを消費します。効果中の再使用は残り時間に加算します。':'カードは釣果を受け取るときに消費します。'}`:'カードを使うと、レアリティ別チップ保証・追加報酬・既存ルールのカプセルがつきます。カードは釣果受取時に消費します。';
  for(const b of dialog.querySelectorAll('[data-fishing-place]'))b.disabled=busy;
}
function updateExchange(){
  const {p,a}=current();
  for(const direction of ['buy','sell']){
    const n=KusaAmounts.parse($(`fishingQuantity-${direction}`).value),buy=direction==='buy';
    const valid=KusaAmounts.valid(n)&&KusaAmounts.cmp(n,0)>0;
    const grass=valid?KusaAmounts.add(p?.grass||0,KusaAmounts.mul(n,buy?-10:5)):-1,bait=valid?KusaAmounts.add(a.fishing.bait,KusaAmounts.mul(n,buy?1:-1)):-1;
    const ok=valid&&KusaAmounts.valid(grass)&&KusaAmounts.valid(bait);
    $(`fishingPreview-${direction}`).textContent=ok?`交換後：草 ${fmt(grass)} ／ 餌 ${fmt(bait)}`:valid?'所持数が足りません。':'餌の個数を整数で入力してください。';
    dialog.querySelector(`[data-fishing-exchange="${direction}"]`).disabled=busy||!playerId||!ok;
  }
}
async function run(action){if(busy||dialogue.locked||phase==='resting')return null;busy=true;updateControls();updateExchange();try{const r=await action();if(!r?.ok)status(r?.message||'保存できませんでした。');return r;}catch(e){status(e.message||'保存できませんでした。');return null;}finally{busy=false;refresh();}}
function takeCoffee(){if(blocked()||phase!=='idle'||castId||!playerId||context!=='coffee')return;if(!scene.beginCoffee()){status('一服の準備中です。少し待ってから、もう一度どうぞ。');return;}held.clear();setPhase('resting');status('椅子に座って、あたたかいコーヒーをひと口。');}
function offerCoffee(){if(blocked()||phase!=='idle'||context!=='coffee'||!playerId)return;held.clear();scene.input(null);dialogue.offerCoffee(takeCoffee);}
function offerPlant(){if(blocked()||phase!=='idle'||scene.p.map!=='house'||castId||!playerId)return;held.clear();scene.input(null);dialogue.offer({title:'窓辺の草をどうしますか？',label:'キめる'},()=>{if(blocked()||phase!=='idle'||scene.p.map!=='house')return;setPhase('plant');dialogue.hideNotice();plantEffect.start();});}
windowPlant.onclick=offerPlant;
$('fishingCanvas').addEventListener('click',e=>{if(scene.p.map!=='house'||phase!=='idle'||blocked())return;const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)*384/rect.width,y=(e.clientY-rect.top)*256/rect.height;if(!coffeeHit(x,y)&&Math.hypot(x-scene.p.x,y-scene.p.y)>18)return;if(context==='coffee')offerCoffee();else if(coffeeHit(x,y))status('椅子の真右か真下まで歩いて、机と椅子を調べてみましょう。');});
function changeLocation(next){
  if(busy||dialogue.locked||castId||phase==='resting')return;clearTimeout(timer);stopAudio();location=next;if(next==='house'||next==='map')scene.enter(next==='house'?'house':'outdoor');else scene.resume(next);setPhase('idle');persistPosition();
  const pending=save.getAccount().fishing.pending;
  if(pending&&next===pending.location){castId=pending.id;resumePending(pending);}else castId='';
  status(next==='house'?'おかえりなさい。家の中を歩いて、ゆっくり支度をしましょう。':next==='map'?'方向ボタンで歩けます。右の川の桟橋、左下の海の桟橋へどうぞ。':next==='river'?'川のせせらぎ。餌をつけて、のんびり待ちましょう。':'波の音。海へ竿を投げてみましょう。');
  scene.set({location});ambience();refresh();
  $('fishingCanvas').animate([{opacity:.15},{opacity:1}],{duration:260});
}
function resumePending(pending){
  clearTimeout(timer);scene.set({location});
  if(Date.now()>=pending.readyAt){setPhase('bite');status('！ 何かがかかりました。「釣る」を押してみましょう。');}
  else{setPhase('waiting');status('ウキを眺めながら、ひとやすみ。');timer=setTimeout(()=>{if(!dialog.open||location!==pending.location)return;setPhase('bite');status('！ 何かがかかりました。「釣る」を押してみましょう。');play('bite');},Math.max(0,pending.readyAt-Date.now()));}
}
async function cast(){
  if(blocked()||!['river','sea'].includes(context))return;
  const {a}=current();if(a.fishing.pending){changeLocation(a.fishing.pending.location);return;}
  if(!a.fishing.bait){$('fishingExchange').hidden=false;$('fishingExchangeOpen').setAttribute('aria-expanded','true');updateControls();status('まず交換所で餌を用意しましょう。');$('fishingExchange').scrollIntoView({block:'nearest',behavior:'smooth'});return;}
  if(isCrystalCard(globalThis.KusaGachaInventory?.getCard($('fishingCard').value))){await useCrystal();return;}
  const cardId=$('fishingCard').value,count=cardId?Number($('fishingCardCount').value):0,id=playerId,place=location;
  if(count){const selectedCard=globalThis.KusaGachaInventory?.getCard(cardId);if(!await confirmAction({title:'釣りのおまじない',lines:[`ダブりカードを${count}枚使います。最後の1枚は残ります。`,fishingCardEffectDescription(selectedCard,count,a),'カードは釣果を受け取るとき、餌1個は投げるときに消費します。'],action:'このカードで釣る',expectedPlayerId:id}))return;}
  if(id!==playerId||place!==location||!dialog.open)return;
  scene.p.direction=place==='river'?'right':'down';await persistPosition();
  const r=await run(()=>startFishing(save,id,place,fishingPeriod(),cardId,count));
  if(!r?.ok||!dialog.open||id!==playerId)return;castId=r.pending.id;setPhase('casting');status('そっと、ウキを投げます。');play('cast');
  timer=setTimeout(()=>{if(!dialog.open)return;play('splash');resumePending(r.pending);},650);
}
async function reel(){
  const id=castId,owner=playerId,r=await run(()=>catchFishing(save,owner,id));if(!r?.ok||!dialog.open||owner!==playerId)return;
  castId='';clearTimeout(timer);setPhase('reeling');status('さっと竿を引きます…');play('catch');
  const units={grass:'個',balls:'球',chips:'枚'};
  const caught=Object.entries(r.rewards).map(([k,n])=>`${k==='balls'?'パチンコの玉':names[k]||'アイテム'}を${fmt(n)}${units[k]||'個'}`).join('、');
  const summary=`「${caught}釣り上げた！」`;$('fishingResult').textContent=summary;
  timer=setTimeout(()=>{if(!dialog.open)return;setPhase('reward');status(summary,{wait:true,sound:true});rewardParticles(r.rewards);timer=setTimeout(()=>{if(dialog.open)setPhase('idle');},1300);},500);
}
function rewardSummary(rewards){const units={grass:'個',balls:'球',chips:'枚'};return Object.entries(rewards).map(([k,n])=>`${names[k]||'アイテム'} ${fmt(n)}${units[k]||'個'}`).join('、')+'を獲得！';}
async function useCrystal(){
 if(blocked()||phase!=='idle'||castId||!playerId)return;
 const id=playerId,count=Number($('fishingCardCount').value),{a}=current(),card=globalThis.KusaGachaInventory?.getCard($('fishingCard').value);
 if(!isCrystalCard(card))return;
 if(!await confirmAction({title:'結晶の加護',lines:[`ダブりカードを${count}枚消費します。最後の1枚は残ります。`,fishingCardEffectDescription(card,count,a),`使用直後に報酬を獲得。加護は${count*10}分間、再使用は時間を加算します。餌は消費しません。`],action:'結晶の加護を発動',expectedPlayerId:id}))return;
 if(!dialog.open||id!==playerId)return;
 const r=await run(()=>activateCrystalBlessing(save,id,count));if(!r?.ok||!dialog.open||id!==playerId)return;
 crystalResult=r;$('fishingCard').value='';held.clear();scene.input(null);dialogue.hideNotice();setPhase('blessing');crystalEffect.start(r.mode);dialog.querySelector('.fishing-stage').scrollIntoView({block:'center',behavior:'instant'});
}
$('fishingCrystalUse').onclick=useCrystal;
function rewardParticles(rewards){
  clearRewardEffects();const owner=playerId;
  const host=$('fishingParticles');host.replaceChildren();let index=0;
  const from=$('fishingCanvas').getBoundingClientRect(),root=dialog.getBoundingClientRect(),origin=scene.screenPoint(scene.p.x,scene.p.y-12);
  for(const [k,n] of Object.entries(rewards)){
    const dest=$(`fishing-${icons[k]==='🎁'?'capsules':k}`)?.getBoundingClientRect();if(!dest)continue;
    const count=Math.min(n,Math.min(5,Math.max(0,25-index)));
    for(let j=0;j<count;j++,index++){
      const node=document.createElement('span');node.textContent=icons[k];node.className='fishing-token';dialog.append(node);
      const anim=node.animate([{transform:`translate(${from.left-root.left+from.width*origin.x/384}px,${from.top-root.top+from.height*origin.y/256}px) scale(1)`,opacity:1},{transform:`translate(${dest.left-root.left+dest.width/2}px,${dest.top-root.top}px) scale(.5)`,opacity:0}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?100:800,delay:index*75,easing:'ease-in-out'});
      anim.finished.then(()=>node.remove()).catch(()=>node.remove());if(index<5){const delay=index*85;const timeout=setTimeout(()=>{rewardSoundTimers.delete(timeout);if(dialog.open&&playerId===owner&&globalThis.KusaPlayerStore?.getSelectedId()===owner)play('reward',1+delay/3000);},delay);rewardSoundTimers.add(timeout);}
    }
    const target=$(`fishing-${icons[k]==='🎁'?'capsules':k}`);target?.animate([{color:'#467a5d'},{color:'#d59332'},{color:'#467a5d'}],{duration:1200});
  }
}
async function open(){
  if(dialog.open)return;returnFocus=document.activeElement;
  for(const id of ['pachiToggle','gachaToggle'])if($(id)?.getAttribute('aria-expanded')==='true')$(id).click();
  dialog.showModal();playerId='';refresh();
  const pending=save.getAccount().fishing.pending;if(pending){location=pending.location;castId=pending.id;resumePending(pending);}else setPhase('idle');
  if(!pending)status(scene.p.map==='house'?'方向ボタンで歩けます。家の下側の出口から外へどうぞ。':'おかえりなさい。水辺をのんびり歩きましょう。');
  refresh();scene.start();ambience();interval=setInterval(()=>{if(!document.hidden){refresh();if(Date.now()-lastPositionSave>2000)persistPosition();}},1000);$('fishingAction').focus();
  document.querySelectorAll('[data-fishing-open]').forEach(b=>b.setAttribute('aria-pressed','true'));
}
function closed(){dialogue.reset();plantEffect.stop();crystalEffect.stop();crystalResult=null;scene.endCoffee(false);if(['resting','plant','blessing'].includes(phase))phase='idle';persistPosition();held.clear();clearTimeout(timer);clearRewardEffects();clearInterval(interval);scene.stop();stopAudio();document.querySelectorAll('[data-fishing-open]').forEach(b=>b.setAttribute('aria-pressed','false'));returnFocus?.focus();}
dialog.addEventListener('close',closed);$('fishingClose').onclick=()=>dialog.close();
$('fishingAction').onclick=()=>{scene.input(null);if(dialogue.locked)dialogue.activate();else if(phase==='plant')plantEffect.stop(true);else if(phase==='blessing')crystalEffect.stop(true);else if(phase==='resting')scene.endCoffee();else if(phase==='bite')reel();else if(context==='plant')offerPlant();else if(context==='coffee')offerCoffee();else if(context==='exit')changeLocation('map');else if(context==='home')changeLocation('house');else if(context==='river'||context==='sea')cast();};
dialog.addEventListener('cancel',e=>{if(dialogue.locked){e.preventDefault();if(dialogue.choiceOpen)dialogue.choose(1);else dialogue.advance();}});
$('fishingBack').onclick=()=>changeLocation('map');
dialog.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.fishingPlace)changeLocation(b.dataset.fishingPlace);
  if(b.dataset.fishingCharacter&&location==='house'){const id=playerId,value=b.dataset.fishingCharacter;await run(()=>fishingTransaction(save,id,(p,a)=>{a.fishing.character=value;}));}
  if(b.dataset.fishingQuick){const [dir,part]=b.dataset.fishingQuick.split(':'),{p,a}=current();const max=dir==='buy'?KusaAmounts.div(p?.grass||0,10):a.fishing.bait;$(`fishingQuantity-${dir}`).value=part==='half'?KusaAmounts.div(max,2):max;updateExchange();}
  if(b.dataset.fishingExchange){const dir=b.dataset.fishingExchange,n=KusaAmounts.parse($(`fishingQuantity-${dir}`).value),id=playerId;
    if(!await confirmAction({title:'餌の交換',lines:[dir==='buy'?`${fmt(KusaAmounts.mul(n,10))}草を餌${fmt(n)}個に交換します。`:`餌${fmt(n)}個を${fmt(KusaAmounts.mul(n,5))}草に戻します。`,'購入は10草、返却は5草です。'],action:'交換する',expectedPlayerId:id}))return;
    const r=await run(()=>exchangeBait(save,id,dir,n));if(globalThis.KusaPlayerStore?.getSelectedId()===id)$('fishingExchangeStatus').textContent=r?.message||'交換できませんでした。';
  }
});
for(const dir of ['buy','sell'])$(`fishingQuantity-${dir}`).oninput=updateExchange;
$('fishingExchangeOpen').onclick=()=>{const box=$('fishingExchange');box.hidden=!box.hidden;$('fishingExchangeOpen').setAttribute('aria-expanded',String(!box.hidden));updateControls();if(!box.hidden)box.scrollIntoView({block:'nearest',behavior:'smooth'});};
$('fishingExchangeClose').onclick=()=>{$('fishingExchange').hidden=true;$('fishingExchangeOpen').setAttribute('aria-expanded','false');updateControls();$('fishingExchangeOpen').focus();};
$('fishingSound').onclick=()=>{sound=!sound;$('fishingSound').textContent=`音 ${sound?'ON':'OFF'}`;$('fishingSound').setAttribute('aria-pressed',String(sound));if(!sound)stopAudio();else ambience();};
$('fishingCard').onchange=()=>{updateControls();refresh();};$('fishingCardCount').onchange=()=>{updateControls();refresh();};
$('fishingCapsules').onclick=()=>{dialog.close();requestAnimationFrame(()=>$('capsuleInventoryBadge')?.click());};
document.addEventListener('visibilitychange',()=>{if(document.hidden){dialogue.reset();plantEffect.stop();crystalEffect.stop();crystalResult=null;if(['plant','blessing'].includes(phase))setPhase('idle');scene.endCoffee();persistPosition();held.clear();scene.stop();stopAudio();}else if(dialog.open){refresh();scene.start();const p=save.getAccount().fishing.pending;if(p&&p.location===location)resumePending(p);ambience();}});
for(const event of ['kusa-player-changed','kusa-medal-save-changed','kusa-gacha-inventory-changed','kusa-theme-changed'])window.addEventListener(event,()=>{if(!busy)refresh();});
window.addEventListener('storage',()=>{if(dialog.open)refresh();});
const walkKeys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};const held=new Set();
document.addEventListener('keydown',e=>{if(!dialog.open)return;if(dialogue.key(e))return;if(['plant','blessing'].includes(phase)&&['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat){if(phase==='blessing')crystalEffect.stop(true);else plantEffect.stop(true);}return;}if(blocked()||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(walkKeys[e.code]){e.preventDefault();held.add(e.code);scene.input(walkKeys[e.code]);}else if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();if(e.target===windowPlant)offerPlant();else $('fishingAction').click();}});
document.addEventListener('keyup',e=>{if(!walkKeys[e.code])return;held.delete(e.code);scene.input(held.size?walkKeys[[...held].at(-1)]:null);});
for(const b of controls.querySelectorAll('[data-walk]')){
  b.onpointerdown=e=>{e.preventDefault();if(b.disabled||blocked())return;b.setPointerCapture(e.pointerId);scene.input(b.dataset.walk);};
  b.onpointermove=e=>{if(!b.hasPointerCapture(e.pointerId))return;const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)scene.input(null);};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>scene.input(null));
}
window.addEventListener('blur',()=>{held.clear();scene.input(null);persistPosition();});
const hub=document.querySelector('.kusa-games-icons');if(hub){const b=document.createElement('button');b.type='button';b.dataset.fishingOpen='';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-pressed','false');b.innerHTML='<img src="assets/fishing/icon.png" width="56" height="56" alt=""><strong>草釣り</strong><small>水辺でのんびり、宝もの探し</small>';hub.append(b);}
const switches=document.querySelector('.screen-game-switches');if(switches){const b=document.createElement('button');b.type='button';b.className='screen-button';b.dataset.fishingOpen='';b.textContent='草釣り';switches.append(b);}
document.addEventListener('click',e=>{if(e.target.closest('[data-fishing-open]'))open();});
globalThis.KusaFishing=Object.freeze({open,close:()=>dialog.close(),diagnostics:()=>({playerId,location,phase,busy,castId,position:scene.snapshot(),view:scene.diagnostics(),audio:soundscape.diagnostics(),dialogue:dialogue.diagnostics(),plant:plantEffect.diagnostics(),crystal:crystalEffect.diagnostics(),crystalRemaining:crystalBlessingRemaining(save.getAccount()),bobberScreen:scene.bobberScreen,context,open:dialog.open,particles:dialog.querySelectorAll('.fishing-token').length,activeSounds:media.size})});
