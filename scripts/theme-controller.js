(() => {
  'use strict';
  const defaults={paper:'grass',siteFrame:'grass',profile:'meadow',frame:'basic',night:false,bgmTrack:'theme',bgmVolume:.5,bgmVolumeUserSet:false};
  const store=()=>window.KusaPlayerStore;
  let prefs={...defaults,...store()?.getThemePreferences?.()};
  const dialog=document.createElement('dialog');dialog.id='siteThemeDialog';dialog.className='site-theme-dialog';dialog.setAttribute('aria-labelledby','siteThemeTitle');
  dialog.innerHTML='<header><h2 id="siteThemeTitle">草むらの着せ替え</h2><button type="button" data-theme-close aria-label="着せ替えを閉じる">×</button></header><p>基本テーマの背景と枠を組み合わせられます。ゲームの性能や所持資源は変わりません。</p><label>サイト背景<select name="paper"><option value="grass">草むらペーパー</option><option value="plain">無地</option></select></label><label>プロフィール背景<select name="profile"><option value="meadow">深緑の草むら</option><option value="plain">深緑の無地</option></select></label><label>プロフィール枠<select name="frame"><option value="basic">基本の金色枠</option><option value="simple">シンプルな草色枠</option></select></label><label>表示モード<select name="night"><option value="false">昼の草むら</option><option value="true">夜の草むら</option></select></label><label>BGM音量<input name="bgmVolume" type="range" min="0" max="1" step="0.01" aria-label="BGM音量"></label><p>追加のスキンはショップの「スキン・テーマ」から。現在は基本セットを使用できます。BGMはページを開くたびにOFFで始まります。</p><div class="theme-actions"><button type="button" data-theme-reset>基本に戻す</button><button type="button" data-theme-shop>ショップへ</button><button type="button" data-theme-close>閉じる</button></div><p id="themeSaveStatus" role="status"></p>';
  const siteFrameLabel=document.createElement('label');siteFrameLabel.innerHTML='サイトの枠<select name="siteFrame"><option value="grass">基本の草色枠</option><option value="simple">シンプルな枠なし</option></select>';dialog.querySelector('[name="paper"]').closest('label').after(siteFrameLabel);
  for(const [selector,label] of [['[name=paper] [value=grass]','テーマの背景'],['[name=profile] [value=meadow]','テーマの風景'],['[name=profile] [value=plain]','無地'],['[name=frame] [value=basic]','テーマの装飾枠'],['[name=frame] [value=simple]','シンプルな枠'],['[name=siteFrame] [value=grass]','テーマの枠'],['[name=night] [value=false]','テーマの標準色'],['[name=night] [value=true]','夜の表示']])dialog.querySelector(selector).textContent=label;
  document.body.append(dialog);
  const bgmLabel=document.createElement('label');bgmLabel.textContent='BGMを選択';
  const bgmSelect=document.createElement('select');bgmSelect.name='bgmTrack';bgmSelect.id='siteBgmTrack';bgmSelect.setAttribute('aria-label','BGMを選択');
  for(const [value,label] of [['theme','テーマに合わせる'],['silent-snowfield','無音の雪原（ガラスの少女）']]){const option=document.createElement('option');option.value=value;option.textContent=label;bgmSelect.append(option);}
  bgmLabel.append(bgmSelect);dialog.querySelector('[name="bgmVolume"]').closest('label').before(bgmLabel);
  dialog.querySelector('[data-theme-reset]').textContent='パーツ設定を戻す';
  const themeLabel=document.createElement('label');themeLabel.textContent='所持テーマ';
  const themeSelect=document.createElement('select');themeSelect.id='ownedSiteTheme';themeSelect.setAttribute('aria-label','所持テーマ');themeLabel.append(themeSelect);dialog.querySelector('header').after(themeLabel);
  const intro=dialog.querySelector('p');intro.textContent='所持テーマと背景・枠を選べます。ゲームの性能は変わりません。';
  dialog.querySelectorAll('p')[1].textContent='曲を選ぶとBGMを再生します。BGMボタンでオン・オフを切り替えられます（スマホはメニュー内）。';
  function syncThemes(){
    const commerce=window.KusaCommerce;commerce?.save.reload();const account=commerce?.save.getAccount();
    const ownsGlassTheme=account?.ownedSkins?.includes('glass-cosmos')===true;
    let glassBgmOption=bgmSelect.querySelector('option[value="silent-snowfield"]');
    if(ownsGlassTheme&&!glassBgmOption){glassBgmOption=document.createElement('option');glassBgmOption.value='silent-snowfield';glassBgmOption.textContent='無音の雪原（ガラスの少女）';bgmSelect.append(glassBgmOption);}
    if(!ownsGlassTheme){glassBgmOption?.remove();if(prefs.bgmTrack==='silent-snowfield'||store()?.getThemePreferences?.().bgmTrack==='silent-snowfield'){prefs.bgmTrack='theme';store()?.saveThemePreferences?.(prefs);}}
    bgmSelect.value=ownsGlassTheme&&prefs.bgmTrack==='silent-snowfield'?'silent-snowfield':'theme';
    themeSelect.replaceChildren();
    for(const theme of window.KusaSiteThemes.catalog){if(!theme.starter&&!account?.ownedSkins.includes(theme.id))continue;const option=document.createElement('option');option.value=theme.id;option.textContent=theme.name;themeSelect.append(option);}
    themeSelect.value=window.KusaSiteThemes.refresh();themeSelect.disabled=!commerce?.save.selectedPlayerId;
  }
  themeSelect.addEventListener('change',async()=>{themeSelect.disabled=true;const result=await window.KusaCommerce.equipSiteTheme(themeSelect.value);syncThemes();document.getElementById('themeSaveStatus').textContent=result?.ok?'テーマを適用しました。':result?.message||'変更できませんでした。';});
  for(const type of ['kusa-medal-save-changed','kusa-player-changed'])window.addEventListener(type,syncThemes);
  function apply(){document.body.dataset.themePaper=prefs.paper;document.body.dataset.themeSiteFrame=prefs.siteFrame;document.body.dataset.themeProfile=prefs.profile;document.body.dataset.themeFrame=prefs.frame;document.documentElement.classList.toggle('night',prefs.night);for(const key of Object.keys(defaults)){const input=dialog.querySelector('[name="'+key+'"]');if(input)input.value=String(prefs[key]);}window.dispatchEvent(new CustomEvent('kusa-theme-applied',{detail:{preferences:{...prefs}}}));}
  function save(){apply();const ok=store()?.saveThemePreferences?.(prefs);document.getElementById('themeSaveStatus').textContent=ok?'設定を保存しました。':'この環境では保存できません。表示には適用しました。';}
  dialog.addEventListener('input',e=>{if(e.target.name==='bgmVolume'){prefs.bgmVolume=Number(e.target.value);prefs.bgmVolumeUserSet=true;window.KusaSiteBgm?.setVolume(prefs.bgmVolume);}});
  dialog.addEventListener('change',e=>{const key=e.target.name;if(!(key in defaults))return;if(key==='bgmTrack'&&e.target.value==='silent-snowfield'){const commerce=window.KusaCommerce;commerce?.save.reload();const account=commerce?.save.getAccount();if(!account?.ownedSkins?.includes('glass-cosmos')){prefs.bgmTrack='theme';syncThemes();save();window.KusaSiteBgm?.pause();return;}}if(key==='bgmVolume')prefs.bgmVolumeUserSet=true;prefs[key]=key==='night'?e.target.value==='true':key==='bgmVolume'?Number(e.target.value):e.target.value;save();if(key==='bgmTrack')window.KusaSiteBgm?.play();});
  dialog.querySelector('[data-theme-reset]').addEventListener('click',()=>{prefs={...defaults,bgmTrack:prefs.bgmTrack,bgmVolume:prefs.bgmVolume,bgmVolumeUserSet:prefs.bgmVolumeUserSet};save();});
  dialog.querySelectorAll('[data-theme-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));dialog.querySelector('[data-theme-shop]').addEventListener('click',()=>{dialog.close();document.getElementById('kusaShopOpen').click();document.getElementById('shopSkinsTab').click();});
  document.getElementById('siteThemeOpen').addEventListener('click',()=>{syncThemes();apply();dialog.showModal();});
  window.addEventListener('kusa-player-changed',e=>{if(e.detail?.imported){prefs={...defaults,...store()?.getThemePreferences?.()};apply();}});
  syncThemes();apply();
})();
