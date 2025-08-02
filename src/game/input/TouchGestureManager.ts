/**
 * タッチジェスチャー認識システム
 * 
 * 対応ジェスチャー:
 * - スワイプ（上下左右）
 * - ピンチズーム（拡大・縮小）
 * - ロングプレス（長押し）
 * - ダブルタップ
 * - ドラッグ
 */

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'longpress' | 'doubletap' | 'drag' | 'dragend' | 'momentum' | 'bounce'
  target: HTMLElement | null
  detail: SwipeDetail | PinchDetail | LongPressDetail | DoubleTapDetail | DragDetail | MomentumDetail | BounceDetail
  timestamp: number
  preventDefault: () => void
}

export interface SwipeDetail {
  direction: 'up' | 'down' | 'left' | 'right'
  distance: number
  velocity: number
  startX: number
  startY: number
  endX: number
  endY: number
}

export interface PinchDetail {
  scale: number
  deltaScale: number
  centerX: number
  centerY: number
}

export interface DragDetail {
  deltaX: number
  deltaY: number
  totalX: number
  totalY: number
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export interface LongPressDetail {
  x: number
  y: number
  duration: number
}

export interface DoubleTapDetail {
  x: number
  y: number
}

export interface MomentumDetail {
  velocityX: number
  velocityY: number
  duration: number
}

export interface BounceDetail {
  direction: 'left' | 'right' | 'up' | 'down'
  intensity: number
}

interface TouchPoint {
  identifier: number
  x: number
  y: number
  timestamp: number
}

interface GestureListener {
  element: HTMLElement
  type: GestureEvent['type']
  handler: (event: GestureEvent) => void
  options?: AddEventListenerOptions
}

export class TouchGestureManager {
  private readonly element: HTMLElement
  private readonly touchPoints = new Map<number, TouchPoint>()
  private lastTap: { x: number; y: number; timestamp: number } | null = null
  private longPressTimer: number | null = null
  private isDragging = false
  private dragStartPoint: { x: number; y: number } | null = null
  private dragTotalDelta = { x: 0, y: 0 }
  private readonly listeners = new Map<string, Set<GestureListener>>()
  private readonly preventDefaultGestures = new Set<GestureEvent['type']>()
  
  // モーメンタムスクロール用
  private lastVelocity = { x: 0, y: 0 }
  private momentumTimer: number | null = null
  private lastMoveTime = 0
  private moveHistory: Array<{ x: number; y: number; time: number }> = []
  
  // 設定可能なパラメータ
  private config = {
    swipeThreshold: 50, // px
    swipeVelocityThreshold: 0.3, // px/ms
    doubleTapThreshold: 300, // ms
    doubleTapDistance: 30, // px
    longPressThreshold: 500, // ms
    pinchThreshold: 0.1, // scale change
    dragThreshold: 10, // px
    momentumThreshold: 200, // モーメンタムスクロールの閾値
    friction: 0.95, // 慣性スクロールの摩擦係数
    bounceThreshold: 50, // バウンスバック効果の閾値
  }

  constructor(element: HTMLElement, config?: Partial<typeof TouchGestureManager.prototype.config>) {
    this.element = element
    if (config !== undefined && config !== null) {
      this.config = { ...this.config, ...config }
    }
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // タッチイベント
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })
    
    // マウスイベント（デスクトップでのテスト用）
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: false })
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: false })
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: false })
    this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this), { passive: false })
  }

  private handleTouchStart(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      this.touchPoints.set(touch.identifier, {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      })
    }

    // ロングプレス検出
    if (this.touchPoints.size === 1) {
      const touch = event.changedTouches[0]
      this.startLongPressDetection(touch.clientX, touch.clientY)
      
      // ダブルタップ検出
      this.checkDoubleTap(touch.clientX, touch.clientY)
    }

    if (this.shouldPreventDefault('drag') || this.shouldPreventDefault('pinch')) {
      event.preventDefault()
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    // ロングプレスをキャンセル
    this.cancelLongPress()

    // ピンチズーム検出
    if (event.touches.length === 2) {
      this.detectPinch(event)
    }

    // ドラッグ検出
    if (event.touches.length === 1) {
      this.detectDrag(event.touches[0])
    }

    // タッチポイントを更新
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const point = this.touchPoints.get(touch.identifier)
      if (point !== null && point !== undefined) {
        point.x = touch.clientX
        point.y = touch.clientY
        point.timestamp = Date.now()
      }
    }

    if (this.isDragging && this.shouldPreventDefault('drag')) {
      event.preventDefault()
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    this.cancelLongPress()

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const startPoint = this.touchPoints.get(touch.identifier)
      
      if (startPoint !== null && startPoint !== undefined) {
        const endPoint = {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now()
        }

        // スワイプ検出
        this.detectSwipe(startPoint, endPoint, event.target as HTMLElement)
        
        this.touchPoints.delete(touch.identifier)
      }
    }

    // ドラッグ終了
    if (this.touchPoints.size === 0 && this.isDragging) {
      this.endDrag(event.changedTouches[0])
    }
  }

  private handleTouchCancel(event: TouchEvent): void {
    this.cancelLongPress()
    this.touchPoints.clear()
    if (this.isDragging) {
      this.isDragging = false
      this.dragStartPoint = null
      this.dragTotalDelta = { x: 0, y: 0 }
    }
  }

  // マウスイベントハンドラー（タッチをシミュレート）
  private handleMouseDown(event: MouseEvent): void {
    const fakeTouch = {
      identifier: -1,
      clientX: event.clientX,
      clientY: event.clientY
    }
    
    this.touchPoints.set(-1, {
      identifier: -1,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    })

    this.startLongPressDetection(event.clientX, event.clientY)
    this.checkDoubleTap(event.clientX, event.clientY)
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.touchPoints.has(-1)) {
      this.cancelLongPress()
      this.detectDrag({
        clientX: event.clientX,
        clientY: event.clientY
      } as Touch)

      const point = this.touchPoints.get(-1)
      if (point !== null && point !== undefined) {
        point.x = event.clientX
        point.y = event.clientY
        point.timestamp = Date.now()
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    this.cancelLongPress()
    
    const startPoint = this.touchPoints.get(-1)
    if (startPoint !== null && startPoint !== undefined) {
      const endPoint = {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      }

      this.detectSwipe(startPoint, endPoint, event.target as HTMLElement)
      this.touchPoints.delete(-1)
    }

    if (this.isDragging) {
      this.endDrag({
        clientX: event.clientX,
        clientY: event.clientY
      } as Touch)
    }
  }

  private handleMouseLeave(event: MouseEvent): void {
    this.handleMouseUp(event)
  }

  private startLongPressDetection(x: number, y: number): void {
    this.longPressTimer = window.setTimeout(() => {
      this.emitGesture('longpress', null, {
        x,
        y,
        duration: this.config.longPressThreshold
      } as LongPressDetail)
    }, this.config.longPressThreshold)
  }

  private cancelLongPress(): void {
    if (this.longPressTimer !== null && this.longPressTimer !== undefined) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private checkDoubleTap(x: number, y: number): void {
    const now = Date.now()
    
    if (this.lastTap !== null && this.lastTap !== undefined) {
      const timeDiff = now - this.lastTap.timestamp
      const distance = Math.sqrt(
        (x - this.lastTap.x)**2 + 
        (y - this.lastTap.y)**2
      )
      
      if (timeDiff < this.config.doubleTapThreshold && 
          distance < this.config.doubleTapDistance) {
        this.emitGesture('doubletap', null, { x, y } as DoubleTapDetail)
        this.lastTap = null
        return
      }
    }
    
    this.lastTap = { x, y, timestamp: now }
  }

  private detectSwipe(start: TouchPoint, end: { x: number; y: number; timestamp: number }, target: HTMLElement): void {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const deltaTime = end.timestamp - start.timestamp
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / deltaTime

    if (distance < this.config.swipeThreshold || 
        velocity < this.config.swipeVelocityThreshold) {
      return
    }

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    let direction: SwipeDetail['direction']

    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }

    const detail: SwipeDetail = {
      direction,
      distance,
      velocity,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y
    }

    this.emitGesture('swipe', target, detail)
  }

  private detectPinch(event: TouchEvent): void {
    if (event.touches.length !== 2) return

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    
    const currentDistance = Math.sqrt(
      (touch1.clientX - touch2.clientX)**2 +
      (touch1.clientY - touch2.clientY)**2
    )

    const point1 = this.touchPoints.get(touch1.identifier)
    const point2 = this.touchPoints.get(touch2.identifier)
    
    if (point1 !== null && point1 !== undefined && point2 !== null && point2 !== undefined) {
      const previousDistance = Math.sqrt(
        (point1.x - point2.x)**2 +
        (point1.y - point2.y)**2
      )

      const scale = currentDistance / previousDistance
      const deltaScale = scale - 1

      if (Math.abs(deltaScale) > this.config.pinchThreshold) {
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2

        const detail: PinchDetail = {
          scale,
          deltaScale,
          centerX,
          centerY
        }

        this.emitGesture('pinch', event.target as HTMLElement, detail)
      }
    }
  }

  private detectDrag(touch: Touch): void {
    const currentTime = Date.now()
    
    if (!this.isDragging) {
      if (this.dragStartPoint === null || this.dragStartPoint === undefined) {
        this.dragStartPoint = { x: touch.clientX, y: touch.clientY }
        this.moveHistory = [{ x: touch.clientX, y: touch.clientY, time: currentTime }]
      }
      
      const distance = Math.sqrt(
        (touch.clientX - this.dragStartPoint.x)**2 +
        (touch.clientY - this.dragStartPoint.y)**2
      )
      
      if (distance > this.config.dragThreshold) {
        this.isDragging = true
      }
    }

    if (this.isDragging && this.dragStartPoint !== null && this.dragStartPoint !== undefined) {
      // 移動履歴を更新（速度計算用）
      this.moveHistory.push({ x: touch.clientX, y: touch.clientY, time: currentTime })
      
      // 古い履歴を削除（100ms以上前）
      this.moveHistory = this.moveHistory.filter(point => currentTime - point.time < 100)
      
      const deltaX = touch.clientX - (this.dragStartPoint.x + this.dragTotalDelta.x)
      const deltaY = touch.clientY - (this.dragStartPoint.y + this.dragTotalDelta.y)
      
      this.dragTotalDelta.x += deltaX
      this.dragTotalDelta.y += deltaY

      const detail: DragDetail = {
        deltaX,
        deltaY,
        totalX: this.dragTotalDelta.x,
        totalY: this.dragTotalDelta.y,
        startX: this.dragStartPoint.x,
        startY: this.dragStartPoint.y,
        currentX: touch.clientX,
        currentY: touch.clientY
      }

      this.emitGesture('drag', document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement, detail)
      this.lastMoveTime = currentTime
    }
  }

  private endDrag(touch: Touch): void {
    if (this.isDragging && this.dragStartPoint !== null && this.dragStartPoint !== undefined) {
      // 速度を計算
      this.calculateVelocity()
      
      const detail: DragDetail = {
        deltaX: 0,
        deltaY: 0,
        totalX: this.dragTotalDelta.x,
        totalY: this.dragTotalDelta.y,
        startX: this.dragStartPoint.x,
        startY: this.dragStartPoint.y,
        currentX: touch.clientX,
        currentY: touch.clientY
      }

      this.emitGesture('dragend', document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement, detail)
      
      // モーメンタムスクロールを開始
      this.startMomentumScroll()
    }

    this.isDragging = false
    this.dragStartPoint = null
    this.dragTotalDelta = { x: 0, y: 0 }
    this.moveHistory = []
  }

  private calculateVelocity(): void {
    if (this.moveHistory.length < 2) {
      this.lastVelocity = { x: 0, y: 0 }
      return
    }

    const latest = this.moveHistory[this.moveHistory.length - 1]
    const previous = this.moveHistory[this.moveHistory.length - 2]
    
    const timeDelta = latest.time - previous.time
    if (timeDelta === 0) {
      this.lastVelocity = { x: 0, y: 0 }
      return
    }

    this.lastVelocity = {
      x: (latest.x - previous.x) / timeDelta,
      y: (latest.y - previous.y) / timeDelta
    }
  }

  private startMomentumScroll(): void {
    const speed = Math.sqrt(
      this.lastVelocity.x * this.lastVelocity.x + 
      this.lastVelocity.y * this.lastVelocity.y
    )

    if (speed < this.config.momentumThreshold / 1000) {
      return // 速度が不十分
    }

    this.stopMomentumScroll()
    
    let velocityX = this.lastVelocity.x
    let velocityY = this.lastVelocity.y
    let lastTime = Date.now()

    const tick = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      // 摩擦を適用
      velocityX *= this.config.friction
      velocityY *= this.config.friction

      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
      
      if (speed < 0.01) {
        this.stopMomentumScroll()
        return
      }

      // モーメンタムイベントを発火
      const detail: MomentumDetail = {
        velocityX,
        velocityY,
        duration: deltaTime
      }

      this.emitGesture('momentum', null, detail)
      
      this.momentumTimer = requestAnimationFrame(tick)
    }

    this.momentumTimer = requestAnimationFrame(tick)
  }

  private stopMomentumScroll(): void {
    if (this.momentumTimer !== null && this.momentumTimer !== undefined) {
      cancelAnimationFrame(this.momentumTimer)
      this.momentumTimer = null
    }
  }

  private emitGesture(type: GestureEvent['type'], target: HTMLElement | null, detail: SwipeDetail | PinchDetail | LongPressDetail | DoubleTapDetail | DragDetail | MomentumDetail | BounceDetail): void {
    const event: GestureEvent = {
      type,
      target,
      detail,
      timestamp: Date.now(),
      preventDefault: () => this.preventDefaultGestures.add(type)
    }

    const listeners = this.listeners.get(type)
    if (listeners !== undefined && listeners !== null) {
      listeners.forEach(listener => {
        if (listener.element === null || listener.element === undefined || listener.element === target || (target !== null && listener.element.contains(target))) {
          listener.handler(event)
        }
      })
    }
  }

  private shouldPreventDefault(type: GestureEvent['type']): boolean {
    return this.preventDefaultGestures.has(type)
  }

  public on(type: GestureEvent['type'], handler: (event: GestureEvent) => void, element?: HTMLElement): void {
    const listener: GestureListener = {
      element: element ?? this.element,
      type,
      handler
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(listener)
  }

  public off(type: GestureEvent['type'], handler: (event: GestureEvent) => void): void {
    const listeners = this.listeners.get(type)
    if (listeners !== undefined && listeners !== null) {
      listeners.forEach(listener => {
        if (listener.handler === handler) {
          listeners.delete(listener)
        }
      })
    }
  }

  public setPreventDefault(type: GestureEvent['type'], prevent: boolean): void {
    if (prevent) {
      this.preventDefaultGestures.add(type)
    } else {
      this.preventDefaultGestures.delete(type)
    }
  }

  public updateConfig(config: Partial<typeof TouchGestureManager.prototype.config>): void {
    this.config = { ...this.config, ...config }
  }

  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this))
    this.element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this))
    
    this.cancelLongPress()
    this.stopMomentumScroll()
    this.touchPoints.clear()
    this.listeners.clear()
    this.preventDefaultGestures.clear()
    this.moveHistory = []
  }
}

// タッチ対応のユーティリティ関数
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export const getPointerPosition = (event: TouchEvent | MouseEvent): { x: number; y: number } => {
  if ('touches' in event && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    }
  } if ('clientX' in event) {
    return {
      x: event.clientX,
      y: event.clientY
    }
  }
  return { x: 0, y: 0 }
}

// デバイス性能チェック
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isAndroid = userAgent.includes('android')
  const isMobile = isIOS || isAndroid || isTouchDevice()
  
  // ハードウェア情報の取得（可能な場合）
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4
  const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4
  
  // パフォーマンスレベルの推定
  let performanceLevel: 'low' | 'medium' | 'high' = 'medium'
  
  if (deviceMemory <= 2 || hardwareConcurrency <= 2) {
    performanceLevel = 'low'
  } else if (deviceMemory >= 6 && hardwareConcurrency >= 6) {
    performanceLevel = 'high'
  }
  
  return {
    isIOS,
    isAndroid,
    isMobile,
    hardwareConcurrency,
    deviceMemory,
    performanceLevel,
    supportsVibration: 'vibrate' in navigator,
    supportsWakeLock: 'wakeLock' in navigator
  }
}

// 最適化されたタッチ設定を取得
export const getOptimizedTouchConfig = () => {
  const deviceInfo = getDeviceInfo()
  
  const baseConfig = {
    swipeThreshold: 50,
    swipeVelocityThreshold: 0.3,
    doubleTapThreshold: 300,
    doubleTapDistance: 30,
    longPressThreshold: 500,
    pinchThreshold: 0.1,
    dragThreshold: 10,
    momentumThreshold: 200,
    friction: 0.95,
    bounceThreshold: 50,
  }
  
  // デバイス性能に基づく調整
  switch (deviceInfo.performanceLevel) {
    case 'low':
      return {
        ...baseConfig,
        friction: 0.9, // より早い減速
        momentumThreshold: 300, // より高い閾値
      }
    case 'high':
      return {
        ...baseConfig,
        friction: 0.98, // よりスムーズな減速
        momentumThreshold: 150, // より低い閾値
        dragThreshold: 5, // より敏感なドラッグ
      }
    default:
      return baseConfig
  }
}

// 振動フィードバックのユーティリティ
export const vibrate = (pattern: number | number[], fallback?: () => void) => {
  if ('vibrate' in navigator && navigator.vibrate !== null && navigator.vibrate !== undefined) {
    navigator.vibrate(pattern)
  } else if (fallback !== null && fallback !== undefined) {
    fallback()
  }
}