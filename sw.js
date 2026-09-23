"use strict";
const CACHE="garage-hub-shell-v1.3.1";
const SHELL=["/","/index.html","/style.css","/app.js","/manifest.webmanifest","/icon-192.png","/icon-512.png","/apple-touch-icon.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/")||request.headers.has("Authorization"))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(()=>caches.match("/index.html")));
    return;
  }
  if(SHELL.includes(url.pathname))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
