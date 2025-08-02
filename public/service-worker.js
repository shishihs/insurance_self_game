/* eslint-disable no-console */
/**
 * Enhanced Service Worker for 人生充実ゲーム PWA
 * 
 * 機能:
 * - 最適化されたキャッシュ戦略（Stale While Revalidate）
 * - インテリジェントなプリキャッシング
 * - パフォーマンス重視のリソース管理
 * - オフライン体験の向上
 * - バックグラウンド同期
 * - プッシュ通知対応
 */

const CACHE_VERSION = '3.0';
const CACHE_NAME = `life-fulfillment-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `life-fulfillment-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `life-fulfillment-dynamic-v${CACHE_VERSION}`;
const IMAGES_CACHE_NAME = `life-fulfillment-images-v${CACHE_VERSION}`;
const API_CACHE_NAME = `life-fulfillment-api-v${CACHE_VERSION}`;

// 必須の静的ファイル（即座にキャッシュ）
// GitHub Pagesのサブディレクトリに対応
const BASE_PATH = '/insurance_self_game';
const CRITICAL_STATIC_FILES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/favicon.ico`,
  `${BASE_PATH}/favicon.svg`
].filter(url => {
  // 存在しないファイルを除外するためのフィルタ
  return !url.includes('undefined') && !url.includes('null');
});

// プリキャッシュするファイル（バックグラウンドでキャッシュ）
const PRECACHE_FILES = [
  // アプリケーションの主要CSS・JSファイルは自動検出
];

// キャッシュしないパス
const EXCLUDE_PATHS = [
  '/api/realtime/',
  '/ws/',
  '.hot-update.',
  'chrome-extension://',
  'webpack',
  'sockjs-node',
  '__webpack',
];

// キャッシュ期間設定（秒） - パフォーマンス最適化
const CACHE_EXPIRY = {
  static: 7 * 24 * 60 * 60, // 7日（長めにキャッシュ）
  dynamic: 24 * 60 * 60, // 24時間
  images: 30 * 24 * 60 * 60, // 30日（画像は長期キャッシュ）
  api: 5 * 60, // 5分（APIは短めに）
};

// デバイス性能の検出（拡張版）
const getDeviceCapability = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  
  // ネットワーク品質の評価
  const effectiveType = connection?.effectiveType || '4g';
  const downlink = connection?.downlink || 10;
  const rtt = connection?.rtt || 100;
  
  return {
    isLowEnd: memory <= 2 || cores <= 2,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1.5,
    isHighPerformance: memory >= 8 && cores >= 8 && downlink >= 10,
    memory,
    cores,
    effectiveType,
    downlink,
    rtt,
    // パフォーマンススコアの算出
    performanceScore: Math.min(100, (memory * 10 + cores * 5 + Math.min(downlink * 5, 50)))
  };
};

// インストールイベント
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Enhanced Version...');
  
  event.waitUntil(
    (async () => {
      try {
        // 重要な静的ファイルを即座にキャッシュ
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        console.log('[Service Worker] Pre-caching critical static files');
        
        // 個別にキャッシュを試みる（エラーを回避）
        const cachePromises = CRITICAL_STATIC_FILES.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await staticCache.put(url, response);
              console.log(`[Service Worker] Cached: ${url}`);
            } else {
              console.warn(`[Service Worker] Failed to cache ${url}: ${response.status}`);
            }
          } catch (error) {
            console.warn(`[Service Worker] Could not cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        
        // デバイス性能を評価
        const deviceInfo = getDeviceCapability();
        console.log('[Service Worker] Device capability:', deviceInfo);
        
        // 高性能デバイスの場合のみ、追加のプリキャッシュを実行
        if (!deviceInfo.isLowEnd && !deviceInfo.isSlowConnection) {
          await precacheAdditionalAssets();
        }
        
        console.log('[Service Worker] Installation complete, skipping waiting');
        return self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Installation failed:', error);
        throw error;
      }
    })()
  );
});

// 追加アセットのプリキャッシュ（パフォーマンス最適化版）
async function precacheAdditionalAssets() {
  try {
    const deviceInfo = getDeviceCapability();
    
    // キャッシュの準備
    const cachePromises = [
      caches.open(IMAGES_CACHE_NAME),
      caches.open(DYNAMIC_CACHE_NAME),
      caches.open(API_CACHE_NAME)
    ];
    
    await Promise.all(cachePromises);
    
    // 高性能デバイスの場合は重要なリソースをプリロード
    if (deviceInfo.isHighPerformance) {
      const criticalResources = [
        '/favicon.svg',
        // 他の重要なリソースを追加可能
      ];
      
      await Promise.allSettled(
        criticalResources.map(resource => 
          fetch(resource).then(response => {
            if (response.ok) {
              const cache = caches.open(STATIC_CACHE_NAME);
              cache.then(c => c.put(resource, response.clone()));
            }
            return response;
          }).catch(() => {})
        )
      );
    }
    
    console.log(`[Service Worker] Additional caches prepared (Performance Score: ${deviceInfo.performanceScore})`);
  } catch (error) {
    console.warn('[Service Worker] Failed to prepare additional caches:', error);
  }
}

// アクティベートイベント
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Enhanced Version...');
  
  event.waitUntil(
    (async () => {
      try {
        // 現在有効なキャッシュ名のリスト
        const validCaches = [
          STATIC_CACHE_NAME,
          DYNAMIC_CACHE_NAME,
          IMAGES_CACHE_NAME,
          API_CACHE_NAME
        ];
        
        // 古いキャッシュを削除
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('life-fulfillment-') && 
                   !validCaches.includes(cacheName);
          })
          .map(cacheName => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        // 期限切れエントリの削除
        await cleanExpiredCacheEntries();
        
        console.log('[Service Worker] Cache cleanup complete');
        console.log('[Service Worker] Claiming clients');
        
        return self.clients.claim();
      } catch (error) {
        console.error('[Service Worker] Activation failed:', error);
        throw error;
      }
    })()
  );
});

// 期限切れキャッシュエントリの削除
async function cleanExpiredCacheEntries() {
  const cacheNames = [DYNAMIC_CACHE_NAME, IMAGES_CACHE_NAME, API_CACHE_NAME];
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cachedDate = response.headers.get('sw-cached-date');
          if (cachedDate) {
            const cacheAge = (Date.now() - parseInt(cachedDate)) / 1000;
            const expiry = getExpiry(request.url);
            
            if (cacheAge > expiry) {
              console.log('[Service Worker] Removing expired cache entry:', request.url);
              await cache.delete(request);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[Service Worker] Failed to clean cache ${cacheName}:`, error);
    }
  }
}

// URLに基づいた有効期限の取得
function getExpiry(url) {
  if (url.includes('/api/')) return CACHE_EXPIRY.api;
  if (url.includes('.jpg') || url.includes('.png') || url.includes('.svg')) return CACHE_EXPIRY.images;
  if (url.includes('.js') || url.includes('.css')) return CACHE_EXPIRY.static;
  return CACHE_EXPIRY.dynamic;
}

// フェッチイベント - 高度なキャッシュ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 除外パスのチェック
  if (EXCLUDE_PATHS.some(path => url.href.includes(path))) {
    return;
  }
  
  // リクエストタイプに基づいた処理
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// ナビゲーションリクエストの処理（HTML）
async function handleNavigationRequest(request) {
  try {
    // Network First with Cache Fallback
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      // 成功時はキャッシュを更新
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // オフライン時はキャッシュから返す
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // メインページをフォールバックとして返す
    return caches.match('/') || new Response('オフライン', { status: 503 });
  }
}

// 静的アセットの処理（JS、CSS）
async function handleStaticAsset(request) {
  // Stale While Revalidate戦略
  const cached = await caches.match(request);
  const networkResponsePromise = fetchAndCache(request, STATIC_CACHE_NAME);
  
  if (cached) {
    // キャッシュがある場合は即座に返し、バックグラウンドで更新
    networkResponsePromise.catch(() => {
      // ネットワークエラーは無視（キャッシュが有効）
    });
    return cached;
  }
  
  // キャッシュがない場合はネットワークを待つ
  try {
    return await networkResponsePromise;
  } catch (error) {
    return new Response('Asset not available', { status: 503 });
  }
}

// 画像の処理
async function handleImageRequest(request) {
  // Cache First with Network Fallback
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    return await fetchAndCache(request, IMAGES_CACHE_NAME);
  } catch (error) {
    // 画像が取得できない場合のフォールバック
    return new Response('', { status: 204 });
  }
}

// APIリクエストの処理
async function handleApiRequest(request) {
  // Network First with Cache Fallback (短期間)
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      // APIレスポンスをキャッシュ（短期間）
      const cache = await caches.open(API_CACHE_NAME);
      const responseToCache = response.clone();
      
      // キャッシュ日時を追加
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, cachedResponse);
      return response;
    }
    
    throw new Error('API response not ok');
  } catch (error) {
    // ネットワークエラー時はキャッシュから返す
    const cached = await caches.match(request);
    if (cached) {
      // キャッシュされたAPIレスポンスに古いデータであることを示すヘッダーを追加
      const headers = new Headers(cached.headers);
      headers.set('sw-from-cache', 'true');
      
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
    
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 動的リクエストの処理
async function handleDynamicRequest(request) {
  // Stale While Revalidate
  const cached = await caches.match(request);
  const networkResponsePromise = fetchAndCache(request, DYNAMIC_CACHE_NAME);
  
  if (cached) {
    networkResponsePromise.catch(() => {});
    return cached;
  }
  
  try {
    return await networkResponsePromise;
  } catch (error) {
    return new Response('Content not available', { status: 503 });
  }
}

// フェッチしてキャッシュするヘルパー関数
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  if (!response || response.status !== 200) {
    return response;
  }
  
  const cache = await caches.open(cacheName);
  const responseToCache = response.clone();
  
  // キャッシュ日時を追加
  const headers = new Headers(responseToCache.headers);
  headers.set('sw-cached-date', Date.now().toString());
  
  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers
  });
  
  cache.put(request, cachedResponse);
  return response;
}

// リクエストタイプの判定関数
function isStaticAsset(request) {
  return request.destination === 'style' || 
         request.destination === 'script' || 
         request.destination === 'manifest';
}

function isImageRequest(request) {
  return request.destination === 'image' ||
         request.url.includes('.jpg') ||
         request.url.includes('.png') ||
         request.url.includes('.svg') ||
         request.url.includes('.webp');
}

function isApiRequest(request) {
  return request.url.includes('/api/') && !request.url.includes('/api/realtime/');
}

// メッセージイベント（高度なキャッシュ制御）
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      console.log('[Service Worker] Skip waiting on message');
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      console.log('[Service Worker] Clearing all caches');
      event.waitUntil(clearAllCaches());
      break;
      
    case 'CLEAR_CACHE_TYPE':
      console.log(`[Service Worker] Clearing ${data.cacheType} cache`);
      event.waitUntil(clearCacheByType(data.cacheType));
      break;
      
    case 'GET_CACHE_INFO':
      event.waitUntil(getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      }));
      break;
      
    case 'PRELOAD_RESOURCES':
      console.log('[Service Worker] Preloading resources:', data.resources);
      event.waitUntil(preloadResources(data.resources));
      break;
      
    case 'UPDATE_PERFORMANCE_MODE':
      console.log('[Service Worker] Performance mode updated:', data.mode);
      // パフォーマンスモードに応じた設定変更
      updatePerformanceSettings(data.mode);
      break;
      
    case 'CACHE_ACCESSIBILITY_STATE':
      console.log('[Service Worker] Caching accessibility state');
      // アクセシビリティ設定のキャッシュ（今後の実装用）
      break;
      
    case 'CLEAR_DNS_CACHE':
      console.log('[Service Worker] DNS cache clear requested (no-op)');
      // DNSキャッシュはService Workerでは制御不可
      break;
      
    default:
      console.log('[Service Worker] Unknown message type:', data.type);
  }
});

// 全キャッシュクリア
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[Service Worker] All caches cleared');
  } catch (error) {
    console.error('[Service Worker] Failed to clear caches:', error);
  }
}

// タイプ別キャッシュクリア
async function clearCacheByType(cacheType) {
  const cacheMap = {
    'static': STATIC_CACHE_NAME,
    'dynamic': DYNAMIC_CACHE_NAME,
    'images': IMAGES_CACHE_NAME,
    'api': API_CACHE_NAME
  };
  
  const cacheName = cacheMap[cacheType];
  if (cacheName) {
    try {
      await caches.delete(cacheName);
      console.log(`[Service Worker] ${cacheType} cache cleared`);
    } catch (error) {
      console.error(`[Service Worker] Failed to clear ${cacheType} cache:`, error);
    }
  }
}

// キャッシュ情報の取得
async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys();
    const info = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      let totalSize = 0;
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const text = await response.text();
          totalSize += text.length;
        }
      }
      
      info[cacheName] = {
        entries: requests.length,
        estimatedSize: totalSize
      };
    }
    
    return info;
  } catch (error) {
    console.error('[Service Worker] Failed to get cache info:', error);
    return {};
  }
}

// リソースのプリロード
async function preloadResources(resources) {
  try {
    for (const resource of resources) {
      const request = new Request(resource);
      
      if (isImageRequest(request)) {
        await fetchAndCache(request, IMAGES_CACHE_NAME);
      } else if (isStaticAsset(request)) {
        await fetchAndCache(request, STATIC_CACHE_NAME);
      } else {
        await fetchAndCache(request, DYNAMIC_CACHE_NAME);
      }
    }
    console.log('[Service Worker] Resources preloaded successfully');
  } catch (error) {
    console.error('[Service Worker] Failed to preload resources:', error);
  }
}

// パフォーマンス設定の更新
function updatePerformanceSettings(mode) {
  // パフォーマンスモードに応じてキャッシュ設定を調整
  if (mode === 'low') {
    // 低性能モード: より積極的なキャッシュクリア
    cleanExpiredCacheEntries();
  }
}

// バックグラウンド同期（改善版）
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-game-data':
      event.waitUntil(syncGameData());
      break;
    case 'cleanup-cache':
      event.waitUntil(cleanExpiredCacheEntries());
      break;
    case 'preload-assets':
      event.waitUntil(backgroundPreload());
      break;
    default:
      console.log('[Service Worker] Unknown sync tag:', event.tag);
  }
});

// ゲームデータの同期
async function syncGameData() {
  try {
    console.log('[Service Worker] Starting game data sync...');
    
    // ローカルストレージのゲームデータを取得
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_GAME_DATA',
        timestamp: Date.now()
      });
    }
    
    console.log('[Service Worker] Game data sync completed');
  } catch (error) {
    console.error('[Service Worker] Game data sync failed:', error);
  }
}

// バックグラウンドプリロード
async function backgroundPreload() {
  try {
    const deviceInfo = getDeviceCapability();
    
    // 低性能デバイスではスキップ
    if (deviceInfo.isLowEnd || deviceInfo.isSlowConnection) {
      return;
    }
    
    // 一般的なアセットをプリロード
    const assetsToPreload = [
      '/manifest.json',
      // 他の重要なアセットを動的に追加可能
    ];
    
    await preloadResources(assetsToPreload);
    console.log('[Service Worker] Background preload completed');
  } catch (error) {
    console.error('[Service Worker] Background preload failed:', error);
  }
}

// プッシュ通知（強化版）
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData = {
    title: '人生充実ゲーム',
    body: 'プレイを再開しましょう！',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'game-notification',
    renotify: true,
    requireInteraction: false,
    timestamp: Date.now(),
    data: {
      url: '/',
      timestamp: Date.now(),
      action: 'resume-game'
    },
    actions: [
      {
        action: 'play',
        title: 'プレイ',
        icon: '/favicon.ico'
      },
      {
        action: 'stats',
        title: '統計',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/favicon.ico'
      }
    ],
    // 通知の外観設定
    silent: false,
    vibrate: [200, 100, 200],
    // 進歩的な機能
    showTrigger: true
  };
  
  // プッシュデータがある場合は解析
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.warn('[Service Worker] Failed to parse push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  // 振動パターンの設定
  const vibrationPattern = notificationData.priority === 'high' 
    ? [200, 100, 200, 100, 200] 
    : [100, 50, 100];
  
  notificationData.vibrate = vibrationPattern;
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// 通知クリックイベント（改善版）
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';
  
  switch (event.action) {
    case 'play':
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
          // 既存のウィンドウがある場合はフォーカス
          for (const client of clientList) {
            if (client.url === targetUrl && 'focus' in client) {
              // ゲーム開始メッセージを送信
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: 'start-game',
                timestamp: Date.now()
              });
              return client.focus();
            }
          }
          
          // 新しいウィンドウを開く
          if (clients.openWindow) {
            return clients.openWindow(`${targetUrl  }?action=start-game`);
          }
        })
      );
      break;
      
    case 'stats':
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
          for (const client of clientList) {
            if (client.url.includes(targetUrl) && 'focus' in client) {
              // 統計画面表示メッセージを送信
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: 'show-stats',
                timestamp: Date.now()
              });
              return client.focus();
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow(`${targetUrl  }?action=stats`);
          }
        })
      );
      break;
      
    case 'close':
      // 何もしない（通知を閉じるのみ）
      break;
      
    default:
      // デフォルトアクション（通知をクリック）
      event.waitUntil(
        clients.openWindow(targetUrl)
      );
  }
});

// 定期的なキャッシュクリーンアップ
setInterval(() => {
  cleanExpiredCacheEntries().catch(error => {
    console.warn('[Service Worker] Periodic cache cleanup failed:', error);
  });
}, 60 * 60 * 1000); // 1時間ごと

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});

console.log('[Service Worker] Enhanced Service Worker loaded successfully');