/* Display-only daily counters. Lifetime/session records are never changed. */
(()=>{'use strict';
 const key='kusa-pachi-daily-counters-v1';let cache={};
 try{cache=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
 const day=now=>new Date(now+9*3600000).toISOString().slice(0,10);
 const count=n=>Number.isFinite(n)&&n>=0?n:0;
 function read(machine,id,raw){
  const name=machine+':'+id,today=day(Date.now()),previous=cache[name];
  const totals=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,count(v)]));
  let row=previous;
  if(!row||row.day!==today)row={day:today,last:totals,values:Object.fromEntries(Object.keys(totals).map(k=>[k,0]))};
  else {
   for(const [k,value]of Object.entries(totals)){
    const last=count(row.last[k]);
    if(k==='streak'||k==='chain'){
     if(value===0)row.values[k]=0;
     else if(value<last)row.values[k]=value;
     else row.values[k]=count(row.values[k])+Math.max(0,value-last);
    }else row.values[k]=count(row.values[k])+Math.max(0,value-last);
   }
   row.last=totals;
  }
  cache[name]=row;
  // Save only when a counter changes, not on every animation frame.
  const serialized=JSON.stringify(cache);
  if(serialized!==saved){try{localStorage.setItem(key,serialized);saved=serialized;}catch{}}
  return {...row.values};
 }
 let saved=JSON.stringify(cache);
 let timer;
 function schedule(){clearTimeout(timer);const now=Date.now(),next=(Math.floor((now+9*3600000)/86400000)+1)*86400000-9*3600000;timer=setTimeout(()=>{window.dispatchEvent(new Event('pachi-counter-day-changed'));schedule();},Math.max(1,next-now));}
 window.KusaDailyPachiCounters={read};schedule();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){window.dispatchEvent(new Event('pachi-counter-day-changed'));schedule();}});
 window.addEventListener('pageshow',()=>{window.dispatchEvent(new Event('pachi-counter-day-changed'));schedule();});
})();
