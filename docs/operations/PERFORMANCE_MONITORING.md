# パフォーマンス監視とチューニング

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

insurance_gameプロジェクトのパフォーマンス監視戦略と最適化手法を定義します。優れたユーザー体験を提供するための包括的なパフォーマンス管理を実現します。

## 1. パフォーマンス戦略

### 基本方針
- **ユーザー体験最優先**: プレイヤーの快適性を最重要視
- **継続的監視**: リアルタイムでのパフォーマンス追跡
- **データ駆動**: 測定データに基づく最適化判断
- **予防的対応**: 問題発生前の積極的な改善

### パフォーマンス目標（SLO）
- **First Contentful Paint (FCP)**: 1.8秒以内
- **Largest Contentful Paint (LCP)**: 2.5秒以内
- **First Input Delay (FID)**: 100ms以内
- **Cumulative Layout Shift (CLS)**: 0.1以下
- **Time to Interactive (TTI)**: 3.8秒以内

## 2. Core Web Vitals 監視

### 2.1 リアルタイム測定

#### Web Vitals ライブラリの実装
```javascript
// src/utils/performance-monitor.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  initialize() {
    // Core Web Vitals の監視開始
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));
    
    // カスタムメトリクスの監視
    this.startCustomMetrics();
  }
  
  private handleMetric(metric: Metric) {
    const { name, value, rating } = metric;
    
    // メトリクスを記録
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // 分析データを送信
    this.sendMetric({
      name,
      value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    // しきい値チェック
    this.checkThresholds(name, value, rating);
  }
  
  private sendMetric(data: MetricData) {
    // Google Analytics 4 への送信
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vital', {
        metric_name: data.name,
        metric_value: data.value,
        metric_rating: data.rating
      });
    }
    
    // カスタム分析エンドポイントへの送信
    this.sendToCustomAnalytics(data);
  }
  
  private checkThresholds(name: string, value: number, rating: string) {
    const thresholds = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 }
    };
    
    const threshold = thresholds[name as keyof typeof thresholds];
    if (threshold && value > threshold.poor) {
      this.alertPerformanceIssue(name, value, threshold.poor);
    }
  }
  
  private startCustomMetrics() {
    // ゲーム固有のパフォーマンスメトリクス
    this.monitorGamePerformance();
    this.monitorInteractionLatency();
    this.monitorMemoryUsage();
  }
  
  private monitorGamePerformance() {
    // ゲーム開始時間の測定
    const startTime = performance.now();
    
    window.addEventListener('game-started', () => {
      const gameStartTime = performance.now() - startTime;
      this.sendMetric({
        name: 'game_start_time',
        value: gameStartTime,
        rating: gameStartTime < 1000 ? 'good' : gameStartTime < 2500 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });
  }
  
  private monitorInteractionLatency() {
    // カード選択のレスポンス時間
    let clickStartTime: number;
    
    document.addEventListener('pointerdown', () => {
      clickStartTime = performance.now();
    });
    
    document.addEventListener('click', (event) => {
      if (clickStartTime && event.target?.closest('[data-card]')) {
        const latency = performance.now() - clickStartTime;
        this.sendMetric({
          name: 'card_click_latency',
          value: latency,
          rating: latency < 50 ? 'good' : latency < 100 ? 'needs-improvement' : 'poor',
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }
    });
  }
  
  private monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.sendMetric({
          name: 'memory_usage',
          value: memory.usedJSHeapSize / 1024 / 1024, // MB
          rating: memory.usedJSHeapSize / memory.jsHeapSizeLimit < 0.8 ? 'good' : 'poor',
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }, 30000); // 30秒間隔
    }
  }
}

interface MetricData {
  name: string;
  value: number;
  rating: string;
  timestamp: number;
  url: string;
  userAgent: string;
}
```

### 2.2 Performance Observer の活用

#### 詳細な性能測定
```javascript
// src/utils/performance-observer.ts
export class DetailedPerformanceObserver {
  private observers: PerformanceObserver[] = [];
  
  startObserving() {
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observePaintTiming();
    this.observeLayoutShift();
  }
  
  private observeNavigationTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navigation = entry as PerformanceNavigationTiming;
        
        const metrics = {
          dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp_connect: navigation.connectEnd - navigation.connectStart,
          request_response: navigation.responseEnd - navigation.requestStart,
          dom_parse: navigation.domContentLoadedEventEnd - navigation.responseEnd,
          load_complete: navigation.loadEventEnd - navigation.navigationStart
        };
        
        this.sendNavigationMetrics(metrics);
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
    this.observers.push(observer);
  }
  
  private observeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // 重要なリソースのみ監視
        if (this.isImportantResource(resource.name)) {
          const metrics = {
            name: resource.name,
            size: resource.transferSize,
            load_time: resource.responseEnd - resource.requestStart,
            cache_hit: resource.transferSize === 0,
            type: this.getResourceType(resource.name)
          };
          
          this.sendResourceMetrics(metrics);
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }
  
  private observePaintTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.sendMetric('fcp_detailed', entry.startTime);
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint'] });
    this.observers.push(observer);
  }
  
  private observeLayoutShift() {
    let cumulativeScore = 0;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as LayoutShift;
        
        if (!layoutShift.hadRecentInput) {
          cumulativeScore += layoutShift.value;
          
          this.sendMetric('cls_realtime', cumulativeScore);
          
          // 大きなレイアウトシフトを検出
          if (layoutShift.value > 0.1) {
            this.alertLayoutShift(layoutShift);
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }
  
  private isImportantResource(url: string): boolean {
    const importantPatterns = [
      /\.js$/,
      /\.css$/,
      /\.(png|jpg|jpeg|webp|svg)$/,
      /\/api\//
    ];
    
    return importantPatterns.some(pattern => pattern.test(url));
  }
  
  private getResourceType(url: string): string {
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'stylesheet';
    if (/\.(png|jpg|jpeg|webp|svg)$/.test(url)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }
  
  stopObserving() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}
```

## 3. バンドル分析と最適化

### 3.1 バンドルサイズ監視

#### Webpack Bundle Analyzer の統合
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'game-core': ['./src/domain', './src/game'],
          'ui-components': ['./src/components'],
          'utilities': ['./src/utils']
        }
      }
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500
  }
});
```

#### 自動バンドル監視
```javascript
// scripts/bundle-monitor.js
const fs = require('fs');
const path = require('path');

class BundleMonitor {
  constructor() {
    this.distPath = path.join(__dirname, '../dist');
    this.thresholds = {
      totalSize: 2 * 1024 * 1024, // 2MB
      chunkSize: 500 * 1024,      // 500KB
      assetSize: 1024 * 1024      // 1MB
    };
  }
  
  async analyzeBundleSize() {
    if (!fs.existsSync(this.distPath)) {
      throw new Error('Build directory not found');
    }
    
    const files = this.getAllFiles(this.distPath);
    const analysis = {
      totalSize: 0,
      chunks: [],
      assets: [],
      warnings: []
    };
    
    files.forEach(file => {
      const stats = fs.statSync(file);
      const relativePath = path.relative(this.distPath, file);
      const size = stats.size;
      
      analysis.totalSize += size;
      
      if (file.endsWith('.js')) {
        analysis.chunks.push({ path: relativePath, size });
        
        if (size > this.thresholds.chunkSize) {
          analysis.warnings.push(`Large chunk: ${relativePath} (${this.formatSize(size)})`);
        }
      } else if (file.match(/\.(css|png|jpg|jpeg|webp|svg)$/)) {
        analysis.assets.push({ path: relativePath, size });
        
        if (size > this.thresholds.assetSize) {
          analysis.warnings.push(`Large asset: ${relativePath} (${this.formatSize(size)})`);
        }
      }
    });
    
    if (analysis.totalSize > this.thresholds.totalSize) {
      analysis.warnings.push(`Total bundle size exceeds threshold: ${this.formatSize(analysis.totalSize)}`);
    }
    
    return analysis;
  }
  
  getAllFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        files = files.concat(this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    });
    
    return files;
  }
  
  formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  generateReport(analysis) {
    const report = `
# Bundle Analysis Report

Generated: ${new Date().toISOString()}

## Summary
- **Total Size**: ${this.formatSize(analysis.totalSize)}
- **Chunks**: ${analysis.chunks.length}
- **Assets**: ${analysis.assets.length}
- **Warnings**: ${analysis.warnings.length}

## Largest Chunks
${analysis.chunks
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
  .map(chunk => `- ${chunk.path}: ${this.formatSize(chunk.size)}`)
  .join('\n')}

## Largest Assets
${analysis.assets
  .sort((a, b) => b.size - a.size)
  .slice(0, 10)
  .map(asset => `- ${asset.path}: ${this.formatSize(asset.size)}`)
  .join('\n')}

## Warnings
${analysis.warnings.length > 0 
  ? analysis.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')
  : 'No warnings'}

## Recommendations
${this.generateRecommendations(analysis)}
    `;
    
    return report;
  }
  
  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.totalSize > this.thresholds.totalSize) {
      recommendations.push('Consider implementing code splitting or removing unused dependencies');
    }
    
    const largeChunks = analysis.chunks.filter(chunk => chunk.size > this.thresholds.chunkSize);
    if (largeChunks.length > 0) {
      recommendations.push('Split large chunks into smaller modules');
    }
    
    const largeAssets = analysis.assets.filter(asset => asset.size > this.thresholds.assetSize);
    if (largeAssets.length > 0) {
      recommendations.push('Optimize large assets (compress images, use WebP format)');
    }
    
    return recommendations.length > 0 
      ? recommendations.map(rec => `- ${rec}`).join('\n')
      : 'Bundle size is within acceptable limits';
  }
}

module.exports = BundleMonitor;
```

### 3.2 Code Splitting の実装

#### 動的インポートによる分割
```javascript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/game',
      name: 'Game',
      component: () => import('../views/GameView.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      // プリロードによる最適化
      component: () => import(/* webpackChunkName: "settings" */ '../views/SettingsView.vue')
    },
    {
      path: '/admin',
      name: 'Admin',
      // 条件付きロード
      component: () => {
        if (process.env.NODE_ENV === 'development') {
          return import('../views/AdminView.vue');
        }
        return Promise.reject(new Error('Admin panel not available in production'));
      }
    }
  ]
});

export default router;
```

#### 遅延コンポーネント
```vue
<!-- src/components/LazyGameBoard.vue -->
<template>
  <div class="lazy-game-board">
    <Suspense>
      <template #default>
        <GameBoard v-if="shouldLoadGameBoard" />
      </template>
      <template #fallback>
        <div class="loading-skeleton">
          <div class="skeleton-card" v-for="i in 12" :key="i"></div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from 'vue';

const GameBoard = defineAsyncComponent(() => import('./GameBoard.vue'));
const shouldLoadGameBoard = ref(false);

onMounted(() => {
  // Intersection Observer を使用した遅延ロード
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      shouldLoadGameBoard.value = true;
      observer.disconnect();
    }
  });
  
  observer.observe(document.querySelector('.lazy-game-board')!);
});
</script>
```

## 4. メモリ使用量監視

### 4.1 メモリリーク検出

#### Vue.js メモリリーク監視
```javascript
// src/utils/memory-monitor.ts
export class MemoryMonitor {
  private intervalId: number | null = null;
  private componentCounts = new Map<string, number>();
  
  startMonitoring() {
    if (this.intervalId) return;
    
    this.intervalId = window.setInterval(() => {
      this.checkMemoryUsage();
      this.checkComponentLeaks();
    }, 30000); // 30秒間隔
  }
  
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usagePercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      const memoryData = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        usage_percent: Math.round(usagePercent * 100)
      };
      
      // 使用率が80%を超えた場合アラート
      if (usagePercent > 0.8) {
        this.alertHighMemoryUsage(memoryData);
      }
      
      this.sendMemoryMetrics(memoryData);
    }
  }
  
  private checkComponentLeaks() {
    // Vue コンポーネントの数をカウント
    const currentCounts = this.countVueComponents();
    
    currentCounts.forEach((count, componentName) => {
      const previousCount = this.componentCounts.get(componentName) || 0;
      
      // コンポーネント数が異常に増加している場合
      if (count > previousCount * 2 && count > 10) {
        this.alertPossibleLeak(componentName, previousCount, count);
      }
    });
    
    this.componentCounts = currentCounts;
  }
  
  private countVueComponents(): Map<string, number> {
    const counts = new Map<string, number>();
    
    // DOM内のVueコンポーネントを数える
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      if (element.__vue__) {
        const componentName = element.__vue__.$options.name || 'Anonymous';
        counts.set(componentName, (counts.get(componentName) || 0) + 1);
      }
    });
    
    return counts;
  }
  
  trackEventListeners() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const listenerMap = new WeakMap();
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (!listenerMap.has(this)) {
        listenerMap.set(this, new Map());
      }
      
      const typeListeners = listenerMap.get(this);
      if (!typeListeners.has(type)) {
        typeListeners.set(type, new Set());
      }
      
      typeListeners.get(type).add(listener);
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      const typeListeners = listenerMap.get(this);
      if (typeListeners && typeListeners.has(type)) {
        typeListeners.get(type).delete(listener);
      }
      
      return originalRemoveEventListener.call(this, type, listener, options);
    };
    
    // 定期的にリスナー数をチェック
    setInterval(() => {
      let totalListeners = 0;
      
      // すべての要素のリスナー数をカウント
      document.querySelectorAll('*').forEach(element => {
        const listeners = listenerMap.get(element);
        if (listeners) {
          listeners.forEach(typeListeners => {
            totalListeners += typeListeners.size;
          });
        }
      });
      
      if (totalListeners > 1000) {
        console.warn(`High number of event listeners detected: ${totalListeners}`);
      }
    }, 60000); // 1分間隔
  }
}
```

### 4.2 オブジェクト数監視

#### WeakMap/WeakSet の活用
```javascript
// src/utils/object-pool.ts
export class ObjectPool<T> {
  private pool: T[] = [];
  private create: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize = 100) {
    this.create = createFn;
    this.reset = resetFn;
    this.maxSize = maxSize;
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.create();
  }
  
  release(obj: T) {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }
  
  size(): number {
    return this.pool.length;
  }
  
  clear() {
    this.pool.length = 0;
  }
}

// ゲームオブジェクト用プール
export const cardPool = new ObjectPool(
  () => ({ id: 0, type: '', value: 0, selected: false }),
  (card) => {
    card.id = 0;
    card.type = '';
    card.value = 0;
    card.selected = false;
  }
);
```

## 5. ネットワークパフォーマンス

### 5.1 リソース読み込み最適化

#### Resource Hints の実装
```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- DNS プリフェッチ -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//cdn.jsdelivr.net">
    
    <!-- 重要なリソースのプリロード -->
    <link rel="preload" href="/assets/fonts/game-font.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/images/card-background.webp" as="image">
    
    <!-- 次に必要になるリソースのプリフェッチ -->
    <link rel="prefetch" href="/game">
    <link rel="prefetch" href="/assets/sounds/card-flip.mp3">
    
    <title>Insurance Game</title>
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

#### Service Worker によるキャッシュ戦略
```javascript
// public/sw.js
const CACHE_NAME = 'insurance-game-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/assets/index.js',
  '/assets/index.css',
  '/assets/images/logo.png'
];

// インストール時
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
  );
});

// フェッチ時のキャッシュ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 静的リソースはCache Firstで処理
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
    return;
  }
  
  // HTMLはNetwork Firstで処理
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // 画像はStale While Revalidateで処理
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          const fetchPromise = fetch(request)
            .then(fetchResponse => {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, fetchResponse.clone()));
              return fetchResponse;
            });
          
          return response || fetchPromise;
        })
    );
  }
});
```

### 5.2 画像最適化

#### 次世代フォーマットの活用
```vue
<!-- src/components/OptimizedImage.vue -->
<template>
  <picture class="optimized-image">
    <!-- WebP対応ブラウザ向け -->
    <source :srcset="webpSrcset" type="image/webp">
    <!-- AVIF対応ブラウザ向け -->
    <source :srcset="avifSrcset" type="image/avif">
    <!-- フォールバック -->
    <img 
      :src="fallbackSrc" 
      :alt="alt"
      :loading="lazy ? 'lazy' : 'eager'"
      @load="onLoad"
      @error="onError"
    >
  </picture>
</template>

<script setup lang="ts">
interface Props {
  src: string;
  alt: string;
  sizes?: string;
  lazy?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  sizes: '100vw',
  lazy: true
});

const webpSrcset = computed(() => 
  generateSrcset(props.src, 'webp')
);

const avifSrcset = computed(() => 
  generateSrcset(props.src, 'avif')
);

const fallbackSrc = computed(() => 
  generateOptimizedSrc(props.src, 'jpg')
);

function generateSrcset(src: string, format: string): string {
  const baseName = src.replace(/\.[^/.]+$/, '');
  const sizes = [320, 640, 960, 1280, 1920];
  
  return sizes
    .map(size => `${baseName}_${size}w.${format} ${size}w`)
    .join(', ');
}

function generateOptimizedSrc(src: string, format: string): string {
  const baseName = src.replace(/\.[^/.]+$/, '');
  return `${baseName}_640w.${format}`;
}

function onLoad(event: Event) {
  // パフォーマンス測定
  const img = event.target as HTMLImageElement;
  const loadTime = performance.now() - startTime;
  
  PerformanceMonitor.getInstance().sendMetric({
    name: 'image_load_time',
    value: loadTime,
    rating: loadTime < 1000 ? 'good' : 'poor',
    timestamp: Date.now(),
    url: img.src,
    userAgent: navigator.userAgent
  });
}

function onError(event: Event) {
  console.error('Image failed to load:', event);
}
</script>
```

## 6. パフォーマンステスト

### 6.1 自動化されたパフォーマンステスト

#### Lighthouse CI の設定
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['https://shishihs.github.io/insurance_self_game/'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

#### GitHub Actions での実行
```yaml
# .github/workflows/performance-test.yml
name: Performance Test

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
  schedule:
    - cron: '0 */6 * * *' # 6時間ごと

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.13.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          
      - name: Check performance regression
        run: |
          # 前回の結果と比較してリグレッションをチェック
          node scripts/check-performance-regression.js
```

### 6.2 負荷テスト

#### ユーザーシミュレーション
```javascript
// tests/performance/load-test.js
import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // 30秒で10ユーザーまで増加
    { duration: '1m', target: 10 },   // 1分間10ユーザーを維持
    { duration: '30s', target: 50 },  // 30秒で50ユーザーまで増加
    { duration: '2m', target: 50 },   // 2分間50ユーザーを維持
    { duration: '30s', target: 0 },   // 30秒で0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95%のリクエストが2秒以内
    http_req_failed: ['rate<0.01'],    // エラー率1%未満
  }
};

const BASE_URL = 'https://shishihs.github.io/insurance_self_game';

export default function() {
  // メインページのテスト
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'page contains game content': (r) => r.body.includes('insurance-game'),
  });
  
  sleep(1);
  
  // ゲームページのテスト
  response = http.get(`${BASE_URL}/game`);
  check(response, {
    'game page status is 200': (r) => r.status === 200,
    'game page response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  sleep(2);
}

export function handleSummary(data) {
  return {
    'performance-report.json': JSON.stringify(data, null, 2),
    'performance-report.html': htmlReport(data)
  };
}
```

## 7. パフォーマンス最適化実装

### 7.1 Vue.js 固有の最適化

#### Virtual Scrolling の実装
```vue
<!-- src/components/VirtualScroll.vue -->
<template>
  <div 
    class="virtual-scroll-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="onScroll"
    ref="container"
  >
    <div 
      class="virtual-scroll-spacer"
      :style="{ 
        height: totalHeight + 'px',
        paddingTop: offsetY + 'px'
      }"
    >
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="virtual-scroll-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item.originalIndex"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  buffer?: number;
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5
});

const container = ref<HTMLElement>();
const scrollTop = ref(0);

const totalHeight = computed(() => 
  props.items.length * props.itemHeight
);

const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  const end = Math.min(
    start + Math.ceil(props.containerHeight / props.itemHeight) + props.buffer,
    props.items.length
  );
  
  return {
    start: Math.max(0, start - props.buffer),
    end
  };
});

const visibleItems = computed(() => 
  props.items
    .slice(visibleRange.value.start, visibleRange.value.end)
    .map((item, index) => ({
      ...item,
      originalIndex: visibleRange.value.start + index
    }))
);

const offsetY = computed(() => 
  visibleRange.value.start * props.itemHeight
);

const onScroll = (event: Event) => {
  scrollTop.value = (event.target as HTMLElement).scrollTop;
};
</script>
```

#### メモ化の活用
```javascript
// src/composables/useGameLogic.ts
import { computed, ref, readonly } from 'vue';

export function useGameLogic() {
  const gameState = ref(getInitialGameState());
  
  // 重い計算をメモ化
  const gameScore = computed(() => {
    return expensiveScoreCalculation(gameState.value);
  });
  
  const availableMoves = computed(() => {
    return calculateAvailableMoves(gameState.value);
  });
  
  // パフォーマンス監視付きのアクション
  const makeMove = (move: GameMove) => {
    const startTime = performance.now();
    
    gameState.value = applyMove(gameState.value, move);
    
    const endTime = performance.now();
    PerformanceMonitor.getInstance().sendMetric({
      name: 'move_execution_time',
      value: endTime - startTime,
      rating: (endTime - startTime) < 16 ? 'good' : 'poor', // 60fps基準
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  };
  
  return {
    gameState: readonly(gameState),
    gameScore,
    availableMoves,
    makeMove
  };
}

// メモ化ヘルパー
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // キャッシュサイズ制限
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

const expensiveScoreCalculation = memoize((gameState: GameState) => {
  // 重い計算処理
  return gameState.cards.reduce((total, card) => total + calculateCardValue(card), 0);
});
```

## 8. チェックリスト

### パフォーマンス監視チェックリスト
- [ ] Core Web Vitals の監視が設定されている
- [ ] カスタムメトリクスが実装されている
- [ ] バンドルサイズの監視が動作している
- [ ] メモリ使用量の監視が実装されている
- [ ] パフォーマンステストが自動実行されている

### 最適化実装チェックリスト
- [ ] Code Splitting が適切に実装されている
- [ ] 画像の最適化（WebP、遅延読み込み）が実装されている
- [ ] Service Worker によるキャッシュが設定されている
- [ ] Virtual Scrolling が必要な箇所に実装されている
- [ ] メモ化が重い計算に適用されている

### アラート設定チェックリスト
- [ ] パフォーマンス劣化のアラートが設定されている
- [ ] メモリリークのアラートが設定されている
- [ ] バンドルサイズ増加のアラートが設定されている
- [ ] Core Web Vitals の閾値アラートが設定されている

## 関連ドキュメント

- [監視・アラート設定](./MONITORING_ALERTING.md)
- [デプロイメント手順書](./DEPLOYMENT_PROCEDURES.md)
- [品質保証戦略](../project/QUALITY_ASSURANCE.md)
- [開発原則](../development/PRINCIPLES.md)