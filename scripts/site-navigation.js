/* The new theme is already in HTML. Only bind interactions. */
(()=>{'use strict';
 const nav=document.getElementById('siteNavigation'),menu=document.querySelector('.site-menu-toggle');
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));});
 nav.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');}});
 const resources=document.querySelector('.kusa-profile-resources');const fit=()=>resources.querySelectorAll('strong').forEach(n=>n.classList.toggle('has-long-value',n.textContent.length>=9));new MutationObserver(fit).observe(resources,{subtree:true,childList:true,characterData:true});fit();
 document.querySelectorAll('[data-shop-shortcut]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('kusaShopOpen').click();document.querySelector('[data-shop-tab="'+b.dataset.shopShortcut+'"]').click();}));
 document.querySelector('.directory-head .search-box button').addEventListener('click',()=>document.getElementById('searchInput').dispatchEvent(new Event('input',{bubbles:true})));
 document.querySelectorAll('.named-item').forEach((n,i)=>{let number=n.querySelector('.directory-index');if(!number){number=document.createElement('em');number.className='directory-index';number.setAttribute('aria-hidden','true');n.prepend(number);}number.textContent=String(i+1).padStart(3,'0')+'：';});
})();
