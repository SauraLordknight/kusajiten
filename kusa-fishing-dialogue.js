// DOM text stays readable at phone sizes while the generated skin is reused
// by both the bottom message window and the center choice window.
export class FishingDialogue {
 constructor(stage,text,{changed=()=>{},sound=()=>{}}={}){
  this.changed=changed;this.sound=sound;this.text=text;this.waiting=false;this.choiceOpen=false;this.hideTimer=0;
  this.message=document.createElement('section');this.message.className='fishing-rpg-window fishing-rpg-message';this.message.hidden=true;this.message.setAttribute('aria-label','メッセージ');
  this.next=document.createElement('button');this.next.type='button';this.next.className='fishing-rpg-next';this.next.textContent='▼';this.next.setAttribute('aria-label','メッセージを閉じる');this.next.hidden=true;
  this.message.append(text,this.next);stage.append(this.message);this.message.addEventListener('click',()=>{if(this.waiting)this.advance();});
  this.layer=document.createElement('div');this.layer.className='fishing-choice-layer';this.layer.hidden=true;
  this.layer.innerHTML='<section class="fishing-rpg-window fishing-rpg-choices" role="dialog" aria-modal="true" aria-labelledby="fishingChoiceTitle"><p id="fishingChoiceTitle">ここでひと休みしますか？</p><button type="button" class="fishing-rpg-choice-button" data-coffee-choice="yes">一服する</button><button type="button" class="fishing-rpg-choice-button" data-coffee-choice="no">やめる</button></section>';
  stage.append(this.layer);this.buttons=[...this.layer.querySelectorAll('button')];this.buttons.forEach((b,i)=>{b.onclick=()=>this.choose(i);b.onfocus=()=>this.select(i);});
 }
 get locked(){return this.waiting||this.choiceOpen;}
 say(value,{wait=false,sound=false}={}){
  clearTimeout(this.hideTimer);this.text.textContent=value;this.waiting=wait;this.next.hidden=!wait;
  if(!this.choiceOpen)this.message.hidden=false;
  if(sound)this.sound('message');
  if(!wait)this.hideTimer=setTimeout(()=>{if(!this.locked)this.message.hidden=true;},4500);
  if(wait){this.focusBefore=document.activeElement;this.next.focus({preventScroll:true});}
  this.changed();
 }
 hideNotice(){if(!this.locked){clearTimeout(this.hideTimer);this.message.hidden=true;}}
 offerCoffee(callback){this.offer({title:'ここでひと休みしますか？',label:'一服する'},callback);}
 offer({title,label},callback){
  if(this.locked)return;this.layer.querySelector('#fishingChoiceTitle').textContent=title;this.buttons[0].textContent=label;clearTimeout(this.hideTimer);this.focusBefore=document.activeElement;this.callback=callback;this.choiceOpen=true;this.message.hidden=true;this.layer.hidden=false;this.select(0);this.buttons[0].focus({preventScroll:true});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.layer.firstElementChild.animate([{transform:'translateY(14px) scale(.84)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1}],{duration:190,easing:'cubic-bezier(.2,.8,.2,1)'});
  this.changed();
 }
 select(index){this.index=index;this.buttons.forEach((b,i)=>b.dataset.selected=String(i===index));}
 choose(index){if(!this.choiceOpen)return;const callback=this.callback;this.choiceOpen=false;this.callback=null;this.layer.hidden=true;this.changed();this.restoreFocus();if(index===0){this.sound('confirm');callback?.();}}
 restoreFocus(){if(this.focusBefore?.isConnected)this.focusBefore.focus({preventScroll:true});}
 advance(){if(!this.waiting)return;this.waiting=false;this.message.hidden=true;this.next.hidden=true;this.changed();this.restoreFocus();}
 activate(){if(this.choiceOpen)this.choose(this.index);else this.advance();}
 key(event){
  if(!this.locked)return false;
  if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Tab'].includes(event.code)&&this.choiceOpen){event.preventDefault();const step=event.code==='ArrowUp'||event.code==='ArrowLeft'||event.shiftKey?-1:1;this.select((this.index+step+2)%2);this.buttons[this.index].focus({preventScroll:true});return true;}
  if(['Enter','Space','Escape'].includes(event.code)){event.preventDefault();if(!event.repeat){if(event.code==='Escape'&&this.choiceOpen)this.choose(1);else this.activate();}return true;}
  // Movement must never leak through an open message/choice.
  if(event.code.startsWith('Arrow')||/^Key[WASD]$/.test(event.code)){event.preventDefault();return true;}
  return false;
 }
 reset(){clearTimeout(this.hideTimer);this.waiting=false;this.choiceOpen=false;this.callback=null;this.message.hidden=true;this.layer.hidden=true;this.next.hidden=true;}
 diagnostics(){return {messageVisible:!this.message.hidden,text:this.text.textContent,waiting:this.waiting,choiceOpen:this.choiceOpen,choiceIndex:this.index??0};}
}
