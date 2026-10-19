/* Three illustrations belong to one collectible: processing never creates another card ID. */
(() => {
  'use strict';
  const id = 'glass-girl-omega', base = 'assets/gacha-cards/glass-girl-omega/';
  const variants = Object.freeze({
    normal: {name:'ガラスの少女',label:'通常',poster:'assets/glass-girl/live2d-upgrade-v3/glass-girl-still.png',video:'assets/glass-girl/live2d-upgrade-v3/glass-girl-deluxe.mp4',width:960,height:1462,text:'硝子の向こうから、少女がそっと手を差し出す。'},
    processed: {name:'【零の誓い】名前の無い少女',label:'加工',poster:'assets/glass-girl/live2d-upgrade-v3/nameless-girl-still.png',video:'assets/glass-girl/live2d-upgrade-v3/nameless-girl-deluxe.mp4',width:960,height:1446,text:'忘れ去られた少女は、結晶の力で選別に抗う'},
    awakened: {name:'【原初の天誓】Eve〈イヴ〉',label:'覚醒',poster:base+'eve-still-v5.png',video:base+'eve-loop-v5.mp4',width:800,height:1200,text:'神が生み出した最初の人間。人類を最後まで守る事を誓い、最初に神を殺した存在。'}
  });
  let activeId='', activeMode='', stage=null, film=null, poster=null, status=null, mediaGeneration=0, manualPlay=false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function mode(cardId, account = {}) {
    if (cardId !== id) return '';
    const processed = !!account.refinements?.[id]?.length, awakened = processed && !!account.awakenedCards?.[id];
    const selected = account.cardDisplayModes?.[id];
    if (selected === 'normal') return 'normal';
    if (selected === 'processed' && processed) return 'processed';
    if (selected === 'awakened' && awakened) return 'awakened';
    return awakened ? 'awakened' : processed ? 'processed' : 'normal';
  }
  function stop() { if (film) film.pause(); }
  function visible() {
    const modal=document.getElementById('gachaDetailModal');
    return activeId===id && modal && !modal.hidden && !document.hidden && (!reduced.matches||manualPlay);
  }
  function sync() {
    if (!film) return;
    if (visible()) {
      const generation=mediaGeneration;
      film.hidden=false;
      film.play().then(()=>{if(generation===mediaGeneration&&!visible())film.pause();}).catch(error=>{
        if(generation!==mediaGeneration||!visible()||error.name==='AbortError')return;
        film.hidden=true;status.hidden=false;status.textContent='アニメーションを再生';
      });
    } else stop();
    if(reduced.matches&&!manualPlay){film.hidden=true;status.hidden=false;status.textContent='アニメーションを再生';}
  }
  function ensureStage(panel) {
    if(stage)return;
    stage=document.createElement('figure');stage.className='animated-card-stage';
    poster=document.createElement('img');poster.className='animated-card-poster';poster.decoding='async';
    film=document.createElement('video');film.className='animated-card-video';film.muted=film.defaultMuted=true;film.loop=true;film.playsInline=true;film.preload='none';
    film.setAttribute('aria-hidden','true');film.setAttribute('playsinline','');
    const frame=document.createElement('img');frame.className='animated-card-frame';frame.src=base+'portrait-frame-v2.png';frame.alt='';frame.setAttribute('aria-hidden','true');
    status=document.createElement('button');status.type='button';status.className='animated-card-replay';status.hidden=true;
    status.addEventListener('click',()=>{
      if(film.error)film.load();
      const generation=mediaGeneration;manualPlay=true;
      film.hidden=false;status.hidden=true;film.play().catch(()=>{if(generation===mediaGeneration){film.hidden=true;status.hidden=false;}});
    });
    film.addEventListener('loadeddata',()=>{if(visible())film.hidden=false;});
    film.addEventListener('error',()=>{if(!film.error||activeId!==id)return;film.hidden=true;status.hidden=false;status.textContent='再読み込み';});
    stage.append(poster,film,frame,status);panel.prepend(stage);
  }
  function clear(panel) {
    mediaGeneration++;manualPlay=false;activeId='';activeMode='';stop();
    if(stage)stage.hidden=true;
    panel.classList.remove('has-animated-card');delete panel.dataset.animatedVariant;
    if(film){film.removeAttribute('src');film.load();}
  }
  function paint(node,cardId,account={}) {
    const detail=node.matches('#gachaDetailModal .detail-panel');
    if(cardId!==id){if(detail)clear(node);return;}
    const selected=mode(id,account),variant=variants[selected];
    if(!detail){
      if(node.classList.contains('is-locked')||node.disabled)return;
      node.classList.add('has-animated-thumbnail');node.dataset.animatedVariant=selected;
      const icon=node.querySelector('.gacha-book-emoji');
      if(icon)icon.textContent='❄️';
      const name=node.querySelector('.gacha-book-name');if(name)name.textContent=variant.name;
      node.setAttribute('aria-label',variant.name+'、Ωレア、'+variant.label);
      return;
    }
    ensureStage(node);node.classList.add('has-animated-card');stage.hidden=false;node.dataset.animatedVariant=selected;
    document.getElementById('gachaDetailTitle').textContent=variant.name;
    document.getElementById('gachaDetailRarity').textContent='Ωレア';
    document.getElementById('gachaDetailKind').textContent=variant.label+' · アニメーションカード';
    document.getElementById('gachaDetailText').textContent=variant.text;
    if(activeId!==id||activeMode!==selected){
      mediaGeneration++;manualPlay=false;stop();activeId=id;activeMode=selected;
      stage.style.setProperty('--card-ratio',String(variant.width/variant.height));
      poster.src=variant.poster;poster.alt=variant.name;
      poster.width=variant.width;poster.height=variant.height;
      film.poster=variant.poster;film.src=variant.video;film.hidden=true;
      status.hidden=true;film.load();
    }
    sync();
  }
  function init() {
    const modal=document.getElementById('gachaDetailModal');if(!modal)return;
    new MutationObserver(()=>{if(modal.hidden)stop();else sync();}).observe(modal,{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('visibilitychange',sync);
    reduced.addEventListener('change',()=>{manualPlay=false;sync();});
    window.addEventListener('kusa-player-changed',()=>{
      stop();if(!modal.hidden)document.getElementById('gachaDetailClose').click();
    });
    window.addEventListener('kusa-card-detail-close',stop);
    window.addEventListener('pagehide',stop);
    window.addEventListener('kusa-card-detail-open',e=>{if(e.detail.cardId!==id)clear(modal.querySelector('.detail-panel'));});
  }
  window.KusaAnimatedCards=Object.freeze({id,variants,has:cardId=>cardId===id,mode,paint,stop,snapshot:()=>({id:activeId,mode:activeMode,paused:film?.paused??true,src:film?.getAttribute('src')||'',time:film?.currentTime||0})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

