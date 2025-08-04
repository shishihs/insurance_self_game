import { loadPhaser } from '../loaders/PhaserLoader'
import { mobilePerformanceManager } from '../../performance/MobilePerformanceManager'

/**
 * モバイル対応を含むPhaserゲームの基本設定
 * Phaserが動的にロードされるため、実際の設定は createGameConfig() で取得
 */
export const gameConfig = {
  type: 'AUTO' as const,
  parent: 'game-container',
  backgroundColor: '#2a2a3e', // 初期画面の黒画面を防ぐため、少し明るい色に設定
  scale: {
    mode: 'FIT' as const, // 画面に合わせてフィットするように変更
    autoCenter: 'CENTER_BOTH' as const,
    width: 1280, // 固定幅
    height: 720, // 固定高さ（16:9のアスペクト比）
    min: {
      width: 320,
      height: 480
    },
    max: {
      width: 1920,
      height: 1080
    },
    // リサイズ時の自動更新を確実に
    autoRound: false,
    expandParent: false
  },
  physics: {
    default: 'arcade' as const,
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  // モバイル最適化 + WebGL/GPU最適化
  render: {
    pixelArt: false,
    antialias: true,
    powerPreference: 'high-performance', // ハードウェアアクセラレーション
    transparent: false,
    preserveDrawingBuffer: false, // メモリ節約
    failIfMajorPerformanceCaveat: false,
    // WebGL最適化設定
    clearBeforeRender: true,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    // バッチ処理最適化
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    desynchronized: true, // 非同期レンダリング（Chrome）
    // テクスチャ最適化
    maxTextures: 16,
    maxTextureSize: 2048,
    batchSize: 4096,
    // パフォーマンス優先設定
    autoResize: false,
    roundPixels: true
  },
  // タッチ入力設定
  input: {
    touch: {
      target: null,
      capture: false
    },
    activePointers: 2, // マルチタッチ対応（ピンチズーム用）
    smoothFactor: 0 // タッチ入力の即時反映
  },
  // オーディオ設定（モバイル対応）
  audio: {
    disableWebAudio: false,
    noAudio: false
  },
  // パフォーマンス設定
  fps: {
    target: 60,
    min: 30,
    smoothStep: true
  },
  scene: [] // シーンは後で追加
}

/**
 * Phaserがロードされた後に実際のGameConfigを作成
 */
export async function createGameConfig(): Promise<import('phaser').Types.Core.GameConfig> {
  const Phaser = await loadPhaser()
  
  // 基本設定を作成
  const baseConfig = {
    ...gameConfig,
    type: Phaser.AUTO,
    scale: {
      ...gameConfig.scale,
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    }
  } as import('phaser').Types.Core.GameConfig
  
  // モバイルパフォーマンス最適化を適用
  const optimizedConfig = mobilePerformanceManager.optimizePhaserConfig(baseConfig)
  
  // デバイス情報をログ出力
  const deviceInfo = mobilePerformanceManager.getDeviceInfo()
  console.log('🔧 Device Info:', deviceInfo)
  
  // 最適化推奨事項をログ出力
  const recommendations = mobilePerformanceManager.getOptimizationRecommendations()
  if (recommendations.length > 0) {
    console.log('💡 Performance Recommendations:', recommendations)
  }
  
  return optimizedConfig
}

/**
 * ゲーム定数
 */
export const GAME_CONSTANTS = {
  // カード関連
  CARD_WIDTH: 120,
  CARD_HEIGHT: 180,
  CARD_SCALE: 1,
  CARD_HOVER_SCALE: 1.1,
  CARD_SPACING: 20,
  
  // アニメーション時間（ミリ秒）
  CARD_FLIP_DURATION: 300,
  CARD_MOVE_DURATION: 200,
  CARD_DRAW_DURATION: 400,
  
  // レイアウト（1280x720基準）
  HAND_Y_POSITION: 520,  // Changed from 600 to 520 to ensure cards are fully visible
  CHALLENGE_Y_POSITION: 180,
  DECK_X_POSITION: 100,
  DECK_Y_POSITION: 520,  // Changed from 600 to 520 to match hand position
  DISCARD_X_POSITION: 1180,
  DISCARD_Y_POSITION: 520,  // Changed from 600 to 520 to match hand position
  
  // ゲームプレイ
  MAX_HAND_SIZE: 7,
  INITIAL_DRAW: 5,
  TURN_DRAW: 1,
  
  // ステージ設定
  STAGE_TURNS: {
    youth: 10,      // 青年期: 10ターン
    middle: 15,     // 中年期: 15ターン
    fulfillment: 20 // 充実期: 20ターン
  },
  
  // 勝利条件
  VICTORY_VITALITY: 30,  // 活力30以上でクリア
  
  // ドラッグ&ドロップ
  DRAG_DROP: {
    SNAP_DISTANCE: 100,           // スナップが発動する距離（px）
    DRAG_ALPHA: 0.8,              // ドラッグ中の透明度
    DRAG_SCALE: 1.15,             // ドラッグ中の拡大率
    DROP_ZONE_SCALE: 1.2,         // ドロップゾーンハイライト時の拡大率
    SNAP_DURATION: 200,           // スナップアニメーション時間（ms）
    BOUNCE_DURATION: 400,         // バウンス効果時間（ms）
    VIBRATION_DURATION: 150,      // 振動効果時間（ms）
    MOBILE_TOUCH_OFFSET: 60,      // モバイルでの指オフセット（px）
    GLOW_PULSE_DURATION: 1000,    // グロウパルス周期（ms）
  },
  
  // カラー
  COLORS: {
    LIFE_CARD: 0x4C6EF5,
    INSURANCE_CARD: 0x51CF66,
    PITFALL_CARD: 0xFF6B6B,
    HIGHLIGHT: 0xFFD43B,
    SELECTED: 0x748FFC,
    DROP_ZONE_VALID: 0x51CF66,    // 有効ドロップゾーン
    DROP_ZONE_INVALID: 0xFF6B6B,  // 無効ドロップゾーン
    DROP_ZONE_HOVER: 0xFFD43B,    // ホバー中ドロップゾーン
    DRAG_SHADOW: 0x000000,        // ドラッグ時シャドウ
    MAGNETIC_GLOW: 0x00FFFF,      // マグネット効果グロウ
  }
}