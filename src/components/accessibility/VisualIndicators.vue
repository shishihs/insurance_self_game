<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface FocusIndicatorOptions {
  color?: string
  width?: number
  style?: 'solid' | 'dashed' | 'dotted'
  offset?: number
  borderRadius?: number
}

// フォーカスインジケーターの管理
export class FocusIndicatorManager {
  private focusedElement: HTMLElement | null = null
  private indicator: HTMLElement
  private options: Required<FocusIndicatorOptions>

  constructor(options: FocusIndicatorOptions = {}) {
    this.options = {
      color: options.color || '#818CF8',
      width: options.width || 3,
      style: options.style || 'solid',
      offset: options.offset || 4,
      borderRadius: options.borderRadius || 8
    }

    this.indicator = this.createIndicator()
    document.body.appendChild(this.indicator)
    this.setupEventListeners()
  }

  private createIndicator(): HTMLElement {
    const indicator = document.createElement('div')
    indicator.className = 'focus-indicator'
    indicator.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      transition: all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 0;
      border: ${this.options.width}px ${this.options.style} ${this.options.color};
      border-radius: ${this.options.borderRadius}px;
      box-shadow: 0 0 20px rgba(129, 140, 248, 0.4);
    `
    return indicator
  }

  private setupEventListeners(): void {
    // フォーカスイベントの監視
    document.addEventListener('focusin', this.handleFocusIn.bind(this))
    document.addEventListener('focusout', this.handleFocusOut.bind(this))
    
    // スクロールやリサイズ時の位置更新
    window.addEventListener('scroll', this.updatePosition.bind(this), true)
    window.addEventListener('resize', this.updatePosition.bind(this))
    
    // MutationObserverで要素の変更を監視
    const observer = new MutationObserver(() => {
      if (this.focusedElement) {
        this.updatePosition()
      }
    })
    
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['style', 'class']
    })
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement
    
    // フォーカス可能な要素かチェック
    if (this.isFocusable(target)) {
      this.focusedElement = target
      this.showIndicator(target)
    }
  }

  private handleFocusOut(): void {
    this.hideIndicator()
    this.focusedElement = null
  }

  private isFocusable(element: HTMLElement): boolean {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ]
    
    return focusableSelectors.some(selector => element.matches(selector))
  }

  private showIndicator(element: HTMLElement): void {
    const rect = element.getBoundingClientRect()
    const offset = this.options.offset
    
    this.indicator.style.left = `${rect.left - offset}px`
    this.indicator.style.top = `${rect.top - offset}px`
    this.indicator.style.width = `${rect.width + offset * 2}px`
    this.indicator.style.height = `${rect.height + offset * 2}px`
    this.indicator.style.opacity = '1'
    
    // 要素の角丸に合わせる
    const computedStyle = window.getComputedStyle(element)
    const borderRadius = computedStyle.borderRadius
    if (borderRadius && borderRadius !== '0px') {
      this.indicator.style.borderRadius = borderRadius
    }
  }

  private hideIndicator(): void {
    this.indicator.style.opacity = '0'
  }

  private updatePosition(): void {
    if (this.focusedElement && this.focusedElement === document.activeElement) {
      this.showIndicator(this.focusedElement)
    }
  }

  public setOptions(options: Partial<FocusIndicatorOptions>): void {
    Object.assign(this.options, options)
    
    this.indicator.style.border = 
      `${this.options.width}px ${this.options.style} ${this.options.color}`
    this.indicator.style.borderRadius = `${this.options.borderRadius}px`
    
    if (this.focusedElement) {
      this.updatePosition()
    }
  }

  public destroy(): void {
    this.indicator.remove()
    document.removeEventListener('focusin', this.handleFocusIn.bind(this))
    document.removeEventListener('focusout', this.handleFocusOut.bind(this))
    window.removeEventListener('scroll', this.updatePosition.bind(this), true)
    window.removeEventListener('resize', this.updatePosition.bind(this))
  }
}

// コンポーネントのセットアップ
const focusIndicatorManager = ref<FocusIndicatorManager | null>(null)

const props = defineProps<{
  enabled?: boolean
  options?: FocusIndicatorOptions
}>()

onMounted(() => {
  if (props.enabled !== false) {
    focusIndicatorManager.value = new FocusIndicatorManager(props.options)
  }
})

// 外部からオプションを更新できるように公開
defineExpose({
  setOptions: (options: Partial<FocusIndicatorOptions>) => {
    focusIndicatorManager.value?.setOptions(options)
  },
  destroy: () => {
    focusIndicatorManager.value?.destroy()
  }
})
</script>

<template>
  <!-- このコンポーネントはJavaScriptで動的に要素を作成するためテンプレートは空 -->
</template>

<style>
/* グローバルスタイルとして適用 */
.focus-indicator {
  animation: focus-pulse 2s ease-in-out infinite;
}

@keyframes focus-pulse {
  0%, 100% {
    box-shadow: 
      0 0 20px rgba(129, 140, 248, 0.4),
      inset 0 0 10px rgba(129, 140, 248, 0.1);
  }
  50% {
    box-shadow: 
      0 0 30px rgba(129, 140, 248, 0.6),
      inset 0 0 15px rgba(129, 140, 248, 0.2);
  }
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
  .focus-indicator {
    border-width: 4px !important;
    border-color: #000 !important;
    box-shadow: 
      0 0 0 2px #fff,
      0 0 0 6px #000 !important;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .focus-indicator {
    animation: none !important;
    transition: opacity 150ms ease !important;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .focus-indicator {
    border-color: #A5B4FC;
    box-shadow: 
      0 0 25px rgba(165, 180, 252, 0.5),
      inset 0 0 12px rgba(165, 180, 252, 0.15);
  }
}

/* 高DPIディスプレイ対応 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .focus-indicator {
    border-width: 2px;
    transform: translateZ(0); /* GPUアクセラレーション */
  }
}
</style>