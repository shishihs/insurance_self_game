/**
 * アクセシビリティテストヘルパー
 * WCAG 2.1 AA基準の検証を支援するユーティリティ
 */

export interface A11yTestResult {
  passed: boolean
  violations: A11yViolation[]
  warnings: A11yWarning[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
}

export interface A11yViolation {
  element: HTMLElement
  issue: string
  wcagCriteria: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  fix: string
}

export interface A11yWarning {
  element: HTMLElement
  issue: string
  recommendation: string
}

export class A11yTestHelper {
  /**
   * 要素のアクセシビリティをテスト
   */
  static testElement(element: HTMLElement): A11yTestResult {
    const violations: A11yViolation[] = []
    const warnings: A11yWarning[] = []

    // 各種テストを実行
    this.testColorContrast(element, violations)
    this.testKeyboardNavigation(element, violations, warnings)
    this.testAriaAttributes(element, violations, warnings)
    this.testFocusIndicators(element, violations)
    this.testTouchTargets(element, violations)
    this.testMotion(element, warnings)

    const passed = violations.length === 0
    const total = violations.length + warnings.length

    return {
      passed,
      violations,
      warnings,
      summary: {
        total,
        passed: passed ? 1 : 0,
        failed: violations.length,
        warnings: warnings.length
      }
    }
  }

  /**
   * 色のコントラスト比をテスト
   */
  private static testColorContrast(element: HTMLElement, violations: A11yViolation[]): void {
    const computedStyle = window.getComputedStyle(element)
    const backgroundColor = computedStyle.backgroundColor
    const color = computedStyle.color

    if (backgroundColor !== 'rgba(0, 0, 0, 0)' && color) {
      const contrast = this.calculateContrastRatio(backgroundColor, color)
      
      // WCAG AA基準: 通常テキスト4.5:1、大きいテキスト3:1
      const fontSize = parseFloat(computedStyle.fontSize)
      const fontWeight = computedStyle.fontWeight
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight === 'bold')
      const requiredContrast = isLargeText ? 3 : 4.5

      if (contrast < requiredContrast) {
        violations.push({
          element,
          issue: `コントラスト比が不十分です (${contrast.toFixed(2)}:1)`,
          wcagCriteria: 'WCAG 2.1 1.4.3',
          severity: 'serious',
          fix: `コントラスト比を${requiredContrast}:1以上にしてください`
        })
      }
    }
  }

  /**
   * キーボードナビゲーションをテスト
   */
  private static testKeyboardNavigation(
    element: HTMLElement, 
    violations: A11yViolation[], 
    warnings: A11yWarning[]
  ): void {
    // インタラクティブ要素のチェック
    const isInteractive = this.isInteractiveElement(element)
    
    if (isInteractive) {
      const tabindex = element.getAttribute('tabindex')
      
      // tabindex="-1"の場合は警告
      if (tabindex === '-1') {
        warnings.push({
          element,
          issue: 'キーボードでフォーカスできません',
          recommendation: 'tabindex="0"を設定してキーボードアクセスを可能にしてください'
        })
      }
      
      // 正のtabindexは避けるべき
      if (tabindex && parseInt(tabindex) > 0) {
        violations.push({
          element,
          issue: '正のtabindex値は使用しないでください',
          wcagCriteria: 'WCAG 2.1 2.4.3',
          severity: 'moderate',
          fix: 'tabindex="0"または削除してください'
        })
      }
    }
  }

  /**
   * ARIA属性をテスト
   */
  private static testAriaAttributes(
    element: HTMLElement, 
    violations: A11yViolation[], 
    warnings: A11yWarning[]
  ): void {
    // aria-labelまたはaria-labelledbyのチェック
    const hasAriaLabel = element.hasAttribute('aria-label')
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
    const hasTextContent = element.textContent?.trim().length ?? 0 > 0

    if (this.isInteractiveElement(element) && !hasAriaLabel && !hasAriaLabelledBy && !hasTextContent) {
      violations.push({
        element,
        issue: 'アクセシブルな名前がありません',
        wcagCriteria: 'WCAG 2.1 4.1.2',
        severity: 'critical',
        fix: 'aria-label属性を追加するか、テキストコンテンツを提供してください'
      })
    }

    // role属性の検証
    const role = element.getAttribute('role')
    if (role && !this.isValidRole(role)) {
      violations.push({
        element,
        issue: `無効なrole属性: ${role}`,
        wcagCriteria: 'WCAG 2.1 4.1.2',
        severity: 'serious',
        fix: '有効なARIAロールを使用してください'
      })
    }

    // aria-describedbyの存在チェック
    if (this.needsDescription(element) && !element.hasAttribute('aria-describedby')) {
      warnings.push({
        element,
        issue: '追加の説明が推奨されます',
        recommendation: 'aria-describedby属性で詳細な説明を提供してください'
      })
    }
  }

  /**
   * フォーカスインジケーターをテスト
   */
  private static testFocusIndicators(element: HTMLElement, violations: A11yViolation[]): void {
    if (this.isInteractiveElement(element)) {
      // フォーカス時のスタイルをシミュレート
      element.focus()
      const focusedStyle = window.getComputedStyle(element)
      
      // outlineまたはborderの変化をチェック
      const hasOutline = focusedStyle.outlineStyle !== 'none' && focusedStyle.outlineWidth !== '0px'
      const hasBorderChange = this.checkBorderChange(element)
      
      if (!hasOutline && !hasBorderChange) {
        violations.push({
          element,
          issue: 'フォーカスインジケーターが表示されません',
          wcagCriteria: 'WCAG 2.1 2.4.7',
          severity: 'serious',
          fix: 'フォーカス時に視覚的な表示を追加してください'
        })
      }
      
      element.blur()
    }
  }

  /**
   * タッチターゲットサイズをテスト
   */
  private static testTouchTargets(element: HTMLElement, violations: A11yViolation[]): void {
    if (this.isInteractiveElement(element)) {
      const rect = element.getBoundingClientRect()
      const minSize = 44 // WCAG 2.1 AAA基準
      
      if (rect.width < minSize || rect.height < minSize) {
        violations.push({
          element,
          issue: `タッチターゲットが小さすぎます (${rect.width}x${rect.height}px)`,
          wcagCriteria: 'WCAG 2.1 2.5.5',
          severity: 'moderate',
          fix: `最小44x44pxのサイズにしてください`
        })
      }
    }
  }

  /**
   * モーション設定をテスト
   */
  private static testMotion(element: HTMLElement, warnings: A11yWarning[]): void {
    const computedStyle = window.getComputedStyle(element)
    const hasAnimation = computedStyle.animationName !== 'none'
    const hasTransition = computedStyle.transitionProperty !== 'none'
    
    if (hasAnimation || hasTransition) {
      // prefers-reduced-motionのサポートをチェック
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      
      if (reducedMotionQuery.matches) {
        const stillHasMotion = 
          computedStyle.animationDuration !== '0s' || 
          computedStyle.transitionDuration !== '0s'
        
        if (stillHasMotion) {
          warnings.push({
            element,
            issue: 'モーション削減設定が適用されていません',
            recommendation: '@media (prefers-reduced-motion: reduce)でアニメーションを無効化してください'
          })
        }
      }
    }
  }

  /**
   * コントラスト比を計算
   */
  private static calculateContrastRatio(bg: string, fg: string): number {
    const bgRgb = this.parseColor(bg)
    const fgRgb = this.parseColor(fg)
    
    const bgLuminance = this.getLuminance(bgRgb)
    const fgLuminance = this.getLuminance(fgRgb)
    
    const lighter = Math.max(bgLuminance, fgLuminance)
    const darker = Math.min(bgLuminance, fgLuminance)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * 色をRGB値に変換
   */
  private static parseColor(color: string): [number, number, number] {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    }
    return [0, 0, 0]
  }

  /**
   * 輝度を計算
   */
  private static getLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      const sRGB = c / 255
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  /**
   * インタラクティブ要素かチェック
   */
  private static isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea']
    const tagName = element.tagName.toLowerCase()
    
    return interactiveTags.includes(tagName) || 
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex') ||
           element.getAttribute('role') === 'button'
  }

  /**
   * 有効なARIAロールかチェック
   */
  private static isValidRole(role: string): boolean {
    const validRoles = [
      'button', 'link', 'checkbox', 'radio', 'menuitem', 'tab',
      'navigation', 'main', 'complementary', 'banner', 'contentinfo',
      'dialog', 'alert', 'status', 'progressbar', 'slider'
    ]
    return validRoles.includes(role)
  }

  /**
   * 説明が必要な要素かチェック
   */
  private static needsDescription(element: HTMLElement): boolean {
    const complexElements = ['input', 'select', 'textarea']
    const tagName = element.tagName.toLowerCase()
    
    return complexElements.includes(tagName) || 
           element.getAttribute('role') === 'slider' ||
           element.getAttribute('role') === 'progressbar'
  }

  /**
   * ボーダーの変化をチェック
   */
  private static checkBorderChange(element: HTMLElement): boolean {
    const normalStyle = window.getComputedStyle(element)
    const normalBorder = normalStyle.border
    
    element.focus()
    const focusedStyle = window.getComputedStyle(element)
    const focusedBorder = focusedStyle.border
    element.blur()
    
    return normalBorder !== focusedBorder
  }

  /**
   * 全体的なアクセシビリティレポートを生成
   */
  static generateReport(container: HTMLElement = document.body): string {
    const elements = container.querySelectorAll('*')
    const results: A11yTestResult[] = []
    
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        const result = this.testElement(element)
        if (result.violations.length > 0 || result.warnings.length > 0) {
          results.push(result)
        }
      }
    })
    
    // レポートの作成
    let report = '# アクセシビリティテストレポート\n\n'
    report += `テスト日時: ${new Date().toLocaleString()}\n\n`
    
    // サマリー
    const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0)
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)
    
    report += '## サマリー\n'
    report += `- 違反: ${totalViolations}件\n`
    report += `- 警告: ${totalWarnings}件\n\n`
    
    // 詳細
    if (totalViolations > 0) {
      report += '## 違反詳細\n'
      results.forEach(result => {
        result.violations.forEach(violation => {
          report += `\n### ${violation.severity.toUpperCase()}: ${violation.issue}\n`
          report += `- 要素: ${this.getElementSelector(violation.element)}\n`
          report += `- WCAG基準: ${violation.wcagCriteria}\n`
          report += `- 修正方法: ${violation.fix}\n`
        })
      })
    }
    
    if (totalWarnings > 0) {
      report += '\n## 警告詳細\n'
      results.forEach(result => {
        result.warnings.forEach(warning => {
          report += `\n### ${warning.issue}\n`
          report += `- 要素: ${this.getElementSelector(warning.element)}\n`
          report += `- 推奨事項: ${warning.recommendation}\n`
        })
      })
    }
    
    return report
  }

  /**
   * 要素のセレクターを取得
   */
  private static getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`
    }
    
    if (element.className) {
      return `${element.tagName.toLowerCase()}.${element.className.split(' ').join('.')}`
    }
    
    return element.tagName.toLowerCase()
  }
}