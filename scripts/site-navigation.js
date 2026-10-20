/* The new theme is already in HTML. Only bind interactions. */
(()=>{'use strict';
 const nav=document.getElementById('siteNavigation'),menu=document.querySelector('.site-menu-toggle');
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));});
 nav.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');}});
 const resources=document.querySelector('.kusa-profile-resources');let fitFrame=0,revision=0,lastWidth=innerWidth,resourceWidth=-1;const measurements=new WeakMap();
 const fit=()=>{fitFrame=0;resources.querySelectorAll('strong').forEach(n=>{
   const key=n.textContent+'|'+n.parentElement.clientWidth+'|'+revision;if(measurements.get(n)===key)return;
   n.style.removeProperty('font-size');n.style.removeProperty('transform');n.classList.remove('has-long-value');
   const parentStyle=getComputedStyle(n.parentElement);const available=n.parentElement.getBoundingClientRect().right-parseFloat(parentStyle.paddingRight)-n.getBoundingClientRect().left-2;if(available<=0)return;
   const natural=n.scrollWidth,base=parseFloat(getComputedStyle(n).fontSize);
   if(natural>available){const size=Math.max(9,base*available/natural);n.style.fontSize=size+'px';if(n.scrollWidth>available)n.style.transform='scaleX('+(available/n.scrollWidth)+')';}
   n.title=n.textContent;measurements.set(n,key);
 });};
 const schedule=()=>{if(!fitFrame)fitFrame=requestAnimationFrame(fit);};
 new MutationObserver(schedule).observe(resources,{subtree:true,childList:true,characterData:true});new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==resourceWidth){resourceWidth=width;schedule();}}).observe(resources);window.addEventListener('resize',()=>{if(innerWidth!==lastWidth){lastWidth=innerWidth;revision++;schedule();}});document.fonts.ready.then(()=>{revision++;schedule();});window.addEventListener('kusa-theme-applied',()=>{revision++;schedule();});schedule();
 document.querySelectorAll('[data-shop-shortcut]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('kusaShopOpen').click();document.querySelector('[data-shop-tab="'+b.dataset.shopShortcut+'"]').click();}));
 document.querySelector('.directory-head .search-box button').addEventListener('click',()=>document.getElementById('searchInput').dispatchEvent(new Event('input',{bubbles:true})));
 document.querySelectorAll('.named-item').forEach((n,i)=>{let number=n.querySelector('.directory-index');if(!number){number=document.createElement('em');number.className='directory-index';number.setAttribute('aria-hidden','true');n.prepend(number);}number.textContent=String(i+1).padStart(3,'0')+'：';});
})();
