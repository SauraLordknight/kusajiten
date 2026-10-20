/* Theme-only media. The portrait is the approved normal-card rig rendered to alpha. */
(() => {
  'use strict';
  const THEME = 'glass-cosmos';
  const root = document.documentElement;
  const mediaRoot = new URL('../assets/themes/glass-cosmos/', document.currentScript?.src || location.href);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Safari's canPlayType may report VP9 support without VP9 transparency.
  // Apple browsers therefore use the exact same RGBA frames as animated WebP.
  const appleBrowser = /iP(?:hone|ad|od)/.test(navigator.userAgent) ||
    /Apple Computer/.test(navigator.vendor || '') ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  let backdrop = null;
  let portrait = null;
  let visibility = null;
  let profileVisible = true;
  let activated = false;
  let motionWatch = null;
  let appliedMotion = motion.matches;
  let scrolling=false,scrollTimer=0;

  function element(tag, className) {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }
  function createMedia(className, posterName, videoName, mime, animationName = '') {
    const host = element('div', className);
    host.setAttribute('aria-hidden', 'true');
    const image = element('img', className + '-poster');
    image.alt = '';
    image.decoding = 'async';
    image.src = new URL(posterName, mediaRoot).href;
    host.append(image);
    host._image = image;
    host._poster = image.src;
    host._animation = animationName ? new URL(animationName, mediaRoot).href : '';
    host._useAnimatedImage = !!animationName && (appleBrowser ||
      !document.createElement('video').canPlayType('video/webm; codecs="vp9"'));
    host._setAnimatedImage = active => {
      const target = active ? host._animation : host._poster;
      if (target && image.src !== target) image.src = target;
    };
    // Reduced motion never downloads a movie. A change of preference can start
    // playback later, without replacing the poster or shifting the page.
    host._createVideo = () => {
      if (host._video) return host._video;
      const video = element('video', className + '-video');
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.disablePictureInPicture = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('tabindex', '-1');
      const source = document.createElement('source');
      source.src = new URL(videoName, mediaRoot).href;
      source.type = mime;
      video.append(source);
      video.addEventListener('playing', () => {
        if (!motion.matches && !document.hidden) host.dataset.videoReady = 'true';
      });
      const failed = () => {
        delete host.dataset.videoReady;
        if (host._animation && activated && host.isConnected) {
          host._useAnimatedImage = true;
          updatePlayback();
        }
      };
      video.addEventListener('error', failed);
      source.addEventListener('error', failed);
      host.append(video);
      host._video = video;
      return video;
    };
    return host;
  }
  function updatePlayback() {
    if (!activated) return;
    appliedMotion = motion.matches;
    if(document.querySelector('#kusa-pachi-window[open],#pachiSelectionWindow[open]')){for(const host of [backdrop,portrait]){host?._video?.pause();host?._setAnimatedImage(false);}return;}
    for (const host of [backdrop, portrait]) {
      if (!host) continue;
      if(scrolling&&!document.hidden&&!motion.matches){host._video?.pause();if(host._useAnimatedImage)host._setAnimatedImage(false);continue;}
      const shouldPlay = !document.hidden && !motion.matches && (host !== portrait || profileVisible);
      if (!shouldPlay) {
        host._video?.pause();
        host._setAnimatedImage(false);
        if (motion.matches) delete host.dataset.videoReady;
        continue;
      }
      if (host._useAnimatedImage) {
        host._video?.pause();
        delete host.dataset.videoReady;
        host._setAnimatedImage(true);
        continue;
      }
      const video = host._createVideo();
      const promise = video.play();
      if (promise?.catch) promise.catch(() => { delete host.dataset.videoReady; });
    }
  }
  function release(host) {
    if (!host) return;
    const video = host._video;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.replaceChildren();
      video.load();
    }
    host._image.removeAttribute('src');
    host.remove();
  }
  function sync() {
    const active = root.dataset.siteTheme === THEME;
    if (!active) {
      activated = false;clearTimeout(scrollTimer);scrolling=false;delete root.dataset.themeScrolling;
      clearInterval(motionWatch);
      motionWatch = null;
      visibility?.disconnect();
      visibility = null;
      release(backdrop); release(portrait);
      backdrop = portrait = null;
      return;
    }
    if (!document.body) return;
    if (!backdrop) {
      backdrop = createMedia('glass-cosmos-backdrop', 'world-poster.webp', 'world-loop.mp4', 'video/mp4');
      backdrop.id = 'glassCosmosBackdrop';
      document.body.prepend(backdrop);
    }
    const profile = document.getElementById('kusaProfile');
    if (profile && !portrait) {
      portrait = createMedia('glass-theme-portrait', 'profile-poster.png', 'profile-normal.webm', 'video/webm', 'profile-loop.webp');
      profile.append(portrait);
      profileVisible = true;
      if ('IntersectionObserver' in window) {
        visibility = new IntersectionObserver(entries => {
          profileVisible = entries[0]?.isIntersecting !== false;
          updatePlayback();
        }, {rootMargin: '80px'});
        visibility.observe(profile);
      }
    }
    activated = true;
    updatePlayback();
    if (!motionWatch) {
      // Some WebKit/Chromium versions can update MediaQueryList.matches without
      // delivering its change event during a media/resource transition. Read
      // one boolean per second only while this theme is active; touch media
      // only when the user's preference actually changed.
      motionWatch = setInterval(() => {
        if (motion.matches !== appliedMotion) updatePlayback();
      }, 1000);
    }
  }
  // Freeze the current decorative movie frame during scrolling, then resume it.
  function scrollSettled(){scrollTimer=0;scrolling=false;delete root.dataset.themeScrolling;updatePlayback();}
  document.addEventListener('scroll',()=>{
    if(!activated)return;
    if(!scrolling){scrolling=true;root.dataset.themeScrolling='true';updatePlayback();}
    clearTimeout(scrollTimer);scrollTimer=setTimeout(scrollSettled,180);
  },{capture:true,passive:true});
  new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['data-site-theme']});
  document.addEventListener('visibilitychange', updatePlayback);
  if (motion.addEventListener) motion.addEventListener('change', updatePlayback);
  else motion.addListener?.(updatePlayback);
  window.addEventListener('pagehide', () => {
    for (const host of [backdrop, portrait]) {
      host?._video?.pause();
      host?._setAnimatedImage(false);
    }
  });
  window.addEventListener('pageshow', sync);
  for (const type of ['kusa-theme-changed','kusa-theme-applied','kusa-player-changed']) window.addEventListener(type, sync);
  function observeGameWindows(){for(const id of ['kusa-pachi-window','pachiSelectionWindow']){const n=document.getElementById(id);if(n)new MutationObserver(updatePlayback).observe(n,{attributes:true,attributeFilter:['open']});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeGameWindows,{once:true});else observeGameWindows();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, {once: true});
  else sync();
})();
