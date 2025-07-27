import type { TutorialConfig } from '@/domain/types/tutorial.types'

/**
 * チュートリアルステップ定義
 * TUTORIAL_DESIGN.mdのStep 1-5に基づいた実装
 */

/**
 * メインチュートリアル設定
 */
export const MAIN_TUTORIAL_CONFIG: TutorialConfig = {
  id: 'main_tutorial',
  name: '保険ゲーム基本チュートリアル',
  description: '保険の基本とゲームの遊び方を学びます',
  version: '1.0.0',
  canSkip: true,
  showProgress: true,
  autoStart: false,
  overlayOptions: {
    backgroundColor: '#000000',
    opacity: 0.8,
    blurBackground: false,
    allowClickThrough: false
  },
  steps: [
    // =============================
    // Step 1: 基本操作 (3分)
    // =============================
    {
      id: 'welcome',
      title: 'ようこそ！',
      description: 'このゲームでは、人生の様々なチャレンジに挑戦しながら保険を活用して安心を築きます。まずは基本操作から学びましょう。',
      position: 'center',
      action: 'wait',
      waitTime: 2000,
      highlightOptions: {
        animationType: 'none'
      }
    },
    {
      id: 'hand_cards_intro',
      title: '手札の確認',
      description: '画面下部に表示されているのがあなたの手札です。各カードには「名前」「パワー」「コスト」が表示されています。',
      targetElement: 'hand-area',
      position: 'top',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#4CAF50',
        animationType: 'pulse',
        borderColor: '#2E7D32',
        borderWidth: 3
      }
    },
    {
      id: 'card_selection_intro',
      title: 'カードの選択',
      description: 'カードをクリックして選択してみましょう。選択されたカードは光って表示されます。',
      targetElement: 'hand-area',
      position: 'top',
      action: 'click',
      highlightOptions: {
        color: '#FFD700',
        animationType: 'glow',
        borderColor: '#FFA500',
        borderWidth: 2
      }
    },
    {
      id: 'challenge_intro',
      title: 'チャレンジの基本',
      description: '画面右上に表示されているのがチャレンジカードです。選択したカードでこのチャレンジに挑戦します。',
      targetElement: 'current-challenge',
      position: 'left',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#FF5722',
        animationType: 'pulse',
        borderColor: '#D84315',
        borderWidth: 3
      }
    },
    {
      id: 'challenge_attempt',
      title: 'チャレンジに挑戦',
      description: 'カードを選択したら「チャレンジ」ボタンを押して挑戦しましょう。選択したカードのパワーがチャレンジの必要パワーを上回れば成功です。',
      targetElement: 'challenge-button',
      position: 'top',
      action: 'click',
      highlightOptions: {
        color: '#2196F3',
        animationType: 'pulse',
        borderColor: '#1976D2',
        borderWidth: 3
      }
    },
    {
      id: 'vitality_intro',
      title: '活力システム',
      description: '画面上部のバーが「活力」です。チャレンジに失敗すると活力が減り、0になるとゲームオーバーになります。大切に管理しましょう。',
      targetElement: 'vitality-bar',
      position: 'bottom',
      action: 'wait',
      waitTime: 4000,
      highlightOptions: {
        color: '#E91E63',
        animationType: 'pulse',
        borderColor: '#C2185B',
        borderWidth: 3
      }
    },

    // =============================
    // Step 2: 保険の基本 (4分)
    // =============================
    {
      id: 'insurance_intro',
      title: '保険の力',
      description: '保険カードを持っていると、チャレンジ時にパワーボーナスが得られます。つまり、成功率が上がるのです！',
      position: 'center',
      action: 'wait',
      waitTime: 3000
    },
    {
      id: 'insurance_types_intro',
      title: '保険の種類',
      description: '保険には「終身保険」と「定期保険」があります。カード選択画面で実際に選んでその違いを体験しましょう。',
      targetElement: 'card-choices',
      position: 'top',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#9C27B0',
        animationType: 'glow',
        borderColor: '#7B1FA2',
        borderWidth: 2
      }
    },
    {
      id: 'whole_life_explanation',
      title: '終身保険の特徴',
      description: '終身保険は高コストですが、一度加入すれば永続的に効果が続きます。安心感を重視する方向けです。',
      targetElement: 'insurance-type-whole-life',
      position: 'right',
      action: 'hover',
      highlightOptions: {
        color: '#4CAF50',
        animationType: 'pulse',
        borderColor: '#388E3C',
        borderWidth: 3
      }
    },
    {
      id: 'term_explanation',
      title: '定期保険の特徴',
      description: '定期保険は低コストですが期限があります。計画的な保険管理が必要ですが、コストパフォーマンスに優れます。',
      targetElement: 'insurance-type-term',
      position: 'right',
      action: 'hover',
      highlightOptions: {
        color: '#FF9800',
        animationType: 'pulse',
        borderColor: '#F57C00',
        borderWidth: 3
      }
    },
    {
      id: 'insurance_selection',
      title: '保険を選択',
      description: 'まずは定期保険を選んでみましょう。実際の効果を体験できます。',
      targetElement: 'insurance-type-term',
      position: 'right',
      action: 'click',
      highlightOptions: {
        color: '#FFD700',
        animationType: 'glow',
        borderColor: '#FFA500',
        borderWidth: 3
      }
    },

    // =============================
    // Step 3: 年齢とライフステージ (3分)
    // =============================
    {
      id: 'age_system_intro',
      title: '年齢システム',
      description: 'このゲームでは時間が経つと年齢が上がり、活力の上限が変化します。人生のライフステージを体験しましょう。',
      targetElement: 'stage-text',
      position: 'bottom',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#607D8B',
        animationType: 'pulse',
        borderColor: '#455A64',
        borderWidth: 3
      }
    },
    {
      id: 'vitality_decrease',
      title: '活力の変化',
      description: '青年期（35）→中年期（30）→充実期（27）と活力上限が減少します。これは現実の体力変化を模擬しています。',
      targetElement: 'vitality-bar',
      position: 'bottom',
      action: 'wait',
      waitTime: 4000,
      highlightOptions: {
        color: '#E91E63',
        animationType: 'pulse',
        borderColor: '#C2185B',
        borderWidth: 3
      }
    },
    {
      id: 'insurance_burden_intro',
      title: '保険料負担',
      description: '保険を3枚以上持つと「保険料負担」が発生し、チャレンジパワーが減少します。過度な保険は逆効果になることもあります。',
      targetElement: 'insurance-burden-display',
      position: 'left',
      action: 'wait',
      waitTime: 4000,
      highlightOptions: {
        color: '#F44336',
        animationType: 'pulse',
        borderColor: '#D32F2F',
        borderWidth: 3
      },
      skipCondition: () => {
        // 保険が3枚未満の場合はスキップ
        return document.querySelectorAll('.insurance-card').length < 3
      }
    },

    // =============================
    // Step 4: 期限管理と更新 (3分)
    // =============================
    {
      id: 'expiration_warning',
      title: '期限切れ警告',
      description: '定期保険は期限があります。期限が近づくと警告が表示されます。残りターン数を常に確認しましょう。',
      targetElement: 'insurance-list',
      position: 'left',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#FF5722',
        animationType: 'pulse',
        borderColor: '#D84315',
        borderWidth: 3
      }
    },
    {
      id: 'renewal_system',
      title: '更新システム',
      description: '期限切れ前に更新の選択ができます。更新コストと継続の必要性を考えて判断しましょう。',
      targetElement: 'renewal-dialog',
      position: 'center',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#3F51B5',
        animationType: 'glow',
        borderColor: '#303F9F',
        borderWidth: 3
      },
      skipCondition: () => {
        // 更新ダイアログが表示されていない場合はスキップ
        return !document.querySelector('.renewal-dialog')
      }
    },
    {
      id: 'renewal_decision',
      title: '更新の判断',
      description: '更新コストと保険の必要性を天秤にかけます。コストが高すぎる場合は失効させることも戦略の一つです。',
      targetElement: 'renewal-options',
      position: 'top',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#9C27B0',
        animationType: 'pulse',
        borderColor: '#7B1FA2',
        borderWidth: 3
      },
      skipCondition: () => {
        // 更新オプションが表示されていない場合はスキップ
        return !document.querySelector('.renewal-options')
      }
    },

    // =============================
    // Step 5: 戦略的思考 (2分)
    // =============================
    {
      id: 'strategic_thinking',
      title: '戦略的思考',
      description: '年齢とライフステージに応じた保険選択が重要です。若い時は定期保険中心、年齢を重ねたら終身保険を検討しましょう。',
      position: 'center',
      action: 'wait',
      waitTime: 3000
    },
    {
      id: 'young_strategy',
      title: '若年期の戦略',
      description: '青年期は活力が高いので、低コストの定期保険でリスクを抑えつつ、チャレンジに積極的に挑戦しましょう。',
      position: 'center',
      action: 'wait',
      waitTime: 3000
    },
    {
      id: 'mature_strategy',
      title: '成熟期の戦略',
      description: '中年期以降は活力が減るので、終身保険で安定した保護を確保し、確実にクリアできるチャレンジを選びましょう。',
      position: 'center',
      action: 'wait',
      waitTime: 3000
    },
    {
      id: 'dream_cards_intro',
      title: '夢の実現',
      description: '最終的な目標は夢カードの獲得です。体力系は年齢で難しくなり、知識系は年齢で易しくなります。戦略的に選択しましょう。',
      targetElement: 'dream-cards-display',
      position: 'top',
      action: 'wait',
      waitTime: 4000,
      highlightOptions: {
        color: '#FFD700',
        animationType: 'glow',
        borderColor: '#FFA500',
        borderWidth: 3
      },
      skipCondition: () => {
        // 夢カード表示がない場合はスキップ
        return !document.querySelector('.dream-cards-display')
      }
    },
    {
      id: 'tutorial_complete',
      title: 'チュートリアル完了！',
      description: 'おめでとうございます！基本的なゲームシステムを理解しました。実際のゲームで保険を活用した人生設計を楽しんでください！',
      position: 'center',
      action: 'wait',
      waitTime: 3000,
      onEnter: () => {
        // 完了時の特別な処理（花火エフェクトなど）
        console.log('Tutorial completed successfully!')
      }
    }
  ]
}

/**
 * クイックチュートリアル設定（短縮版）
 */
export const QUICK_TUTORIAL_CONFIG: TutorialConfig = {
  id: 'quick_tutorial',
  name: '保険ゲーム クイックガイド',
  description: '基本操作だけを素早く学びます',
  version: '1.0.0',
  canSkip: true,
  showProgress: true,
  autoStart: false,
  steps: [
    {
      id: 'quick_welcome',
      title: 'クイックガイド',
      description: 'カードを選んでチャレンジに挑戦し、保険で成功率を上げるゲームです。',
      position: 'center',
      action: 'wait',
      waitTime: 2000
    },
    {
      id: 'quick_cards',
      title: '手札とチャレンジ',
      description: '手札からカードを選んで、チャレンジカードに挑戦しましょう。',
      targetElement: 'hand-area',
      position: 'top',
      action: 'click',
      highlightOptions: {
        color: '#4CAF50',
        animationType: 'pulse'
      }
    },
    {
      id: 'quick_insurance',
      title: '保険の効果',
      description: '保険カードを持つとチャレンジの成功率が上がります。適切に活用しましょう。',
      targetElement: 'insurance-list',
      position: 'left',
      action: 'wait',
      waitTime: 3000,
      highlightOptions: {
        color: '#2196F3',
        animationType: 'glow'
      }
    },
    {
      id: 'quick_complete',
      title: '準備完了！',
      description: 'これで基本操作は理解できました。楽しいゲーム体験をお楽しみください！',
      position: 'center',
      action: 'wait',
      waitTime: 2000
    }
  ]
}

/**
 * 利用可能なチュートリアル設定の一覧
 */
export const AVAILABLE_TUTORIALS = {
  main: MAIN_TUTORIAL_CONFIG,
  quick: QUICK_TUTORIAL_CONFIG
} as const

/**
 * チュートリアル設定を取得
 */
export function getTutorialConfig(tutorialId: keyof typeof AVAILABLE_TUTORIALS): TutorialConfig {
  const config = AVAILABLE_TUTORIALS[tutorialId]
  if (!config) {
    throw new Error(`Tutorial config not found: ${tutorialId}`)
  }
  return config
}

/**
 * チュートリアルの推奨設定を取得
 */
export function getRecommendedTutorial(isFirstTime: boolean = true): TutorialConfig {
  return isFirstTime ? MAIN_TUTORIAL_CONFIG : QUICK_TUTORIAL_CONFIG
}