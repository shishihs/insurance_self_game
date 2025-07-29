<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TouchGestureManager } from '@/game/input/TouchGestureManager'
import type { SwipeDetail, DragDetail } from '@/game/input/TouchGestureManager'

interface Card {
  id: string
  content: any
}

const props = defineProps<{
  cards: Card[]
  maxVisibleCards?: number
  swipeThreshold?: number
  onSwipeLeft?: (card: Card) => void
  onSwipeRight?: (card: Card) => void
  onSwipeUp?: (card: Card) => void
}>()

const emit = defineEmits<{
  swipe: [direction: 'left' | 'right' | 'up', card: Card]
  cardChange: [index: number]
}>()

// デフォルト値
const maxVisible = computed(() => props.maxVisibleCards || 3)
const threshold = computed(() => props.swipeThreshold || 100)

// 状態管理
const currentIndex = ref(0)
const dragOffset = ref({ x: 0, y: 0 })
const dragRotation = ref(0)
const isDragging = ref(false)
const swipeDirection = ref<'left' | 'right' | 'up' | null>(null)

// DOM参照
const containerRef = ref<HTMLElement>()
let gestureManager: TouchGestureManager | null = null

// 表示するカード
const visibleCards = computed(() => {
  const start = currentIndex.value
  const end = Math.min(start + maxVisible.value, props.cards.length)
  return props.cards.slice(start, end).map((card, index) => ({
    ...card,
    stackIndex: index,
    isTop: index === 0
  }))
})

// カードのスタイル計算
const getCardStyle = (stackIndex: number) => {
  const scale = 1 - (stackIndex * 0.05)
  const translateY = stackIndex * 10
  const opacity = 1 - (stackIndex * 0.1)
  
  if (stackIndex === 0 && isDragging.value) {
    return {
      transform: `
        translate(${dragOffset.value.x}px, ${dragOffset.value.y}px)
        rotate(${dragRotation.value}deg)
        scale(${scale})
      `,
      opacity: opacity,
      zIndex: maxVisible.value - stackIndex,
      transition: 'none'
    }
  }
  
  return {
    transform: `
      translateY(${translateY}px)
      scale(${scale})
    `,
    opacity: opacity,
    zIndex: maxVisible.value - stackIndex,
    transition: 'all var(--transition-normal)'
  }
}

// スワイプインジケーターのスタイル
const swipeIndicatorStyle = computed(() => {
  if (!isDragging.value) return { opacity: 0 }
  
  const absX = Math.abs(dragOffset.value.x)
  const absY = Math.abs(dragOffset.value.y)
  const opacity = Math.min(Math.max(absX, absY) / threshold.value, 1)
  
  return {
    opacity: opacity * 0.8,
    transform: `scale(${0.8 + opacity * 0.4})`
  }
})

// ジェスチャーハンドラーの設定
const setupGestureHandlers = () => {
  if (!containerRef.value) return
  
  gestureManager = new TouchGestureManager(containerRef.value, {
    dragThreshold: 5,
    swipeThreshold: threshold.value,
    swipeVelocityThreshold: 0.5
  })
  
  // ドラッグ開始
  gestureManager.on('drag', (event) => {
    const detail = event.detail as DragDetail
    if (event.target?.closest('.swipeable-card:first-child')) {
      isDragging.value = true
      dragOffset.value = {
        x: detail.totalX,
        y: detail.totalY
      }
      // 回転角度（横方向のドラッグ量に応じて）
      dragRotation.value = detail.totalX * 0.1
      
      // スワイプ方向の判定
      const absX = Math.abs(detail.totalX)
      const absY = Math.abs(detail.totalY)
      
      if (absX > absY) {
        swipeDirection.value = detail.totalX > 0 ? 'right' : 'left'
      } else if (absY > threshold.value / 2) {
        swipeDirection.value = detail.totalY < 0 ? 'up' : null
      } else {
        swipeDirection.value = null
      }
    }
  })
  
  // ドラッグ終了
  gestureManager.on('dragend', (event) => {
    const detail = event.detail as DragDetail
    if (!isDragging.value) return
    
    const absX = Math.abs(detail.totalX)
    const absY = Math.abs(detail.totalY)
    
    // スワイプ判定
    if (absX > threshold.value || absY > threshold.value) {
      let direction: 'left' | 'right' | 'up' | null = null
      
      if (absX > absY) {
        direction = detail.totalX > 0 ? 'right' : 'left'
      } else if (detail.totalY < -threshold.value) {
        direction = 'up'
      }
      
      if (direction) {
        handleSwipe(direction)
        return
      }
    }
    
    // スワイプしきい値に達していない場合は元に戻す
    resetDrag()
  })
  
  // クイックスワイプ
  gestureManager.on('swipe', (event) => {
    const detail = event.detail as SwipeDetail
    if (event.target?.closest('.swipeable-card:first-child')) {
      switch (detail.direction) {
        case 'left':
        case 'right':
        case 'up':
          handleSwipe(detail.direction)
          break
      }
    }
  })
}

// スワイプ処理
const handleSwipe = (direction: 'left' | 'right' | 'up') => {
  if (currentIndex.value >= props.cards.length - 1) return
  
  const currentCard = props.cards[currentIndex.value]
  
  // スワイプアニメーション
  swipeDirection.value = direction
  isDragging.value = true
  
  // アニメーション用のオフセット設定
  switch (direction) {
    case 'left':
      dragOffset.value = { x: -window.innerWidth, y: 0 }
      dragRotation.value = -30
      props.onSwipeLeft?.(currentCard)
      break
    case 'right':
      dragOffset.value = { x: window.innerWidth, y: 0 }
      dragRotation.value = 30
      props.onSwipeRight?.(currentCard)
      break
    case 'up':
      dragOffset.value = { x: 0, y: -window.innerHeight }
      dragRotation.value = 0
      props.onSwipeUp?.(currentCard)
      break
  }
  
  // 触覚フィードバック
  if ('vibrate' in navigator) {
    navigator.vibrate(50)
  }
  
  // イベント発火
  emit('swipe', direction, currentCard)
  
  // 次のカードへ
  setTimeout(() => {
    currentIndex.value++
    resetDrag()
    emit('cardChange', currentIndex.value)
  }, 300)
}

// ドラッグ状態のリセット
const resetDrag = () => {
  isDragging.value = false
  dragOffset.value = { x: 0, y: 0 }
  dragRotation.value = 0
  swipeDirection.value = null
}

// 前のカードに戻る
const goToPrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    emit('cardChange', currentIndex.value)
  }
}

// ライフサイクル
onMounted(() => {
  setupGestureHandlers()
})

onUnmounted(() => {
  if (gestureManager) {
    gestureManager.destroy()
  }
})

// 公開メソッド
defineExpose({
  goToPrevious,
  currentIndex: computed(() => currentIndex.value)
})
</script>

<template>
  <div ref="containerRef" class="swipeable-card-stack">
    <div class="cards-container">
      <div
        v-for="(card, index) in visibleCards"
        :key="card.id"
        :class="[
          'swipeable-card',
          {
            'is-top': card.isTop,
            'is-dragging': card.isTop && isDragging,
            'swipe-left': card.isTop && swipeDirection === 'left',
            'swipe-right': card.isTop && swipeDirection === 'right',
            'swipe-up': card.isTop && swipeDirection === 'up'
          }
        ]"
        :style="getCardStyle(card.stackIndex)"
      >
        <!-- カードコンテンツ -->
        <slot name="card" :card="card" :index="currentIndex + index">
          <div class="default-card-content">
            {{ card.content }}
          </div>
        </slot>
        
        <!-- スワイプインジケーター（トップカードのみ） -->
        <template v-if="card.isTop">
          <div 
            v-if="swipeDirection === 'left'"
            class="swipe-indicator swipe-indicator-left"
            :style="swipeIndicatorStyle"
          >
            <span class="indicator-icon">❌</span>
          </div>
          <div 
            v-if="swipeDirection === 'right'"
            class="swipe-indicator swipe-indicator-right"
            :style="swipeIndicatorStyle"
          >
            <span class="indicator-icon">✅</span>
          </div>
          <div 
            v-if="swipeDirection === 'up'"
            class="swipe-indicator swipe-indicator-up"
            :style="swipeIndicatorStyle"
          >
            <span class="indicator-icon">⭐</span>
          </div>
        </template>
      </div>
    </div>
    
    <!-- カード枚数インジケーター -->
    <div class="card-counter">
      {{ currentIndex + 1 }} / {{ cards.length }}
    </div>
    
    <!-- 操作ヒント（最初のカードのみ） -->
    <div v-if="currentIndex === 0" class="swipe-hint">
      <span class="hint-arrow left">←</span>
      <span class="hint-text">スワイプで選択</span>
      <span class="hint-arrow right">→</span>
    </div>
  </div>
</template>

<style scoped>
.swipeable-card-stack {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}

.cards-container {
  position: relative;
  width: 100%;
  height: 100%;
  padding: var(--space-lg);
}

.swipeable-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  
  width: calc(100% - var(--space-xl) * 2);
  max-width: 400px;
  height: 70%;
  max-height: 600px;
  
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  
  box-shadow: var(--shadow-card);
  cursor: grab;
  
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

.swipeable-card.is-dragging {
  cursor: grabbing;
}

.default-card-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--space-xl);
  color: white;
  font-size: var(--text-lg);
  text-align: center;
}

/* スワイプインジケーター */
.swipe-indicator {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 100px;
  height: 100px;
  border-radius: 50%;
  
  transition: all var(--transition-fast);
  pointer-events: none;
}

.swipe-indicator-left {
  top: 50%;
  left: var(--space-lg);
  transform: translateY(-50%);
  background: rgba(239, 68, 68, 0.9);
}

.swipe-indicator-right {
  top: 50%;
  right: var(--space-lg);
  transform: translateY(-50%);
  background: rgba(34, 197, 94, 0.9);
}

.swipe-indicator-up {
  top: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(251, 191, 36, 0.9);
}

.indicator-icon {
  font-size: 48px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* カウンター */
.card-counter {
  position: absolute;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  
  padding: var(--space-xs) var(--space-md);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  
  color: white;
  font-size: var(--text-sm);
  font-weight: 500;
}

/* スワイプヒント */
.swipe-hint {
  position: absolute;
  bottom: calc(var(--space-lg) + 50px);
  left: 50%;
  transform: translateX(-50%);
  
  display: flex;
  align-items: center;
  gap: var(--space-md);
  
  color: rgba(255, 255, 255, 0.6);
  font-size: var(--text-sm);
  
  animation: hint-pulse 2s ease-in-out infinite;
}

.hint-arrow {
  font-size: var(--text-xl);
  animation: hint-arrow 1s ease-in-out infinite alternate;
}

.hint-arrow.left {
  animation-delay: 0s;
}

.hint-arrow.right {
  animation-delay: 0.5s;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes hint-arrow {
  0% { transform: translateX(0); }
  100% { transform: translateX(5px); }
}

.hint-arrow.left {
  animation-name: hint-arrow-left;
}

@keyframes hint-arrow-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-5px); }
}

/* カード非表示時のアニメーション */
.swipeable-card.swipe-left {
  animation: swipe-out-left 300ms ease-out forwards;
}

.swipeable-card.swipe-right {
  animation: swipe-out-right 300ms ease-out forwards;
}

.swipeable-card.swipe-up {
  animation: swipe-out-up 300ms ease-out forwards;
}

@keyframes swipe-out-left {
  to {
    transform: translateX(-150%) rotate(-30deg);
    opacity: 0;
  }
}

@keyframes swipe-out-right {
  to {
    transform: translateX(150%) rotate(30deg);
    opacity: 0;
  }
}

@keyframes swipe-out-up {
  to {
    transform: translateY(-150%);
    opacity: 0;
  }
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .swipeable-card {
    width: calc(100% - var(--space-md) * 2);
    height: 75%;
  }
  
  .swipe-indicator {
    width: 80px;
    height: 80px;
  }
  
  .indicator-icon {
    font-size: 36px;
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .swipeable-card {
    transition: opacity var(--transition-fast) !important;
  }
  
  .swipe-hint,
  .hint-arrow {
    animation: none !important;
  }
  
  .swipeable-card.swipe-left,
  .swipeable-card.swipe-right,
  .swipeable-card.swipe-up {
    animation: none !important;
    opacity: 0;
  }
}
</style>