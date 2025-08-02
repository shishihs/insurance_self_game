<template>
  <div 
    class="interactive-elements"
    ref="containerRef"
    :class="{ 
      'touch-enabled': touchEnabled,
      'performance-mode': performanceMode,
      'accessibility-mode': accessibilityMode 
    }"
  >
    <!-- ドラッグ可能な要素のコンテナ -->
    <div class="draggable-container" ref="draggableContainer">
      <slot name="draggable" />
    </div>

    <!-- ドロップゾーンのコンテナ -->
    <div class="drop-zones-container" ref="dropZonesContainer">
      <slot name="drop-zones" />
    </div>

    <!-- ビジュアルフィードバック用のオーバーレイ -->
    <div class="feedback-overlay" ref="feedbackOverlay">
      <!-- ドラッグ中のゴーストイメージ -->
      <div 
        class="drag-ghost"
        ref="dragGhost"
        :style="ghostStyle"
        v-show="isDragging"
      >
        <div class="ghost-content" ref="ghostContent"></div>
      </div>

      <!-- ドロップ予測の表示 -->
      <div 
        class="drop-preview"
        ref="dropPreview"
        :class="{ active: showDropPreview, valid: isValidDrop }"
        :style="dropPreviewStyle"
      ></div>

      <!-- ホバーエフェクト -->
      <div 
        class="hover-indicator"
        ref="hoverIndicator"
        :style="hoverStyle"
        v-show="showHoverIndicator"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

// 型定義
interface DragData {
  element: HTMLElement
  data: any
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  offset: { x: number; y: number }
}

interface DropZone {
  element: HTMLElement
  bounds: DOMRect
  accepts: string[]
  onDrop?: (data: any) => void
  onDragEnter?: () => void
  onDragLeave?: () => void
}

interface TouchInfo {
  identifier: number
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface Props {
  enableDrag?: boolean
  enableDrop?: boolean
  enableHover?: boolean
  enableTouch?: boolean
  performanceMode?: boolean
  accessibilityMode?: boolean
  dragThreshold?: number
  hoverDelay?: number
  snapToGrid?: boolean
  gridSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  enableDrag: true,
  enableDrop: true,
  enableHover: true,
  enableTouch: true,
  performanceMode: false,
  accessibilityMode: false,
  dragThreshold: 5,
  hoverDelay: 300,
  snapToGrid: false,
  gridSize: 20
})

const emit = defineEmits<{
  dragStart: [data: any, element: HTMLElement]
  dragEnd: [data: any, element: HTMLElement]
  drop: [data: any, dropZone: HTMLElement]
  dropFailed: [data: any, element: HTMLElement]
  hover: [element: HTMLElement, isHovering: boolean]
}>()

// テンプレート参照
const containerRef = ref<HTMLElement>()
const draggableContainer = ref<HTMLElement>()
const dropZonesContainer = ref<HTMLElement>()
const feedbackOverlay = ref<HTMLElement>()
const dragGhost = ref<HTMLElement>()
const ghostContent = ref<HTMLElement>()
const dropPreview = ref<HTMLElement>()
const hoverIndicator = ref<HTMLElement>()

// リアクティブ状態
const isDragging = ref(false)
const showDropPreview = ref(false)
const isValidDrop = ref(false)
const showHoverIndicator = ref(false)
const touchEnabled = ref(false)
const currentDrag = ref<DragData | null>(null)
const hoveredElement = ref<HTMLElement | null>(null)
const dropZones = ref<DropZone[]>([])

// タッチ関連の状態
const touches = ref<Map<number, TouchInfo>>(new Map())
const longPressTimer = ref<number | null>(null)
const isLongPress = ref(false)

// パフォーマンス関連
const animationFrame = ref<number | null>(null)
const lastFrameTime = ref(0)

// 計算プロパティ
const ghostStyle = computed(() => {
  if (!currentDrag.value) return {}
  
  return {
    transform: `translate(${currentDrag.value.currentPosition.x - currentDrag.value.offset.x}px, ${currentDrag.value.currentPosition.y - currentDrag.value.offset.y}px)`,
    pointerEvents: 'none',
    zIndex: 9999
  }
})

const dropPreviewStyle = computed(() => {
  if (!currentDrag.value) return {}
  
  const pos = props.snapToGrid 
    ? snapToGrid(currentDrag.value.currentPosition)
    : currentDrag.value.currentPosition
  
  return {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    width: '100px',
    height: '60px'
  }
})

const hoverStyle = computed(() => {
  if (!hoveredElement.value) return {}
  
  const rect = hoveredElement.value.getBoundingClientRect()
  const containerRect = containerRef.value?.getBoundingClientRect()
  
  if (!containerRect) return {}
  
  return {
    left: `${rect.left - containerRect.left - 4}px`,
    top: `${rect.top - containerRect.top - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`
  }
})

// ドラッグ&ドロップの実装
const initializeDragAndDrop = () => {
  if (!draggableContainer.value) return

  // ドラッグ可能な要素を監視
  const observer = new MutationObserver(() => {
    updateDraggableElements()
  })
  
  observer.observe(draggableContainer.value, {
    childList: true,
    subtree: true
  })

  updateDraggableElements()
  updateDropZones()
}

const updateDraggableElements = () => {
  if (!draggableContainer.value) return

  const draggableElements = draggableContainer.value.querySelectorAll('[draggable="true"], .draggable')
  
  draggableElements.forEach(element => {
    const el = element as HTMLElement
    
    // 既存のイベントリスナーを削除
    removeDragListeners(el)
    
    // 新しいイベントリスナーを追加
    addDragListeners(el)
  })
}

const addDragListeners = (element: HTMLElement) => {
  if (!props.enableDrag) return

  // マウスイベント
  element.addEventListener('mousedown', handleMouseDown, { passive: false })
  
  // タッチイベント
  if (props.enableTouch) {
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
  }
  
  // ホバーイベント
  if (props.enableHover) {
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)
  }

  // アクセシビリティ対応
  if (props.accessibilityMode) {
    element.addEventListener('keydown', handleKeyDown)
    element.addEventListener('focus', handleFocus)
    element.addEventListener('blur', handleBlur)
  }
}

const removeDragListeners = (element: HTMLElement) => {
  element.removeEventListener('mousedown', handleMouseDown)
  element.removeEventListener('touchstart', handleTouchStart)
  element.removeEventListener('mouseenter', handleMouseEnter)
  element.removeEventListener('mouseleave', handleMouseLeave)
  element.removeEventListener('keydown', handleKeyDown)
  element.removeEventListener('focus', handleFocus)
  element.removeEventListener('blur', handleBlur)
}

// マウスイベントハンドラー
const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return // 左クリックのみ
  
  event.preventDefault()
  
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  
  startDrag({
    element,
    data: getDragData(element),
    startPosition: { x: event.clientX, y: event.clientY },
    currentPosition: { x: event.clientX, y: event.clientY },
    offset: {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  })
  
  // グローバルマウスイベントを追加
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event: MouseEvent) => {
  if (!currentDrag.value) return
  
  event.preventDefault()
  
  updateDragPosition(event.clientX, event.clientY)
}

const handleMouseUp = (event: MouseEvent) => {
  if (!currentDrag.value) return
  
  event.preventDefault()
  
  // グローバルイベントリスナーを削除
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  finishDrag(event.clientX, event.clientY)
}

// タッチイベントハンドラー
const handleTouchStart = (event: TouchEvent) => {
  event.preventDefault()
  
  const touch = event.changedTouches[0]
  const element = event.currentTarget as HTMLElement
  
  // タッチ情報を記録
  touches.value.set(touch.identifier, {
    identifier: touch.identifier,
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: touch.clientX,
    currentY: touch.clientY
  })
  
  // 長押し検出
  longPressTimer.value = window.setTimeout(() => {
    isLongPress.value = true
    
    const rect = element.getBoundingClientRect()
    startDrag({
      element,
      data: getDragData(element),
      startPosition: { x: touch.clientX, y: touch.clientY },
      currentPosition: { x: touch.clientX, y: touch.clientY },
      offset: {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    })
    
    // 振動フィードバック
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, 500)
  
  // タッチイベントリスナーを追加
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
  document.addEventListener('touchcancel', handleTouchCancel)
}

const handleTouchMove = (event: TouchEvent) => {
  const touch = Array.from(event.changedTouches).find(t => touches.value.has(t.identifier))
  if (!touch) return
  
  const touchInfo = touches.value.get(touch.identifier)
  if (!touchInfo) return
  
  // 長押し判定前の移動量チェック
  if (!isLongPress.value) {
    const deltaX = Math.abs(touch.clientX - touchInfo.startX)
    const deltaY = Math.abs(touch.clientY - touchInfo.startY)
    
    if (deltaX > props.dragThreshold || deltaY > props.dragThreshold) {
      clearLongPressTimer()
      return
    }
  } else {
    event.preventDefault()
    updateDragPosition(touch.clientX, touch.clientY)
  }
  
  // タッチ情報を更新
  touchInfo.currentX = touch.clientX
  touchInfo.currentY = touch.clientY
}

const handleTouchEnd = (event: TouchEvent) => {
  const touch = Array.from(event.changedTouches).find(t => touches.value.has(t.identifier))
  if (!touch) return
  
  clearLongPressTimer()
  
  if (isLongPress.value && currentDrag.value) {
    event.preventDefault()
    finishDrag(touch.clientX, touch.clientY)
  }
  
  // クリーンアップ
  touches.value.delete(touch.identifier)
  cleanupTouchEvents()
}

const handleTouchCancel = (event: TouchEvent) => {
  const touch = Array.from(event.changedTouches).find(t => touches.value.has(t.identifier))
  if (!touch) return
  
  clearLongPressTimer()
  touches.value.delete(touch.identifier)
  cleanupTouchEvents()
  
  if (currentDrag.value) {
    cancelDrag()
  }
}

// ホバーイベントハンドラー
const handleMouseEnter = (event: MouseEvent) => {
  if (!props.enableHover || isDragging.value) return
  
  const element = event.currentTarget as HTMLElement
  
  setTimeout(() => {
    if (element.matches(':hover') && !isDragging.value) {
      showHoverEffect(element)
      emit('hover', element, true)
    }
  }, props.hoverDelay)
}

const handleMouseLeave = (event: MouseEvent) => {
  if (!props.enableHover) return
  
  const element = event.currentTarget as HTMLElement
  hideHoverEffect()
  emit('hover', element, false)
}

// キーボードアクセシビリティ
const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.accessibilityMode) return
  
  const element = event.currentTarget as HTMLElement
  
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      simulateClick(element)
      break
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      event.preventDefault()
      simulateKeyboardDrag(element, event.key)
      break
  }
}

const handleFocus = (event: FocusEvent) => {
  if (!props.accessibilityMode) return
  
  const element = event.currentTarget as HTMLElement
  showFocusIndicator(element)
}

const handleBlur = (event: FocusEvent) => {
  if (!props.accessibilityMode) return
  
  hideFocusIndicator()
}

// ドラッグ操作の実装
const startDrag = (dragData: DragData) => {
  currentDrag.value = dragData
  isDragging.value = true
  
  // ゴーストイメージを作成
  createDragGhost(dragData.element)
  
  // ドロップゾーンをハイライト
  highlightDropZones()
  
  // パフォーマンス最適化
  if (!props.performanceMode) {
    dragData.element.style.willChange = 'transform'
  }
  
  emit('dragStart', dragData.data, dragData.element)
}

const updateDragPosition = (x: number, y: number) => {
  if (!currentDrag.value) return
  
  // パフォーマンス最適化
  const now = performance.now()
  if (now - lastFrameTime.value < 16.67) return // 60FPS制限
  lastFrameTime.value = now
  
  currentDrag.value.currentPosition = { x, y }
  
  // ドロップ可能性をチェック
  const dropZone = findDropZoneAt(x, y)
  updateDropPreview(dropZone)
  
  // スムーズなアニメーション
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
  
  animationFrame.value = requestAnimationFrame(() => {
    updateVisualFeedback()
  })
}

const finishDrag = (x: number, y: number) => {
  if (!currentDrag.value) return
  
  const dropZone = findDropZoneAt(x, y)
  
  if (dropZone && canDropOn(dropZone, currentDrag.value.data)) {
    // ドロップ成功
    performDrop(dropZone, currentDrag.value)
    emit('drop', currentDrag.value.data, dropZone.element)
  } else {
    // ドロップ失敗
    returnToOriginalPosition(currentDrag.value)
    emit('dropFailed', currentDrag.value.data, currentDrag.value.element)
  }
  
  endDrag()
}

const cancelDrag = () => {
  if (!currentDrag.value) return
  
  returnToOriginalPosition(currentDrag.value)
  endDrag()
}

const endDrag = () => {
  if (!currentDrag.value) return
  
  const dragData = currentDrag.value
  
  // スタイルをリセット
  dragData.element.style.willChange = ''
  
  // 状態をリセット
  isDragging.value = false
  showDropPreview.value = false
  currentDrag.value = null
  isLongPress.value = false
  
  // ビジュアルフィードバックをクリーンアップ
  cleanupVisualFeedback()
  
  emit('dragEnd', dragData.data, dragData.element)
}

// ヘルパー関数
const getDragData = (element: HTMLElement): any => {
  const dataTransfer = element.dataset.dragData
  return dataTransfer ? JSON.parse(dataTransfer) : { element }
}

const createDragGhost = (element: HTMLElement) => {
  if (!ghostContent.value) return
  
  // 元の要素のクローンを作成
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.transform = 'scale(0.9)'
  clone.style.opacity = '0.8'
  clone.style.pointerEvents = 'none'
  
  ghostContent.value.innerHTML = ''
  ghostContent.value.appendChild(clone)
}

const updateDropZones = () => {
  if (!dropZonesContainer.value) return
  
  const zones = dropZonesContainer.value.querySelectorAll('.drop-zone, [data-drop-zone]')
  
  dropZones.value = Array.from(zones).map(zone => {
    const element = zone as HTMLElement
    return {
      element,
      bounds: element.getBoundingClientRect(),
      accepts: element.dataset.accepts ? element.dataset.accepts.split(',') : ['*'],
      onDrop: undefined, // 実装に応じて設定
      onDragEnter: undefined,
      onDragLeave: undefined
    }
  })
}

const findDropZoneAt = (x: number, y: number): DropZone | null => {
  return dropZones.value.find(zone => {
    const rect = zone.bounds
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }) || null
}

const canDropOn = (dropZone: DropZone, data: any): boolean => {
  if (dropZone.accepts.includes('*')) return true
  
  const dataType = data.type || 'default'
  return dropZone.accepts.includes(dataType)
}

const snapToGrid = (position: { x: number; y: number }): { x: number; y: number } => {
  const gridSize = props.gridSize
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  }
}

const highlightDropZones = () => {
  dropZones.value.forEach(zone => {
    if (currentDrag.value && canDropOn(zone, currentDrag.value.data)) {
      zone.element.classList.add('drop-zone-highlight')
    }
  })
}

const updateDropPreview = (dropZone: DropZone | null) => {
  showDropPreview.value = Boolean(dropZone)
  isValidDrop.value = dropZone ? canDropOn(dropZone, currentDrag.value?.data) : false
}

const performDrop = (dropZone: DropZone, dragData: DragData) => {
  // ドロップアニメーション
  const targetRect = dropZone.element.getBoundingClientRect()
  const targetCenter = {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2
  }
  
  // スナップアニメーション
  if (dragGhost.value) {
    dragGhost.value.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
    dragGhost.value.style.transform = `translate(${targetCenter.x}px, ${targetCenter.y}px) scale(0.8)`
  }
  
  dropZone.onDrop?.(dragData.data)
}

const returnToOriginalPosition = (dragData: DragData) => {
  // 元の位置に戻すアニメーション
  if (dragGhost.value) {
    dragGhost.value.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    dragGhost.value.style.transform = `translate(${dragData.startPosition.x}px, ${dragData.startPosition.y}px) scale(0.9)`
  }
}

const showHoverEffect = (element: HTMLElement) => {
  hoveredElement.value = element
  showHoverIndicator.value = true
  
  // ホバーアニメーション
  element.style.transition = 'transform 0.2s ease-out'
  element.style.transform = 'translateY(-4px) scale(1.02)'
}

const hideHoverEffect = () => {
  if (hoveredElement.value) {
    hoveredElement.value.style.transform = ''
  }
  
  hoveredElement.value = null
  showHoverIndicator.value = false
}

const showFocusIndicator = (element: HTMLElement) => {
  element.classList.add('keyboard-focused')
}

const hideFocusIndicator = () => {
  document.querySelectorAll('.keyboard-focused').forEach(el => {
    el.classList.remove('keyboard-focused')
  })
}

const simulateClick = (element: HTMLElement) => {
  element.click()
}

const simulateKeyboardDrag = (element: HTMLElement, direction: string) => {
  // キーボードでのドラッグシミュレーション
  const step = 20
  const rect = element.getBoundingClientRect()
  
  let deltaX = 0
  let deltaY = 0
  
  switch (direction) {
    case 'ArrowUp': deltaY = -step; break
    case 'ArrowDown': deltaY = step; break
    case 'ArrowLeft': deltaX = -step; break
    case 'ArrowRight': deltaX = step; break
  }
  
  // 新しい位置を計算
  const newX = rect.left + deltaX
  const newY = rect.top + deltaY
  
  // ドロップゾーンをチェック
  const dropZone = findDropZoneAt(newX, newY)
  if (dropZone) {
    const data = getDragData(element)
    if (canDropOn(dropZone, data)) {
      emit('drop', data, dropZone.element)
    }
  }
}

const updateVisualFeedback = () => {
  // ビジュアルフィードバックの更新
  if (currentDrag.value && hoverIndicator.value) {
    const dropZone = findDropZoneAt(
      currentDrag.value.currentPosition.x,
      currentDrag.value.currentPosition.y
    )
    
    if (dropZone) {
      hoverIndicator.value.style.borderColor = isValidDrop.value ? '#51CF66' : '#FF6B6B'
    }
  }
}

const cleanupVisualFeedback = () => {
  // ドロップゾーンのハイライトを削除
  dropZones.value.forEach(zone => {
    zone.element.classList.remove('drop-zone-highlight')
  })
  
  // ゴーストをクリーンアップ
  if (ghostContent.value) {
    ghostContent.value.innerHTML = ''
  }
}

const clearLongPressTimer = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

const cleanupTouchEvents = () => {
  if (touches.value.size === 0) {
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchCancel)
  }
}

// 公開API
const registerDropZone = (element: HTMLElement, config: Partial<DropZone>) => {
  const dropZone: DropZone = {
    element,
    bounds: element.getBoundingClientRect(),
    accepts: ['*'],
    ...config
  }
  
  dropZones.value.push(dropZone)
  return () => {
    const index = dropZones.value.indexOf(dropZone)
    if (index > -1) {
      dropZones.value.splice(index, 1)
    }
  }
}

const unregisterDropZone = (element: HTMLElement) => {
  dropZones.value = dropZones.value.filter(zone => zone.element !== element)
}

// ライフサイクル
onMounted(() => {
  touchEnabled.value = 'ontouchstart' in window
  
  nextTick(() => {
    initializeDragAndDrop()
  })
  
  // リサイズ時にドロップゾーンを更新
  window.addEventListener('resize', updateDropZones)
})

onUnmounted(() => {
  // イベントリスナーのクリーンアップ
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  document.removeEventListener('touchcancel', handleTouchCancel)
  window.removeEventListener('resize', updateDropZones)
  
  clearLongPressTimer()
  
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})

// 公開API
defineExpose({
  registerDropZone,
  unregisterDropZone,
  isDragging
})
</script>

<style scoped>
.interactive-elements {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.draggable-container,
.drop-zones-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.feedback-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

/* ドラッグゴースト */
.drag-ghost {
  position: absolute;
  will-change: transform;
  transition: transform 0.1s ease-out;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
}

.ghost-content {
  transform-origin: center center;
}

/* ドロップ予測 */
.drop-preview {
  position: absolute;
  border: 2px dashed #ADB5BD;
  border-radius: 8px;
  background: rgba(173, 181, 189, 0.1);
  opacity: 0;
  transition: all 0.2s ease-out;
  pointer-events: none;
}

.drop-preview.active {
  opacity: 1;
}

.drop-preview.valid {
  border-color: #51CF66;
  background: rgba(81, 207, 102, 0.1);
}

/* ホバーインジケーター */
.hover-indicator {
  position: absolute;
  border: 2px solid #4DABF7;
  border-radius: 8px;
  background: rgba(77, 171, 247, 0.1);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  animation: hover-glow 2s ease-in-out infinite;
}

@keyframes hover-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(77, 171, 247, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(77, 171, 247, 0.5);
  }
}

/* ドラッグ可能要素のスタイル */
:deep(.draggable) {
  cursor: grab;
  transition: all 0.2s ease-out;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

:deep(.draggable:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

:deep(.draggable.dragging) {
  cursor: grabbing;
  opacity: 0.5;
  transform: scale(0.95);
}

/* ドロップゾーンのスタイル */
:deep(.drop-zone) {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 8px;
  transition: all 0.3s ease-out;
  min-height: 60px;
}

:deep(.drop-zone-highlight) {
  border-color: #4DABF7;
  background: rgba(77, 171, 247, 0.05);
  animation: drop-zone-pulse 1.5s ease-in-out infinite;
}

:deep(.drop-zone-invalid) {
  border-color: #FF6B6B;
  background: rgba(255, 107, 107, 0.05);
}

@keyframes drop-zone-pulse {
  0%, 100% {
    border-color: #4DABF7;
    background: rgba(77, 171, 247, 0.05);
  }
  50% {
    border-color: #339AF0;
    background: rgba(77, 171, 247, 0.1);
  }
}

/* タッチ対応 */
.touch-enabled .draggable {
  touch-action: none;
}

/* アクセシビリティ対応 */
.accessibility-mode :deep(.draggable) {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.accessibility-mode :deep(.draggable:focus),
.accessibility-mode :deep(.keyboard-focused) {
  outline-color: #4DABF7;
  box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.3);
}

/* パフォーマンスモード */
.performance-mode .drag-ghost {
  transition: none;
}

.performance-mode .drop-preview,
.performance-mode .hover-indicator {
  transition-duration: 0.1s;
}

.performance-mode :deep(.draggable),
.performance-mode :deep(.drop-zone) {
  transition-duration: 0.1s;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .drag-ghost {
    transform: scale(0.9);
  }
  
  .drop-preview {
    border-width: 3px;
  }
  
  .hover-indicator {
    border-width: 3px;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .hover-indicator {
    animation: none;
  }
  
  :deep(.drop-zone-highlight) {
    animation: none;
  }
}

/* 高度なエフェクト */
:deep(.draggable-enhanced) {
  will-change: transform;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

:deep(.draggable-enhanced:hover) {
  transform: translateY(-4px) scale(1.02) rotateX(2deg);
  filter: brightness(1.05) saturate(1.1);
}

:deep(.drop-zone-enhanced) {
  background: linear-gradient(135deg, transparent, rgba(77, 171, 247, 0.03));
  backdrop-filter: blur(1px);
}

:deep(.drop-zone-enhanced.drop-zone-highlight) {
  background: linear-gradient(135deg, rgba(77, 171, 247, 0.1), rgba(81, 207, 102, 0.1));
  backdrop-filter: blur(2px);
}

/* カスタムスクロールバー（ドラッグ中のスクロール対応） */
.interactive-elements::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.interactive-elements::-webkit-scrollbar-track {
  background: rgba(134, 142, 150, 0.1);
  border-radius: 4px;
}

.interactive-elements::-webkit-scrollbar-thumb {
  background: rgba(134, 142, 150, 0.3);
  border-radius: 4px;
}

.interactive-elements::-webkit-scrollbar-thumb:hover {
  background: rgba(134, 142, 150, 0.5);
}
</style>