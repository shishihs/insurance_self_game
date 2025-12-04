// Empty Service Worker to replace and unregister old PWA Service Worker
self.addEventListener('install', () => {
    console.log('Empty Service Worker installed - unregistering old PWA worker');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Empty Service Worker activated - clearing all caches');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('All caches cleared, unregistering self');
            return self.registration.unregister();
        })
    );
});
