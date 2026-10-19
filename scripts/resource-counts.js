/* Wallet quantities: safe numbers for legacy saves, decimal strings for larger integers.
   BigInt is confined to arithmetic; JSON never contains a BigInt or Infinity. */
(function(root){
  'use strict';
  const safe=BigInt(Number.MAX_SAFE_INTEGER);
  const valid=v=>typeof v==='number'?Number.isSafeInteger(v)&&v>=0:typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v);
  const signed=v=>typeof v==='number'?Number.isSafeInteger(v):typeof v==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v);
  const big=v=>{if(!signed(v))throw new TypeError('資源数は整数で指定してください。');return BigInt(v);};
  const pack=v=>v<=safe&&v>=-safe?Number(v):String(v);
  const normalize=(v,fallback=0)=>valid(v)||(typeof v==='number'&&Number.isFinite(v)&&Number.isInteger(v)&&v>=0)?pack(BigInt(v)):fallback;
  const parse=(v,fallback=-1)=>/^\d+$/.test(String(v).trim())?pack(BigInt(String(v).trim())):fallback;
  const add=(a,b)=>pack(big(a)+big(b));
  const sub=(a,b)=>pack(big(a)-big(b));
  const mul=(a,b)=>pack(big(a)*big(b));
  const div=(a,b)=>pack(big(a)/big(b));
  const mod=(a,b)=>pack(big(a)%big(b));
  const cmp=(a,b)=>{const x=big(a),y=big(b);return x===y?0:x>y?1:-1;};
  const min=(a,b)=>a===Infinity?b:b===Infinity?a:cmp(a,b)<0?a:b;
  const max=(a,b)=>a===Infinity||b===Infinity?Infinity:cmp(a,b)>0?a:b;
  const format=v=>signed(v)?String(v).replace(/\B(?=(\d{3})+(?!\d))/g,','):Number(v||0).toLocaleString('ja-JP');
  const api=Object.freeze({valid,signed,normalize,parse,add,sub,mul,div,mod,cmp,min,max,format});
  root.KusaAmounts=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
