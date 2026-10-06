const V='pedidos-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(['./','./index.html'])))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});

self.addEventListener('push',e=>{
 let d={};try{d=e.data.json()}catch(_){}
 const x=Object.assign({},d.data,d.notification);
 e.waitUntil(self.registration.showNotification(x.title||'Pedidos DFR',{body:x.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:x.tag||undefined,data:{url:x.url||'./'},vibrate:[200,100,200]}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus' in c)return c.focus()}return clients.openWindow(e.notification.data.url||'./')}));
});
