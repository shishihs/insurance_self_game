/**
 * フォーカスインジケーター管理システム
 * アクセシビリティ向上のための視覚的フィードバック
 */

export interface FocusIndicatorOptions {
  color?: string
  width?: number
  style?: 'solid' | 'dashed' | 'dotted'
  offset?: number
  borderRadius?: number
}

/**
 * フォーカスインジケーターの管理クラス
 */
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
    
    // フォーカス可能な要素のみ対象にする
    if (this.isFocusableElement(target)) {
      this.focusedElement = target
      this.showIndicator(target)
    }
  }

  private handleFocusOut(): void {
    this.focusedElement = null
    this.hideIndicator()
  }

  private isFocusableElement(element: HTMLElement): boolean {
    // フォーカス可能な要素の判定
    const focusableSelectors = [
      'button', 'input', 'select', 'textarea', 'a[href]',
      '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ]
    
    return focusableSelectors.some(selector => 
      element.matches(selector) || element.closest(selector)
    )
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