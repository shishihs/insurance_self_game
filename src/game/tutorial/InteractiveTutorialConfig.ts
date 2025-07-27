import type { TutorialConfig } from '@/domain/types/tutorial.types'

/**
 * インタラクティブゲームプレイチュートリアル
 * 実際にゲームを操作しながら学ぶ体験型チュートリアル
 */
export const INTERACTIVE_GAME_TUTORIAL: TutorialConfig = {
  id: 'interactive_game_tutorial',
  name: '人生充実ゲーム入門',
  description: '実際にゲームをプレイしながら基本的な操作を学びます',
  version: '2.0.0',
  autoStart: false,
  canSkip: true,
  showProgress: true,
  overlayOptions: {
    backgroundColor: '#000000',
    opacity: 0.6,
    blurBackground: false,
    allowClickThrough: true // 特定の要素のみクリック可能
  },
  steps: [
    // ========== イントロダクション ==========
    {
      id: 'welcome',
      title: 'ようこそ、人生充実ゲームへ！',
      description: 'このゲームでは、保険を活用しながら人生の様々な挑戦を乗り越え、夢を実現することを目指します。\n\n実際にゲームをプレイしながら、基本的な操作を学んでいきましょう！',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'none'
      }
    },

    // ========== 基本UI説明 ==========
    {
      id: 'vitality_explanation',
      title: '活力（バイタリティ）について',
      description: 'この緑のバーがあなたの活力です。\n\n活力は人生の挑戦に立ち向かうエネルギーを表し、0になるとゲームオーバーです。\n\n現在の活力: 20/35',
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
      id: 'hand_cards_explanation',
      title: '手札について',
      description: 'ここがあなたの手札です。\n\n人生カード（青）と保険カード（緑）があり、これらを使って様々な挑戦に立ち向かいます。',
      targetElement: 'hand-area',
      position: 'top',
      action: 'click',
      highlightOptions: {
        color: '#FFD700',
        opacity: 0.3,
        borderWidth: 4,
        borderColor: '#FFA500',
        glowEffect: true,
        animationType: 'glow'
      }
    },

    // ========== カードドロー体験 ==========
    {
      id: 'draw_card_instruction',
      title: '最初のカードを引いてみましょう',
      description: '「カードを引く」ボタンをクリックして、新しいカードを1枚引いてください。\n\nカードを引くことで、新たな選択肢が増えます。',
      targetElement: 'draw-button',
      position: 'left',
      action: 'wait_for_game_action',
      gameAction: {
        type: 'draw_card',
        validation: (gameState: any) => {
          // 手札が初期枚数より増えているか確認
          return gameState.hand.length > gameState.config.startingHandSize
        }
      },
      highlightOptions: {
        color: '#4CAF50',
        opacity: 0.5,
        borderWidth: 4,
        borderColor: '#2E7D32',
        glowEffect: true,
        animationType: 'pulse',
        duration: 800
      }
    },

    {
      id: 'draw_success',
      title: 'よくできました！',
      description: '新しいカードを引きました。\n\n手札が増えると、より多くの戦略を立てることができます。',
      position: 'center',
      action: 'auto',
      waitTime: 3000,
      highlightOptions: {
        animationType: 'none'
      }
    },

    // ========== チャレンジ開始 ==========
    {
      id: 'challenge_explanation',
      title: 'チャレンジカードが現れました',
      description: 'これが「チャレンジカード」です。\n\n人生には様々な挑戦があります。手札のカードを使って、これらの挑戦を乗り越えましょう。',
      targetElement: 'challenge-area',
      position: 'bottom',
      action: 'click',
      highlightOptions: {
        color: '#FF6B6B',
        opacity: 0.4,
        borderWidth: 4,
        borderColor: '#FF4444',
        glowEffect: true,
        animationType: 'pulse'
      }
    },

    {
      id: 'select_cards_instruction',
      title: 'カードを選択してチャレンジに挑戦',
      description: 'チャレンジに必要なパワー以上になるよう、手札からカードを選択してください。\n\n複数のカードを組み合わせることもできます。\n\nカードをクリックして選択しましょう！',
      targetElement: 'hand-area',
      position: 'top',
      action: 'wait_for_game_action',
      gameAction: {
        type: 'select_cards',
        validation: (gameState: any) => {
          return gameState.selectedCards.length > 0
        }
      },
      highlightOptions: {
        color: '#FFD700',
        opacity: 0.4,
        borderWidth: 3,
        borderColor: '#FFA500',
        animationType: 'glow'
      }
    },

    {
      id: 'resolve_challenge_instruction',
      title: 'チャレンジに挑戦！',
      description: 'カードを選択したら、「チャレンジに挑む」ボタンをクリックして結果を確認しましょう。\n\n選択したカードの合計パワーがチャレンジに必要なパワー以上なら成功です！',
      targetElement: 'resolve-button',
      position: 'left',
      action: 'wait_for_game_action',
      gameAction: {
        type: 'resolve_challenge',
        validation: (gameState: any) => {
          return gameState.phase === 'resolution' || gameState.phase === 'card_selection'
        }
      },
      highlightOptions: {
        color: '#2196F3',
        opacity: 0.5,
        borderWidth: 4,
        borderColor: '#1976D2',
        glowEffect: true,
        animationType: 'pulse'
      }
    },

    // ========== チャレンジ成功時の保険選択 ==========
    {
      id: 'insurance_selection',
      title: '保険を選択しましょう',
      description: 'チャレンジ成功！報酬として保険カードを1枚選べます。\n\n保険は将来の挑戦に備える重要な要素です。\n\n3枚の中から1枚を選んでください。',
      targetElement: 'card-selection-ui',
      position: 'center',
      action: 'wait_for_game_action',
      gameAction: {
        type: 'select_reward_card',
        validation: (gameState: any) => {
          return gameState.phase === 'resolution'
        }
      },
      skipCondition: () => {
        // チャレンジ失敗時はスキップ
        const gameState = (window as any).__gameState
        return gameState?.lastChallengeResult?.success === false
      },
      highlightOptions: {
        color: '#4CAF50',
        opacity: 0.3,
        animationType: 'glow'
      }
    },

    // ========== ターン終了 ==========
    {
      id: 'end_turn_instruction',
      title: 'ターンを終了しましょう',
      description: 'チャレンジが終わったら、「ターン終了」ボタンをクリックして次のターンに進みます。\n\n新しいチャレンジが現れ、ゲームが進行します。',
      targetElement: 'end-turn-button',
      position: 'left',
      action: 'wait_for_game_action',
      gameAction: {
        type: 'end_turn',
        validation: (gameState: any) => {
          return gameState.turn > 1
        }
      },
      highlightOptions: {
        color: '#9C27B0',
        opacity: 0.5,
        borderWidth: 4,
        borderColor: '#7B1FA2',
        glowEffect: true,
        animationType: 'pulse'
      }
    },

    // ========== 保険の効果説明 ==========
    {
      id: 'insurance_effects',
      title: '保険の効果について',
      description: '保険カードはチャレンジ時にボーナスパワーを提供します。\n\n年齢が上がるほど保険の効果も高まりますが、保険が多すぎると負担（-パワー）も発生します。\n\nバランスが重要です！',
      targetElement: 'insurance-list',
      position: 'left',
      action: 'click',
      highlightOptions: {
        color: '#00BCD4',
        opacity: 0.4,
        borderWidth: 3,
        borderColor: '#0097A7',
        animationType: 'pulse'
      }
    },

    // ========== 基本的な戦略 ==========
    {
      id: 'basic_strategy',
      title: '基本的な戦略',
      description: '成功のコツ：\n\n1. 活力を管理しながら挑戦する\n2. 保険を適切に選択・活用する\n3. カードの組み合わせを工夫する\n4. 年齢に応じた戦略を立てる',
      position: 'center',
      action: 'click',
      highlightOptions: {
        animationType: 'none'
      }
    },

    // ========== チュートリアル完了 ==========
    {
      id: 'tutorial_complete',
      title: 'チュートリアル完了！',
      description: 'おめでとうございます！基本的な操作を習得しました。\n\nこれから本格的なゲームが始まります。\n\n3つのライフステージを乗り越え、最後に夢を実現しましょう！\n\n頑張ってください！',
      position: 'center',
      action: 'click',
      highlightOptions: {
        color: '#4CAF50',
        opacity: 0.3,
        animationType: 'glow',
        duration: 2000
      },
      onExit: () => {
        // チュートリアル完了フラグを設定
        localStorage.setItem('tutorial_completed', 'true')
        
        // 完了メッセージ
        console.log('🎉 チュートリアル完了！本格的なゲームをお楽しみください！')
      }
    }
  ]
}

/**
 * 簡易版チュートリアル（リピーター向け）
 */
export const QUICK_TUTORIAL: TutorialConfig = {
  id: 'quick_tutorial',
  name: 'クイックガイド',
  description: '基本操作の簡単な復習',
  version: '1.0.0',
  autoStart: false,
  canSkip: true,
  showProgress: true,
  steps: [
    {
      id: 'quick_intro',
      title: '基本操作の復習',
      description: 'カードを引いて、チャレンジに挑戦し、保険を活用して人生を充実させましょう！',
      position: 'center',
      action: 'click'
    },
    {
      id: 'quick_controls',
      title: '操作方法',
      description: '1. カードを引く\n2. カードを選択\n3. チャレンジに挑む\n4. 保険を選択\n5. ターン終了',
      position: 'center',
      action: 'click'
    },
    {
      id: 'quick_complete',
      title: 'それでは、ゲームを楽しんでください！',
      description: '詳しいチュートリアルが必要な場合は、メニューから「詳細チュートリアル」を選択してください。',
      position: 'center',
      action: 'click'
    }
  ]
}