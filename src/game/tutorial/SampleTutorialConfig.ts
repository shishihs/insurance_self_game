import type { TutorialConfig } from '@/domain/types/tutorial.types'

/**
 * サンプルチュートリアル設定
 * UI表示機能のテスト用
 */
export const SAMPLE_TUTORIAL_CONFIG: TutorialConfig = {
  id: 'basic_tutorial_ui_test',
  name: 'チュートリアルUI基本テスト',
  description: 'チュートリアルのUI表示機能をテストするための設定',
  version: '1.0.0',
  autoStart: false,
  canSkip: true,
  showProgress: true,
  overlayOptions: {
    backgroundColor: '#000000',
    opacity: 0.7,
    blurBackground: false,
    allowClickThrough: false
  },
  steps: [
    {
      id: 'welcome',
      title: 'チュートリアルへようこそ',
      description: 'このチュートリアルでは、ゲームの基本的な操作方法を学びます。「次へ」ボタンまたはスペースキーで進めます。',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'none'
      }
    },
    {
      id: 'vitality_intro',
      title: 'バイタリティバーの確認',
      description: '画面上部のバイタリティバーは、あなたの生命力を表します。この値が0になるとゲームオーバーです。',
      targetElement: 'vitality-bar',
      position: 'bottom',
      action: 'click',
      highlightOptions: {
        color: '#00FF00',
        opacity: 0.4,
        borderWidth: 3,
        borderColor: '#00AA00',
        glowEffect: true,
        animationType: 'pulse',
        duration: 1000
      }
    },
    {
      id: 'hand_intro',
      title: '手札の確認',
      description: '画面下部には、あなたの手札が表示されます。これらのカードを使ってチャレンジに挑戦します。',
      targetElement: 'hand-area',
      position: 'top',
      action: 'click',
      highlightOptions: {
        color: '#FFD700',
        opacity: 0.3,
        borderWidth: 4,
        borderColor: '#FFA500',
        glowEffect: true,
        animationType: 'glow',
        duration: 1200
      }
    },
    {
      id: 'insurance_intro',
      title: '保険リストの確認',
      description: '右側には現在加入している保険のリストが表示されます。保険は将来のリスクに備える重要な要素です。',
      targetElement: 'insurance-list',
      position: 'left',
      action: 'click',
      highlightOptions: {
        color: '#FF6B6B',
        opacity: 0.4,
        borderWidth: 3,
        borderColor: '#FF4444',
        animationType: 'pulse',
        duration: 800
      }
    },
    {
      id: 'burden_intro',
      title: '保険負担の確認',
      description: '保険負担指標では、現在の保険の維持コストを確認できます。負担が大きすぎると生活に影響します。',
      targetElement: 'burden-indicator',
      position: 'left',
      action: 'click',
      highlightOptions: {
        color: '#9C88FF',
        opacity: 0.5,
        borderWidth: 2,
        borderColor: '#7B68EE',
        animationType: 'border',
        duration: 1500
      }
    },
    {
      id: 'controls_intro',
      title: 'チュートリアルの操作方法',
      description: '画面下部のボタンで操作できます。スペース/Enter（次へ）、矢印キー（前後）、ESC（スキップ）も使用できます。',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'none'
      }
    },
    {
      id: 'auto_progression',
      title: '自動進行のテスト',
      description: 'このステップは3秒後に自動的に次へ進みます。待機中はボタンでも進めることができます。',
      position: 'center',
      action: 'auto',
      waitTime: 3000,
      highlightOptions: {
        animationType: 'none'
      }
    },
    {
      id: 'responsive_test',
      title: 'レスポンシブ対応のテスト',
      description: 'ブラウザのウィンドウサイズを変更してみてください。UIが自動的に調整されることを確認できます。',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'none'
      }
    },
    {
      id: 'accessibility_test',
      title: 'アクセシビリティ機能',
      description: 'TABキー（フォーカス移動）、数字キー1-9（ステップジャンプ）も試してみてください。',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'none'
      }
    },
    {
      id: 'completion',
      title: 'チュートリアル完了',
      description: 'チュートリアルUIのテストが完了しました。実際のゲームでは、より詳細な操作説明が行われます。',
      position: 'center',
      action: 'click',
      highlightOptions: {
        color: '#4CAF50',
        opacity: 0.3,
        animationType: 'glow',
        duration: 2000
      }
    }
  ]
}

/**
 * 短縮版テスト用チュートリアル
 */
export const QUICK_TEST_TUTORIAL: TutorialConfig = {
  id: 'quick_ui_test',
  name: 'クイックUIテスト',
  description: '基本的なUI要素のハイライトテスト',
  version: '1.0.0',
  autoStart: false,
  canSkip: true,
  showProgress: true,
  steps: [
    {
      id: 'test_start',
      title: 'UIテスト開始',
      description: 'チュートリアルUI機能の簡単なテストを開始します。',
      position: 'center',
      action: 'click'
    },
    {
      id: 'test_highlight',
      title: 'ハイライトテスト',
      description: 'バイタリティバーがハイライトされているか確認してください。',
      targetElement: 'vitality-bar',
      position: 'bottom',
      action: 'click',
      highlightOptions: {
        animationType: 'pulse',
        duration: 800
      }
    },
    {
      id: 'test_complete',
      title: 'テスト完了',
      description: 'UIテストが完了しました。',
      position: 'center',
      action: 'click'
    }
  ]
}

/**
 * エラーハンドリングテスト用設定
 */
export const ERROR_TEST_TUTORIAL: TutorialConfig = {
  id: 'error_handling_test',
  name: 'エラーハンドリングテスト',
  description: '存在しない要素の参照などエラーケースのテスト',
  version: '1.0.0',
  autoStart: false,
  canSkip: true,
  showProgress: true,
  steps: [
    {
      id: 'valid_step',
      title: '正常なステップ',
      description: 'これは正常に動作するステップです。',
      position: 'center',
      action: 'click'
    },
    {
      id: 'invalid_element',
      title: '存在しない要素のテスト',
      description: '存在しない要素を参照しているステップです。エラーハンドリングが適切に動作するかテストします。',
      targetElement: 'non-existent-element',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'pulse'
      }
    },
    {
      id: 'recovery_step',
      title: '復旧テスト',
      description: 'エラーから正常に復旧できているかテストします。',
      position: 'center',
      action: 'click'
    }
  ]
}