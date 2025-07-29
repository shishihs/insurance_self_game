/**
 * Service Worker for 人生充実ゲーム PWA
 * 
 * 機能:
 * - オフライン対応
 * - キャッシュ戦略
 * - バックグラウンド同期
 * - プッシュ通知（将来対応）
 */

const CACHE_NAME = 'life-fulfillment-v1';
const STATIC_CACHE_NAME = 'life-fulfillment-static-v1';
const DYNAMIC_CACHE_NAME = 'life-fulfillment-dynamic-v1';

// キャッシュするファイルのリスト
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // CSS・JSファイルは動的に追加される
];

// キャッシュしないパス
const EXCLUDE_PATHS = [
  '/api/',
  '/ws/',
  '.hot-update.',
  'chrome-extension://',
  'webpack',
];

// インストールイベント
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// アクティベートイベント
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    // 古いキャッシュを削除
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('life-fulfillment-') && 
                   cacheName !== STATIC_CACHE_NAME &&
                   cacheName !== DYNAMIC_CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// フェッチイベント
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 除外パスのチェック
  if (EXCLUDE_PATHS.some(path => url.href.includes(path))) {
    return;
  }
  
  // ナビゲーションリクエスト（HTMLページ）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功時はキャッシュを更新
          return caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
        })
        .catch(() => {
          // オフライン時はキャッシュから返す
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // キャッシュにない場合はオフラインページを返す
              return caches.match('/');
            });
        })
    );
    return;
  }
  
  // 静的アセット（CSS、JS、画像など）
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            // キャッシュがある場合は返す
            return response;
          }
          
          // キャッシュがない場合はネットワークから取得
          return fetch(request)
            .then((response) => {
              // 成功レスポンスのみキャッシュ
              if (!response || response.status !== 200) {
                return response;
              }
              
              // レスポンスをキャッシュに保存
              return caches.open(STATIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(request, response.clone());
                  return response;
                });
            });
        })
    );
    return;
  }
  
  // その他のリクエスト（API等）
  event.respondWith(
    fetch(request)
      .then((response) => {
        // ネットワークから取得できた場合
        if (!response || response.status !== 200) {
          return response;
        }
        
        // 動的キャッシュに保存
        return caches.open(DYNAMIC_CACHE_NAME)
          .then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから返す
        return caches.match(request);
      })
  );
});

// メッセージイベント（キャッシュ更新等）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting on message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Clearing cache');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// バックグラウンド同期（将来実装用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-game-data') {
    event.waitUntil(syncGameData());
  }
});

// ゲームデータの同期（将来実装用）
async function syncGameData() {
  // ローカルストレージのゲームデータをサーバーと同期
  console.log('[Service Worker] Syncing game data...');
}

// プッシュ通知（将来実装用）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'プレイを再開しましょう！',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'play',
        title: 'プレイ',
        icon: '/icon-play-96x96.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icon-close-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('人生充実ゲーム', options)
  );
});

// 通知クリックイベント
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});