/**
 * ゲーム内イベントの型定義
 */

/**
 * 保険更新オプションの型定義
 * NOTE: 保険更新システムは削除されたが、型定義は残しておく
 */
export interface InsuranceRenewalOption {
  /** 保険タイプ */
  type: 'basic' | 'premium' | 'ultimate'
  /** 保険料 */
  cost: number
  /** 保険名 */
  name: string
  /** 保険の説明 */
  description: string
  /** 保険の効果 */
  effects: {
    /** ダメージ軽減率 */
    damageReduction?: number
    /** 追加効果 */
    additionalEffects?: string[]
  }
}

/**
 * チュートリアルステップデータの型定義
 */
export interface TutorialStepData {
  /** 現在のステップID */
  stepId: string
  /** ステップ番号（0から開始） */
  stepIndex: number
  /** 全ステップ数 */
  totalSteps: number
  /** ステップの設定 */
  stepConfig: {
    /** ステップID */
    id: string
    /** ステップのタイトル */
    title?: string
    /** ステップの説明文 */
    text: string
    /** ターゲット要素のセレクタ */
    target?: string
    /** ハイライトのタイプ */
    highlightType?: 'pulse' | 'glow' | 'border'
    /** 配置位置 */
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
    /** 誘導矢印を表示するか */
    showArrow?: boolean
    /** 次へボタンを表示するか */
    showNext?: boolean
    /** 戻るボタンを表示するか */
    showPrev?: boolean
    /** スキップボタンを表示するか */
    showSkip?: boolean
  }
}

/**
 * ウィンドウイベントの型定義
 */
export interface WindowWithTutorialEvents extends Window {
  /** チュートリアルイベントハンドラー */
  _tutorialEventHandler?: () => void
}

/**
 * パフォーマンスAPIの拡張型定義
 */
export interface PerformanceWithMemory extends Performance {
  /** メモリ情報（Chrome限定） */
  memory?: {
    /** 使用中のJSヒープサイズ */
    usedJSHeapSize: number
    /** 合計JSヒープサイズ */
    totalJSHeapSize: number
    /** JSヒープサイズの上限 */
    jsHeapSizeLimit: number
  }
}

/**
 * チュートリアルオーバーレイのインターフェース
 */
export interface TutorialOverlay {
  /** 高コントラストモードを有効化 */
  enableHighContrastMode?: () => void
  /** アニメーション削減モードを有効化 */
  enableReducedMotion?: () => void
}

/**
 * グローバルチュートリアルテストAPI
 */
export interface GlobalTutorialTestAPI {
  /** 基本UIテスト */
  basic: () => Promise<void>
  /** クイックテスト */
  quick: () => Promise<void>
  /** エラーハンドリングテスト */
  error: () => Promise<void>
  /** レスポンシブテスト */
  responsive: () => void
  /** アクセシビリティテスト */
  accessibility: () => void
  /** パフォーマンステスト */
  performance: () => void
  /** メモリ監視 */
  memory: () => void
  /** 全テスト実行 */
  all: () => Promise<void>
  /** テスト結果サマリー */
  summary: () => void
  /** チュートリアル強制終了 */
  stop: () => void
}

/**
 * グローバルウィンドウオブジェクトの拡張
 */
export interface WindowWithTutorialTest extends Window {
  /** チュートリアルテストAPI */
  tutorialTest?: GlobalTutorialTestAPI
}