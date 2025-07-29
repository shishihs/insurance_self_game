/**
 * ARIA属性管理システム
 * WCAG 2.1 AA準拠のセマンティックマークアップとアクセシビリティ属性を包括的に管理
 */

export interface ARIADescriptor {
  role?: string
  label?: string
  labelledBy?: string
  describedBy?: string
  expanded?: boolean
  selected?: boolean
  pressed?: boolean
  checked?: boolean | 'mixed'
  disabled?: boolean
  hidden?: boolean
  live?: 'off' | 'polite' | 'assertive'
  relevant?: string
  atomic?: boolean
  busy?: boolean
  level?: number
  posInSet?: number
  setSize?: number
  hasPopup?: boolean | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  controls?: string
  owns?: string
  flowTo?: string
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  keyShortcuts?: string
  roledescription?: string
}

export interface ARIARelationship {
  sourceId: string
  targetId: string
  relationship: 'labelledby' | 'describedby' | 'controls' | 'owns' | 'flowto'
}

export interface ARIAValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export class ARIAManager {
  private static instance: ARIAManager
  private elements = new Map<string, HTMLElement>()
  private relationships = new Map<string, ARIARelationship[]>()
  private observers = new Map<string, MutationObserver>()
  private validRoles = new Set([
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
    'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
    'contentinfo', 'definition', 'dialog', 'directory', 'document',
    'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
    'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
    'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
    'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
    'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
    'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
    'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
    'tooltip', 'tree', 'treegrid', 'treeitem'
  ])

  private constructor() {
    this.setupGlobalObserver()
  }

  public static getInstance(): ARIAManager {
    if (!ARIAManager.instance) {
      ARIAManager.instance = new ARIAManager()
    }
    return ARIAManager.instance
  }

  /**
   * 要素にARIA属性を設定
   */
  public setARIA(element: HTMLElement, descriptor: ARIADescriptor, elementId?: string): void {
    const id = elementId || this.generateId(element)
    element.id = id
    this.elements.set(id, element)

    // 基本属性の設定
    if (descriptor.role !== undefined) {
      this.setRole(element, descriptor.role)
    }

    if (descriptor.label !== undefined) {
      element.setAttribute('aria-label', descriptor.label)
    }

    if (descriptor.labelledBy !== undefined) {
      element.setAttribute('aria-labelledby', descriptor.labelledBy)
      this.addRelationship(id, descriptor.labelledBy, 'labelledby')
    }

    if (descriptor.describedBy !== undefined) {
      element.setAttribute('aria-describedby', descriptor.describedBy)
      this.addRelationship(id, descriptor.describedBy, 'describedby')
    }

    // 状態属性の設定
    this.setStateAttributes(element, descriptor)

    // ライブリージョン属性
    this.setLiveRegionAttributes(element, descriptor)

    // 階層・位置属性
    this.setHierarchyAttributes(element, descriptor)

    // その他の属性
    this.setMiscAttributes(element, descriptor)

    // 検証
    const validation = this.validateElement(element)
    if (!validation.valid) {
      console.warn(`ARIA validation failed for ${id}:`, validation.errors)
    }
  }

  /**
   * ゲーム特有のARIA設定
   */
  public setGameElementARIA(element: HTMLElement, gameType: 'card' | 'dropzone' | 'button' | 'status' | 'modal', context: any = {}): void {
    const id = this.generateId(element)
    
    switch (gameType) {
      case 'card':
        this.setCardARIA(element, context)
        break
      case 'dropzone':
        this.setDropZoneARIA(element, context)
        break
      case 'button':
        this.setButtonARIA(element, context)
        break
      case 'status':
        this.setStatusARIA(element, context)
        break
      case 'modal':
        this.setModalARIA(element, context)
        break
    }
  }

  /**
   * カード要素のARIA設定
   */
  private setCardARIA(element: HTMLElement, context: any): void {
    const { card, selected, draggable, position } = context
    
    this.setARIA(element, {
      role: 'button',
      label: this.createCardLabel(card),
      describedBy: this.createCardDescription(card, element.id),
      selected,
      pressed: selected,
      disabled: card.disabled,
      posInSet: position?.index,
      setSize: position?.total,
      keyShortcuts: draggable ? 'Space または Enter でドラッグ開始' : undefined,
      roledescription: 'ゲームカード'
    })

    // ドラッグ可能な場合
    if (draggable) {
      element.setAttribute('draggable', 'true')
      element.setAttribute('aria-grabbed', selected ? 'true' : 'false')
    }

    // カードタイプ別の追加情報
    if (card.type === 'insurance') {
      element.setAttribute('data-card-type', 'insurance')
      element.classList.add('insurance-card')
    }
  }

  /**
   * ドロップゾーン要素のARIA設定
   */
  private setDropZoneARIA(element: HTMLElement, context: any): void {
    const { label, accepts, state } = context

    this.setARIA(element, {
      role: 'region',
      label: label || 'ドロップゾーン',
      describedBy: this.createDropZoneDescription(accepts, element.id),
      live: 'polite',
      relevant: 'additions removals',
      roledescription: 'ドロップエリア'
    })

    // 状態による属性設定
    if (state === 'active') {
      element.setAttribute('aria-dropeffect', 'move')
    } else if (state === 'invalid') {
      element.setAttribute('aria-invalid', 'true')
    }
  }

  /**
   * ボタン要素のARIA設定
   */
  private setButtonARIA(element: HTMLElement, context: any): void {
    const { action, shortcut, pressed, disabled, hasPopup } = context

    this.setARIA(element, {
      role: element.tagName.toLowerCase() === 'button' ? undefined : 'button',
      label: context.label,
      pressed,
      disabled,
      hasPopup,
      keyShortcuts: shortcut,
      describedBy: action ? this.createActionDescription(action, element.id) : undefined
    })
  }

  /**
   * ステータス要素のARIA設定
   */
  private setStatusARIA(element: HTMLElement, context: any): void {
    const { type, value, maxValue, description } = context

    const descriptor: ARIADescriptor = {
      role: type === 'progress' ? 'progressbar' : 'status',
      label: context.label,
      live: 'polite',
      atomic: true
    }

    if (type === 'progress' && typeof value === 'number') {
      element.setAttribute('aria-valuenow', value.toString())
      if (typeof maxValue === 'number') {
        element.setAttribute('aria-valuemax', maxValue.toString())
        element.setAttribute('aria-valuemin', '0')
      }
    }

    this.setARIA(element, descriptor)
  }

  /**
   * モーダル要素のARIA設定
   */
  private setModalARIA(element: HTMLElement, context: any): void {
    const { title, describedBy, modal = true } = context

    this.setARIA(element, {
      role: 'dialog',
      labelledBy: title,
      describedBy,
      hidden: false
    })

    if (modal) {
      element.setAttribute('aria-modal', 'true')
    }

    // フォーカストラップの設定
    this.setupModalFocusTrap(element)
  }

  /**
   * ライブリージョンの更新
   */
  public announceLive(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const liveRegion = this.getOrCreateLiveRegion(priority)
    
    // 前のメッセージをクリア
    liveRegion.textContent = ''
    
    // 少し待ってから新しいメッセージを設定（スクリーンリーダーが確実に読み上げるため）
    setTimeout(() => {
      liveRegion.textContent = message
    }, 100)
  }

  /**
   * 要素のARIA属性を検証
   */
  public validateElement(element: HTMLElement): ARIAValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // ロールの検証
    const role = element.getAttribute('role')
    if (role && !this.validRoles.has(role)) {
      errors.push(`Invalid role: ${role}`)
    }

    // 必須属性の確認
    this.validateRequiredAttributes(element, role, errors, warnings)

    // 属性の組み合わせ検証
    this.validateAttributeCombinations(element, errors, warnings)

    // アクセシブルネームの確認
    this.validateAccessibleName(element, errors, warnings, suggestions)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * 全要素のARIA検証
   */
  public validateAll(container: HTMLElement = document.body): ARIAValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []
    const allSuggestions: string[] = []

    const elements = container.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]')
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        const result = this.validateElement(el)
        allErrors.push(...result.errors)
        allWarnings.push(...result.warnings)
        allSuggestions.push(...result.suggestions)
      }
    })

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions
    }
  }

  /**
   * ARIAツリー構造の取得
   */
  public getARIATree(container: HTMLElement = document.body): any {
    const tree = {
      element: this.getElementInfo(container),
      children: []
    }

    const children = container.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement
      tree.children.push(this.getARIATree(child))
    }

    return tree
  }

  private setupGlobalObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('aria-')) {
          const element = mutation.target as HTMLElement
          this.validateElement(element)
        }
      })
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['role', 'aria-label', 'aria-labelledby', 'aria-describedby'],
      subtree: true
    })
  }

  private setRole(element: HTMLElement, role: string): void {
    if (this.validRoles.has(role)) {
      element.setAttribute('role', role)
    } else {
      console.warn(`Invalid ARIA role: ${role}`)
    }
  }

  private setStateAttributes(element: HTMLElement, descriptor: ARIADescriptor): void {
    if (descriptor.expanded !== undefined) {
      element.setAttribute('aria-expanded', descriptor.expanded.toString())
    }
    if (descriptor.selected !== undefined) {
      element.setAttribute('aria-selected', descriptor.selected.toString())
    }
    if (descriptor.pressed !== undefined) {
      element.setAttribute('aria-pressed', descriptor.pressed.toString())
    }
    if (descriptor.checked !== undefined) {
      element.setAttribute('aria-checked', descriptor.checked.toString())
    }
    if (descriptor.disabled !== undefined) {
      element.setAttribute('aria-disabled', descriptor.disabled.toString())
    }
    if (descriptor.hidden !== undefined) {
      element.setAttribute('aria-hidden', descriptor.hidden.toString())
    }
    if (descriptor.busy !== undefined) {
      element.setAttribute('aria-busy', descriptor.busy.toString())
    }
    if (descriptor.current !== undefined) {
      element.setAttribute('aria-current', descriptor.current.toString())
    }
  }

  private setLiveRegionAttributes(element: HTMLElement, descriptor: ARIADescriptor): void {
    if (descriptor.live !== undefined) {
      element.setAttribute('aria-live', descriptor.live)
    }
    if (descriptor.relevant !== undefined) {
      element.setAttribute('aria-relevant', descriptor.relevant)
    }
    if (descriptor.atomic !== undefined) {
      element.setAttribute('aria-atomic', descriptor.atomic.toString())
    }
  }

  private setHierarchyAttributes(element: HTMLElement, descriptor: ARIADescriptor): void {
    if (descriptor.level !== undefined) {
      element.setAttribute('aria-level', descriptor.level.toString())
    }
    if (descriptor.posInSet !== undefined) {
      element.setAttribute('aria-posinset', descriptor.posInSet.toString())
    }
    if (descriptor.setSize !== undefined) {
      element.setAttribute('aria-setsize', descriptor.setSize.toString())
    }
  }

  private setMiscAttributes(element: HTMLElement, descriptor: ARIADescriptor): void {
    if (descriptor.hasPopup !== undefined) {
      element.setAttribute('aria-haspopup', descriptor.hasPopup.toString())
    }
    if (descriptor.controls !== undefined) {
      element.setAttribute('aria-controls', descriptor.controls)
      this.addRelationship(element.id, descriptor.controls, 'controls')
    }
    if (descriptor.owns !== undefined) {
      element.setAttribute('aria-owns', descriptor.owns)
      this.addRelationship(element.id, descriptor.owns, 'owns')
    }
    if (descriptor.flowTo !== undefined) {
      element.setAttribute('aria-flowto', descriptor.flowTo)
      this.addRelationship(element.id, descriptor.flowTo, 'flowto')
    }
    if (descriptor.keyShortcuts !== undefined) {
      element.setAttribute('aria-keyshortcuts', descriptor.keyShortcuts)
    }
    if (descriptor.roledescription !== undefined) {
      element.setAttribute('aria-roledescription', descriptor.roledescription)
    }
  }

  private createCardLabel(card: any): string {
    const parts = [card.name || 'カード']
    if (card.type) parts.push(`タイプ: ${card.type}`)
    if (card.power !== undefined) parts.push(`パワー: ${card.power}`)
    return parts.join(', ')
  }

  private createCardDescription(card: any, elementId: string): string {
    const descId = `${elementId}-desc`
    const descElement = document.createElement('div')
    descElement.id = descId
    descElement.className = 'sr-only'
    descElement.textContent = card.description || 'カードの詳細説明'
    document.body.appendChild(descElement)
    return descId
  }

  private createDropZoneDescription(accepts: string[], elementId: string): string {
    const descId = `${elementId}-desc`
    const descElement = document.createElement('div')
    descElement.id = descId
    descElement.className = 'sr-only'
    descElement.textContent = accepts 
      ? `${accepts.join('、')}をドロップできます` 
      : 'アイテムをドロップできます'
    document.body.appendChild(descElement)
    return descId
  }

  private createActionDescription(action: string, elementId: string): string {
    const descId = `${elementId}-desc`
    const descElement = document.createElement('div')
    descElement.id = descId
    descElement.className = 'sr-only'
    descElement.textContent = `アクション: ${action}`
    document.body.appendChild(descElement)
    return descId
  }

  private setupModalFocusTrap(modal: HTMLElement): void {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement.focus()
            }
          }
        }
      })
      
      firstElement.focus()
    }
  }

  private getOrCreateLiveRegion(priority: 'polite' | 'assertive'): HTMLElement {
    const id = `live-region-${priority}`
    let region = document.getElementById(id)
    
    if (!region) {
      region = document.createElement('div')
      region.id = id
      region.setAttribute('aria-live', priority)
      region.setAttribute('aria-relevant', 'additions text')
      region.className = 'sr-only'
      document.body.appendChild(region)
    }
    
    return region
  }

  private validateRequiredAttributes(element: HTMLElement, role: string | null, errors: string[], warnings: string[]): void {
    // ロール別の必須属性チェック
    if (role === 'button' && !element.hasAttribute('aria-label') && !element.textContent?.trim()) {
      errors.push('Button role requires accessible name')
    }
    
    if (role === 'progressbar') {
      if (!element.hasAttribute('aria-valuenow')) {
        errors.push('Progressbar requires aria-valuenow')
      }
    }
    
    if (role === 'slider') {
      if (!element.hasAttribute('aria-valuenow') || !element.hasAttribute('aria-valuemin') || !element.hasAttribute('aria-valuemax')) {
        errors.push('Slider requires aria-valuenow, aria-valuemin, and aria-valuemax')
      }
    }
  }

  private validateAttributeCombinations(element: HTMLElement, errors: string[], warnings: string[]): void {
    // aria-labelとaria-labelledbyの競合チェック
    if (element.hasAttribute('aria-label') && element.hasAttribute('aria-labelledby')) {
      warnings.push('Both aria-label and aria-labelledby present - aria-labelledby takes precedence')
    }
    
    // aria-hiddenとフォーカス可能要素の競合
    if (element.getAttribute('aria-hidden') === 'true' && element.tabIndex >= 0) {
      errors.push('Focusable element should not have aria-hidden="true"')
    }
  }

  private validateAccessibleName(element: HTMLElement, errors: string[], warnings: string[], suggestions: string[]): void {
    const isInteractive = this.isInteractiveElement(element)
    if (isInteractive) {
      const hasAccessibleName = 
        element.hasAttribute('aria-label') || 
        element.hasAttribute('aria-labelledby') || 
        element.textContent?.trim()
      
      if (!hasAccessibleName) {
        errors.push('Interactive element lacks accessible name')
      }
    }
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea']
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem']
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role') || '') ||
           element.hasAttribute('tabindex') ||
           element.hasAttribute('onclick')
  }

  private getElementInfo(element: HTMLElement): any {
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      ariaLabelledBy: element.getAttribute('aria-labelledby'),
      ariaDescribedBy: element.getAttribute('aria-describedby'),
      textContent: element.textContent?.trim().substring(0, 100)
    }
  }

  private generateId(element: HTMLElement): string {
    if (element.id) return element.id
    
    const tagName = element.tagName.toLowerCase()
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `${tagName}-${timestamp}-${random}`
  }

  private addRelationship(sourceId: string, targetId: string, relationship: ARIARelationship['relationship']): void {
    if (!this.relationships.has(sourceId)) {
      this.relationships.set(sourceId, [])
    }
    
    this.relationships.get(sourceId)!.push({
      sourceId,
      targetId,
      relationship
    })
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.elements.clear()
    this.relationships.clear()
  }
}

// シングルトンインスタンスをエクスポート
export const ariaManager = ARIAManager.getInstance()