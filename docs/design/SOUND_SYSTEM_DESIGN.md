# サウンドシステム設計書

> **最終更新**: 2025/01/28  
> **文書種別**: 技術仕様書  
> **更新頻度**: サウンド機能追加・変更時に更新

## 概要

人生充実ゲームのサウンドシステムは、Web Audio APIを活用した革新的な音響体験を提供します。従来のサウンドファイルに依存しない動的音生成により、ファイルサイズゼロで高品質なサウンドエフェクトを実現しています。

## 設計原則

### 1. ファイルレス音響生成
- **目標**: サウンドファイル不要で即座に使用可能
- **利点**: ダウンロード時間ゼロ、ストレージ使用量最小化
- **技術**: Web Audio APIによるプログラマティック音生成

### 2. 音楽理論に基づく設計
- **成功音**: C5-E5-G5の長三和音（523.25Hz, 659.25Hz, 783.99Hz）
- **通知音**: ド→ミの完全3度音程（523.25Hz → 659.25Hz）
- **勝利音**: ファンファーレ風の音階進行

### 3. 心理音響学の応用
- **快感音**: 和音・上昇音程により達成感を演出
- **警告音**: 不協和音・下降音程により緊急性を表現
- **操作音**: 短時間・適度な音量で操作フィードバック

### 4. パフォーマンス最適化
- **レイテンシ**: 5ms未満のレスポンス時間
- **CPU使用率**: アイドル時1%未満
- **メモリ使用量**: AudioContextのみで約500KB

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────┐
│                   Game Scene                    │
│  - ユーザーアクション検出                          │
│  - サウンドトリガー呼び出し                        │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│                 SoundManager                    │
│  - サウンドキー管理                               │
│  - 音量・有効性制御                               │
│  - 設定永続化                                    │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│           WebAudioSoundGenerator                │
│  - AudioContext管理                             │
│  - Oscillator/Filter/Gain制御                   │
│  - 動的波形生成                                  │
└─────────────────────────────────────────────────┘
```

## WebAudioSoundGenerator 詳細設計

### クラス構造

```typescript
export class WebAudioSoundGenerator {
  private audioContext: AudioContext
  
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  
  // 各サウンドエフェクトメソッド...
}
```

### 音響生成メソッド一覧

#### UI操作音

##### playButtonClick()
- **波形**: Sine wave
- **周波数**: 800Hz → 400Hz (指数減衰)
- **時間**: 50ms
- **用途**: ボタンクリック時のフィードバック

```typescript
playButtonClick(): void {
  const time = this.audioContext.currentTime
  const osc = this.audioContext.createOscillator()
  const gain = this.audioContext.createGain()
  
  osc.frequency.setValueAtTime(800, time)
  osc.frequency.exponentialRampToValueAtTime(400, time + 0.05)
  
  gain.gain.setValueAtTime(0.3, time)
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05)
}
```

##### playButtonHover()
- **波形**: Sine wave
- **周波数**: 1200Hz (固定)
- **時間**: 30ms
- **用途**: ボタンホバー時の軽いフィードバック

#### カード操作音

##### playCardDraw()
- **波形**: White noise + High-pass filter
- **特性**: ホワイトノイズを高域通過フィルターで処理
- **フィルター**: 1000Hz → 3000Hz (指数上昇)
- **時間**: 100ms
- **用途**: カードをドローする際のリアルなシャッフル音

```typescript
playCardDraw(): void {
  // ホワイトノイズ生成
  const bufferSize = 0.1 * this.audioContext.sampleRate
  const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  
  // フィルター適用
  const filter = this.audioContext.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.setValueAtTime(1000, time)
  filter.frequency.exponentialRampToValueAtTime(3000, time + 0.1)
}
```

##### playCardSelect()
- **波形**: Square wave
- **周波数**: 600Hz → 800Hz (指数上昇)
- **時間**: 50ms
- **用途**: カード選択・選択解除時

#### チャレンジ音

##### playChallengeSuccess()
- **構成**: 3音の和音 (C5-E5-G5)
- **周波数**: 523.25Hz, 659.25Hz, 783.99Hz
- **タイミング**: 50msずつずらして重奏
- **時間**: 各音300ms
- **用途**: チャレンジ成功時の達成感演出

```typescript
playChallengeSuccess(): void {
  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  
  notes.forEach((freq, index) => {
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time + index * 0.05)
    
    gain.gain.setValueAtTime(0, time + index * 0.05)
    gain.gain.linearRampToValueAtTime(0.2, time + index * 0.05 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, time + index * 0.05 + 0.3)
  })
}
```

##### playChallengeFail()
- **波形**: Sawtooth wave
- **周波数**: 300Hz → 100Hz (指数下降)
- **時間**: 200ms
- **用途**: チャレンジ失敗時の挫折感演出

#### 活力システム音

##### playVitalityGain()
- **波形**: Sine wave
- **周波数**: 400Hz → 800Hz (指数上昇)
- **時間**: 150ms
- **用途**: 活力増加時の爽快感

##### playVitalityLoss()
- **波形**: Sine wave
- **周波数**: 600Hz → 200Hz (指数下降)
- **時間**: 150ms
- **用途**: 活力減少時の緊張感

#### 警告・通知音

##### playWarning()
- **構成**: 2回のビープ音
- **波形**: Square wave
- **周波数**: 880Hz (固定)
- **間隔**: 150ms
- **用途**: 重要な警告通知

##### playNotification()
- **構成**: ド→ミの音程進行
- **周波数**: 523.25Hz → 659.25Hz
- **時間**: 100ms (50ms×2音)
- **用途**: 一般的な通知

#### ゲーム進行音

##### playGameOver()
- **波形**: Sawtooth wave
- **周波数**: 200Hz → 50Hz (指数下降)
- **時間**: 1000ms
- **用途**: ゲームオーバー時の終了感

##### playVictory()
- **構成**: ファンファーレ風6音構成
- **音階**: C5-C5-C5-E5-G5-C6
- **タイミング**: 段階的進行 (0ms, 100ms, 200ms, 300ms, 500ms, 700ms)
- **用途**: ゲーム勝利時の壮大な達成感

```typescript
playVictory(): void {
  const notes = [
    { freq: 523.25, start: 0 },     // C5
    { freq: 523.25, start: 0.1 },   // C5
    { freq: 523.25, start: 0.2 },   // C5
    { freq: 659.25, start: 0.3 },   // E5
    { freq: 783.99, start: 0.5 },   // G5
    { freq: 1046.50, start: 0.7 }   // C6
  ]
  
  notes.forEach(({ freq, start }) => {
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, time + start)
    
    gain.gain.setValueAtTime(0, time + start)
    gain.gain.linearRampToValueAtTime(0.15, time + start + 0.02)
    gain.gain.setValueAtTime(0.15, time + start + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.01, time + start + 0.2)
  })
}
```

## SoundManager 詳細設計

### クラス構造

```typescript
export class SoundManager {
  private scene: Phaser.Scene
  private enabled: boolean = true
  private volume: number = 0.5
  private webAudioGenerator: WebAudioSoundGenerator
  
  // サウンドエフェクト定義
  private readonly soundEffects = {
    // 各サウンドキーと設定...
  } as const
}
```

### サウンドエフェクト定義

| カテゴリ | キー | 音量 | 説明 |
|----------|------|------|------|
| **カード操作** | `cardDraw` | 0.4 | カードドロー |
| | `cardSelect` | 0.3 | カード選択 |
| | `cardDeselect` | 0.3 | 選択解除 |
| | `cardPlay` | 0.5 | カードプレイ |
| | `cardShuffle` | 0.4 | シャッフル |
| **チャレンジ** | `challengeStart` | 0.5 | チャレンジ開始 |
| | `challengeSuccess` | 0.6 | 成功 |
| | `challengeFail` | 0.5 | 失敗 |
| **ステージ** | `stageComplete` | 0.7 | ステージクリア |
| | `gameOver` | 0.6 | ゲームオーバー |
| | `gameVictory` | 0.8 | 勝利 |
| **UI操作** | `buttonClick` | 0.3 | ボタンクリック |
| | `buttonHover` | 0.2 | ホバー |
| | `dialogOpen` | 0.4 | ダイアログ開く |
| | `dialogClose` | 0.4 | ダイアログ閉じる |
| **保険** | `insuranceGet` | 0.5 | 保険獲得 |
| | `insuranceExpire` | 0.4 | 期限切れ |
| | `insuranceRenew` | 0.4 | 更新 |
| **活力** | `vitalityGain` | 0.4 | 活力増加 |
| | `vitalityLoss` | 0.5 | 活力減少 |
| | `vitalityWarning` | 0.6 | 活力警告 |
| **通知** | `notification` | 0.4 | 通知 |
| | `warning` | 0.5 | 警告 |
| | `error` | 0.5 | エラー |

### 主要メソッド

#### play(soundKey)
指定されたサウンドキーのエフェクトを再生

```typescript
play(soundKey: keyof typeof this.soundEffects): void {
  if (!this.enabled) return
  
  try {
    switch (soundKey) {
      case 'buttonClick':
        this.webAudioGenerator.playButtonClick()
        break
      case 'challengeSuccess':
        this.webAudioGenerator.playChallengeSuccess()
        break
      // 他のケース...
    }
  } catch (error) {
    console.warn('Sound playback error:', error)
  }
}
```

#### playSequence(soundKeys, delay)
複数のサウンドを連続再生

```typescript
playSequence(soundKeys: SoundKey[], delay: number = 100): void {
  soundKeys.forEach((key, index) => {
    this.scene.time.delayedCall(index * delay, () => {
      this.play(key)
    })
  })
}
```

#### 設定管理
- `setVolume(volume)`: 音量設定（0.0〜1.0）
- `setEnabled(enabled)`: サウンド有効/無効切り替え
- `saveSettings()`: 設定をlocalStorageに保存

## ゲーム統合

### イベントトリガー

```typescript
// カードドロー時
this.soundManager.play('cardDraw')

// チャレンジ成功時
this.soundManager.play('challengeSuccess')

// UI操作時
this.soundManager.play('buttonClick')

// 複数音の連続再生（例：勝利時）
this.soundManager.playSequence([
  'challengeSuccess',
  'stageComplete', 
  'gameVictory'
], 200)
```

### キーボード制御

#### Mキーによる切り替え
```typescript
// GameSceneでの実装
this.input.keyboard.on('keydown-M', () => {
  const currentState = this.soundManager.isEnabled()
  this.soundManager.setEnabled(!currentState)
  this.soundManager.saveSettings()
  
  // 視覚フィードバック
  this.showNotification(
    currentState ? 'サウンド OFF' : 'サウンド ON'
  )
})
```

## パフォーマンス仕様

### レスポンス時間
- **ボタンクリック音**: < 5ms
- **カード操作音**: < 10ms
- **チャレンジ音**: < 15ms
- **複雑な音（勝利音）**: < 25ms

### リソース使用量
- **メモリ**: 約500KB（AudioContext）
- **CPU**: < 1%（アイドル時）
- **CPU**: < 5%（複数音同時再生時）

### 同時発音数
- **制限**: なし（Web Audio API仕様による）
- **推奨**: 同時5音以下（品質維持のため）

## ブラウザ互換性

### 対応ブラウザ
- **Chrome**: 14+
- **Firefox**: 25+
- **Safari**: 6+
- **Edge**: 12+

### 互換性対応
```typescript
constructor() {
  // webkit prefix対応
  this.audioContext = new (
    window.AudioContext || 
    (window as any).webkitAudioContext
  )()
}
```

### フォールバック
AudioContext非対応ブラウザでは、サウンドなしでゲームプレイ継続

## 今後の拡張計画

### Phase 1（短期）
- [ ] 音響バリエーション機能
  - 同一アクションで複数のサウンドパターン
  - ランダム選択による飽き防止

- [ ] サウンドプリセット機能
  - クラシック・モダン・サイファイなどのテーマ
  - ユーザー選択可能

### Phase 2（中期）
- [ ] 3D音響対応
  - Web Audio API Panner Node使用
  - カード位置に応じた定位

- [ ] 動的音響調整
  - ゲーム進行に応じた音程・音色変化
  - プレイヤーの成績による音響フィードバック

### Phase 3（長期）
- [ ] AI音響生成
  - 機械学習によるプレイヤー好み学習
  - 動的な音響パラメータ調整

- [ ] VR/AR対応
  - 空間音響対応
  - 触覚フィードバック連携

## トラブルシューティング

### よくある問題

#### 音が出ない
1. **ブラウザのミュート確認**
2. **Mキーでの設定確認**
3. **AudioContext suspension**
   ```typescript
   if (this.audioContext.state === 'suspended') {
     await this.audioContext.resume()
   }
   ```

#### 音が遅れる
1. **バッファサイズ確認**
2. **他のオーディオアプリ終了**
3. **ブラウザのオーディオ設定確認**

#### 音質が悪い
1. **サンプリングレート確認**
2. **音量設定の確認**（クリッピング防止）
3. **同時発音数の削減**

### デバッグ方法

#### AudioContext状態確認
```typescript
console.log('AudioContext state:', this.audioContext.state)
console.log('Sample rate:', this.audioContext.sampleRate)
console.log('Current time:', this.audioContext.currentTime)
```

#### サウンド設定確認
```typescript
console.log('Sound enabled:', this.soundManager.isEnabled())
console.log('Volume:', this.soundManager.getVolume())
```

## 設計判断の記録

### Web Audio API選択理由
1. **ファイルサイズ削減**: 15種類のサウンドでも0KB
2. **即時性**: ファイルロード待機不要
3. **カスタマイズ性**: パラメータ調整による音響最適化
4. **モダン性**: 最新ブラウザ標準技術の活用

### 音楽理論適用理由
1. **科学的根拠**: 心理音響学に基づく音響設計
2. **ユーザビリティ**: 直感的に理解できる音響フィードバック
3. **品質保証**: 音楽理論による品質の一貫性

### パフォーマンス優先理由
1. **ゲーム体験**: 音響遅延によるゲーム体験阻害の防止
2. **アクセシビリティ**: 低スペック環境での動作保証
3. **バッテリー**: モバイル環境でのバッテリー消費最小化

---

このサウンドシステムは、技術的革新性とユーザー体験の向上を両立させた設計となっています。継続的な改善により、より豊かな音響体験を提供していきます。