/**
 * キーボードアクセシビリティマネージャー
 * WCAG 2.1 AA準拠のキーボードナビゲーション実装
 */

export interface FocusableElement {
  element: HTMLElement
  priority: number
  group?: string
  onFocus?: () => void
  onBlur?: () => void
  onActivate?: () => void
}

export interface KeyboardShortcut {
  key: string
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  description: string
  action: () => void
  global?: boolean
}

export class KeyboardManager {
  private focusableElements: FocusableElement[] = []
  private currentFocusIndex: number = -1
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private isActive: boolean = true
  private focusVisibleEnabled: boolean = true

  constructor() {
    this.setupEventListeners()
    this.setupFocusVisible()
  }

  /**
   * フォーカス可能要素を登録
   */
  registerFocusableElement(element: HTMLElement, options: Partial<FocusableElement> = {}): void {
    const focusableElement: FocusableElement = {
      element,
      priority: options.priority || 0,
      group: options.group,
      onFocus: options.onFocus,
      onBlur: options.onBlur,
      onActivate: options.onActivate
    }

    // 既存要素の更新または新規追加
    const existingIndex = this.focusableElements.findIndex(el => el.element === element)
    if (existingIndex >= 0) {
      this.focusableElements[existingIndex] = focusableElement
    } else {
      this.focusableElements.push(focusableElement)
    }

    // 優先度順にソート
    this.focusableElements.sort((a, b) => b.priority - a.priority)

    // ARIA属性の設定
    this.setupElementAccessibility(element)
  }

  /**
   * フォーカス可能要素の登録解除
   */
  unregisterFocusableElement(element: HTMLElement): void {
    const index = this.focusableElements.findIndex(el => el.element === element)
    if (index >= 0) {
      this.focusableElements.splice(index, 1)
      
      // 現在のフォーカスインデックスを調整
      if (this.currentFocusIndex >= index) {
        this.currentFocusIndex = Math.max(0, this.currentFocusIndex - 1)
      }
    }
  }

  /**
   * キーボードショートカットを登録
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.createShortcutKey(shortcut.key, shortcut.modifiers || [])
    this.shortcuts.set(key, shortcut)
  }

  /**
   * キーボードショートカットの登録解除
   */
  unregisterShortcut(key: string, modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[] = []): void {
    const shortcutKey = this.createShortcutKey(key, modifiers)
    this.shortcuts.delete(shortcutKey)
  }

  /**
   * 次の要素にフォーカス移動
   */
  focusNext(): void {
    if (this.focusableElements.length === 0) return

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length
    this.setFocus(this.currentFocusIndex)
  }

  /**
   * 前の要素にフォーカス移動
   */
  focusPrevious(): void {
    if (this.focusableElements.length === 0) return

    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentFocusIndex - 1
    this.setFocus(this.currentFocusIndex)
  }

  /**
   * 特定のグループの最初の要素にフォーカス
   */
  focusGroup(groupName: string): void {
    const groupElements = this.focusableElements.filter(el => el.group === groupName)
    if (groupElements.length > 0) {
      const index = this.focusableElements.indexOf(groupElements[0])
      if (index >= 0) {
        this.currentFocusIndex = index
        this.setFocus(index)
      }
    }
  }

  /**
   * 特定の要素にフォーカス
   */
  focusElement(element: HTMLElement): void {
    const index = this.focusableElements.findIndex(el => el.element === element)
    if (index >= 0) {
      this.currentFocusIndex = index
      this.setFocus(index)
    }
  }

  /**
   * 現在のフォーカス要素を取得
   */
  getCurrentFocusedElement(): HTMLElement | null {
    if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableElements.length) {
      return this.focusableElements[this.currentFocusIndex].element
    }
    return null
  }

  /**
   * フォーカストラップの開始
   */
  startFocusTrap(container: HTMLElement): void {
    const focusableInContainer = this.focusableElements.filter(el => 
      container.contains(el.element)
    )
    
    if (focusableInContainer.length > 0) {
      // コンテナ外の要素を一時的に無効化
      this.focusableElements.forEach(el => {
        if (!container.contains(el.element)) {
          el.element.setAttribute('tabindex', '-1')
          el.element.setAttribute('aria-hidden', 'true')
        }
      })
      
      // 最初の要素にフォーカス
      this.focusElement(focusableInContainer[0].element)
    }
  }

  /**
   * フォーカストラップの終了
   */
  endFocusTrap(): void {
    // すべての要素の属性を復元
    this.focusableElements.forEach(el => {
      el.element.removeAttribute('tabindex')
      el.element.removeAttribute('aria-hidden')
    })
  }

  /**
   * ヘルプテキストの表示/非表示
   */
  toggleHelp(): void {
    const helpPanel = this.createHelpPanel()
    document.body.appendChild(helpPanel)
    
    // ESCキーで閉じる
    const closeHelp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        helpPanel.remove()
        document.removeEventListener('keydown', closeHelp)
      }
    }
    document.addEventListener('keydown', closeHelp)
    
    // フォーカスを移動
    const closeButton = helpPanel.querySelector('button')
    if (closeButton) {
      closeButton.focus()
    }
  }

  /**
   * スキップリンクの作成
   */
  createSkipLinks(): HTMLElement {
    const skipLinks = document.createElement('div')
    skipLinks.className = 'skip-links'
    skipLinks.setAttribute('aria-label', 'スキップリンク')
    
    const skipToMain = this.createSkipLink('メインコンテンツに移動', '#main-content')
    const skipToNav = this.createSkipLink('ナビゲーションに移動', '#navigation')
    const skipToFooter = this.createSkipLink('フッターに移動', '#footer')
    
    skipLinks.appendChild(skipToMain)
    skipLinks.appendChild(skipToNav)
    skipLinks.appendChild(skipToFooter)
    
    return skipLinks
  }

  /**
   * アクティブ状態の切り替え
   */
  setActive(active: boolean): void {
    this.isActive = active
    
    if (!active) {
      // フォーカスを解除
      const currentElement = this.getCurrentFocusedElement()
      if (currentElement) {
        currentElement.blur()
      }
    }
  }

  /**
   * フォーカス表示の有効/無効切り替え
   */
  setFocusVisible(enabled: boolean): void {
    this.focusVisibleEnabled = enabled
    document.documentElement.classList.toggle('keyboard-navigation', enabled)
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('focusin', this.handleFocusIn.bind(this))
    document.addEventListener('focusout', this.handleFocusOut.bind(this))
    
    // マウス使用時はフォーカス表示を無効化
    document.addEventListener('mousedown', () => {
      document.documentElement.classList.remove('keyboard-navigation')
    })
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return

    // ショートカットの処理
    const shortcutKey = this.createShortcutKey(event.key, this.getActiveModifiers(event))
    const shortcut = this.shortcuts.get(shortcutKey)
    
    if (shortcut) {
      event.preventDefault()
      shortcut.action()
      return
    }

    // 基本的なナビゲーション
    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        if (event.shiftKey) {
          this.focusPrevious()
        } else {
          this.focusNext()
        }
        break

      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        this.focusNext()
        break

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        this.focusPrevious()
        break

      case 'Home':
        event.preventDefault()
        this.currentFocusIndex = 0
        this.setFocus(0)
        break

      case 'End':
        event.preventDefault()
        this.currentFocusIndex = this.focusableElements.length - 1
        this.setFocus(this.currentFocusIndex)
        break

      case 'Enter':
      case ' ':
        const currentElement = this.getCurrentFocusedElement()
        if (currentElement) {
          event.preventDefault()
          const focusableEl = this.focusableElements[this.currentFocusIndex]
          if (focusableEl.onActivate) {
            focusableEl.onActivate()
          } else {
            currentElement.click()
          }
        }
        break

      case 'F1':
        event.preventDefault()
        this.toggleHelp()
        break
    }
  }

  private handleFocusIn(event: FocusEvent): void {
    if (!this.focusVisibleEnabled) return

    const target = event.target as HTMLElement
    const index = this.focusableElements.findIndex(el => el.element === target)
    
    if (index >= 0) {
      this.currentFocusIndex = index
      const focusableEl = this.focusableElements[index]
      
      // カスタムフォーカスハンドラを実行
      if (focusableEl.onFocus) {
        focusableEl.onFocus()
      }
      
      // キーボードナビゲーション表示を有効化
      document.documentElement.classList.add('keyboard-navigation')
    }
  }

  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement
    const index = this.focusableElements.findIndex(el => el.element === target)
    
    if (index >= 0) {
      const focusableEl = this.focusableElements[index]
      
      // カスタムブラーハンドラを実行
      if (focusableEl.onBlur) {
        focusableEl.onBlur()
      }
    }
  }

  private setFocus(index: number): void {
    if (index < 0 || index >= this.focusableElements.length) return

    const focusableEl = this.focusableElements[index]
    const element = focusableEl.element

    // 要素が表示されているかチェック
    if (element.offsetParent === null) {
      // 非表示の場合は次の要素に移動
      this.focusNext()
      return
    }

    element.focus()
    
    // スクロールして表示
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    })
  }

  private setupElementAccessibility(element: HTMLElement): void {
    // タブインデックスの設定
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0')
    }

    // ロールの設定（必要に応じて）
    if (!element.hasAttribute('role')) {
      const tagName = element.tagName.toLowerCase()
      if (tagName === 'div' || tagName === 'span') {
        element.setAttribute('role', 'button')
      }
    }

    // ARIA-LABELが未設定の場合の対応
    if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
      const textContent = element.textContent?.trim()
      if (textContent) {
        element.setAttribute('aria-label', textContent)
      }
    }
  }

  private createShortcutKey(key: string, modifiers: string[]): string {
    const sortedModifiers = modifiers.sort()
    return `${sortedModifiers.join('+')}+${key.toLowerCase()}`
  }

  private getActiveModifiers(event: KeyboardEvent): string[] {
    const modifiers: string[] = []
    if (event.ctrlKey) modifiers.push('ctrl')
    if (event.altKey) modifiers.push('alt')
    if (event.shiftKey) modifiers.push('shift')
    if (event.metaKey) modifiers.push('meta')
    return modifiers
  }

  private createSkipLink(text: string, href: string): HTMLElement {
    const link = document.createElement('a')
    link.href = href
    link.textContent = text
    link.className = 'skip-link'
    
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        (target as HTMLElement).focus()
      }
    })
    
    return link
  }

  private createHelpPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'keyboard-help-panel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-labelledby', 'help-title')
    panel.setAttribute('aria-modal', 'true')
    
    const shortcuts = Array.from(this.shortcuts.values())
    
    panel.innerHTML = `
      <div class="help-content">
        <h2 id="help-title">キーボードショートカット</h2>
        <div class="shortcuts-list">
          <div class="shortcut-group">
            <h3>基本ナビゲーション</h3>
            <dl>
              <dt>Tab / Shift+Tab</dt>
              <dd>次/前の要素に移動</dd>
              <dt>矢印キー</dt>
              <dd>方向に応じて移動</dd>
              <dt>Enter / Space</dt>
              <dd>要素を選択/実行</dd>
              <dt>Home / End</dt>
              <dd>最初/最後の要素に移動</dd>
            </dl>
          </div>
          ${shortcuts.length > 0 ? `
            <div class="shortcut-group">
              <h3>ゲーム操作</h3>
              <dl>
                ${shortcuts.map(shortcut => `
                  <dt>${this.formatShortcut(shortcut)}</dt>
                  <dd>${shortcut.description}</dd>
                `).join('')}
              </dl>
            </div>
          ` : ''}
        </div>
        <button type="button" onclick="this.closest('.keyboard-help-panel').remove()">
          閉じる (Esc)
        </button>
      </div>
    `
    
    return panel
  }

  private formatShortcut(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers || []
    const parts = [...modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1)), shortcut.key]
    return parts.join(' + ')
  }

  private setupFocusVisible(): void {
    // CSS変数でキーボードナビゲーション状態を管理
    const style = document.createElement('style')
    style.textContent = `
      .keyboard-navigation *:focus {
        outline: 2px solid #818CF8;
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        z-index: 1000;
      }
      
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        border-radius: 4px;
      }
      
      .skip-link:focus {
        position: static;
        width: auto;
        height: auto;
        left: auto;
        top: auto;
      }
      
      .keyboard-help-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 10000;
      }
      
      .help-content h2 {
        margin-top: 0;
        color: #818CF8;
      }
      
      .shortcuts-list dt {
        font-weight: bold;
        color: #FFD43B;
        margin-top: 0.5rem;
      }
      
      .shortcuts-list dd {
        margin-left: 1rem;
        margin-bottom: 0.5rem;
      }
      
      .help-content button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #818CF8;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.focusableElements = []
    this.shortcuts.clear()
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('focusin', this.handleFocusIn.bind(this))
    document.removeEventListener('focusout', this.handleFocusOut.bind(this))
  }
}