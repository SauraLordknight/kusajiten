import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const assetRoot=new URL('kusa-medal/models/commemorative-display/',document.baseURI);
const modelPromises=new Map();
function localBuffer(quality) {
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL(`local-${quality}.js`,assetRoot).href;
    const timer=setTimeout(()=>{script.remove();reject(new Error('メダルの読み込みがタイムアウトしました。再試行してください。'));},45000);
    script.onload=()=>{
      clearTimeout(timer);
      const key=`KusaCommemorativeLocal${quality}`,value=globalThis[key];delete globalThis[key];script.remove();
      if(!value)return reject(new Error('メダルのローカルデータがありません。'));
      const bytes=Uint8Array.from(atob(value),ch=>ch.charCodeAt(0));resolve(bytes.buffer);
    };
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('メダルデータを読み込めません。testフォルダー全体を配置してください。'));};
    document.head.append(script);
  });
}
function loadModel(quality) {
  if(!modelPromises.has(quality)){
    const promise=(async()=>{
      let buffer;
      if(location.protocol==='file:')buffer=await localBuffer(quality);
      else {
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
        try {const response=await fetch(new URL(`kusa-commemorative-${quality}.glb?v=20261007`,assetRoot),{signal:controller.signal});
          if(!response.ok)throw new Error(`メダルデータを読み込めません（${response.status}）。`);buffer=await response.arrayBuffer();
        }finally{clearTimeout(timer);}
      }
      return new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,assetRoot.href,resolve,reject));
    })().catch(error=>{modelPromises.delete(quality);throw error;});
    modelPromises.set(quality,promise);
  }
  return modelPromises.get(quality);
}

function fitText(context,value,width,size) {
  let fontSize=size;
  const family='Georgia,"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",serif';
  context.font=`${fontSize}px ${family}`;
  while(context.measureText(value).width>width&&fontSize>8){fontSize-=1;context.font=`${fontSize}px ${family}`;}
  return fontSize;
}

function engrave(material,record) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d');
  if(material.map?.image)c.drawImage(material.map.image,0,0,1024,512);
  else {c.fillStyle='#c79d55';c.fillRect(0,0,1024,512);}
  c.textAlign='center';c.textBaseline='middle';
  const fields=[`PLAYER: ${record.playerNameAtMint}`,`ACQUIRED: ${record.mintedDate}`,`SERIAL: ${record.serialNumber}`];
  for(let i=0;i<fields.length;i++){
    fitText(c,fields[i],930,i===2?58:64);
    const y=[88,256,424][i];
    c.fillStyle='rgba(255,237,177,.70)';c.fillText(fields[i],513,y+1.4);
    c.fillStyle='#1c1008';c.fillText(fields[i],512,y);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const result=material.clone();result.map=texture;result.needsUpdate=true;
  return {material:result,texture,fields};
}

export class CommemorativeRenderer {
  constructor() {
    this.canvas=document.createElement('canvas');this.canvas.className='commemorative-3d-canvas';this.canvas.setAttribute('aria-label','記念メダルの3D表示');
    this.canvas.tabIndex=0;
    const context=this.canvas.getContext('webgl2',{alpha:true,antialias:true});
    if(!context)throw new Error('この端末では3D表示を利用できません。記念メダルの記録は保存されています。');
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,context,alpha:true,antialias:true});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(35,1,.05,60);this.target=new THREE.Vector3();
    this.root=new THREE.Group();this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xfff5dd,0x151b25,2));
    const key=new THREE.DirectionalLight(0xfff0d0,3.5);key.position.set(-3,4,5);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xc5e3ff,1.6);fill.position.set(3,1,-3);this.scene.add(fill);
    const rear=new THREE.DirectionalLight(0xfff1d7,3.2);rear.position.set(-2,3,-4);this.scene.add(rear);
    const envScene=new THREE.Scene();envScene.background=new THREE.Color(.13,.15,.17);
    for(const [pos,size,power] of [[[0,5,0],[6,1,6],3], [[-5,1,2],[1,6,4],2],[[5,2,-1],[1,6,4],2]]){
      const panel=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color(power,power*.95,power*.85)}));panel.position.set(...pos);envScene.add(panel);
    }
    const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(envScene,.04);this.scene.environment=this.environment.texture;
    pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    this.spherical=new THREE.Spherical(4,Math.PI/2,0);this.pointers=new Map();this.autoRotate=true;this.allowReducedMotion=false;this.mode='profile';this.visible=true;
    this.motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
    this.onMotionChange=()=>{this.lastTime=0;this.wake();};
    this.motionPreference.addEventListener('change',this.onMotionChange);
    this.frame=0;this.rotation=0;this.generation=0;this.dirty=true;this.lastTime=0;this.lastDraw=0;this.installControls();
    this.observer=new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting!==false;this.wake();});
    this.resizeObserver=new ResizeObserver(()=>{this.resize();this.wake();});
    this.onVisibility=()=>{this.lastTime=0;this.wake();};document.addEventListener('visibilitychange',this.onVisibility);
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;cancelAnimationFrame(this.frame);this.frame=0;this.onError?.(new Error('3D表示が中断されました。「再試行」で復帰できます。'));});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.dirty=true;this.wake();});
  }
  async setRecord(record,quality) {
    const generation=++this.generation;
    const gltf=await loadModel(quality);await document.fonts?.ready;
    if(generation!==this.generation)return;
    this.clearCoin();
    const coin=gltf.scene.clone(true),plate=coin.getObjectByName('PersonalizationPlate');
    if(!plate)throw new Error('メダルの刻印面が見つかりません。');
    const stamp=engrave(plate.material,record);plate.material=stamp.material;this.stamp=stamp;
    coin.rotation.x=Math.PI/2;
    this.root.add(coin);this.coin=coin;this.record=record;this.canvas.dataset.serial=record.serialNumber;
    this.canvas.dataset.engraving=JSON.stringify(stamp.fields);this.canvas.dataset.quality=quality;
    this.rotation=0;this.root.rotation.y=0;this.dirty=true;this.wake();
  }
  clearCoin(){if(this.coin)this.root.remove(this.coin);this.coin=null;this.stamp?.material.dispose();this.stamp?.texture.dispose();this.stamp=null;}
  attach(host,mode) {
    this.observer.disconnect();this.resizeObserver.disconnect();this.host=host;this.mode=mode;this.visible=true;
    host.append(this.canvas);this.canvas.classList.toggle('is-interactive',mode==='detail');this.canvas.tabIndex=mode==='detail'?0:-1;
    this.observer.observe(host);this.resizeObserver.observe(host);this.reset();this.resize();this.wake();
  }
  detach(){this.observer.disconnect();this.resizeObserver.disconnect();this.host=null;this.canvas.remove();cancelAnimationFrame(this.frame);this.frame=0;}
  reset(){this.spherical.set(this.mode==='profile'?4.0:3.85,Math.PI/2,0);this.target.set(0,0,0);this.rotation=0;this.root.rotation.y=0;this.pointers.clear();this.updateCamera();}
  updateCamera(){this.spherical.radius=Math.max(1.4,Math.min(10,this.spherical.radius));this.spherical.phi=Math.max(.02,Math.min(Math.PI-.02,this.spherical.phi));this.camera.position.setFromSpherical(this.spherical).add(this.target);this.camera.lookAt(this.target);this.canvas.dataset.camera=JSON.stringify([this.spherical.radius,this.spherical.phi,this.spherical.theta,...this.target.toArray()]);this.dirty=true;this.wake();}
  resize(){if(!this.host)return;const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight),ratio=Math.min(devicePixelRatio||1,this.mode==='profile'?1:1.5);
    const size=`${w}/${h}/${ratio}`;if(this.lastSize===size)return;this.lastSize=size;
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
  setAuto(value,{allowReducedMotion=false}={}){this.autoRotate=value;this.allowReducedMotion=allowReducedMotion;this.lastTime=0;this.wake();}
  wake(){if(!this.frame&&this.host&&this.visible&&!document.hidden&&!this.lost)this.frame=requestAnimationFrame(t=>this.tick(t));}
  tick(time){
    this.frame=0;if(!this.host||!this.visible||document.hidden||this.lost)return;
    const moving=this.autoRotate&&(this.allowReducedMotion||!this.motionPreference.matches);
    const elapsed=this.lastTime?Math.min((time-this.lastTime)/1000,.1):0;this.lastTime=time;
    if(moving&&!this.pointers.size){this.rotation+=elapsed*Math.PI*2/20;this.root.rotation.y=this.rotation;this.canvas.dataset.rotation=String(this.rotation);this.dirty=true;}
    if(this.dirty){this.renderer.render(this.scene,this.camera);this.lastDraw=time;this.dirty=false;this.canvas.dataset.frames=String(this.renderer.info.render.frame);}
    if(moving||this.dirty)this.wake();
  }
  installControls(){
    const c=this.canvas;
    this.down=e=>{if(this.mode!=='detail')return;e.preventDefault();c.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.gesture=null;this.dragPan=e.button===2||e.button===1||e.shiftKey;};
    this.move=e=>{
      const prev=this.pointers.get(e.pointerId);if(!prev||this.mode!=='detail')return;e.preventDefault();
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===1){const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(this.dragPan)this.pan(dx,dy);else{this.spherical.theta-=dx*.008;this.spherical.phi-=dy*.008;}}
      else{const [a,b]=[...this.pointers.values()];const g={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(this.gesture){this.spherical.radius*=this.gesture.distance/g.distance;this.pan(g.x-this.gesture.x,g.y-this.gesture.y);}this.gesture=g;}
      this.updateCamera();
    };
    this.end=e=>{this.pointers.delete(e.pointerId);this.gesture=null;try{c.releasePointerCapture(e.pointerId);}catch{}this.lastTime=0;this.wake();};
    c.addEventListener('pointerdown',this.down);c.addEventListener('pointermove',this.move);c.addEventListener('pointerup',this.end);c.addEventListener('pointercancel',this.end);c.addEventListener('lostpointercapture',this.end);
    c.addEventListener('wheel',e=>{if(this.mode!=='detail')return;e.preventDefault();this.spherical.radius*=Math.exp(e.deltaY*.001);this.updateCamera();},{passive:false});
    c.addEventListener('contextmenu',e=>{if(this.mode==='detail')e.preventDefault();});
    c.addEventListener('keydown',e=>{if(this.mode!=='detail')return;const action={ArrowLeft:()=>this.spherical.theta-=.15,ArrowRight:()=>this.spherical.theta+=.15,ArrowUp:()=>this.spherical.phi-=.15,ArrowDown:()=>this.spherical.phi+=.15,'+':()=>this.spherical.radius*=.9,'-':()=>this.spherical.radius*=1.1,Home:()=>this.reset()}[e.key];if(action){e.preventDefault();action();this.updateCamera();}});
  }
  pan(dx,dy){const scale=this.spherical.radius*.0017;this.target.addScaledVector(new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),-dx*scale);this.target.addScaledVector(new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion),dy*scale);this.target.clampLength(0,1.6);}
  dispose(){this.detach();this.generation++;this.clearCoin();this.resizeObserver.disconnect();this.motionPreference.removeEventListener('change',this.onMotionChange);document.removeEventListener('visibilitychange',this.onVisibility);this.environment.dispose();this.renderer.dispose();}
}
globalThis.KusaCommemorativeRenderer={CommemorativeRenderer,prepare:()=>loadModel('profile')};
