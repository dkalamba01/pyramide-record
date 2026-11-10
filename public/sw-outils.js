/* Hors ligne pour la page Outils : réseau d'abord, copie en cache si pas de connexion. */
const C='pr-outils-v1',OK=/\/pages\/outils|\/css\/|\/js\/main\.js|\/assets\/images\/logo|fonts\.(googleapis|gstatic)\.com/;
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x.startsWith('pr-outils')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!OK.test(r.url))return;
  e.respondWith(fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('/pages/outils.html'):undefined))))});
