import type { Phaser } from 'phaser'

/**
 * Phaserゲームの基本設定
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#f5f5f5',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
    min: {
      width: 640,
      height: 360
    },
    max: {
      width: 1920,
      height: 1080
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [] // シーンは後で追加
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
  
  // レイアウト
  HAND_Y_POSITION: 550,
  CHALLENGE_Y_POSITION: 200,
  DECK_X_POSITION: 100,
  DECK_Y_POSITION: 550,
  DISCARD_X_POSITION: 1180,
  DISCARD_Y_POSITION: 550,
  
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
  
  // カラー
  COLORS: {
    LIFE_CARD: 0x4C6EF5,
    INSURANCE_CARD: 0x51CF66,
    PITFALL_CARD: 0xFF6B6B,
    HIGHLIGHT: 0xFFD43B,
    SELECTED: 0x748FFC
  }
}