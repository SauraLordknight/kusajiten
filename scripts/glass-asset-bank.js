/* Bounded, sequential image decoding. Failed assets never retry in a render loop. */
(()=>{'use strict';
 const banks=new Set();
 class GlassAssetBank{
  constructor(files,{capacity=2,onReady=()=>{},transform=null}={}){this.files=files;this.capacity=capacity;this.onReady=onReady;this.transform=transform;this.cache=new Map();this.wanted=[];this.pending=null;this.failed=false;this.error='';this.generation=0;this.requests=0;this.peak=0;banks.add(this);}
  drop(value){if(value instanceof HTMLImageElement)value.removeAttribute('src');else if(value?.close)value.close();else if(value instanceof HTMLCanvasElement)value.width=value.height=1;}
  want(indices){this.wanted=[...new Set(indices.filter(i=>i>=0&&i<this.files.length))].slice(0,this.capacity);for(const [i,image]of this.cache)if(!this.wanted.includes(i)){this.drop(image);this.cache.delete(i);}this.pump();}
  use(index){this.want([index,index+1]);return this.cache.get(index)||null;}
  peek(index){return this.cache.get(index)||null;}
  pump(){
   if(this.pending||this.failed)return;
   const index=this.wanted.find(i=>!this.cache.has(i));if(index===undefined)return;
   const image=new Image(),generation=this.generation,record={image,index,promise:null};this.pending=record;this.requests++;
   image.src=this.files[index];
   record.promise=(async()=>{try{await image.decode();if(generation!==this.generation)return false;const value=this.transform?this.transform(image,index):image;
    if(value!==image)this.drop(image);
    if(!this.wanted.includes(index)){this.drop(value);return false;}
    this.cache.set(index,value);this.peak=Math.max(this.peak,this.cache.size);return true;
   }catch(e){if(generation===this.generation){this.failed=true;this.error=e.message||'image-decode';}return false;}
   finally{if(this.pending===record){this.pending=null;if(generation===this.generation){this.onReady();this.pump();}}}})();
  }
  async prepare(index=0){this.want([index,index+1]);while(!this.cache.has(index)&&this.pending&&!this.failed)await this.pending.promise;return!!this.cache.get(index);}
  async prepareAll(){this.want(this.files.map((_,i)=>i));while(this.pending&&!this.failed)await this.pending.promise;return !this.failed&&this.cache.size===this.files.length;}
  release({retry=false}={}){if(this.pending||this.cache.size||this.wanted.length){this.generation++;if(this.pending)this.drop(this.pending.image);this.pending=null;for(const image of this.cache.values())this.drop(image);this.cache.clear();this.wanted=[];}if(retry){this.failed=false;this.error='';}}
  snapshot(){return{loaded:this.cache.size,pending:this.pending?1:0,failed:this.failed,error:this.error,requests:this.requests,peak:this.peak,capacity:this.capacity,rgbaBytes:[...this.cache.values()].reduce((n,x)=>n+(x.naturalWidth||x.width)*(x.naturalHeight||x.height)*4,0)};}
 }
 window.GlassAssetBank=GlassAssetBank;
 const isOpen=()=>!!document.querySelector('#kusa-pachi-window[open]')&&!document.getElementById('pachiGame')?.hidden&&document.getElementById('pachiMachine')?.dataset.activeMachine==='debug';
 let open=false;
 function releaseBanks(){for(const bank of banks)bank.release({retry:true});document.dispatchEvent(new Event('glass-cabinet-released'));}
 function sync(){const next=isOpen();if(next===open)return;open=next;if(!next)releaseBanks();}
 function bind(){const root=document.getElementById('kusa-pachi-window');if(!root)return;new MutationObserver(()=>{if(!root.open){open=false;releaseBanks();}else sync();}).observe(root,{attributes:true,attributeFilter:['open']});for(const id of ['pachiGame','pachiMachine'])new MutationObserver(sync).observe(document.getElementById(id),{attributes:true,attributeFilter:['hidden','data-active-machine']});sync();}
 window.GlassAssetDiagnostics={release:releaseBanks,snapshot:()=>[...banks].map(b=>b.snapshot())};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
