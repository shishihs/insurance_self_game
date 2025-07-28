# API Documentation

> **最終更新**: 2025/01/28  
> **文書種別**: 技術仕様書  
> **更新頻度**: 機能追加・変更時に更新

## 概要

このドキュメントは、人生充実ゲームのAPIとシステムアーキテクチャの詳細を記述します。開発者が新機能を実装したり、既存システムを理解するための技術的なリファレンスです。

## アーキテクチャ概要

### システム構成

```
┌─────────────────────────────────────────────────┐
│                   Vue 3 UI Layer               │
│  - App.vue（ホーム画面）                         │
│  - GameCanvas.vue（ゲーム統合）                   │
└─────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────┐
│                 Phaser 3 Game Layer             │
│  - GameScene（メインゲーム）                      │
│  - TutorialManager（チュートリアル）               │
│  - DropZoneManager（ドラッグ&ドロップ）            │
│  - SoundManager（サウンドシステム）                 │
└─────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────┐
│                Domain Model Layer                │
│  - Game（ゲーム状態管理）                         │
│  - Card/Deck（カードシステム）                     │
│  - Vitality（活力システム）                       │
│  - CardPower（カードパワー）                       │
└─────────────────────────────────────────────────┘
```

## Web Audio API サウンドシステム

### WebAudioSoundGenerator

プログラマティックに高品質なサウンドエフェクトを生成するクラス。

#### 基本API

```typescript
class WebAudioSoundGenerator {
  constructor()
  
  // UI操作音
  playButtonClick(): void
  playButtonHover(): void
  
  // カード操作音
  playCardDraw(): void
  playCardSelect(): void
  
  // チャレンジ音
  playChallengeSuccess(): void
  playChallengeFail(): void
  
  // 活力変化音
  playVitalityGain(): void
  playVitalityLoss(): void
  
  // 通知・警告音
  playWarning(): void
  playNotification(): void
  
  // ゲーム進行音
  playGameOver(): void
  playVictory(): void
  
  // システム管理
  async resume(): Promise<void>
  destroy(): void
}
```

#### 音響設計原則

1. **音楽理論の適用**
   - 成功音：C5-E5-G5の長三和音（心地よい響き）
   - 通知音：ド→ミの完全3度音程（親しみやすい音程）
   - 勝利音：ファンファーレ風の音階進行

2. **心理音響学の応用**
   - カードドローSound：ホワイトノイズ + ハイパスフィルター
   - 警告音：2回のビープ音による緊急度表現
   - 失敗音：のこぎり波による不協和音

3. **技術仕様**
   - サンプリングレート：44.1kHz
   - ビット深度：32bit float
   - レイテンシ：< 5ms
   - ファイルサイズ：0KB（動的生成）

### SoundManager

ゲーム全体のサウンドエフェクトを統合管理するクラス。

#### 基本API

```typescript
class SoundManager {
  constructor(scene: Phaser.Scene)
  
  // サウンド再生
  play(soundKey: SoundKey): void
  playSequence(soundKeys: SoundKey[], delay: number): void
  playWithVariation(soundKey: SoundKey, variations: number): void
  
  // 音量・設定管理
  setVolume(volume: number): void
  getVolume(): number
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
  
  // システム管理
  stopAll(): void
  saveSettings(): void
  destroy(): void
}
```

#### サウンドエフェクト一覧

| カテゴリ | サウンドキー | 説明 | 音響特性 |
|----------|-------------|------|----------|
| **カード操作** | `cardDraw` | カードドロー音 | ホワイトノイズ + フィルター |
| | `cardSelect` | カード選択音 | 矩形波 600Hz→800Hz |
| | `cardDeselect` | 選択解除音 | cardSelectと同じ |
| | `cardPlay` | カードプレイ音 | - |
| | `cardShuffle` | シャッフル音 | - |
| **チャレンジ** | `challengeStart` | チャレンジ開始 | - |
| | `challengeSuccess` | 成功音 | C5-E5-G5和音 |
| | `challengeFail` | 失敗音 | のこぎり波 300Hz→100Hz |
| **UI操作** | `buttonClick` | ボタンクリック | サイン波 800Hz→400Hz |
| | `buttonHover` | ホバー音 | サイン波 1200Hz |
| | `dialogOpen` | ダイアログ開く | - |
| | `dialogClose` | ダイアログ閉じる | - |
| **保険** | `insuranceGet` | 保険獲得 | 通知音 |
| | `insuranceExpire` | 期限切れ | - |
| | `insuranceRenew` | 更新音 | 通知音 |
| **活力** | `vitalityGain` | 活力増加 | サイン波 400Hz→800Hz |
| | `vitalityLoss` | 活力減少 | サイン波 600Hz→200Hz |
| | `vitalityWarning` | 活力警告 | 2回ビープ 880Hz |
| **ゲーム進行** | `stageComplete` | ステージクリア | - |
| | `gameOver` | ゲームオーバー | のこぎり波 200Hz→50Hz |
| | `gameVictory` | 勝利音 | ファンファーレ |
| **通知** | `notification` | 通知音 | ド→ミ音程 |
| | `warning` | 警告音 | 2回ビープ |
| | `error` | エラー音 | - |

## ドメインモデル API

### Game エンティティ

ゲーム状態を管理するメインエンティティ。

#### 基本API

```typescript
class Game {
  // ゲーム状態
  getVitality(): Vitality
  getCurrentStage(): LifeStage
  getTurn(): number
  
  // カード操作
  drawCard(): Card | null
  selectCard(cardId: string): boolean
  deselectCard(cardId: string): boolean
  getSelectedCards(): Card[]
  
  // チャレンジ
  startChallenge(challengeId: string): void
  resolveChallenge(): ChallengeResult
  
  // ターン管理
  endTurn(): void
  canEndTurn(): boolean
  
  // 保険システム
  getInsuranceCards(): InsuranceCard[]
  renewInsurance(cardId: string): InsuranceRenewalResult
  
  // ゲーム判定
  isGameOver(): boolean
  isVictory(): boolean
}
```

### CardPower バリューオブジェクト

カードの力を表現する値オブジェクト。負の値エラーが修正されました。

#### 基本API

```typescript
class CardPower {
  constructor(value: number)
  
  // 値操作（不変オブジェクト）
  add(other: CardPower): CardPower
  subtract(other: CardPower): CardPower  // 負の値は0に修正
  multiply(factor: number): CardPower
  
  // 比較
  equals(other: CardPower): boolean
  isGreaterThan(other: CardPower): boolean
  isLessThan(other: CardPower): boolean
  
  // 値取得
  getValue(): number
  toString(): string
}
```

#### 修正されたエラー

以前は `subtract()` メソッドで負の値が発生する可能性がありましたが、現在は以下のように修正されています：

```typescript
subtract(other: CardPower): CardPower {
  const result = this.value - other.value;
  return new CardPower(Math.max(0, result)); // 負の値は0に修正
}
```

### Vitality バリューオブジェクト

プレイヤーの活力（体力）を管理するバリューオブジェクト。

#### 基本API

```typescript
class Vitality {
  constructor(current: number, max: number)
  
  // 値操作
  increase(amount: number): Vitality
  decrease(amount: number): Vitality
  
  // 状態確認
  isEmpty(): boolean
  isFull(): boolean
  getPercentage(): number
  
  // 値取得
  getCurrent(): number
  getMax(): number
}
```

## UI統合システム

### TutorialManager

インタラクティブなチュートリアルシステム。

#### 基本API

```typescript
class TutorialManager {
  constructor(scene: Phaser.Scene)
  
  // チュートリアル制御
  startTutorial(): void
  nextStep(): void
  skipStep(): void
  endTutorial(): void
  
  // 状態管理
  isActive(): boolean
  getCurrentStep(): TutorialStep
  getProgress(): { current: number, total: number }
  
  // ゲーム統合
  waitForGameAction(actionType: GameActionType): Promise<boolean>
  validateGameState(validator: GameStateValidator): boolean
}
```

### DropZoneManager

高性能なドラッグ&ドロップシステム。

#### 基本API

```typescript
class DropZoneManager {
  constructor(scene: Phaser.Scene)
  
  // ゾーン管理
  createZone(config: DropZoneConfig): DropZone
  removeZone(zoneId: string): boolean
  
  // ドラッグ操作
  startDrag(object: Phaser.GameObjects.GameObject): void
  updateDrag(x: number, y: number): void
  endDrag(): DropResult
  
  // 性能特性
  // - 60fps維持保証
  // - 100+ゾーン効率処理
  // - マグネティックスナップ（80-120px範囲）
  // - モバイル最適化（タッチオフセット調整）
}
```

## CUI開発システム

### PlaytestGameController

CUI環境でのゲームテスト・開発用コントローラー。

#### 基本API

```typescript
class PlaytestGameController {
  constructor(gameConfig?: Partial<GameConfig>)
  
  // ゲーム実行
  async runDemo(options: DemoOptions): Promise<GameResult>
  async runBenchmark(options: BenchmarkOptions): Promise<BenchmarkResult>
  
  // AI戦略テスト
  async testStrategy(strategy: AIStrategy): Promise<StrategyResult>
  async compareStrategies(strategies: AIStrategy[]): Promise<ComparisonResult>
  
  // デバッグ機能
  async debugGame(): Promise<void>
  inspectGameState(): GameStateReport
}
```

## パフォーマンス仕様

### Web Audio API
- **レイテンシ**: < 5ms
- **同時発音数**: 制限なし（Web Audio API準拠）
- **メモリ使用量**: 約500KB（AudioContextのみ）
- **CPU使用率**: < 1%（アイドル時）

### ドラッグ&ドロップ
- **フレームレート**: 60fps保証
- **最大ゾーン数**: 100+ゾーン
- **判定精度**: 1px
- **レスポンス時間**: < 16ms

### ゲームロジック
- **ターン処理時間**: < 10ms
- **メモリ使用量**: < 50MB
- **状態変更レイテンシ**: < 1ms

## エラーハンドリング

### サウンドシステム
```typescript
try {
  soundManager.play('buttonClick');
} catch (error) {
  console.warn('Sound playback error:', error);
  // ゲームは正常に継続
}
```

### ドメインモデル
```typescript
// CardPowerの負の値エラーは自動修正
const power = new CardPower(5);
const result = power.subtract(new CardPower(10)); // 結果は CardPower(0)
```

### Web Audio API
```typescript
// AudioContext suspension対応
await webAudioGenerator.resume();
```

## 開発環境セットアップ

### 必要な依存関係
```json
{
  "dependencies": {
    "vue": "^3.5.18",
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

### 開発用コマンド
```bash
# 開発サーバー起動
pnpm dev

# CUIテスト実行
pnpm cui:play

# 大規模ベンチマーク
pnpm benchmark:massive

# 型チェック
pnpm type-check
```

## 今後の拡張予定

### Phase 1（短期）
- [ ] 音響バリエーション機能
- [ ] サウンドプリセット機能
- [ ] 音響解析ツール

### Phase 2（中期）
- [ ] 3D音響対応
- [ ] 音楽シーケンサー統合
- [ ] AI音響生成

### Phase 3（長期）
- [ ] VR/AR音響対応
- [ ] リアルタイム音響解析
- [ ] 機械学習による音響最適化

---

このAPIドキュメントは、プロジェクトの成長と共に継続的に更新されます。新機能の実装時は、必ずこのドキュメントの該当部分も更新してください。

## 関連ドキュメント

- [開発原則](./PRINCIPLES.md) - プロジェクトの核となる開発思想
- [技術仕様書](../design/TECH_SPEC.md) - 使用技術とアーキテクチャ
- [ゲームデザイン](../design/GAME_DESIGN.md) - ゲームルールと仕様
- [CUI使用ガイド](../CUI_USAGE.md) - CUIツールの詳細な使い方