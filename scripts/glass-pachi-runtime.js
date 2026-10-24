/* Independent machine. No network calls; ranking bookkeeping requires explicit optional consent. */
(function(root){
  'use strict';
  const config=Object.freeze({initialBalls:5000,maxBalls:16,maxHolds:4,shotInterval:.185,
    normalOdds:43.3,highOdds:21.65,jackpotOdds:3000,modeTransitionSeconds:2.5,modeRevealSeconds:25/24,
    sideAward:1,startAward:1,premiumAward:500,premiumOdds:500,jackpotAward:1000,superJackpotAward:1500,spinSeconds:2.4,jackpotSpinSeconds:4.8,afterSeconds:.35,jackpotRevealSeconds:1.35,transitionSeconds:7.2,jackpotRoundSeconds:120,jackpotPayoutSettleSeconds:1,jackpotContinueChance:1/3,superJackpotContinueChance:.5,jackpotEndSeconds:1.5});
  const rates=Object.freeze([1,5,10]),validRate=value=>rates.includes(value)?value:1;
  const awardDistribution=Object.freeze({normal:Object.freeze([{award:100,cumulative:1/3},{award:150,cumulative:1}]),mode:Object.freeze([{award:150,cumulative:.2},{award:190,cumulative:.6},{award:250,cumulative:1}])});
  const sampleAward=(distribution,roll)=>distribution.find(item=>roll<item.cumulative)?.award||distribution[distribution.length-1].award;
  // Shared JST setting selection; cabinet-specific ordinary-play probability tiers.
  const settings=Object.freeze([null,...[[43.3,21.65],[40.2,20.1],[38.2,19.1],[35.4,17.7],[32.5,16.25],[27.1,13.55]].map(([normalOdds,highOdds])=>Object.freeze({normalOdds,highOdds}))]);
  // Separate base probabilities; the selected jackpot tier is mutually exclusive.
  const normalJackpotOddsBySetting=Object.freeze([650,560,480,400,330,270]);
  const superJackpotOddsBySetting=Object.freeze([1000,900,800,700,600,500]);
  const modeTriggerOdds=Object.freeze({draws:600,restoration:5,lifeReturn:1});
  const jackpotOddsBySetting=Object.freeze(normalJackpotOddsBySetting.map((d,i)=>1/(1/d+1/superJackpotOddsBySetting[i])));
  const superJackpotShareForSetting=setting=>{const i=Math.max(0,Math.min(5,(Number(setting)||1)-1));return jackpotOddsBySetting[i]/superJackpotOddsBySetting[i];};
  const jackpotOddsForSetting=(setting,kind=null)=>jackpotOddsBySetting[Math.max(0,Math.min(5,(Number(setting)||1)-1))]/(kind==='restoration'?1.25:kind==='life-return'?1.5:1);
  function dailySetting(timestamp=Date.now(),playerId){
    if(root.KusaSharedPachiSetting?.settingForJstDay)return root.KusaSharedPachiSetting.settingForJstDay(timestamp,playerId);
    const day=new Date(timestamp+9*3600000).toISOString().slice(0,10);
    if(Number(day.slice(-2))%10===6)return 6;
    if(day==='2026-10-01')return 3;
    let hash=0x811c9dc5;
    for(let i=0;i<day.length;i++)hash=Math.imul(hash^day.charCodeAt(i),0x01000193);
    hash=Math.imul(hash^(hash>>>16),0x21f0aaad);
    hash=Math.imul(hash^(hash>>>15),0x735a2d97);hash^=hash>>>15;
    return(hash>>>0)%6+1;
  }
  function oddsForSetting(setting,kind=null,legacyHigh=false){
    const tier=settings[setting]||settings[1];
    // Explicit independent tables keep repair and release valuable at every tier.
    return kind&&probabilityModes[kind]?probabilityModes[kind].settingOdds[settings[setting]?setting-1:0]:legacyHigh?tier.highOdds:tier.normalOdds;
  }
  const fresh=()=>({version:1,rate:1,rateRevision:1,payoutUnit:config.jackpotAward/50,lastRate:1,lastBaseAward:0,balls:config.initialBalls,spins:0,hits:0,streak:0,rushLeft:0,
    modeRevision:1,mode:null,pendingMode:null,modeSerial:0,modeTransitionRemaining:0,pending:0,jackpotTotal:0,jackpotChain:0,jackpotRevealRemaining:0,transitionRemaining:0,sinceHit:0,regularHits:0,jackpotHits:0,counterRevision:1,queue:[],current:null,lastFaces:['drop','flower','feather'],lastAward:0,lastSettleAt:0,clock:0,shots:0,starts:0,sides:0,outs:0,timeouts:0,attackerHits:0,
    lastPresentationIndex:0,lastJackpotId:0,returnTransitionRemaining:0,flowRevision:1,afterRemaining:0,afterDuration:config.afterSeconds,lastHit:false,lastJackpot:false,lastSpinId:0,acceptedStarts:0,droppedStarts:0,maxOccupancy:0,paidAwards:0,bestBalls:config.initialBalls,bestStreak:0,lastBonusDay:'',rankBuckets:{},rankQueue:[],rankDropped:0,
    // Glass Girl-only title progress. Kept in this machine save, never in the
    // shared Grass Pachinko profile or title catalog.
    glassTitleRevision:1,glassTitleSelected:'glass_white_world',glassTitleUnlocked:['glass_white_world'],glassRepairCompletions:0,glassReleaseCompletions:0,glassNormalHits:0,glassPremiumHits:0,glassNormalJackpots:0,glassSuperJackpots:0,glassReleaseSuperJackpots:0,glassSettingSpins:[0,0,0,0,0,0],glassPlayDays:[],glassStoryFlags:{repair:false,release:false,normal:false,super:false,special:false},glassStoryMiracles:0});
  // Runtime owns probability modes; media completion must never end a counted mode.
  // Public-facing presentation is unchanged; these are the canonical internal names.
  // Keep existing kind IDs so older saves and media paths remain compatible.
  const aftermathModes=Object.freeze({
    restoration:Object.freeze({name:'修復',duration:164.36}),
    'life-return':Object.freeze({name:'解放',duration:197.6})
  });
  const aftermathDurations=Object.freeze(Object.fromEntries(Object.entries(aftermathModes).map(([kind,mode])=>[kind,mode.duration])));
  const probabilityModes=Object.freeze({
    restoration:Object.freeze({name:'修復',spins:40,odds:settings[1].normalOdds/1.5,premiumOdds:250,settingOdds:Object.freeze(settings.slice(1).map(t=>t.normalOdds/1.5))}),
    'life-return':Object.freeze({name:'解放',spins:60,odds:settings[1].normalOdds/2,premiumOdds:150,settingOdds:Object.freeze(settings.slice(1).map(t=>t.normalOdds/2))})
  });
  // A separate progression for this cabinet. Names and requirements follow the
  // five-act story, while the IDs prevent any collision with Grass Pachinko.
  const glassTitleCatalog=Object.freeze([
    {id:'glass_white_world',name:'白い世界に立つ',rarity:'N',group:'encounter',rule:'ガラスの少女を初めて遊技',unlocked:s=>s.shots>=0},
    {id:'glass_blue_light',name:'青い光を見つけた者',rarity:'N',group:'encounter',rule:'初めて球を発射',unlocked:s=>s.shots>=1},
    {id:'glass_crystal_voice',name:'結晶の声を聞く者',rarity:'R',group:'encounter',rule:'累計10回入賞',unlocked:s=>s.starts+s.sides>=10},
    {id:'glass_beyond_crack',name:'ひびの向こう側',rarity:'R',group:'encounter',rule:'初めて通常当たり',unlocked:s=>s.glassNormalHits>=1},
    {id:'glass_following_back',name:'少女の背中を追う者',rarity:'SR',group:'encounter',rule:'累計5,000回転',unlocked:s=>s.spins>=5000},
    {id:'glass_two_worlds',name:'二つの世界を知る者',rarity:'SR',group:'choice',rule:'修復・解放を各3回完了',unlocked:s=>s.glassRepairCompletions>=3&&s.glassReleaseCompletions>=3},
    {id:'glass_repair_chronicle',name:'修復の記録者',rarity:'SSR',group:'choice',rule:'修復モードを30回完了',unlocked:s=>s.glassRepairCompletions>=30},
    {id:'glass_release_chronicle',name:'解放の記録者',rarity:'SSR',group:'choice',rule:'解放モードを30回完了',unlocked:s=>s.glassReleaseCompletions>=30},
    {id:'glass_crystal_guide',name:'結晶を導く者',rarity:'SSR',group:'choice',rule:'累計10,000回入賞',unlocked:s=>s.starts+s.sides>=10000},
    {id:'glass_resist_white',name:'白に抗う者',rarity:'SSR',group:'power',rule:'通常当たりを20回',unlocked:s=>s.glassNormalHits>=20},
    {id:'glass_wing_witness',name:'翼の目撃者',rarity:'SSR',group:'power',rule:'特別当たりを10回',unlocked:s=>s.glassPremiumHits>=10},
    {id:'glass_life_inheritor',name:'青い生命の継承者',rarity:'UR',group:'power',rule:'累計賞球1,000,000球',unlocked:s=>s.paidAwards>=1000000},
    {id:'glass_beyond_boundary',name:'砕けた境界を越えて',rarity:'UR',group:'power',rule:'通常大当たり50回・超大当たり20回・特別当たり20回',unlocked:s=>s.glassNormalJackpots>=50&&s.glassSuperJackpots>=20&&s.glassPremiumHits>=20},
    {id:'glass_dual_observer',name:'双極の観測者',rarity:'UR',group:'power',rule:'修復・解放を各75回完了',unlocked:s=>s.glassRepairCompletions>=75&&s.glassReleaseCompletions>=75},
    {id:'glass_worldline_walker',name:'世界線の踏破者',rarity:'UR',group:'power',rule:'累計50,000回転',unlocked:s=>s.spins>=50000},
    {id:'glass_wing_guide',name:'翼を導く者',rarity:'UR',group:'power',rule:'特別当たりを30回',unlocked:s=>s.glassPremiumHits>=30},
    {id:'glass_white_night_survivor',name:'白夜の生還者',rarity:'UR',group:'power',rule:'解放モード中に超大当たり10回',unlocked:s=>s.glassReleaseSuperJackpots>=10},
    {id:'glass_white_night_ender',name:'白夜を終わらせし者',rarity:'GODR',group:'selection',rule:'解放モード100回完了・超大当たり30回',unlocked:s=>s.glassReleaseCompletions>=100&&s.glassSuperJackpots>=30},
    {id:'glass_dual_inheritor',name:'双極の継承者',rarity:'GODR',group:'selection',rule:'修復・解放を各150回完了',unlocked:s=>s.glassRepairCompletions>=150&&s.glassReleaseCompletions>=150},
    {id:'glass_worldline_selector',name:'世界線の選別者',rarity:'GODR',group:'selection',rule:'設定1〜6を各20,000回転',unlocked:s=>s.glassSettingSpins.every(n=>n>=20000)},
    {id:'glass_crystal_miracle',name:'結晶の奇跡',rarity:'GODR',group:'selection',rule:'同一遊技中に修復・解放・大当たり・超大当たり・特別当たりを達成',unlocked:s=>s.glassStoryMiracles>=1},
    {id:'glass_blue_life_teacher',name:'青い生命の導師',rarity:'GODR',group:'selection',rule:'累計賞球10,000,000球',unlocked:s=>s.paidAwards>=10000000},
    {id:'glass_unbroken_vow',name:'砕けぬ誓い',rarity:'GODR',group:'selection',rule:'最大50連チャン',unlocked:s=>s.bestStreak>=50},
    {id:'glass_girl_truth',name:'ガラスの少女・真証',rarity:'Ω',group:'salvation',rule:'累計100,000回転・累計賞球20,000,000球',unlocked:s=>s.spins>=100000&&s.paidAwards>=20000000},
    {id:'glass_zero_savior',name:'零からの救済者',rarity:'Ω',group:'salvation',rule:'特別当たり50回・通常大当たり100回・超大当たり50回',unlocked:s=>s.glassPremiumHits>=50&&s.glassNormalJackpots>=100&&s.glassSuperJackpots>=50},
    {id:'glass_crystal_cycle',name:'結晶の輪廻',rarity:'Ω',group:'salvation',rule:'プレイ日数90日・累計賞球30,000,000球',unlocked:s=>s.glassPlayDays.length>=90&&s.paidAwards>=30000000},
    {id:'glass_white_world_end',name:'白い世界の終着点',rarity:'Ω',group:'salvation',rule:'設定1〜6を各50,000回転・修復/解放を各250回完了',unlocked:s=>s.glassSettingSpins.every(n=>n>=50000)&&s.glassRepairCompletions>=250&&s.glassReleaseCompletions>=250},
    {id:'glass_world_salvation',name:'全世界救済',rarity:'Ω',group:'salvation',rule:'累計賞球50,000,000球・最大100連チャン',unlocked:s=>s.paidAwards>=50000000&&s.bestStreak>=100},
    {id:'glass_final_proof',name:'少女の最後の証明',rarity:'Ω',group:'salvation',rule:'他のΩ称号をすべて獲得',unlocked:s=>glassTitleCatalog.filter(t=>t.rarity==='Ω'&&t.id!=='glass_final_proof').every(t=>s.glassTitleUnlocked.includes(t.id))}
  ]);
  const modeKind=kind=>Object.hasOwn(probabilityModes,kind);
  const makeAftermath=(kind,id,elapsed=0)=>({kind,name:aftermathModes[kind].name,elapsed,id});
  const symbols=Object.freeze(['drop','flower','feather','seven','lifeWings']);
  const reelStopTimes=(duration,jackpot=false)=>(jackpot?[.46,.73,1]:[.72,.86,1]).map(r=>duration*r);
  function symbolForResult({jackpot,award,baseAward,rate=1}){const base=baseAward??award/validRate(rate);return jackpot?'seven':base===config.premiumAward?'lifeWings':base>=250?'feather':base>=150?'flower':'drop';}
  function facesForResult(result,variant=0){
    if(result.hit)return Array(3).fill(symbolForResult(result));
    const offset=Math.min(2,Math.max(0,Math.floor(variant*3)));
    return [0,1,2].map(i=>symbols[(i+offset)%3]);
  }
  function create({physics,rng=Math.random,continuationRng=rng,presentationRng=Math.random,modeRng=Math.random,now=Date.now,storage=null,id='test',spinSeconds=config.spinSeconds,afterSeconds=config.afterSeconds,onEvent=null,canSave=()=>true}={}){
    if(!Number.isFinite(spinSeconds)||spinSeconds<=0||spinSeconds>30||!Number.isFinite(afterSeconds)||afterSeconds<0||afterSeconds>10)throw Error('Invalid trial duration');
    const timing=Object.freeze({spinSeconds,afterSeconds});
    const key='glassGirlMachineV1:'+encodeURIComponent(id);
    const state=fresh(),balls=[];state.jackpotSession=null;state.aftermath=null;state.modeTransitionFrom=null;
    let saveError='',dirty=false,saveClock=0,reelPulse=-1;
    const tunnelSeen=new WeakSet();
    function emit(type,details={}){try{onEvent?.({type,clock:state.clock,...details});}catch{/* Audio observers cannot affect play or storage. */}}
    if(storage)try{
      const data=JSON.parse(storage.getItem(key)||'null');
      if(data?.version===1){
        for(const k of Object.keys(state))if(typeof state[k]==='number'&&Number.isFinite(data[k])&&data[k]>=0)state[k]=Math.min(data[k],1e12);
        for(const k of ['balls','bestBalls'])state[k]=KusaAmounts.normalize(data[k],state[k]);
        state.rate=validRate(data.rate);state.lastRate=validRate(data.lastRate);state.rateRevision=1;
        state.payoutUnit=data.rateRevision===1&&Number.isFinite(data.payoutUnit)&&data.payoutUnit>0?Math.min(config.superJackpotAward*10/50,data.payoutUnit):config.jackpotAward/50;
        state.queue=Array.isArray(data.queue)?data.queue.slice(0,4).map(item=>({token:true,rate:validRate(item?.rate)})):[];
        if(Array.isArray(data.lastFaces)&&data.lastFaces.length===3)state.lastFaces=data.lastFaces.map((s,i)=>symbols.includes(s)?s:({'◇':'drop','◆':'flower','✦':'feather'}[s]||symbols[i]));
        if(data.current&&typeof data.current.hit==='boolean'&&Number.isFinite(data.current.remaining)&&Number.isFinite(data.current.award)){
          // Old 1.2-second in-flight results keep their original deadline; never redraw.
          const duration=Number.isFinite(data.current.duration)&&data.current.duration>0?Math.min(30,data.current.duration):1.2;
          state.current={id:data.current.id||state.spins,duration,scene:Number.isInteger(data.current.scene)?data.current.scene%3:state.spins%3,
            hit:data.current.hit,jackpot:!!data.current.jackpot,remaining:Math.max(0,Math.min(duration,data.current.remaining)),rate:validRate(data.current.rate),award:Math.max(0,Math.min(config.superJackpotAward*10,data.current.award)),faces:Array.isArray(data.current.faces)?data.current.faces.slice(0,3):['◇','◆','✦']};
          state.current.baseAward=state.current.award/state.current.rate;
          if(Number.isInteger(data.current.setting)&&settings[data.current.setting])state.current.setting=data.current.setting;
          if(Number.isFinite(data.current.odds)&&data.current.odds>=1)state.current.odds=data.current.odds;
          if(Number.isFinite(data.current.jackpotOdds)&&data.current.jackpotOdds>=1)state.current.jackpotOdds=data.current.jackpotOdds;
          if(Number.isFinite(data.current.superJackpotShare)&&data.current.superJackpotShare>=0&&data.current.superJackpotShare<=1)state.current.superJackpotShare=data.current.superJackpotShare;
          if(/^\d{4}-\d{2}-\d{2}$/.test(data.current.settingDay))state.current.settingDay=data.current.settingDay;
          if(modeKind(data.current.modeKind))state.current.modeKind=data.current.modeKind;
          if(data.current.legacyHigh)state.current.legacyHigh=true;
          if(state.current.jackpot)state.current.presentationIndex=[0,1].includes(data.current.presentationIndex)?data.current.presentationIndex:0;
        }
        if(state.current&&(state.current.faces.length!==3||!state.current.faces.every(s=>symbols.includes(s))))state.current.faces=facesForResult(state.current);
        state.queue=state.queue.slice(0,config.maxHolds-Number(!!state.current));
        state.lastHit=typeof data.lastHit==='boolean'?data.lastHit:state.lastAward>0;state.lastJackpot=!!data.lastJackpot;
        state.afterRemaining=Math.min(10,state.afterRemaining);
        state.afterDuration=Number.isFinite(data.afterDuration)&&data.afterDuration>0?Math.min(10,data.afterDuration):state.afterRemaining>0?1.2:timing.afterSeconds;
        state.flowRevision=1;state.transitionRemaining=state.pending?Math.min(config.transitionSeconds,state.transitionRemaining):0;
        state.returnTransitionRemaining=Math.min(config.transitionSeconds,state.returnTransitionRemaining);
        const j=data.jackpotSession;
        if(j&&Number.isInteger(j.round)&&j.round>0&&['reveal','transition','active','ending'].includes(j.phase)&&Number.isFinite(j.elapsed)&&Number.isFinite(j.paidShots)){
          state.jackpotSession={id:state.lastSpinId,rate:validRate(j.rate),round:j.round,roundAward:config.jackpotAward*validRate(j.rate),phase:j.phase,elapsed:Math.max(0,Math.min(config.jackpotRoundSeconds,j.elapsed)),paidShots:Math.max(0,Math.min(50,Math.floor(j.paidShots))),payoutCompleteRemaining:Number.isFinite(j.payoutCompleteRemaining)?Math.max(0,Math.min(config.jackpotPayoutSettleSeconds,j.payoutCompleteRemaining)):null,endingRemaining:Math.max(0,Math.min(config.jackpotEndSeconds,Number(j.endingRemaining)||0)),musicIndex:Number.isInteger(j.musicIndex)&&j.musicIndex>=0&&j.musicIndex<4?j.musicIndex:-1,musicTime:Math.max(0,Number(j.musicTime)||0)};
        }
        if(state.jackpotSession){state.jackpotSession.presentationIndex=j.kind==='super'?1:j.kind==='normal'?0:[0,1].includes(j.presentationIndex)?j.presentationIndex:0;state.jackpotSession.kind=state.jackpotSession.presentationIndex===1?'super':'normal';state.lastPresentationIndex=state.jackpotSession.presentationIndex;const pool=state.jackpotSession.kind==='super'?[1,3]:[0,2];if(!pool.includes(state.jackpotSession.musicIndex)){state.jackpotSession.musicIndex=-1;state.jackpotSession.musicTime=0;}}
        if(state.jackpotSession){const session=state.jackpotSession;session.roundAward=Number.isFinite(j.roundAward)&&j.roundAward>0?Math.min(config.superJackpotAward*session.rate,j.roundAward):(session.kind==='super'?config.superJackpotAward:config.jackpotAward)*session.rate;}
        if(state.jackpotSession){state.jackpotSession.id=Number.isSafeInteger(j.id)&&j.id>0?j.id:state.lastSpinId;state.lastJackpotId=state.jackpotSession.id;state.jackpotChain=state.jackpotSession.round;}
        state.jackpotRevealRemaining=state.jackpotSession?.phase==='reveal'?Math.min(config.jackpotRevealSeconds,state.jackpotRevealRemaining):0;
        const a=data.aftermath;
        if(a&&Object.hasOwn(aftermathDurations,a.kind)&&Number.isFinite(a.elapsed)&&a.elapsed>=0&&(data.modeRevision===1||a.elapsed<aftermathDurations[a.kind]))state.aftermath=makeAftermath(a.kind,Number.isFinite(a.id)?a.id:state.lastSpinId,a.elapsed);
        if(!state.aftermath&&state.returnTransitionRemaining>0)state.aftermath=makeAftermath(state.lastPresentationIndex===1?'life-return':'restoration',state.lastSpinId);
        if(state.jackpotSession)state.aftermath=null;
        if(data.modeRevision===1){
          const m=data.mode,p=data.pendingMode;
          if(m&&modeKind(m.kind)&&Number.isInteger(m.remaining)&&m.remaining>=0&&(m.remaining>0||state.current?.modeKind===m.kind)){
            state.mode={kind:m.kind,remaining:Math.min(probabilityModes[m.kind].spins,m.remaining),id:Number.isSafeInteger(m.id)?m.id:++state.modeSerial,source:m.source==='jackpot'?'jackpot':'start'};
            if(!state.jackpotSession)state.aftermath=makeAftermath(m.kind,state.mode.id,state.aftermath?.kind===m.kind?state.aftermath.elapsed:0);
          }
          if(p&&modeKind(p.kind)&&!state.mode&&!state.jackpotSession)state.pendingMode={kind:p.kind,source:'start'};
        }
        // Old ten-spin benefits and sealed results survive migration, but are never refilled.
        state.modeRevision=1;
        state.lastBonusDay=typeof data.lastBonusDay==='string'?data.lastBonusDay:'';
        state.rankConsentEpoch=typeof data.rankConsentEpoch==='string'?data.rankConsentEpoch:'';
        if(data.rankBuckets&&typeof data.rankBuckets==='object')for(const[day,rows]of Object.entries(data.rankBuckets))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&rows&&typeof rows==='object'){
          state.rankBuckets[day]={};for(const rate of rates){const b=rows[rate];if(b&&Number.isSafeInteger(b.shots)&&b.shots>=0&&Number.isSafeInteger(b.credit)&&b.credit>=0)state.rankBuckets[day][rate]={shots:b.shots,credit:b.credit};}
        }
        state.rankQueue=Array.isArray(data.rankQueue)?data.rankQueue.filter(e=>e&&/^[a-f0-9]{32}$/.test(e.eventId)&&/^[a-f0-9]{32}$/.test(e.playerId)&&typeof e.name==='string'&&e.name.length<=20&&rates.includes(e.wager)&&Number.isSafeInteger(e.shots)&&e.shots>=0&&e.shots<=10000&&Number.isSafeInteger(e.credit)&&e.credit>=0&&e.credit<=100000000&&/^\d{4}-\d{2}-\d{2}$/.test(e.day)).slice(0,500):[];
        for(const refund of Array.isArray(data.rankRefunds)?data.rankRefunds.slice(0,config.maxBalls):[])if(rates.includes(refund.rate)&&/^\d{4}-\d{2}-\d{2}$/.test(refund.day)){const rows=state.rankBuckets[refund.day]||(state.rankBuckets[refund.day]={}),b=rows[refund.rate]||(rows[refund.rate]={shots:0,credit:0});b.credit+=refund.rate;}
        const from=data.modeTransitionFrom;
        if(from&&modeKind(from.kind)&&Number.isFinite(from.elapsed)&&from.elapsed>=0&&Number.isSafeInteger(from.id))state.modeTransitionFrom=makeAftermath(from.kind,from.id,from.elapsed);
        state.modeTransitionRemaining=state.mode||state.modeTransitionFrom?Math.min(config.modeTransitionSeconds,state.modeTransitionRemaining):0;
        if(!state.modeTransitionRemaining)state.modeTransitionFrom=null;
        if(state.jackpotSession){state.mode=null;state.pendingMode=null;state.rushLeft=0;state.modeTransitionRemaining=0;state.modeTransitionFrom=null;}
        if(data.counterRevision!==1){state.regularHits=0;state.jackpotHits=0;state.sinceHit=0;state.counterRevision=1;}
        if(data.glassTitleRevision===1){
          state.glassTitleSelected=typeof data.glassTitleSelected==='string'?data.glassTitleSelected:state.glassTitleSelected;
          state.glassTitleUnlocked=Array.isArray(data.glassTitleUnlocked)?[...new Set(data.glassTitleUnlocked.filter(id=>glassTitleCatalog.some(t=>t.id===id)))].slice(0,glassTitleCatalog.length):state.glassTitleUnlocked;
          state.glassSettingSpins=Array.isArray(data.glassSettingSpins)?data.glassSettingSpins.slice(0,6).map(n=>Number.isFinite(n)&&n>=0?Math.min(1e12,Math.floor(n)):0):state.glassSettingSpins;
          while(state.glassSettingSpins.length<6)state.glassSettingSpins.push(0);
          state.glassPlayDays=Array.isArray(data.glassPlayDays)?[...new Set(data.glassPlayDays.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(-3660):state.glassPlayDays;
          if(data.glassStoryFlags&&typeof data.glassStoryFlags==='object')for(const k of Object.keys(state.glassStoryFlags))state.glassStoryFlags[k]=!!data.glassStoryFlags[k];
        }
      }
    }catch{saveError='保存データを読み込めませんでした。';}
    // "同一遊技中" achievements deliberately do not bridge a reload or a
    // machine re-selection. Their completed achievement count is persisted.
    state.glassStoryFlags={repair:false,release:false,normal:false,super:false,special:false};
    state.bestBalls=KusaAmounts.max(state.bestBalls,state.balls);state.bestStreak=Math.max(state.bestStreak,state.streak);
    function refreshGlassTitles(){
      const before=`${state.glassTitleSelected}|${Array.isArray(state.glassTitleUnlocked)?state.glassTitleUnlocked.join('|'):''}`;
      if(!Array.isArray(state.glassTitleUnlocked))state.glassTitleUnlocked=[];
      state.glassTitleUnlocked=[...new Set(state.glassTitleUnlocked.filter(id=>glassTitleCatalog.some(t=>t.id===id)))];
      for(const title of glassTitleCatalog)if(!state.glassTitleUnlocked.includes(title.id)&&title.unlocked(state))state.glassTitleUnlocked.push(title.id);
      if(!state.glassTitleUnlocked.includes(state.glassTitleSelected))state.glassTitleSelected='glass_white_world';
      return before!==`${state.glassTitleSelected}|${state.glassTitleUnlocked.join('|')}`;
    }
    function markStory(kind){
      if(!Object.hasOwn(state.glassStoryFlags,kind))return;
      state.glassStoryFlags[kind]=true;
      if(Object.values(state.glassStoryFlags).every(Boolean)){
        state.glassStoryMiracles++;
        state.glassStoryFlags={repair:false,release:false,normal:false,super:false,special:false};
      }
    }
    function trackTitleDay(){
      const d=rankingDay();
      if(!state.glassPlayDays.includes(d))state.glassPlayDays=[...state.glassPlayDays,d].slice(-3660);
    }
    refreshGlassTitles();
    physics.reset();
    const rankingDay=()=>new Date(now()+9*3600000).toISOString().slice(0,10);
    function syncRankingConsent(){
      const consent=root.KusaRankingParticipation?.get('glass',id)||{enabled:false,epoch:''};
      if(!consent.enabled||state.rankConsentEpoch!==consent.epoch){state.rankBuckets={};state.rankQueue=[];state.rankConsentEpoch=consent.epoch;}
      return consent.enabled;
    }
    function rank(rate,shots,credit){if(!syncRankingConsent())return;const day=rankingDay(),rows=state.rankBuckets[day]||(state.rankBuckets[day]={}),b=rows[rate]||(rows[rate]={shots:0,credit:0});b.shots+=shots;b.credit+=credit;}
    function claimDaily(){
      const day=rankingDay();if(state.lastBonusDay===day)return{ok:false,reason:'claimed'};
      if(!canChangeRate())return{ok:false,reason:'busy'};const amount=3000;
      const old={balls:state.balls,lastBonusDay:state.lastBonusDay,bestBalls:state.bestBalls};state.balls=KusaAmounts.add(state.balls,amount);state.lastBonusDay=day;
      if(!save()){Object.assign(state,old);return{ok:false,reason:'save'};}return{ok:true,amount};
    }
    function sealRanking(playerId,name){
      if(!syncRankingConsent())return false;
      if(!/^[a-f0-9]{32}$/.test(playerId)||typeof name!=='string'||!name.trim())return false;
      const oldBuckets=state.rankBuckets,oldQueue=state.rankQueue,next=[];
      for(const[day,rows]of Object.entries(oldBuckets))for(const rate of rates){let{shots=0,credit=0}=rows[rate]||{};while(shots||credit){if(next.length+oldQueue.length>=500)return false;const a=new Uint8Array(16);if(root.crypto?.getRandomValues)root.crypto.getRandomValues(a);else for(let i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*256);const takeShots=Math.min(10000,shots),takeCredit=Math.min(100000000,credit);next.push({eventId:Array.from(a,x=>x.toString(16).padStart(2,'0')).join(''),playerId,name:name.trim().slice(0,20),wager:rate,shots:takeShots,credit:takeCredit,day});shots-=takeShots;credit-=takeCredit;}}
      if(!next.length)return false;state.rankBuckets={};state.rankQueue=[...oldQueue,...next];if(save())return true;state.rankBuckets=oldBuckets;state.rankQueue=oldQueue;return false;
    }
    function acknowledgeRanking(eventId,expired=false){if(state.rankQueue[0]?.eventId!==eventId)return false;const event=state.rankQueue.shift();if(expired)state.rankDropped++;if(save())return true;state.rankQueue.unshift(event);if(expired)state.rankDropped--;return false;}
    function save(){
      if(root.KusaBackupSession?.isCurrent()===false)return false;
      if(!canSave())return false;
      state.bestBalls=KusaAmounts.max(state.bestBalls,state.balls);state.bestStreak=Math.max(state.bestStreak,state.streak);
      refreshGlassTitles();
      if(!storage)return true;
      try{
        // Unsettled physical balls are refunded on reload; no stale held/warp references.
        storage.setItem(key,JSON.stringify({...state,balls:KusaAmounts.add(state.balls,balls.reduce((sum,b)=>sum+validRate(b.rate),0)),rankRefunds:balls.map(b=>({rate:validRate(b.rate),day:b.rankDay||rankingDay()}))}));
        saveError='';dirty=false;return true;
      }catch{saveError='保存できません。発射を停止しました。';return false;}
    }
    function canChangeRate(){return !saveError&&!balls.length&&!state.current&&!state.queue.length&&!state.pending&&!state.jackpotSession&&!state.returnTransitionRemaining&&!state.modeTransitionRemaining&&state.afterRemaining<=1e-8;}
    function finishAftermath(id){if(state.mode||!state.aftermath||state.aftermath.id!==id||state.jackpotSession||state.returnTransitionRemaining||state.modeTransitionRemaining)return false;leaveMode();return save();}
    function leaveMode(){
      const from=state.aftermath;
      if(state.mode?.remaining<=0){
        if(state.mode.kind==='restoration'){state.glassRepairCompletions++;markStory('repair');}
        else {state.glassReleaseCompletions++;markStory('release');}
      }
      state.mode=null;state.aftermath=null;
      if(from){state.modeTransitionFrom={...from};state.modeSerial++;state.modeTransitionRemaining=config.modeTransitionSeconds;}
      dirty=true;
    }
    function enterMode(kind,source){
      state.mode={kind,remaining:probabilityModes[kind].spins,id:++state.modeSerial,source};
      state.modeTransitionRemaining=source==='start'?config.modeTransitionSeconds:0;
      state.modeTransitionFrom=null;
      state.pendingMode=null;state.rushLeft=0;state.aftermath=makeAftermath(kind,state.mode.id);dirty=true;
      emit('modeStart',{kind,remaining:state.mode.remaining,source});
    }
    function applyPendingMode(){if(state.pendingMode&&!state.current&&!state.mode&&!state.pending&&!state.jackpotSession&&!state.returnTransitionRemaining&&!state.modeTransitionRemaining&&state.afterRemaining<=1e-8)enterMode(state.pendingMode.kind,'start');}
    function reconcileJackpotPayout(j){
      if(!j||j.phase!=='active')return false;
      // Cross-check the persisted balance against the authored 50 payout beats.
      // This repairs legacy/stale saves where the visible payout reached its end
      // but a tiny or obsolete pending value kept the presentation alive.
      const unit=Number.isFinite(state.payoutUnit)&&state.payoutUnit>0?state.payoutUnit:j.roundAward/50;
      const expected=Math.max(0,j.roundAward-Math.min(50,j.paidShots)*unit);
      const corrected=Math.max(0,Math.min(state.pending,expected));
      if(Math.abs(corrected-state.pending)>1e-8){state.pending=corrected;dirty=true;}
      if(state.pending<1e-8)state.pending=0;
      return state.pending===0||j.paidShots>=50;
    }
    function eligiblePayout(){const j=state.jackpotSession;return state.transitionRemaining>0||j&&(j.phase!=='active'||Math.floor((j.elapsed+1e-7)/2.4)<=j.paidShots)?0:Math.min(state.pending,state.payoutUnit);}
    function setJackpotMusic(index,time){const j=state.jackpotSession;if(saveError||!j||!(j.kind==='super'?[1,3]:[0,2]).includes(index)||!Number.isFinite(time)||time<0)return false;j.musicIndex=index;j.musicTime=time;dirty=true;return save();}
    function setRate(rate){
      if(!rates.includes(rate)||!canChangeRate())return false;
      const previous=state.rate;state.rate=rate;dirty=true;
      if(!save()){state.rate=previous;return false;}return true;
    }
    function enqueue(rate=state.rate){
      const occupancy=state.queue.length+Number(!!state.current);dirty=true;
      if(occupancy>=config.maxHolds){state.droppedStarts++;emit('queueFull');return false;}
      state.queue.push({token:true,rate:validRate(rate)});state.acceptedStarts++;state.maxOccupancy=Math.max(state.maxOccupancy,occupancy+1);
      if(!state.mode&&!state.pendingMode&&!state.rushLeft&&!state.pending&&!state.jackpotSession&&!state.transitionRemaining&&!state.returnTransitionRemaining){
        // Separate RNG stream: accepted entry only, no failure counter or future-result reads.
        const draw=Math.floor(modeRng()*modeTriggerOdds.draws);
        if(draw>=0&&draw<modeTriggerOdds.restoration+modeTriggerOdds.lifeReturn)state.pendingMode={kind:draw<modeTriggerOdds.restoration?'restoration':'life-return',source:'start'};
      }
      // Persist the accepted token and its one-shot mode draw together, including on reload.
      if(save())emit('queue');return true;
    }
    function beginSpin(){
      const playingJackpot=state.jackpotSession?.phase==='active';
      if(state.current||state.pending&&!playingJackpot||state.jackpotSession&&!playingJackpot||state.returnTransitionRemaining||state.transitionRemaining||state.modeTransitionRemaining||state.afterRemaining>1e-8||!state.queue.length)return;
      const rate=validRate(state.queue.shift().rate);state.spins++;trackTitleDay();
      const activeMode=state.mode&&probabilityModes[state.mode.kind],high=!!activeMode||state.rushLeft>0;reelPulse=-1;
      const legacyHigh=!activeMode&&state.rushLeft>0;
      if(activeMode)state.mode.remaining--;else if(legacyHigh)state.rushLeft--;
      const setting=dailySetting(now(),id),odds=oddsForSetting(setting,activeMode?state.mode.kind:null,legacyHigh),premiumProbability=Math.min(1/odds,1/(activeMode?.premiumOdds||config.premiumOdds));
      const jackpotRoll=rng(),jackpot=!state.jackpotSession&&jackpotRoll<1/jackpotOddsForSetting(setting,activeMode?state.mode.kind:null),roll=rng();
      // One disjoint roll: premium is a subset of wins, never an extra winning draw.
      const premium=!jackpot&&roll<premiumProbability;
      const hit=jackpot||roll<1/odds;
      let award=0;
      if(hit){
        if(jackpot)award=config.jackpotAward;
        else if(premium)award=config.premiumAward;
        else award=sampleAward(high?awardDistribution.mode:awardDistribution.normal,rng());
      }
      // Consume the same cosmetic RNG draw as before; never redraw award or waiting holds.
      const variant=rng();
      const duration=jackpot?Math.max(timing.spinSeconds,config.jackpotSpinSeconds):timing.spinSeconds;
      state.current={id:state.spins,duration,scene:state.spins%3,hit,jackpot,rate,baseAward:award,award:award*rate,remaining:duration,faces:facesForResult({hit,jackpot,award},variant)};
      state.current.setting=setting;state.glassSettingSpins[setting-1]++;state.current.settingDay=new Date(now()+9*3600000).toISOString().slice(0,10);state.current.odds=odds;
      state.current.jackpotOdds=jackpotOddsForSetting(setting,activeMode?state.mode.kind:null);state.current.superJackpotShare=superJackpotShareForSetting(setting);
      if(activeMode)state.current.modeKind=state.mode.kind;
      if(legacyHigh)state.current.legacyHigh=true;
      // Seal the tier before the first frame; both tiers share the exact same lead-in.
      if(jackpot){state.current.presentationIndex=presentationRng()<state.current.superJackpotShare?1:0;if(state.current.presentationIndex===1){state.current.baseAward=config.superJackpotAward;state.current.award=config.superJackpotAward*rate;}}
      dirty=true;
      // Persist the sealed result before its first rendered frame, not on the next half-second tick.
      if(save())emit('spinStart');
    }
    function settle(ball,type,timeout=false){
      const index=balls.indexOf(ball);if(index<0)return false;
      balls.splice(index,1);
      const rate=validRate(ball.rate);
      if(type==='start'){state.starts++;state.balls=KusaAmounts.add(state.balls,config.startAward*rate);state.paidAwards+=config.startAward*rate;rank(rate,0,config.startAward*rate);enqueue(rate);}
      else if(type==='side'){state.sides++;state.balls=KusaAmounts.add(state.balls,config.sideAward*rate);state.paidAwards+=config.sideAward*rate;rank(rate,0,config.sideAward*rate);}
      else if(type==='attacker')state.attackerHits++;
      else {state.outs++;if(timeout)state.timeouts++;}
      emit(type==='start'?'start':type==='side'?'side':type==='attacker'?'attackerIn':'drain',{x:ball.x,award:type==='start'?config.startAward*rate:type==='side'?config.sideAward*rate:0});
      dirty=true;return true;
    }
    function fire(power){
      const cost=state.rate;
      const paid=eligiblePayout();
      if(saveError||balls.length>=config.maxBalls||KusaAmounts.cmp(KusaAmounts.add(state.balls,paid),cost)<0)return false;
      const factor=1+(rng()-.5)*.025;
      const priorRanking=JSON.stringify(state.rankBuckets);
      const priorRankingConsentEpoch=state.rankConsentEpoch;
      const p=physics.point(0);
      const ball={x:p.x,y:p.y,vx:0,vy:-physics.launchSpeed(power,0,factor),r:physics.ballRadius,
        power,rate:cost,rankDay:rankingDay(),launchFactor:factor,phase:'chute',age:0,launchDistance:0};
      state.balls=KusaAmounts.sub(state.balls,cost);state.shots++;balls.push(ball);
      state.pending-=paid;state.balls=KusaAmounts.add(state.balls,paid);state.paidAwards+=paid;if(paid&&state.jackpotSession)state.jackpotSession.paidShots++;
      rank(cost,1,paid);
      if(!save()){state.rankBuckets=JSON.parse(priorRanking);state.rankConsentEpoch=priorRankingConsentEpoch;balls.pop();state.balls=KusaAmounts.add(state.balls,cost-paid);state.pending+=paid;state.paidAwards-=paid;state.shots--;if(paid&&state.jackpotSession)state.jackpotSession.paidShots--;return false;}
      emit('launch');if(paid>0){emit('payout',{award:paid});if(!state.pending&&!state.jackpotSession)emit('jackpotFinish');}
      return true;
    }
    function step(dt){
      if(saveError||!Number.isFinite(dt)||dt<=0)return;
      state.clock+=dt;
      const transitionBefore=state.transitionRemaining,returnBefore=state.returnTransitionRemaining;
      if(state.jackpotSession?.phase==='reveal'){
        const before=state.jackpotRevealRemaining;state.jackpotRevealRemaining=Math.max(0,before-dt);
        if(state.jackpotRevealRemaining<1e-8){state.jackpotRevealRemaining=0;state.jackpotSession.phase='transition';state.transitionRemaining=config.transitionSeconds-Math.max(0,dt-before);}
        dirty=true;
      }
      const modeTransitionBefore=state.modeTransitionRemaining;
      if(state.modeTransitionRemaining>0){state.modeTransitionRemaining=Math.max(0,state.modeTransitionRemaining-dt);if(state.modeTransitionRemaining<1e-8)state.modeTransitionRemaining=0;dirty=true;}
      if(!state.modeTransitionRemaining)state.modeTransitionFrom=null;
      if(state.returnTransitionRemaining>0){state.returnTransitionRemaining=Math.max(0,state.returnTransitionRemaining-dt);if(state.returnTransitionRemaining<1e-8)state.returnTransitionRemaining=0;dirty=true;}
      if(transitionBefore>0){state.transitionRemaining=Math.max(0,state.transitionRemaining-dt);dirty=true;}
      if(state.aftermath&&!state.jackpotSession){const modeHidden=Math.max(0,modeTransitionBefore-(config.modeTransitionSeconds-config.modeRevealSeconds));state.aftermath.elapsed+=Math.max(0,dt-Math.min(dt,Math.max(returnBefore,modeHidden)));if(!state.mode&&state.aftermath.elapsed>=aftermathDurations[state.aftermath.kind])state.aftermath=null;dirty=true;}
      const j=state.jackpotSession;
      if(j){
        dirty=true;
        if(j.phase==='ending'){j.endingRemaining=Math.max(0,j.endingRemaining-dt);if(!j.endingRemaining){state.jackpotSession=null;enterMode(j.kind==='super'?'life-return':'restoration','jackpot');state.returnTransitionRemaining=config.transitionSeconds;save();}}
        else if(j.phase!=='reveal'&&!state.transitionRemaining){j.phase='active';j.elapsed=Math.min(config.jackpotRoundSeconds,j.elapsed+Math.max(0,dt-transitionBefore));
          // The award reaching zero is the authoritative end of a round. The old
          // implementation only watched the 120-second clock, so a restored or
          // throttled session could keep its character/music scene indefinitely.
          if(reconcileJackpotPayout(j)){
            if(j.payoutCompleteRemaining===null||!Number.isFinite(j.payoutCompleteRemaining)){j.payoutCompleteRemaining=config.jackpotPayoutSettleSeconds;emit('jackpotPayoutComplete',{round:j.round});}
            else j.payoutCompleteRemaining=Math.max(0,j.payoutCompleteRemaining-dt);
          }else j.payoutCompleteRemaining=null;
          if(reconcileJackpotPayout(j)&&j.payoutCompleteRemaining===0){
            if(continuationRng()<(j.kind==='super'?config.superJackpotContinueChance:config.jackpotContinueChance)){j.round++;state.jackpotChain=j.round;j.elapsed=0;j.paidShots=0;j.payoutCompleteRemaining=null;j.roundAward=(j.kind==='super'?config.superJackpotAward:config.jackpotAward)*j.rate;state.payoutUnit=j.roundAward/50;state.pending=j.roundAward;state.jackpotTotal+=j.roundAward;state.hits++;state.jackpotHits++;state.streak++;if(!save())return;emit('jackpotContinue',{round:j.round});}
            else{j.phase='ending';j.payoutCompleteRemaining=null;j.endingRemaining=config.jackpotEndSeconds;if(!save())return;emit('jackpotFinish');}
          }
        }
      }
      // Keep the original field through the entire entry transition. Only the
      // active prize scene may request its dedicated layout. On return, retain
      // that layout until the return film has also finished.
      const fieldSession=state.jackpotSession;
      const prizeField=!!fieldSession&&['active','ending'].includes(fieldSession.phase)&&!state.transitionRemaining;
      const retainingField=state.returnTransitionRemaining>0&&!!physics.state?.jackpot;
      physics.setJackpot(prizeField||retainingField,fieldSession?.kind||physics.state?.jackpotKind||'normal');
      const phases=new Map(balls.map(b=>[b,b.phase])),before=physics.state?{...physics.state}:null;
      const results=physics.advanceMany(balls,dt);
      for(const b of balls){const old=phases.get(b),result=results.get(b);
        if(old!==b.phase){if(b.phase==='warp')emit('warpIn',{x:b.x});if(old==='warp'&&b.phase==='field')emit('warpOut',{x:b.x});if(b.phase==='held')emit('holdIn',{x:b.x});if(old==='held'&&b.phase==='field')emit('holdOut',{x:b.x});}
        if(result?.impact>35){const peg=physics.pegs?.some(p=>Math.hypot(p.x-b.x,p.y-b.y)<16);emit(peg?'peg':'mechanism',{impact:result.impact,x:b.x});}
        if(b.phase==='field'&&b.y>=280&&b.y<=350&&b.x>=50+(b.y-280)*20/70&&b.x<=72+(b.y-280)*20/70&&!tunnelSeen.has(b)){tunnelSeen.add(b);emit('tunnel',{x:b.x});}
      }
      if(before){const p=physics.state;if(p.rotorHits>before.rotorHits)emit('rotor');if(p.cycles>before.cycles)emit('repairComplete');else if(p.repair>before.repair)emit('repair');if(before.wingProgress<=.001&&p.wingProgress>.001)emit('flowerOpen');if(before.wingProgress>.001&&p.wingProgress<=.001)emit('flowerClose');if(before.jackpot!==p.jackpot)emit(p.jackpot?'attackerOpen':'attackerClose');}
      for(const b of [...balls]){const result=results.get(b);if(result.type)settle(b,result.type,result.timeout);}
      const current=state.current;
      if(!current)state.afterRemaining=Math.max(0,state.afterRemaining-dt);
      if(current&&!state.transitionRemaining&&!state.returnTransitionRemaining&&!state.modeTransitionRemaining&&(!state.jackpotSession||state.jackpotSession.phase==='active')){
        const elapsedBefore=current.duration-current.remaining;
        current.remaining-=dt;
        const elapsedAfter=current.duration-current.remaining;
        reelStopTimes(current.duration,current.jackpot).forEach((at,column)=>{if(elapsedBefore<at-1e-8&&elapsedAfter>=at-1e-8)emit('reelStop',{column,jackpot:current.jackpot,x:150+column*70});});
        const pulse=Math.floor((current.duration-current.remaining)/.6);if(pulse!==reelPulse&&current.remaining>0){reelPulse=pulse;emit('spinLoop');}
        if(current.remaining<=1e-8){
          state.sinceHit++;
          state.lastFaces=current.faces;
          state.lastAward=current.award;state.lastRate=current.rate;state.lastBaseAward=current.baseAward;state.lastSettleAt=state.clock;
          state.lastHit=current.hit;state.lastJackpot=current.jackpot;state.lastSpinId=current.id;state.afterRemaining=state.afterDuration=current.hit&&!current.jackpot&&current.baseAward===config.premiumAward?6.4:timing.afterSeconds;
          if(current.hit){state.hits++;state.streak++;state.sinceHit=0;
            if(current.jackpot)state.jackpotHits++;else {state.regularHits++;if(current.baseAward===config.premiumAward){state.glassPremiumHits++;markStory('special');}else state.glassNormalHits++;}
            if(current.jackpot){state.pending+=current.award;state.jackpotTotal=current.award;state.payoutUnit=current.award/50;state.transitionRemaining=0;state.jackpotRevealRemaining=config.jackpotRevealSeconds;const presentationIndex=current.presentationIndex===1?1:0;state.jackpotSession={id:current.id,rate:current.rate,round:1,roundAward:current.award,phase:'reveal',elapsed:0,paidShots:0,payoutCompleteRemaining:null,endingRemaining:0,musicIndex:-1,musicTime:0,presentationIndex,kind:presentationIndex===1?'super':'normal'};}
            if(current.jackpot){if(state.jackpotSession.presentationIndex===1){state.glassSuperJackpots++;if(current.modeKind==='life-return')state.glassReleaseSuperJackpots++;markStory('super');}else{state.glassNormalJackpots++;markStory('normal');}state.lastJackpotId=current.id;state.jackpotChain=1;state.aftermath=null;state.mode=null;state.pendingMode=null;state.modeTransitionRemaining=0;state.modeTransitionFrom=null;state.rushLeft=0;state.lastPresentationIndex=state.jackpotSession.presentationIndex;}
            else {state.balls=KusaAmounts.add(state.balls,current.award);state.paidAwards+=current.award;rank(current.rate,0,current.award);}
          }else if(!state.rushLeft)state.streak=0;
          state.current=null;dirty=true;
          if(state.mode&&state.mode.remaining===0){const kind=state.mode.kind;leaveMode();emit('modeEnd',{kind});}
          applyPendingMode();
          // Result, credit and cleared current are committed in one storage value.
          // A failed write stops progression until save succeeds or the session reloads.
          if(!save())return;
          if(current.jackpot)emit('jackpotConfirm');
          if(!current.jackpot){emit(current.hit?(current.baseAward===config.premiumAward?'premium':'win'):'miss',{award:current.award});}
          if(!current.jackpot&&(current.modeKind||current.legacyHigh)&&!state.mode&&!state.rushLeft)emit('continuationEnd');
        }
      }
      applyPendingMode();beginSpin();saveClock+=dt;
      if(dirty&&saveClock>=.5){saveClock=0;save();}
    }
    function selectGlassTitle(id){
      if(!glassTitleCatalog.some(t=>t.id===id)||!state.glassTitleUnlocked.includes(id))return false;
      const previous=state.glassTitleSelected;state.glassTitleSelected=id;
      if(!save()){state.glassTitleSelected=previous;return false;}return true;
    }
    syncRankingConsent();
    return {state,balls,key,config,timing,fire,step,enqueue,settle,save,setRate,setJackpotMusic,finishAftermath,claimDaily,sealRanking,acknowledgeRanking,syncRankingConsent,selectGlassTitle,refreshGlassTitles,get titleCatalog(){return glassTitleCatalog;},get eligiblePayout(){return eligiblePayout();},
      get setting(){return dailySetting(now(),id);},
      get canChangeRate(){return canChangeRate();},
      get saveError(){return saveError;},get busy(){return !!(balls.length||state.current||state.queue.length||state.pending||state.jackpotSession||state.returnTransitionRemaining||state.modeTransitionRemaining||state.afterRemaining>1e-8);}};
  }
  const glassTitleSave=(playerId)=>{if(typeof playerId!=='string'||!playerId)return null;try{const saved=JSON.parse(root.localStorage?.getItem('glassGirlMachineV1:'+encodeURIComponent(playerId))||'null');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:null;}catch{return null;}};
  // A fresh runtime grants its introductory title when the cabinet is opened.
  // Reading the profile must not create that grant for an unplayed cabinet.
  const savedGlassTitles=state=>new Set(Array.isArray(state?.glassTitleUnlocked)?state.glassTitleUnlocked:[]);
  root.GlassPachiTitles=Object.freeze({
    listAcquired(playerId){const unlocked=savedGlassTitles(glassTitleSave(playerId));return glassTitleCatalog.filter(t=>unlocked.has(t.id)).map(t=>({id:t.id,name:t.name,rarity:t.rarity}));},
    summary(playerId){const state=glassTitleSave(playerId)||{};const unlocked=savedGlassTitles(state);return {count:glassTitleCatalog.filter(t=>unlocked.has(t.id)).length,total:glassTitleCatalog.length,spins:Number(state.spins)||0,paidAwards:Number(state.paidAwards)||0};}
  });
  const api={config,create,rates,settings,dailySetting,oddsForSetting,jackpotOddsBySetting,jackpotOddsForSetting,normalJackpotOddsBySetting,superJackpotOddsBySetting,superJackpotShareForSetting,modeTriggerOdds,awardDistribution,symbols,reelStopTimes,symbolForResult,facesForResult,aftermathDurations,aftermathModes,probabilityModes,glassTitleCatalog};root.GlassPachiRuntime=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
