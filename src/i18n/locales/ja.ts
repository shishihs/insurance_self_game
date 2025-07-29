/**
 * 日本語翻訳ファイル
 * 保険ゲームの日本語メッセージと設定
 */

export default {
  // 基本UI要素
  ui: {
    // ナビゲーション
    navigation: {
      home: 'ホーム',
      back: 'ホーム',
      game: 'ゲーム',
      tutorial: 'チュートリアル',
      statistics: '統計',
      settings: '設定',
      accessibility: 'アクセシビリティ設定',
      feedback: 'フィードバック'
    },
    
    // ボタン
    buttons: {
      start: '開始',
      startGame: 'ゲーム開始',
      startTutorial: 'チュートリアル開始',
      close: '閉じる',
      cancel: 'キャンセル',
      ok: 'OK',
      yes: 'はい',
      no: 'いいえ',
      continue: '続行',
      skip: 'スキップ',
      next: '次へ',
      previous: '前へ',
      finish: '完了',
      reset: 'リセット',
      save: '保存',
      load: '読み込み'
    },
    
    // 一般的なメッセージ
    common: {
      loading: '読み込み中...',
      error: 'エラーが発生しました',
      success: '成功しました',
      warning: '警告',
      info: '情報',
      confirm: '確認',
      welcome: 'ようこそ',
      congratulations: 'おめでとうございます！',
      gameOver: 'ゲーム終了',
      newGame: '新しいゲーム',
      retry: 'もう一度'
    }
  },
  
  // ゲーム関連
  game: {
    // ゲーム状態
    title: '人生充実ゲーム',
    subtitle: '戦略的ライフシミュレーション',
    description: '人生のさまざまな段階でリスクと保険のバランスを考えながら、充実した人生を目指すゲームです。',
    
    // ライフステージ
    stages: {
      youth: '青年期',
      adult: '成人期',
      middleAge: '中年期',
      elderly: '高齢期'
    },
    
    // ゲーム要素
    elements: {
      vitality: '生命力',
      turn: 'ターン',
      phase: 'フェーズ',
      stage: 'ステージ',
      round: 'ラウンド',
      score: 'スコア',
      level: 'レベル'
    },
    
    // カード
    cards: {
      riskCard: 'リスクカード',
      insuranceCard: '保険カード',
      eventCard: 'イベントカード',
      actionCard: 'アクションカード',
      powerCard: 'パワーカード'
    },
    
    // アクション
    actions: {
      draw: 'カードを引く',
      play: 'カードを使う',
      discard: 'カードを捨てる',
      buyInsurance: '保険を購入',
      cancelInsurance: '保険を解約',
      takeRisk: 'リスクを取る',
      avoidRisk: 'リスクを回避'
    },
    
    // 保険タイプ
    insurance: {
      types: {
        life: '生命保険',
        health: '健康保険',
        auto: '自動車保険',
        home: '火災保険',
        travel: '旅行保険',
        income: '所得保障保険',
        disability: '傷害保険',
        longTermCare: '介護保険'
      },
      
      terms: {
        premium: '保険料',
        coverage: '保障額',
        deductible: '免責金額',
        beneficiary: '受益者',
        policy: '保険証券',
        claim: '保険金請求',
        renewal: '更新',
        cancellation: '解約'
      }
    },
    
    // リスク
    risks: {
      categories: {
        health: '健康リスク',
        financial: '経済リスク',
        accident: '事故リスク',
        natural: '自然災害リスク',
        career: 'キャリアリスク',
        family: '家族リスク'
      },
      
      levels: {
        low: '低リスク',
        medium: '中リスク',
        high: '高リスク',
        extreme: '極高リスク'
      }
    }
  },
  
  // チュートリアル
  tutorial: {
    title: 'ゲームチュートリアル',
    welcome: 'ようこそ！人生充実ゲームの世界へ',
    steps: {
      introduction: {
        title: 'はじめに',
        content: 'このゲームでは、人生のさまざまな段階でリスクと保険のバランスを考えながら進めていきます。'
      },
      basicRules: {
        title: '基本ルール',
        content: '各ターンでカードを引き、リスクに対処するか保険で備えるかを決めます。'
      },
      cardTypes: {
        title: 'カードの種類',
        content: 'リスクカード、保険カード、イベントカードがあります。それぞれの特徴を理解しましょう。'
      },
      insuranceSystem: {
        title: '保険システム',
        content: '保険は事前に購入することでリスクに備えることができます。保険料と保障額を考慮して選択しましょう。'
      },
      strategy: {
        title: '戦略のポイント',
        content: '生命力を維持しながら、効果的な保険戦略を立てることが成功の鍵です。'
      }
    }
  },
  
  // 統計・分析
  statistics: {
    title: '統計ダッシュボード',
    sections: {
      overview: '概要',
      performance: 'パフォーマンス',
      trends: 'トレンド',
      detailed: '詳細分析'
    },
    
    metrics: {
      gamesPlayed: 'プレイ回数',
      winRate: '勝率',
      averageScore: '平均スコア',
      bestScore: '最高スコア',
      totalPlayTime: '総プレイ時間',
      averageGameTime: '平均ゲーム時間',
      survivalRate: '生存率',
      insuranceEfficiency: '保険効率'
    },
    
    charts: {
      vitalityTrend: '生命力推移',
      stageAnalysis: 'ステージ別分析',
      cardUsage: 'カード使用状況',
      decisionAnalysis: '意思決定分析',
      riskManagement: 'リスク管理',
      insuranceCoverage: '保険カバレッジ'
    }
  },
  
  // アクセシビリティ
  accessibility: {
    title: 'アクセシビリティ設定',
    sections: {
      visual: '視覚設定',
      audio: '音声設定',
      interaction: '操作設定',
      display: '表示設定'
    },
    
    options: {
      highContrast: 'ハイコントラスト',
      largeText: '大きな文字',
      reduceMotion: 'アニメーション軽減',
      screenReader: 'スクリーンリーダー対応',
      keyboardNavigation: 'キーボードナビゲーション',
      audioCues: '音声キュー',
      subtitles: '字幕',
      slowAnimations: 'ゆっくりアニメーション'
    },
    
    keyboardShortcuts: {
      title: 'キーボードショートカット',
      homeScreen: 'ホーム画面に戻る (Alt+H)',
      startGame: 'ゲーム開始 (Alt+G)',
      startTutorial: 'チュートリアル開始 (Alt+T)',
      openStatistics: '統計を開く (Alt+S)',
      openAccessibility: 'アクセシビリティ設定 (Alt+A)',
      help: 'ヘルプを表示 (F1)'
    }
  },
  
  // フィードバック
  feedback: {
    title: 'フィードバック',
    types: {
      bug: 'バグ報告',
      suggestion: '改善提案',
      general: '一般的な意見',
      rating: '評価'
    },
    
    form: {
      subject: '件名',
      message: 'メッセージ',
      email: 'メールアドレス（任意）',
      category: 'カテゴリ',
      priority: '優先度',
      submit: '送信',
      thankYou: 'フィードバックをありがとうございました！'
    }
  },
  
  // エラーメッセージ
  errors: {
    general: 'エラーが発生しました。',
    network: 'ネットワークエラーが発生しました。',
    gameState: 'ゲーム状態の読み込みに失敗しました。',
    save: 'ゲームの保存に失敗しました。',
    load: 'ゲームの読み込みに失敗しました。',
    invalidAction: '無効な操作です。',
    cardNotFound: 'カードが見つかりません。',
    insufficientFunds: '資金が不足しています。',
    insuranceNotActive: '保険が有効ではありません。'
  },
  
  // 成功メッセージ
  success: {
    gameSaved: 'ゲームを保存しました。',
    gameLoaded: 'ゲームを読み込みました。',
    insurancePurchased: '保険を購入しました。',
    riskAvoided: 'リスクを回避しました。',
    levelCompleted: 'レベルをクリアしました！',
    achievementUnlocked: '実績を獲得しました！'
  },
  
  // 地域固有設定（日本）
  region: {
    currency: '円',
    currencySymbol: '¥',
    dateFormat: 'YYYY年MM月DD日',
    numberFormat: '1,234',
    
    // 日本の保険制度に関連する用語
    insuranceSystem: {
      nationalHealth: '国民健康保険',
      employeeHealth: '健康保険',
      nationalPension: '国民年金',
      employeePension: '厚生年金',
      longTermCare: '介護保険',
      workersComp: '労災保険',
      unemployment: '雇用保険'
    },
    
    // 日本特有のリスク
    risks: {
      earthquake: '地震',
      typhoon: '台風',
      flood: '洪水',
      aging: '高齢化',
      recession: '不況',
      deflation: 'デフレ'
    }
  },
  
  // 年齢層・世代別メッセージ
  ageGroups: {
    young: {
      title: '若い世代への保険アドバイス',
      message: '将来に向けた基盤作りが重要です。'
    },
    middle: {
      title: '働き盛り世代への保険アドバイス',
      message: '家族を守るための保障を検討しましょう。'
    },
    senior: {
      title: 'シニア世代への保険アドバイス',
      message: '医療・介護リスクへの備えが大切です。'
    }
  }
} as const