<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getOptimizedTouchConfig, TouchGestureManager, vibrate } from '@/game/input/TouchGestureManager'
import type { SwipeDetail } from '@/game/input/TouchGestureManager'

interface NavigationItem {
  id: string
  label: string
  icon: string
  component?: string
  disabled?: boolean
}

const props = defineProps<{
  items: NavigationItem[]
  activeIndex?: number
  showIndicators?: boolean
  infinite?: boolean
  showPreview?: boolean
}>()

const emit = defineEmits<{
  change: [index: number, item: NavigationItem]
  swipe: [direction: 'left' | 'right', fromIndex: number, toIndex: number]
}>()

// 状態管理
const currentIndex = ref(props.activeIndex || 0)
const dragOffset = ref(0)
const isDragging = ref(false)
const isTransitioning = ref(false)
const touchConfig = getOptimizedTouchConfig()

// DOM参照
const containerRef = ref<HTMLElement>()
const gestureManager = ref<TouchGestureManager | null>(null)

// 計算プロパティ
const currentItem = computed(() => props.items[currentIndex.value])
const canSwipeLeft = computed(() => props.infinite || currentIndex.value > 0)
const canSwipeRight = computed(() => props.infinite || currentIndex.value < props.items.length - 1)

// スタイル計算
const containerStyle = computed(() => {
  const baseTransform = `translateX(${-currentIndex.value * 100 + dragOffset.value}%)`
  
  return {
    transform: baseTransform,
    transition: isDragging.value ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    width: `${props.items.length * 100}%`
  }
})

const getItemStyle = (index: number) => {
  const isActive = index === currentIndex.value
  const distance = Math.abs(index - currentIndex.value)
  
  let opacity = 1
  let scale = 1
  let zIndex = 1
  
  if (!isActive) {
    opacity = Math.max(0.3, 1 - distance * 0.3)
    scale = Math.max(0.8, 1 - distance * 0.1)
    zIndex = Math.max(1, 10 - distance)
  }
  
  if (isDragging.value && props.showPreview) {
    // ドラッグ中は隣接するアイテムのプレビューを表示
    const dragProgress = Math.abs(dragOffset.value) / 100
    if (Math.abs(index - currentIndex.value) === 1) {
      opacity = Math.max(opacity, dragProgress * 0.7)
      scale = Math.max(scale, 0.8 + dragProgress * 0.2)
    }
  }
  
  return {
    opacity,
    transform: `scale(${scale})`,
    zIndex
  }
}

// ジェスチャーハンドラー
const setupGestureHandlers = () => {
  if (!containerRef.value) return
  
  gestureManager.value = new TouchGestureManager(containerRef.value, {
    ...touchConfig,
    dragThreshold: 5,
    swipeThreshold: 80
  })
  
  gestureManager.value.on('drag', (event) => {
    const detail = event.detail
    isDragging.value = true
    
    // ドラッグオフセットを計算（パーセンテージ）
    const containerWidth = containerRef.value?.clientWidth || window.innerWidth
    let newOffset = (detail.totalX / containerWidth) * 100
    
    // 境界制限
    if (!props.infinite) {
      if (currentIndex.value === 0 && newOffset > 0) {
        newOffset = Math.min(newOffset, 20) // 左端での制限
      }
      if (currentIndex.value === props.items.length - 1 && newOffset < 0) {
        newOffset = Math.max(newOffset, -20) // 右端での制限
      }
    }
    
    dragOffset.value = newOffset
    
    // 軽い振動フィードバック（一定距離に達したとき）
    if (Math.abs(newOffset) > 25) {
      vibrate(5)
    }
  })
  
  gestureManager.value.on('dragend', () => {
    const threshold = 30 // スワイプと判定する閾値
    let targetIndex = currentIndex.value
    
    if (dragOffset.value > threshold && canSwipeLeft.value) {
      targetIndex = props.infinite && currentIndex.value === 0 
        ? props.items.length - 1 
        : currentIndex.value - 1
    } else if (dragOffset.value < -threshold && canSwipeRight.value) {
      targetIndex = props.infinite && currentIndex.value === props.items.length - 1 
        ? 0 
        : currentIndex.value + 1
    }
    
    navigateToIndex(targetIndex)
  })
  
  gestureManager.value.on('swipe', (event) => {
    const detail = event.detail as SwipeDetail
    
    if (detail.direction === 'left' && canSwipeRight.value) {
      const targetIndex = props.infinite && currentIndex.value === props.items.length - 1 
        ? 0 
        : currentIndex.value + 1
      navigateToIndex(targetIndex)
      emit('swipe', 'left', currentIndex.value, targetIndex)
    } else if (detail.direction === 'right' && canSwipeLeft.value) {
      const targetIndex = props.infinite && currentIndex.value === 0 
        ? props.items.length - 1 
        : currentIndex.value - 1
      navigateToIndex(targetIndex)
      emit('swipe', 'right', currentIndex.value, targetIndex)
    }
  })
}

// ナビゲーション
const navigateToIndex = (index: number) => {
  if (index < 0 || index >= props.items.length || index === currentIndex.value) {
    resetDrag()
    return
  }
  
  if (props.items[index].disabled) {
    resetDrag()
    return
  }
  
  isTransitioning.value = true
  currentIndex.value = index
  resetDrag()
  
  // 強い振動フィードバック
  vibrate([30, 10, 30])
  
  emit('change', index, props.items[index])
  
  setTimeout(() => {
    isTransitioning.value = false
  }, 300)
}

const resetDrag = () => {
  isDragging.value = false
  dragOffset.value = 0
}

// インジケータークリック
const handleIndicatorClick = (index: number) => {
  navigateToIndex(index)
}

// 公開メソッド
const goToNext = () => {
  if (canSwipeRight.value) {
    const targetIndex = props.infinite && currentIndex.value === props.items.length - 1 
      ? 0 
      : currentIndex.value + 1
    navigateToIndex(targetIndex)
  }
}

const goToPrevious = () => {
  if (canSwipeLeft.value) {
    const targetIndex = props.infinite && currentIndex.value === 0 
      ? props.items.length - 1 
      : currentIndex.value - 1
    navigateToIndex(targetIndex)
  }
}

// ライフサイクル
onMounted(() => {
  setupGestureHandlers()
})

onUnmounted(() => {
  if (gestureManager.value) {
    gestureManager.value.destroy()
  }
})

// 公開API
defineExpose({
  goToNext,
  goToPrevious,
  navigateToIndex,
  currentIndex: computed(() => currentIndex.value),
  currentItem
})
</script>

<template>
  <div class="swipe-navigation">
    <!-- メインコンテンツエリア -->
    <div 
      ref="containerRef" 
      class="swipe-container"
      :class="{ 'is-dragging': isDragging, 'is-transitioning': isTransitioning }"
    >
      <div class="swipe-items" :style="containerStyle">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="swipe-item"
          :class="{ 
            'is-active': index === currentIndex,
            'is-disabled': item.disabled 
          }"
          :style="getItemStyle(index)"
        >
          <div class="item-content">
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-label">{{ item.label }}</div>
            
            <!-- カスタムコンテンツスロット -->
            <slot 
              name="item" 
              :item="item" 
              :index="index" 
              :isActive="index === currentIndex"
            >
              <div class="default-content">
                <p>{{ item.label }}</p>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </div>
    
    <!-- インジケーター -->
    <div v-if="showIndicators && items.length > 1" class="swipe-indicators">
      <button
        v-for="(item, index) in items"
        :key="`indicator-${item.id}`"
        class="indicator"
        :class="{ 
          'is-active': index === currentIndex,
          'is-disabled': item.disabled 
        }"
        @click="handleIndicatorClick(index)"
        :aria-label="`${item.label}に移動`"
        :disabled="item.disabled"
      >
        <span class="indicator-dot"></span>
      </button>
    </div>
    
    <!-- スワイプヒント（最初のアイテムでのみ表示） -->
    <div v-if="currentIndex === 0 && items.length > 1" class="swipe-hint">
      <div class="hint-arrows">
        <span class="hint-arrow left" v-if="canSwipeLeft">←</span>
        <span class="hint-text">スワイプで切り替え</span>
        <span class="hint-arrow right" v-if="canSwipeRight">→</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swipe-navigation {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.swipe-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: pan-y; /* 垂直スクロールのみ許可 */
}

.swipe-container.is-dragging {
  cursor: grabbing;
}

.swipe-items {
  display: flex;
  height: 100%;
  will-change: transform;
}

.swipe-item {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.swipe-item.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.item-content {
  width: 100%;
  max-width: 400px;
  padding: var(--space-xl);
  text-align: center;
}

.item-icon {
  font-size: 4rem;
  margin-bottom: var(--space-lg);
  opacity: 0.9;
}

.item-label {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.default-content {
  padding: var(--space-lg);
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
}

/* インジケーター */
.swipe-indicators {
  position: absolute;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-xs);
  z-index: 10;
}

.indicator {
  width: 12px;
  height: 12px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.indicator.is-disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.indicator-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all var(--transition-fast);
}

.indicator.is-active .indicator-dot {
  background: var(--primary-light);
  transform: scale(1.5);
}

.indicator:hover:not(.is-disabled) .indicator-dot {
  background: rgba(255, 255, 255, 0.8);
  transform: scale(1.2);
}

/* スワイプヒント */
.swipe-hint {
  position: absolute;
  bottom: calc(var(--space-lg) + 40px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  
  color: rgba(255, 255, 255, 0.6);
  font-size: var(--text-sm);
  pointer-events: none;
  
  animation: hint-fade 3s ease-in-out infinite;
}

.hint-arrows {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.hint-arrow {
  font-size: var(--text-lg);
  font-weight: bold;
  animation: hint-bounce 1.5s ease-in-out infinite alternate;
}

.hint-arrow.left {
  animation-delay: 0s;
}

.hint-arrow.right {
  animation-delay: 0.75s;
}

@keyframes hint-fade {
  0%, 70%, 100% { opacity: 0.6; }
  85% { opacity: 1; }
}

@keyframes hint-bounce {
  0% { transform: translateX(0); }
  100% { transform: translateX(3px); }
}

.hint-arrow.left {
  animation-name: hint-bounce-left;
}

@keyframes hint-bounce-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-3px); }
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .item-content {
    padding: var(--space-lg);
  }
  
  .item-icon {
    font-size: 3rem;
    margin-bottom: var(--space-md);
  }
  
  .item-label {
    font-size: var(--text-lg);
  }
}

/* ランドスケープモード */
@media (orientation: landscape) and (max-height: 600px) {
  .item-icon {
    font-size: 2.5rem;
    margin-bottom: var(--space-sm);
  }
  
  .item-label {
    font-size: var(--text-md);
  }
  
  .swipe-indicators {
    bottom: var(--space-sm);
  }
  
  .swipe-hint {
    bottom: calc(var(--space-sm) + 30px);
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .swipe-items {
    transition: none !important;
  }
  
  .swipe-item {
    transition: opacity var(--transition-fast) !important;
  }
  
  .hint-arrow,
  .swipe-hint {
    animation: none !important;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: light) {
  .swipe-hint {
    color: rgba(0, 0, 0, 0.6);
  }
  
  .indicator-dot {
    background: rgba(0, 0, 0, 0.3);
  }
  
  .indicator.is-active .indicator-dot {
    background: var(--primary-dark);
  }
}
</style>