/**
 * Vue Composition API for Micro-Interactions
 * プレイヤー体験を向上させるマイクロインタラクションの統合
 */

import { nextTick, onMounted, onUnmounted, type Ref, ref } from 'vue'
import { type InteractionConfig, MicroInteractionManager } from './MicroInteractionManager'

interface UseInteractionsOptions {
  haptic?: boolean
  sound?: boolean
  reducedMotion?: boolean
}

export function useMicroInteractions(options: UseInteractionsOptions = {}) {
  const manager = new MicroInteractionManager()
  const isInitialized = ref(false)

  // 設定の適用
  if (options.haptic !== undefined) manager.setHapticEnabled(options.haptic)
  if (options.sound !== undefined) manager.setSoundEnabled(options.sound)
  if (options.reducedMotion !== undefined) manager.setReducedMotion(options.reducedMotion)

  onMounted(() => {
    isInitialized.value = true
  })

  onUnmounted(() => {
    manager.destroy()
  })

  /**
   * 要素にホバーインタラクションを追加
   */
  const addHoverEffect = (elementRef: Ref<HTMLElement | undefined>, config: Partial<InteractionConfig> = {}) => {
    onMounted(async () => {
      await nextTick()
      if (elementRef.value) {
        manager.registerInteraction({
          type: 'hover',
          element: elementRef.value,
          ...config
        })
      }
    })

    onUnmounted(() => {
      if (elementRef.value) {
        manager.unregisterInteraction(elementRef.value)
      }
    })
  }

  /**
   * 要素にクリックインタラクションを追加
   */
  const addClickEffect = (elementRef: Ref<HTMLElement | undefined>, config: Partial<InteractionConfig> = {}) => {
    onMounted(async () => {
      await nextTick()
      if (elementRef.value) {
        manager.registerInteraction({
          type: 'click',
          element: elementRef.value,
          ...config
        })
      }
    })

    onUnmounted(() => {
      if (elementRef.value) {
        manager.unregisterInteraction(elementRef.value)
      }
    })
  }

  /**
   * 要素にドラッグインタラクションを追加
   */
  const addDragEffect = (elementRef: Ref<HTMLElement | undefined>, config: Partial<InteractionConfig> = {}) => {
    onMounted(async () => {
      await nextTick()
      if (elementRef.value) {
        manager.registerInteraction({
          type: 'drag',
          element: elementRef.value,
          ...config
        })
      }
    })

    onUnmounted(() => {
      if (elementRef.value) {
        manager.unregisterInteraction(elementRef.value)
      }
    })
  }

  /**
   * 要素にフォーカスインタラクションを追加
   */
  const addFocusEffect = (elementRef: Ref<HTMLElement | undefined>, config: Partial<InteractionConfig> = {}) => {
    onMounted(async () => {
      await nextTick()
      if (elementRef.value) {
        manager.registerInteraction({
          type: 'focus',
          element: elementRef.value,
          ...config
        })
      }
    })

    onUnmounted(() => {
      if (elementRef.value) {
        manager.unregisterInteraction(elementRef.value)
      }
    })
  }

  /**
   * カード用インタラクション（ホバー + クリック + ドラッグ）
   */
  const addCardInteractions = (elementRef: Ref<HTMLElement | undefined>) => {
    addHoverEffect(elementRef, { intensity: 'normal' })
    addClickEffect(elementRef, { intensity: 'normal', haptic: true })
    addDragEffect(elementRef, { intensity: 'strong', haptic: true })
  }

  /**
   * ボタン用インタラクション
   */
  const addButtonInteractions = (elementRef: Ref<HTMLElement | undefined>, type: 'primary' | 'secondary' | 'danger' = 'primary') => {
    onMounted(async () => {
      await nextTick()
      if (elementRef.value) {
        const element = elementRef.value

        const handleClick = (event: MouseEvent) => {
          manager.buttonPress(element, type)
        }

        const handleMouseEnter = () => {
          manager.cardHover(element, true)
        }

        const handleMouseLeave = () => {
          manager.cardHover(element, false)
        }

        element.addEventListener('click', handleClick)
        element.addEventListener('mouseenter', handleMouseEnter)
        element.addEventListener('mouseleave', handleMouseLeave)

        // クリーンアップの登録
        onUnmounted(() => {
          element.removeEventListener('click', handleClick)
          element.removeEventListener('mouseenter', handleMouseEnter)
          element.removeEventListener('mouseleave', handleMouseLeave)
        })
      }
    })
  }

  /**
   * 成功フィードバック
   */
  const triggerSuccess = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (elementRef.value) {
      await manager.successAnimation(elementRef.value)
    }
  }

  /**
   * エラーフィードバック
   */
  const triggerError = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (elementRef.value) {
      await manager.errorAnimation(elementRef.value)
    }
  }

  /**
   * カスタムフィードバック
   */
  const triggerFeedback = async (
    elementRef: Ref<HTMLElement | undefined>, 
    type: InteractionConfig['type'], 
    options: Partial<InteractionConfig> = {}
  ) => {
    if (elementRef.value) {
      await manager.triggerFeedback(elementRef.value, type, options)
    }
  }

  /**
   * ローディング状態
   */
  const createLoadingState = (elementRef: Ref<HTMLElement | undefined>) => {
    const isLoading = ref(false)
    let stopLoading: (() => void) | null = null

    const startLoading = async () => {
      await nextTick()
      if (elementRef.value && !isLoading.value) {
        isLoading.value = true
        stopLoading = manager.createLoadingAnimation(elementRef.value)
      }
    }

    const endLoading = () => {
      if (stopLoading) {
        stopLoading()
        stopLoading = null
        isLoading.value = false
      }
    }

    return {
      isLoading: readonly(isLoading),
      startLoading,
      endLoading
    }
  }

  /**
   * ツールチップ表示
   */
  const showTooltip = async (
    elementRef: Ref<HTMLElement | undefined>,
    text: string,
    position: 'top' | 'bottom' | 'left' | 'right' = 'top',
    duration = 3000
  ) => {
    if (!elementRef.value) return

    const tooltip = await manager.showTooltip(elementRef.value, text, position)

    if (duration > 0) {
      setTimeout(() => {
        tooltip.remove()
      }, duration)
    }

    return {
      tooltip,
      hide: () => { tooltip.remove(); }
    }
  }

  /**
   * インタラクション統計（デバッグ用）
   */
  const getInteractionStats = () => {
    return {
      activeInteractions: manager['activeInteractions'].size,
      isInitialized: isInitialized.value
    }
  }

  return {
    // 基本インタラクション
    addHoverEffect,
    addClickEffect,
    addDragEffect,
    addFocusEffect,

    // 複合インタラクション
    addCardInteractions,
    addButtonInteractions,

    // フィードバック
    triggerSuccess,
    triggerError,
    triggerFeedback,

    // ユーティリティ
    createLoadingState,
    showTooltip,

    // 状態
    isInitialized: readonly(isInitialized),
    getInteractionStats,

    // 直接アクセス（高度な使用）
    manager
  }
}

/**
 * カード専用コンポーザブル
 */
export function useCardInteractions() {
  const interactions = useMicroInteractions()

  const setupCard = (elementRef: Ref<HTMLElement | undefined>) => {
    interactions.addCardInteractions(elementRef)
  }

  const onCardHover = async (elementRef: Ref<HTMLElement | undefined>, isEntering: boolean) => {
    if (elementRef.value) {
      await interactions.manager.cardHover(elementRef.value, isEntering)
    }
  }

  const onCardClick = async (elementRef: Ref<HTMLElement | undefined>, position?: { x: number; y: number }) => {
    if (elementRef.value) {
      await interactions.manager.cardClick(elementRef.value, position)
    }
  }

  const onCardDragStart = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (elementRef.value) {
      await interactions.manager.cardDragStart(elementRef.value)
    }
  }

  const onCardDrop = async (elementRef: Ref<HTMLElement | undefined>, success: boolean) => {
    if (elementRef.value) {
      await interactions.manager.cardDrop(elementRef.value, success)
    }
  }

  return {
    setupCard,
    onCardHover,
    onCardClick,
    onCardDragStart,
    onCardDrop,
    ...interactions
  }
}

/**
 * ボタン専用コンポーザブル
 */
export function useButtonInteractions(type: 'primary' | 'secondary' | 'danger' = 'primary') {
  const interactions = useMicroInteractions()

  const setupButton = (elementRef: Ref<HTMLElement | undefined>) => {
    interactions.addButtonInteractions(elementRef, type)
  }

  const onButtonPress = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (elementRef.value) {
      await interactions.manager.buttonPress(elementRef.value, type)
    }
  }

  return {
    setupButton,
    onButtonPress,
    ...interactions
  }
}

// readonly helper
function readonly<T>(ref: Ref<T>): Readonly<Ref<T>> {
  return ref as Readonly<Ref<T>>
}