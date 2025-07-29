<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  pull: [distance: number]
  release: []
  refresh: []
}>()

// デフォルト値
const pullThreshold = props.threshold || 80
const maxPullDistance = props.maxPull || 150

// 状態管理
const isPulling = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const containerRef = ref<HTMLElement>()

// タッチ追跡
let startY = 0
let currentY = 0
let scrollTop = 0

// プル状態
const pullState = ref<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle')

// タッチ開始
const handleTouchStart = (e: TouchEvent) => {
  if (props.disabled || isRefreshing.value) return
  
  const scrollElement = containerRef.value
  if (!scrollElement) return
  
  // スクロール位置が最上部の場合のみプル可能
  scrollTop = scrollElement.scrollTop
  if (scrollTop > 0) return
  
  startY = e.touches[0].clientY
  isPulling.value = true
}

// タッチ移動
const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || props.disabled || isRefreshing.value) return
  
  currentY = e.touches[0].clientY
  const distance = currentY - startY
  
  // 下にプルしている場合のみ処理
  if (distance > 0) {
    // デフォルトのスクロールを防止
    e.preventDefault()
    
    // プル距離を計算（最大値で制限、減衰効果を適用）
    const dampening = 0.5
    const actualDistance = Math.min(
      distance * dampening,
      maxPullDistance
    )
    
    pullDistance.value = actualDistance
    
    // プル状態を更新
    if (actualDistance >= pullThreshold) {
      pullState.value = 'ready'
    } else {
      pullState.value = 'pulling'
    }
    
    emit('pull', actualDistance)
  }
}

// タッチ終了
const handleTouchEnd = async () => {
  if (!isPulling.value || props.disabled) return
  
  isPulling.value = false
  emit('release')
  
  // しきい値を超えている場合はリフレッシュ実行
  if (pullDistance.value >= pullThreshold && !isRefreshing.value) {
    isRefreshing.value = true
    pullState.value = 'refreshing'
    
    // 触覚フィードバック
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 10, 20])
    }
    
    try {
      emit('refresh')
      await props.onRefresh()
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      // リフレッシュ完了
      setTimeout(() => {
        isRefreshing.value = false
        pullDistance.value = 0
        pullState.value = 'idle'
      }, 300)
    }
  } else {
    // しきい値未満の場合は元に戻す
    pullDistance.value = 0
    pullState.value = 'idle'
  }
}

// スクロールイベント（プル中のスクロールを防止）
const handleScroll = (e: Event) => {
  if (isPulling.value && pullDistance.value > 0) {
    e.preventDefault()
  }
}

// ライフサイクル
onMounted(() => {
  const container = containerRef.value
  if (!container) return
  
  container.addEventListener('touchstart', handleTouchStart, { passive: true })
  container.addEventListener('touchmove', handleTouchMove, { passive: false })
  container.addEventListener('touchend', handleTouchEnd, { passive: true })
  container.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  container.addEventListener('scroll', handleScroll, { passive: false })
})

onUnmounted(() => {
  const container = containerRef.value
  if (!container) return
  
  container.removeEventListener('touchstart', handleTouchStart)
  container.removeEventListener('touchmove', handleTouchMove)
  container.removeEventListener('touchend', handleTouchEnd)
  container.removeEventListener('touchcancel', handleTouchEnd)
  container.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="pull-to-refresh">
    <!-- プルインジケーター -->
    <div 
      class="pull-indicator"
      :style="{
        transform: `translateY(${pullDistance}px)`,
        opacity: Math.min(pullDistance / pullThreshold, 1)
      }"
    >
      <div :class="['indicator-content', `state-${pullState}`]">
        <!-- アイドル/プル中 -->
        <div v-if="pullState === 'idle' || pullState === 'pulling'" class="indicator-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M12 20L8 16M12 20L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <!-- リリース準備完了 -->
        <div v-else-if="pullState === 'ready'" class="indicator-icon ready">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M12 4L8 8M12 4L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <!-- リフレッシュ中 -->
        <div v-else-if="pullState === 'refreshing'" class="indicator-spinner">
          <div class="spinner"></div>
        </div>
        
        <div class="indicator-text">
          <span v-if="pullState === 'pulling'">下に引いて更新</span>
          <span v-else-if="pullState === 'ready'">離して更新</span>
          <span v-else-if="pullState === 'refreshing'">更新中...</span>
        </div>
      </div>
    </div>
    
    <!-- コンテンツエリア -->
    <div 
      ref="containerRef"
      class="pull-content"
      :style="{
        transform: `translateY(${isRefreshing ? pullThreshold : pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 300ms ease-out'
      }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pull-to-refresh {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.pull-indicator {
  position: absolute;
  top: -60px;
  left: 0;
  right: 0;
  height: 60px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  transition: transform 300ms ease-out, opacity 300ms ease-out;
  pointer-events: none;
  z-index: 10;
}

.indicator-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  
  color: rgba(255, 255, 255, 0.8);
  transition: all var(--transition-normal);
}

.indicator-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  transition: transform var(--transition-normal);
}

.indicator-icon svg {
  width: 100%;
  height: 100%;
  transition: transform var(--transition-normal);
}

.state-pulling .indicator-icon svg {
  transform: translateY(2px);
}

.state-ready .indicator-icon {
  transform: scale(1.2);
}

.state-ready .indicator-icon svg {
  transform: rotate(180deg);
  color: var(--primary-light);
}

.indicator-spinner {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--primary-light);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.indicator-text {
  font-size: var(--text-xs);
  font-weight: 500;
  text-align: center;
  opacity: 0.8;
}

.pull-content {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  
  will-change: transform;
  background: var(--bg-primary);
}

/* 慣性スクロールの調整 */
.pull-content {
  scroll-behavior: smooth;
}

/* iOS バウンススクロール無効化 */
.pull-content {
  overscroll-behavior-y: contain;
}

/* ダークモード対応 */
@media (prefers-color-scheme: light) {
  .indicator-content {
    color: rgba(0, 0, 0, 0.8);
  }
  
  .spinner {
    border-color: rgba(0, 0, 0, 0.3);
    border-top-color: var(--primary-dark);
  }
  
  .pull-content {
    background: white;
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .pull-indicator,
  .pull-content {
    transition: none !important;
  }
  
  .spinner {
    animation: none;
    border-color: var(--primary-light);
  }
}
</style>