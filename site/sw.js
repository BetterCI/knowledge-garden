// 发布内容或代码后，递增 CACHE_VERSION；新版完整缓存成功后才可切换。
const CACHE_VERSION = 'garden-2026-10-06-2';
const FILES = ['./','./index.html','./styles.css','./app.js','./content.js','./core.js','./storage.js','./manifest.webmanifest','./assets/garden.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(FILES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))));
});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const relative='./'+url.pathname.slice(scope.pathname.length);
  // 只处理列出的应用资源，学习记录始终存于 IndexedDB，与缓存版本独立。
  if(!FILES.includes(relative))return;
  event.respondWith(caches.open(CACHE_VERSION).then(async cache=>{
    const cached=await cache.match(new Request(new URL(relative,self.registration.scope)));
    return cached||fetch(event.request);
  }));
});
