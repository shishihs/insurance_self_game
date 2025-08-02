<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getDeviceInfo, vibrate } from '@/game/input/TouchGestureManager'
import MobileBottomNav from './MobileBottomNav.vue'
import SwipeNavigation from './SwipeNavigation.vue'

interface GameSection {
  id: string
  label: string
  icon: string
  component: string
  preload?: boolean
}

const props = defineProps<{
  sections: GameSection[]
  initialSection?: string
  enablePreloading?: boolean
  performanceMode?: 'auto' | 'low' | 'high'
}>()

const emit = defineEmits<{
  sectionChange: [sectionId: string]
  performanceModeChange: [mode: 'low' | 'high']
}>()

// デバイス情報と設定
const deviceInfo = getDeviceInfo()
const currentSection = ref(props.initialSection || props.sections[0]?.id)
const isLoading = ref(false)
const renderQueue = ref<string[]>([])
const preloadedComponents = ref(new Set<string>())

// パフォーマンスモード
const performanceMode = computed(() => {
  if (props.performanceMode === 'auto') {
    return deviceInfo.performanceLevel === 'low' ? 'low' : 'high'
  }
  return props.performanceMode || 'high'
})

// ナビゲーション用のアイテム
const navItems = computed(() => 
  props.sections.map(section => ({
    id: section.id,
    label: section.label,
    icon: section.icon
  }))
)

const currentSectionIndex = computed(() => 
  props.sections.findIndex(section => section.id === currentSection.value)
)

// レンダリング最適化
const shouldRenderSection = (sectionId: string) => {
  if (performanceMode.value === 'low') {
    // 低性能モードでは現在のセクションのみレンダリング
    return sectionId === currentSection.value
  } 
    // 高性能モードでは隣接セクションも事前レンダリング
    const currentIndex = currentSectionIndex.value
    const sectionIndex = props.sections.findIndex(s => s.id === sectionId)
    return Math.abs(sectionIndex - currentIndex) <= 1
  
}

// セクション切り替え
const changeSection = async (sectionId: string) => {
  if (sectionId === currentSection.value) return
  
  isLoading.value = true
  
  // コンポーネントのプリロード（必要に応じて）
  if (props.enablePreloading && !preloadedComponents.value.has(sectionId)) {
    await preloadComponent(sectionId)
  }
  
  currentSection.value = sectionId
  
  // 振動フィードバック
  vibrate(20)
  
  // レンダリングキューの更新
  updateRenderQueue()
  
  emit('sectionChange', sectionId)
  
  // ローディング状態をリセット
  await nextTick()
  setTimeout(() => {
    isLoading.value = false
  }, 100)
}

// コンポーネントプリロード
const preloadComponent = async (sectionId: string) => {
  const section = props.sections.find(s => s.id === sectionId)
  if (!section) return
  
  try {
    // 動的インポートでコンポーネントをプリロード
    await import(`../${section.component}.vue`)
    preloadedComponents.value.add(sectionId)
  } catch (error) {
    console.warn(`Failed to preload component ${section.component}:`, error)
  }
}

// レンダリングキューの更新
const updateRenderQueue = () => {
  const currentIndex = currentSectionIndex.value
  const newQueue: string[] = []
  
  if (performanceMode.value === 'high') {
    // 高性能モード: 前後のセクションも含める
    for (let i = Math.max(0, currentIndex - 1); i <= Math.min(props.sections.length - 1, currentIndex + 1); i++) {
      newQueue.push(props.sections[i].id)
    }
  } else {
    // 低性能モード: 現在のセクションのみ
    if (props.sections[currentIndex]) {
      newQueue.push(props.sections[currentIndex].id)
    }
  }
  
  renderQueue.value = newQueue
}

// ナビゲーションハンドラー
const handleNavSelect = (sectionId: string) => {
  changeSection(sectionId)
}

const handleSwipeChange = (index: number, item: any) => {
  const section = props.sections[index]
  if (section) {
    changeSection(section.id)
  }
}

// パフォーマンス監視
const performanceObserver = ref<PerformanceObserver | null>(null)

const setupPerformanceMonitoring = () => {
  if ('PerformanceObserver' in window && performanceMode.value === 'auto') {
    performanceObserver.value = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      let hasLongTask = false
      
      for (const entry of entries) {
        if (entry.entryType === 'longtask' && entry.duration > 50) {
          hasLongTask = true
          break
        }
      }
      
      if (hasLongTask && performanceMode.value !== 'low') {
        emit('performanceModeChange', 'low')
      }
    })
    
    try {
      performanceObserver.value.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
    }
  }
}

// Wake Lock（画面スリープ防止）
const wakeLock = ref<WakeLockSentinel | null>(null)

const requestWakeLock = async () => {
  if ('wakeLock' in navigator && deviceInfo.supportsWakeLock) {
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
    } catch (error) {
      console.warn('Wake lock request failed:', error)
    }
  }
}

const releaseWakeLock = () => {
  if (wakeLock.value) {
    wakeLock.value.release()
    wakeLock.value = null
  }
}

// ライフサイクル
onMounted(async () => {
  // 初期レンダリングキューの設定
  updateRenderQueue()
  
  // パフォーマンス監視の開始
  setupPerformanceMonitoring()
  
  // Wake Lockの要求
  await requestWakeLock()
  
  // プリロードが有効な場合、隣接コンポーネントをプリロード
  if (props.enablePreloading && performanceMode.value === 'high') {
    const currentIndex = currentSectionIndex.value
    const preloadTasks = []
    
    // 前のセクション
    if (currentIndex > 0) {
      preloadTasks.push(preloadComponent(props.sections[currentIndex - 1].id))
    }
    
    // 次のセクション
    if (currentIndex < props.sections.length - 1) {
      preloadTasks.push(preloadComponent(props.sections[currentIndex + 1].id))
    }
    
    await Promise.all(preloadTasks)
  }
})

onUnmounted(() => {
  if (performanceObserver.value) {
    performanceObserver.value.disconnect()
  }
  releaseWakeLock()
})

// 公開API
defineExpose({
  changeSection,
  currentSection: computed(() => currentSection.value),
  performanceMode,
  deviceInfo
})
</script>

<template>
  <div 
    class="optimized-game-interface"
    :class="{ 
      [`performance-${performanceMode}`]: true,
      'is-loading': isLoading 
    }"
  >
    <!-- メインコンテンツエリア -->
    <div class="interface-content">
      <!-- デスクトップ用ナビゲーション（タブレット以上） -->
      <div class="desktop-nav" v-if="!deviceInfo.isMobile">
        <nav class="nav-tabs">
          <button
            v-for="section in sections"
            :key="section.id"
            :class="[
              'nav-tab',
              { 'is-active': section.id === currentSection }
            ]"
            @click="changeSection(section.id)"
          >
            <span class="tab-icon">{{ section.icon }}</span>
            <span class="tab-label">{{ section.label }}</span>
          </button>
        </nav>
      </div>
      
      <!-- モバイル用スワイプナビゲーション -->
      <SwipeNavigation
        v-if="deviceInfo.isMobile && sections.length > 1"
        :items="navItems"
        :active-index="currentSectionIndex"
        :show-indicators="true"
        :show-preview="performanceMode === 'high'"
        @change="handleSwipeChange"
        class="mobile-swipe-nav"
      >
        <template #item="{ item, index, isActive }">
          <!-- セクションコンテンツをここでレンダリング -->
          <div 
            v-if="shouldRenderSection(item.id)"
            class="section-content"
            :class="{ 'is-active': isActive }"
          >
            <component 
              :is="sections[index].component"
              v-if="renderQueue.includes(item.id)"
              :key="item.id"
              :performance-mode="performanceMode"
              :device-info="deviceInfo"
            />
            <div v-else class="section-placeholder">
              <div class="loading-spinner"></div>
              <p>{{ item.label }}を読み込み中...</p>
            </div>
          </div>
        </template>
      </SwipeNavigation>
      
      <!-- 単一セクション表示（モバイルでスワイプが無効な場合） -->
      <div 
        v-if="!deviceInfo.isMobile || sections.length === 1"
        class="single-section-view"
      >
        <component 
          :is="sections.find(s => s.id === currentSection)?.component"
          v-if="sections.find(s => s.id === currentSection)"
          :performance-mode="performanceMode"
          :device-info="deviceInfo"
        />
      </div>
    </div>
    
    <!-- モバイル用ボトムナビゲーション -->
    <MobileBottomNav
      v-if="deviceInfo.isMobile && sections.length > 1"
      :items="navItems"
      :active-id="currentSection"
      @select="handleNavSelect"
      class="interface-bottom-nav"
    />
    
    <!-- パフォーマンスインジケーター（開発時のみ） -->
    <div 
      v-if="$dev && performanceMode === 'auto'"
      class="performance-indicator"
      :class="`performance-${deviceInfo.performanceLevel}`"
    >
      <div class="indicator-icon">
        {{ deviceInfo.performanceLevel === 'high' ? '⚡' : 
           deviceInfo.performanceLevel === 'medium' ? '🔶' : '🔋' }}
      </div>
      <div class="indicator-text">
        {{ deviceInfo.performanceLevel.toUpperCase() }}
      </div>
    </div>
    
    <!-- ローディングオーバーレイ -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner large"></div>
        <p>セクションを切り替え中...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.optimized-game-interface {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.interface-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* デスクトップナビゲーション */
.desktop-nav {
  background: var(--bg-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 var(--space-md);
}

.nav-tabs {
  display: flex;
  gap: var(--space-xs);
  max-width: 800px;
  margin: 0 auto;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md) var(--space-lg);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: 8px 8px 0 0;
  position: relative;
}

.nav-tab:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
}

.nav-tab.is-active {
  color: var(--primary-light);
  background: var(--bg-primary);
}

.nav-tab.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-gradient);
}

.tab-icon {
  font-size: var(--text-lg);
}

.tab-label {
  font-weight: 500;
}

/* モバイルスワイプナビゲーション */
.mobile-swipe-nav {
  height: 100%;
}

.section-content {
  width: 100%;
  height: 100%;
  opacity: 0.7;
  transition: opacity var(--transition-normal);
}

.section-content.is-active {
  opacity: 1;
}

.section-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.7);
}

/* 単一セクション表示 */
.single-section-view {
  width: 100%;
  height: 100%;
}

/* ボトムナビゲーション調整 */
.interface-bottom-nav {
  flex-shrink: 0;
}

/* パフォーマンスインジケーター */
.performance-indicator {
  position: fixed;
  top: var(--space-md);
  right: var(--space-md);
  z-index: 1000;
  
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  
  font-size: var(--text-xs);
  color: white;
}

.performance-indicator.performance-high {
  border: 2px solid #10b981;
}

.performance-indicator.performance-medium {
  border: 2px solid #f59e0b;
}

.performance-indicator.performance-low {
  border: 2px solid #ef4444;
}

.indicator-icon {
  font-size: var(--text-sm);
}

/* ローディング */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 100;
  
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--primary-light);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-sm);
}

.loading-spinner.large {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* パフォーマンスモード別スタイル */
.performance-low {
  /* 低性能モード: アニメーションを削減 */
}

.performance-low * {
  transition: none !important;
  animation: none !important;
}

.performance-high {
  /* 高性能モード: 追加エフェクト */
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }
}

@media (min-width: 769px) {
  .mobile-swipe-nav,
  .interface-bottom-nav {
    display: none;
  }
}

/* ランドスケープモード */
@media (orientation: landscape) and (max-height: 600px) {
  .performance-indicator {
    top: var(--space-xs);
    right: var(--space-xs);
    font-size: 10px;
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .optimized-game-interface * {
    transition: none !important;
    animation: none !important;
  }
  
  .loading-spinner {
    animation: none !important;
    border-top-color: var(--primary-light);
    border-right-color: var(--primary-light);
  }
}
</style>