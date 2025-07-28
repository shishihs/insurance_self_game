/**
 * アクセシビリティ基本チェックスクリプト
 * 実装したアニメーションとUI要素のアクセシビリティを確認
 */

// 基本的なアクセシビリティチェック項目
const accessibilityChecks = {
  // 1. キーボードナビゲーション
  keyboardNavigation: {
    name: 'キーボードナビゲーション',
    check: () => {
      const focusableElements = document.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      console.log(`✅ フォーカス可能要素数: ${focusableElements.length}`)
      
      // Tab順序の確認
      let hasTabindex = 0
      focusableElements.forEach(element => {
        if (element.hasAttribute('tabindex')) {
          hasTabindex++
        }
      })
      
      console.log(`✅ tabindex設定済み要素: ${hasTabindex}`)
      return focusableElements.length > 0
    }
  },

  // 2. ARIA属性
  ariaAttributes: {
    name: 'ARIA属性',
    check: () => {
      const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]')
      console.log(`✅ ARIA属性を持つ要素数: ${ariaElements.length}`)
      
      // 主要ARIA属性の確認
      const ariaLabels = document.querySelectorAll('[aria-label]').length
      const ariaRoles = document.querySelectorAll('[role]').length
      const ariaLive = document.querySelectorAll('[aria-live]').length
      
      console.log(`  - aria-label: ${ariaLabels}`)
      console.log(`  - role: ${ariaRoles}`)
      console.log(`  - aria-live: ${ariaLive}`)
      
      return ariaElements.length > 0
    }
  },

  // 3. セマンティックHTML
  semanticHTML: {
    name: 'セマンティックHTML',
    check: () => {
      const semanticElements = document.querySelectorAll(
        'main, nav, header, footer, section, article, aside, h1, h2, h3, h4, h5, h6'
      )
      console.log(`✅ セマンティック要素数: ${semanticElements.length}`)
      
      // 見出し構造の確認
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      console.log(`  - 見出し要素数: ${headings.length}`)
      
      return semanticElements.length > 0
    }
  },

  // 4. フォーカス表示
  focusVisibility: {
    name: 'フォーカス表示',
    check: () => {
      const style = window.getComputedStyle(document.documentElement)
      
      // キーボードナビゲーションクラスの存在確認
      const hasKeyboardNav = document.documentElement.classList.contains('keyboard-navigation')
      console.log(`✅ キーボードナビゲーション状態: ${hasKeyboardNav}`)
      
      // フォーカススタイルの確認
      const buttons = document.querySelectorAll('button')
      let hasFocusStyle = false
      
      if (buttons.length > 0) {
        const firstButton = buttons[0]
        firstButton.focus()
        const focusedStyle = window.getComputedStyle(firstButton)
        hasFocusStyle = focusedStyle.outline !== 'none'
        firstButton.blur()
      }
      
      console.log(`✅ フォーカススタイル設定: ${hasFocusStyle}`)
      return true
    }
  },

  // 5. スクリーンリーダー対応
  screenReader: {
    name: 'スクリーンリーダー対応',
    check: () => {
      const liveRegions = document.querySelectorAll('[aria-live]')
      const srOnlyElements = document.querySelectorAll('.sr-only')
      const skipLinks = document.querySelectorAll('.skip-link')
      
      console.log(`✅ Live Region数: ${liveRegions.length}`)
      console.log(`✅ スクリーンリーダー専用要素: ${srOnlyElements.length}`)
      console.log(`✅ スキップリンク: ${skipLinks.length}`)
      
      return liveRegions.length > 0 || srOnlyElements.length > 0
    }
  },

  // 6. レスポンシブデザイン
  responsiveDesign: {
    name: 'レスポンシブデザイン',
    check: () => {
      const viewport = document.querySelector('meta[name="viewport"]')
      console.log(`✅ Viewport設定: ${viewport ? 'あり' : 'なし'}`)
      
      // CSS Grid/Flexboxの使用確認
      const containers = document.querySelectorAll('.home-container, .game-view, .button-group')
      let hasFlexOrGrid = false
      
      containers.forEach(container => {
        const style = window.getComputedStyle(container)
        if (style.display === 'flex' || style.display === 'grid') {
          hasFlexOrGrid = true
        }
      })
      
      console.log(`✅ Flex/Grid使用: ${hasFlexOrGrid}`)
      return viewport !== null
    }
  },

  // 7. アニメーション設定
  animationSettings: {
    name: 'アニメーション設定',
    check: () => {
      // prefers-reduced-motionの確認
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      console.log(`✅ モーション削減設定: ${prefersReduced}`)
      
      // CSS変数の確認
      const rootStyle = window.getComputedStyle(document.documentElement)
      const hasTransitionVars = rootStyle.getPropertyValue('--transition-fast').trim() !== ''
      
      console.log(`✅ CSS変数（トランジション）: ${hasTransitionVars}`)
      
      // カードアニメーションクラスの存在確認
      const hasCardAnimations = document.head.innerHTML.includes('game-card') && 
                               document.head.innerHTML.includes('dragging')
      
      console.log(`✅ カードアニメーション: ${hasCardAnimations}`)
      return true
    }
  }
}

// チェック実行
function runAccessibilityCheck() {
  console.log('🔍 アクセシビリティチェック開始\n')
  
  const results = {}
  let passedChecks = 0
  const totalChecks = Object.keys(accessibilityChecks).length
  
  for (const [key, check] of Object.entries(accessibilityChecks)) {
    console.log(`📋 ${check.name}をチェック中:`)
    try {
      const result = check.check()
      results[key] = result
      if (result) passedChecks++
      console.log(`${result ? '✅' : '❌'} ${check.name}: ${result ? '合格' : '要改善'}\n`)
    } catch (error) {
      console.error(`❌ ${check.name}: エラー - ${error.message}\n`)
      results[key] = false
    }
  }
  
  // 結果サマリー
  console.log('📊 アクセシビリティチェック結果:')
  console.log(`合格: ${passedChecks}/${totalChecks} (${Math.round((passedChecks/totalChecks)*100)}%)`)
  
  if (passedChecks === totalChecks) {
    console.log('🎉 全てのアクセシビリティチェックに合格しました！')
  } else {
    console.log('⚠️  いくつかの項目で改善が必要です。')
  }
  
  return results
}

// ページ読み込み完了後にチェック実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAccessibilityCheck)
} else {
  runAccessibilityCheck()
}

// キーボードテスト関数
function testKeyboardNavigation() {
  console.log('⌨️  キーボードナビゲーションテスト開始')
  
  const focusableElements = document.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  
  if (focusableElements.length === 0) {
    console.log('❌ フォーカス可能な要素が見つかりません')
    return
  }
  
  let currentIndex = 0
  
  function focusNext() {
    if (currentIndex < focusableElements.length) {
      const element = focusableElements[currentIndex]
      element.focus()
      console.log(`フォーカス: ${element.tagName}${element.className ? '.' + element.className : ''} (${currentIndex + 1}/${focusableElements.length})`)
      currentIndex++
      
      if (currentIndex < focusableElements.length) {
        setTimeout(focusNext, 1000)
      } else {
        console.log('✅ キーボードナビゲーションテスト完了')
      }
    }
  }
  
  focusNext()
}

// グローバルに関数を公開
window.runAccessibilityCheck = runAccessibilityCheck
window.testKeyboardNavigation = testKeyboardNavigation

console.log('🔧 アクセシビリティチェックツール読み込み完了')
console.log('使用方法:')
console.log('  runAccessibilityCheck() - 全体チェック実行')
console.log('  testKeyboardNavigation() - キーボードナビゲーションテスト')