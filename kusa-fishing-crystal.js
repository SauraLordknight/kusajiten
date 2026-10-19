// Reuse the finished, locally stored Blender animations; only one plays during activation.
export class FishingCrystalEffect {
 constructor(stage,{sound=()=>{},ended=()=>{}}={}){
  this.sound=sound;this.ended=ended;this.active=false;
  this.el=document.createElement('section');this.el.className='fishing-crystal-effect';this.el.hidden=true;this.el.setAttribute('aria-label','結晶の加護の発動演出');
  this.el.innerHTML=`<div class="crystal-ripples" aria-hidden="true"></div><div class="crystal-shards" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="crystal-portrait"><video muted playsinline loop preload="none"></video><img class="crystal-frame" src="assets/gacha-cards/glass-girl-omega/portrait-frame-v2.png" alt=""></div><strong>結晶の加護</strong><p>少女の祈りが、水辺を満たしていく。</p><button type="button">演出をスキップ</button>`;
  stage.append(this.el);this.video=this.el.querySelector('video');this.el.querySelector('button').onclick=()=>this.stop(true);
 }
 start(mode='normal'){
  this.stop();this.active=true;const base='assets/glass-girl/live2d-upgrade-v3/',sources={normal:[base+'glass-girl-deluxe.mp4',base+'glass-girl-still.png'],processed:[base+'nameless-girl-deluxe.mp4',base+'nameless-girl-still.png'],awakened:['assets/gacha-cards/glass-girl-omega/eve-loop-v5.mp4','assets/gacha-cards/glass-girl-omega/eve-still-v5.png']};
  const [src,poster]=sources[mode]||sources.normal;this.video.poster=poster;this.video.src=src;this.el.hidden=false;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.video.play().catch(()=>{});
  this.sound('splash',.7);this.cue=setTimeout(()=>{if(this.active)this.sound('crystal',1);},900);this.timer=setTimeout(()=>this.stop(true),5200);
 }
 stop(notify=false){const was=this.active;this.active=false;clearTimeout(this.timer);clearTimeout(this.cue);this.video.pause();this.video.removeAttribute('src');this.video.load();this.el.hidden=true;if(was&&notify)this.ended();}
 diagnostics(){return {active:this.active};}
}
