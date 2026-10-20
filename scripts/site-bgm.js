/* Site music: the supplied Glass Girl score. */
(() => {
  'use strict';
  const button=document.getElementById('siteBgmToggle'),root=document.documentElement;
  const songUrl=new URL('../assets/themes/glass-cosmos/silent-snowfield.mp3',document.currentScript.src).href;
  const music=new Audio();music.loop=true;music.preload='none';
  let generation=0,on=false,currentTrack='',error='',previousTheme=root.dataset.siteTheme;
  const preferences=()=>window.KusaPlayerStore?.getThemePreferences?.()||{};
  function ownsGlassTheme(){try{const shared=JSON.parse(localStorage.getItem('kusaPlayerStoreV1')||'{}'),id=window.KusaPlayerStore?.getSelectedId?.()||shared.selectedPlayerId,medal=JSON.parse(localStorage.getItem('kusaMedalSaveV1')||'{}');return Boolean(id&&medal.accounts?.[id]?.ownedSkins?.includes('glass-cosmos'));}catch{return false;}}
  function resolveTrack(){const value=preferences().bgmTrack||'theme',requestsGlass=value==='silent-snowfield'||(value==='theme'&&root.dataset.siteTheme==='glass-cosmos');return requestsGlass&&ownsGlassTheme()?'silent-snowfield':'none';}
  const trackName=()=>resolveTrack()==='silent-snowfield'?'無音の雪原':'BGMなし';
  const gameOpen=()=>!!document.querySelector('#kusa-pachi-window[open],#pachiSelectionWindow[open]');
  const allowed=()=>on&&!document.hidden&&!gameOpen();
  function stopSound(){music.pause();}
  function paintButton(){button.textContent=on?'BGM：ON':'BGM：OFF';button.setAttribute('aria-pressed',String(on));button.title=error||(on?trackName()+(gameOpen()?'（パチンコ画面では一時停止）':''):'BGMを再生');}
  async function sync(){
    const request=++generation,track=resolveTrack();
    if(track!==currentTrack){stopSound();currentTrack=track;}
    music.volume=Math.max(0,Math.min(1,preferences().bgmVolume??.5));
    if(!allowed()){stopSound();paintButton();return;}
    try{
      if(track==='silent-snowfield'){
        if(music.src!==songUrl)music.src=songUrl;
        await music.play();if(request!==generation)return;if(!allowed())music.pause();
      }else music.pause();
      error='';
    }catch(reason){
      if(request!==generation||reason.name==='AbortError')return;
      error='BGMを再生するには、もう一度BGMボタンを押してください。';on=false;stopSound();
    }
    paintButton();
  }
  function play(){on=true;return sync();}
  function pause(){on=false;return sync();}
  button.addEventListener('click',()=>{if(on)pause();else play();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{generation++;stopSound();});
  window.addEventListener('pageshow',sync);
  for(const type of ['kusa-theme-changed','kusa-player-changed'])window.addEventListener(type,sync);
  window.addEventListener('storage',event=>{if(event.key==='kusaPlayerStoreV1'||event.key===null)sync();});
  new MutationObserver(()=>{
    const theme=root.dataset.siteTheme,changed=theme!==previousTheme;previousTheme=theme;
    // Applying the theme starts its score; a restored page still begins OFF.
    if(changed&&theme==='glass-cosmos'&&(preferences().bgmTrack||'theme')==='theme')on=true;
    sync();
  }).observe(root,{attributes:true,attributeFilter:['data-site-theme']});
  function observeGames(){for(const id of ['kusa-pachi-window','pachiSelectionWindow']){const dialog=document.getElementById(id);if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});}}
  if(document.readyState==='complete')observeGames();else document.addEventListener('DOMContentLoaded',observeGames,{once:true});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.KusaSiteBgm=Object.freeze({play,pause,setVolume:value=>{music.volume=Math.max(0,Math.min(1,Number(value)||0));},snapshot:()=>({on,track:resolveTrack(),title:trackName(),
    playing:resolveTrack()==='silent-snowfield'?!music.paused:false,currentTime:music.currentTime,source:music.currentSrc||music.src,volume:music.volume,gamePaused:gameOpen(),error})});
  sync();
})();
