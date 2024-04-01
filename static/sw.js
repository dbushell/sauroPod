/// <reference lib="WebWorker"/>

const CACHE = '%DEPLOY_HASH%';

const PRECACHE = [
  `/app.min.css?v=${CACHE}`,
  `/offline.js?v=${CACHE}`,
  `/512x512.svg?v=${CACHE}`,
  `/fonts/Sora-Variable.woff2?v=${CACHE}`,
  `/fonts/RedditMono-Light.woff2?v=${CACHE}`
];

const offscreen = new OffscreenCanvas(512, 512);

self.addEventListener('install', (ev) => {
  self.skipWaiting();
  ev.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(self.clients.claim());
  const clearCaches = async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) {
        await caches.delete(key);
      }
    }
  };
  ev.waitUntil(clearCaches());
});

const handleFetch = async (ev) => {
  // Try cache first
  const cache = await caches.open(CACHE);
  let response = await cache.match(ev.request);
  if (response?.headers.has('x-sw-cache')) {
    const date = new Date(response.headers.get('x-sw-cache') ?? 0);
    const age = Date.now() - date.getTime();
    if (age < 1000 * 60 * 60 * 24 * 2) {
      return response;
    }
  }
  // Try fetch and cache
  response = await fetch(ev.request);
  if (!response.ok || response.status !== 200 || response.type !== 'basic') {
    return response;
  }
  // Get response body and headers
  let blob = await response.blob();
  const {status, statusText} = response;
  const headers = new Headers(response.headers);
  headers.set('x-sw-cache', new Date().toISOString());
  // Resize images for cache
  const url = new URL(ev.request.url);
  if (url.pathname.startsWith('/api/artwork/')) {
    offscreen.getContext('2d').drawImage(await createImageBitmap(blob), 0, 0, 512, 512);
    blob = await offscreen.convertToBlob({
      type: 'image/png'
    });
    headers.set('content-type', 'image/png');
    headers.set('content-length', blob.size);
  }
  // Cache new response
  response = new Response(await blob.arrayBuffer(), {
    status,
    statusText,
    headers
  });
  await cache.put(ev.request, response.clone());
  return response;
};

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') {
    return;
  }
  const url = new URL(ev.request.url);
  let cachable = false;
  if (PRECACHE.includes(url.pathname)) {
    cachable = true;
  }
  if (url.pathname.startsWith('/_/immutable/')) {
    cachable = true;
  }
  if (url.searchParams.get('v') === '%DEPLOY_HASH%') {
    cachable = true;
  }
  if (url.pathname.startsWith('/api/artwork/')) {
    cachable = true;
  }
  if (!cachable) {
    return;
  }
  ev.respondWith(handleFetch(ev));
});
