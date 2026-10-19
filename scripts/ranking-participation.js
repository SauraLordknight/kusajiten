/* Explicit per-player, per-game consent. Not included in play-data backups. */
(()=>{'use strict';
 const key='kusaRankingParticipationV1',controllers=new Map(),blocked=new Set();
 const valid=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
 const slot=(game,id)=>`${game}:${id}`;
 function read(){try{const data=JSON.parse(localStorage.getItem(key)||'{}');return data&&typeof data==='object'?data:{};}catch{return {};}}
 function get(game,id){const s=slot(game,id),v=read()[s];return valid(id)&&!blocked.has(s)&&v?.enabled===true&&/^[a-f0-9]{32}$/.test(v.epoch)?{enabled:true,epoch:v.epoch}:{enabled:false,epoch:''};}
 function abort(game,id){const set=controllers.get(slot(game,id));if(set)for(const c of set)c.abort();}
 function notify(game,id){window.dispatchEvent(new CustomEvent('kusa-ranking-participation-changed',{detail:{game,id}}));}
 function set(game,id,enabled){
  if(!['kusa','glass'].includes(game)||!valid(id))return false;
  const s=slot(game,id);abort(game,id);if(!enabled)blocked.add(s);
  const data=read(),bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  data[s]={enabled:!!enabled,epoch:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
  try{localStorage.setItem(key,JSON.stringify(data));blocked.delete(s);notify(game,id);return true;}
  catch{if(!enabled)notify(game,id);return false;}
 }
 async function send(game,id,url,init={}){
  const consent=get(game,id);if(!consent.enabled)throw new DOMException('Not participating','AbortError');
  const s=slot(game,id),c=new AbortController(),set=controllers.get(s)||new Set();set.add(c);controllers.set(s,set);
  try{const result=await fetch(url,{...init,signal:c.signal,keepalive:false});
   const current=get(game,id);if(!current.enabled||current.epoch!==consent.epoch)throw new DOMException('Participation changed','AbortError');
   return result;
  }finally{set.delete(c);if(!set.size)controllers.delete(s);}
 }
 function control(game,getPlayer,onToggle){
  const box=document.createElement('section');box.className='ranking-participation';
  const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span'),status=document.createElement('p');
  input.type='checkbox';input.id=game+'RankingParticipation';text.textContent='このプレイヤーでランキングに参加する（任意）';label.append(input,text);
  const explanation=document.createElement('p');explanation.textContent='初期設定は不参加です。参加後の表示名・ランダムID・倍率・発射数・賞球数を専用Cloudflareサーバーへ送り、名前と収支を公開します。持ち球・草・カードは送りません。';
  const withdrawal=document.createElement('p');withdrawal.textContent='OFFで今後の送信と未送信分の再送を停止し、未送信のランキング集計を破棄します。参加前の記録は送りません。送信済み記録は自動削除されません。送信開始済みの通信は停止を試みますが、到着済みの記録は取り消せません。';
  const retention=document.createElement('p');retention.textContent='当日分を日本時間で集計。運用DBでは48時間を超えた遊技・参加訪問記録を日次削除する方針です。定期処理の失敗時は遅延し、ログ・バックアップには別の保存期間があります。';
  const link=document.createElement('a');link.href='https://tally.so/r/ODv2XR';link.target='_blank';link.rel='noopener noreferrer';link.textContent='送信済み記録の削除・迷惑な名前の相談は要望BOXへ';
  const support=document.createElement('p');support.className='ranking-support-id';
  status.setAttribute('role','status');box.append(label,explanation,withdrawal,retention,link,support,status);
  function update(){const id=getPlayer();input.disabled=!valid(id);input.checked=get(game,id).enabled;support.textContent=valid(id)?`削除依頼用ID：${id}（秘密の認証キーではありません）`:'';}
  input.addEventListener('change',()=>{const enabled=input.checked,id=getPlayer();
   if(!onToggle(enabled)){update();return;}
   const ok=set(game,id,enabled);update();status.textContent=ok?(enabled?'参加しました。この時点以降の遊技を集計します。':'送信を停止しました。送信済み記録の削除は要望BOXへご依頼ください。'):
    enabled?'参加設定を保存できませんでした。':'この画面では停止しましたが、設定を保存できません。再読込で参加状態に戻る可能性があるため、保存設定を確認してください。';
  });
  window.addEventListener('kusa-ranking-participation-changed',update);window.addEventListener('storage',update);update();return{element:box,update,status,input};
 }
 window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;for(const s of [...controllers.keys()]){const [game,id]=s.split(':');abort(game,id);}window.dispatchEvent(new CustomEvent('kusa-ranking-participation-changed',{detail:{remote:true}}));});
 window.KusaRankingParticipation=Object.freeze({get,set,send,control,key});
})();
