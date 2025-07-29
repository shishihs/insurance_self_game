# API Documentation

> **最終更新**: 2025/07/29  
> **文書種別**: 技術仕様書  
> **更新頻度**: 機能追加・変更時に更新

## 概要

このドキュメントは、人生充実ゲームのAPI、システムアーキテクチャ、および新しいドメインサービスの詳細を記述します。v0.2.8では、高度なゲームメカニクス、統計システム、フィードバック機能、および実績システムが追加されました。

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

ゲーム状態を管理するメインエンティティ。ドメイン駆動設計(DDD)に基づいて設計され、複数のドメインサービスと連携します。

#### 基本API

```typescript
class Game implements IGameState {
  // 基本プロパティ
  id: string
  status: GameStatus
  phase: GamePhase
  stage: GameStage
  turn: number
  
  // 値オブジェクト（不変）
  private _vitality: Vitality
  private _insuranceBurden: InsurancePremium
  
  // ドメインサービス
  private cardManager: ICardManager
  private premiumCalculationService: InsurancePremiumCalculationService
  private stageManager: GameStageManager
  private expirationManager: InsuranceExpirationManager
  private challengeResolutionService: ChallengeResolutionService
  
  // ゲーム状態
  getVitality(): Vitality
  getCurrentStage(): GameStage
  getTurn(): number
  getGameStatus(): GameStatus
  getGamePhase(): GamePhase
  
  // カード操作（CardManagerに委譲）
  drawCards(count: number): Card[]
  selectCard(cardId: string): boolean
  deselectCard(cardId: string): boolean
  getSelectedCards(): Card[]
  getHandCards(): Card[]
  getDiscardPile(): Card[]
  
  // チャレンジシステム
  startChallenge(challenge: Card): void
  resolveChallenge(): ChallengeResult
  getCurrentChallenge(): Card | undefined
  
  // ターン管理
  endTurn(): TurnResult
  canEndTurn(): boolean
  nextTurn(): void
  
  // 保険システム
  getInsuranceCards(): Card[]
  getExpiredInsurances(): Card[]
  renewInsurance(cardId: string): boolean
  getInsuranceBurden(): number
  getAvailableInsuranceTypes(): InsuranceTypeChoice[]
  selectInsuranceType(typeId: string): InsuranceTypeSelectionResult
  
  // 保険期限管理
  checkInsuranceExpirations(): InsuranceExpirationNotice[]
  handleInsuranceExpiration(cardId: string): void
  
  // ゲーム判定
  isGameOver(): boolean
  isVictory(): boolean
  canContinue(): boolean
  
  // 統計・分析
  getStats(): PlayerStats
  exportGameState(): IGameState
  
  // パフォーマンス最適化
  private updateCachedValues(): void
  private markDirty(flag: keyof DirtyFlags): void
}
```

#### 新しいドメインサービス統合

1. **ChallengeResolutionService**: チャレンジ解決の専門ロジック
2. **GameStageManager**: ゲームステージの進行管理
3. **InsuranceExpirationManager**: 保険期限の監視と通知
4. **InsurancePremiumCalculationService**: 保険料計算の専門ロジック

### CardPower バリューオブジェクト

カードの力を表現する値オブジェクト。不変性を保証し、負の値エラーが修正されています。

#### 基本API

```typescript
class CardPower {
  private readonly value: number
  
  constructor(value: number)
  
  // 値操作（不変オブジェクト）
  add(other: CardPower): CardPower
  subtract(other: CardPower): CardPower  // 負の値は0に自動修正
  multiply(factor: number): CardPower
  divide(divisor: number): CardPower  // 新機能：除算操作
  
  // 比較操作
  equals(other: CardPower): boolean
  isGreaterThan(other: CardPower): boolean
  isLessThan(other: CardPower): boolean
  isGreaterThanOrEqual(other: CardPower): boolean
  isLessThanOrEqual(other: CardPower): boolean
  
  // 特殊判定
  isZero(): boolean
  isPositive(): boolean
  
  // 値取得・表示
  getValue(): number
  toString(): string
  toDisplayString(): string  // UI表示用フォーマット
  
  // 静的ファクトリメソッド
  static zero(): CardPower
  static of(value: number): CardPower
  static max(a: CardPower, b: CardPower): CardPower
  static min(a: CardPower, b: CardPower): CardPower
}
```

#### 修正されたエラーと新機能

**負の値エラー修正**:
```typescript
subtract(other: CardPower): CardPower {
  const result = this.value - other.value;
  return new CardPower(Math.max(0, result)); // 負の値は0に自動修正
}
```

**新しい除算操作**:
```typescript
divide(divisor: number): CardPower {
  if (divisor === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return new CardPower(Math.floor(this.value / divisor));
}
```

### Vitality バリューオブジェクト

プレイヤーの活力（体力）を管理する値オブジェクト。境界値の安全性と不変性を保証します。

#### 基本API

```typescript
class Vitality {
  private readonly current: number
  private readonly max: number
  
  constructor(current: number, max: number)
  
  // 値操作（不変オブジェクト）
  increase(amount: number): Vitality
  decrease(amount: number): Vitality
  setMax(newMax: number): Vitality  // 新機能：最大値の変更
  restore(): Vitality  // 新機能：完全回復
  
  // 状態確認
  isEmpty(): boolean
  isFull(): boolean
  isDangerous(): boolean  // 新機能：危険状態（25%以下）
  isHealthy(): boolean   // 新機能：健康状態（75%以上）
  getPercentage(): number
  getRemainingPoints(): number  // 新機能：最大値までの残り
  
  // 値取得
  getCurrent(): number
  getMax(): number
  
  // 表示用
  toString(): string
  toDisplayString(): string  // "20/30 (67%)" 形式
  toProgressBar(width: number): string  // プログレスバー形式
  
  // 静的ファクトリメソッド
  static create(current: number, max: number): Vitality
  static full(max: number): Vitality
  static empty(max: number): Vitality
}
```

#### 新機能と安全性

**境界値の安全性**:
- 現在値は0以上、最大値以下に自動調整
- 最大値は1以上に制限
- 不正な値での例外処理

**ゲーム体験の向上**:
- `isDangerous()`: 活力が危険レベル（25%以下）の判定
- `isHealthy()`: 活力が健康レベル（75%以上）の判定
- プログレスバー表示でUI統合を簡素化

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

## 高度なドメインサービス API（v0.2.8新機能）

### StatisticsDataService

プレイヤーのパフォーマンス分析と統計データ管理を担当する新しいドメインサービス。

#### 基本API

```typescript
class StatisticsDataService {
  /**
   * プレイヤー統計を取得
   */
  getPlayerStatistics(playerId?: string): PlayerStatistics
  
  /**
   * ゲームセッション統計を記録
   */
  recordGameSession(sessionData: GameSessionData): void
  
  /**
   * パフォーマンス分析を実行
   */
  analyzePerformance(timeRange: TimeRange): PerformanceAnalysis
  
  /**
   * カード使用統計を取得
   */
  getCardUsageStatistics(): CardUsageStats
  
  /**
   * 決定時間分析を取得
   */
  getDecisionTimeAnalysis(): DecisionTimeStats
  
  /**
   * 戦略パターン分析を実行
   */
  analyzeStrategyPatterns(): StrategyPatternAnalysis
}
```

### FeedbackManagementService

リアルタイムユーザーフィードバック収集と分析システム。

#### 基本API

```typescript
class FeedbackManagementService {
  /**
   * フィードバックを記録
   */
  recordFeedback(feedback: UserFeedback): string
  
  /**
   * バグレポートを処理
   */
  processBugReport(bugReport: BugReport): void
  
  /**
   * 満足度調査を実行
   */
  conductSatisfactionSurvey(): SurveyResult
  
  /**
   * ユーザー体験データを分析
   */
  analyzeUserExperience(): UXAnalysis
  
  /**
   * フィードバック統計を取得
   */
  getFeedbackStatistics(): FeedbackStats
}
```

### AchievementSystemService

実績システムとプレイヤー達成度管理。

#### 基本API

```typescript
class AchievementSystemService {
  /**
   * 実績をチェック
   */
  checkAchievements(gameState: IGameState): Achievement[]
  
  /**
   * 実績を解除
   */
  unlockAchievement(achievementId: string, playerId: string): void
  
  /**
   * プレイヤーの実績一覧を取得
   */
  getPlayerAchievements(playerId: string): PlayerAchievement[]
  
  /**
   * 実績進捗を更新
   */
  updateAchievementProgress(
    achievementId: string, 
    progress: number
  ): void
  
  /**
   * 利用可能な実績一覧を取得
   */
  getAvailableAchievements(): Achievement[]
}
```

### SkillSystemService

スキル成長システムとプレイヤー能力管理。

#### 基本API

```typescript
class SkillSystemService {
  /**
   * スキル経験値を追加
   */
  addSkillExperience(
    skillType: SkillType, 
    experience: number
  ): SkillLevelUpResult
  
  /**
   * プレイヤースキルを取得
   */
  getPlayerSkills(playerId: string): PlayerSkills
  
  /**
   * スキルレベルアップをチェック
   */
  checkSkillLevelUp(skillType: SkillType): boolean
  
  /**
   * スキルボーナスを計算
   */
  calculateSkillBonus(
    skillType: SkillType, 
    level: number
  ): SkillBonus
  
  /**
   * スキル成長予測を生成
   */
  predictSkillGrowth(
    currentSkills: PlayerSkills, 
    playStyle: PlayStyle
  ): GrowthPrediction
}
```

### PlayerProgressionService

プレイヤー成長追跡と進捗管理システム。

#### 基本API

```typescript
class PlayerProgressionService {
  /**
   * プレイヤー進捗を更新
   */
  updateProgression(progressData: ProgressionData): void
  
  /**
   * マイルストーンをチェック
   */
  checkMilestones(playerId: string): Milestone[]
  
  /**
   * 成長軌跡を分析
   */
  analyzeGrowthTrajectory(
    playerId: string, 
    timeRange: TimeRange
  ): GrowthAnalysis
  
  /**
   * 学習曲線を計算
   */
  calculateLearningCurve(playerId: string): LearningCurveData
  
  /**
   * 推奨練習プランを生成
   */
  generatePracticePlan(
    currentLevel: PlayerLevel
  ): PracticePlan
}
```

### DifficultyBalanceService

動的難易度調整システム。

#### 基本API

```typescript
class DifficultyBalanceService {
  /**
   * 難易度を動的調整
   */
  adjustDifficulty(
    currentDifficulty: number, 
    playerPerformance: PerformanceMetrics
  ): number
  
  /**
   * 最適な難易度を計算
   */
  calculateOptimalDifficulty(
    playerSkillLevel: number, 
    challengeType: ChallengeType
  ): DifficultySettings
  
  /**
   * 難易度曲線を分析
   */
  analyzeDifficultyCurve(
    gameSession: GameSession
  ): DifficultyAnalysis
  
  /**
   * プレイヤー適応度を測定
   */
  measurePlayerAdaptation(
    recentPerformance: PerformanceHistory
  ): AdaptationMetrics
}
```

### ReplayabilityService

リプレイ性向上とゲーム体験多様化システム。

#### 基本API

```typescript
class ReplayabilityService {
  /**
   * 動的コンテンツを生成
   */
  generateDynamicContent(
    playerProfile: PlayerProfile
  ): DynamicGameContent
  
  /**
   * ランダムイベントを生成
   */
  generateRandomEvents(
    gameState: IGameState, 
    eventProbability: number
  ): RandomEvent[]
  
  /**
   * プレイスタイル分析を実行
   */
  analyzePlayStyle(
    gameHistory: GameHistory
  ): PlayStyleAnalysis
  
  /**
   * 個人化された挑戦を生成
   */
  generatePersonalizedChallenges(
    playerSkills: PlayerSkills
  ): PersonalizedChallenge[]
}
```

### CacheManager

パフォーマンス最適化のためのキャッシュ管理システム。

#### 基本API

```typescript
class CacheManager {
  /**
   * データをキャッシュに保存
   */
  set<T>(key: string, value: T, ttl?: number): void
  
  /**
   * キャッシュからデータを取得
   */
  get<T>(key: string): T | null
  
  /**
   * キャッシュをクリア
   */
  clear(pattern?: string): void
  
  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStatistics
  
  /**
   * メモリ使用量を最適化
   */
  optimizeMemory(): void
}
```

## 統計・分析システム

### StatisticsDashboard Component

リアルタイム統計ダッシュボードのVueコンポーネント。

#### Props & Events

```typescript
interface StatisticsDashboardProps {
  autoRefresh: boolean
  refreshInterval: number
  showDetailedStats: boolean
}

interface StatisticsDashboardEvents {
  close: () => void
  export: (format: ExportFormat) => void
  refresh: () => void
}
```

### チャート系コンポーネント

```typescript
// カード使用率チャート
interface CardUsageChartProps {
  data: CardUsageData[]
  timeRange: TimeRange
  chartType: 'bar' | 'pie' | 'line'
}

// 決定時間分析チャート
interface DecisionTimeChartProps {
  decisionData: DecisionTimeData[]
  showAverage: boolean
  showTrend: boolean
}

// 活力推移チャート
interface VitalityTrendChartProps {
  vitalityHistory: VitalityData[]
  showPrediction: boolean
}

// 戦略パターン分析チャート
interface StrategyPatternsChartProps {
  patternData: StrategyPatternData[]
  analysisDepth: 'basic' | 'advanced'
}
```

## フィードバック・ユーザー体験システム

### FeedbackButton Component

ユーザーフィードバック収集用のFloating Action Button。

#### 基本API

```typescript
interface FeedbackButtonProps {
  gameState: GameState
  showStats: boolean
  autoSurvey: boolean
}

interface FeedbackButtonEvents {
  'feedback-submitted': (
    feedbackId: string, 
    type: FeedbackType
  ) => void
}
```

### フィードバック管理システム

```typescript
interface UserFeedback {
  id: string
  type: 'bug' | 'suggestion' | 'praise' | 'complaint'
  content: string
  gameState: GameStateSnapshot
  timestamp: Date
  metadata: FeedbackMetadata
}

interface BugReport extends UserFeedback {
  severity: 'low' | 'medium' | 'high' | 'critical'
  steps: string[]
  expectedBehavior: string
  actualBehavior: string
  browserInfo: BrowserInfo
}
```

## ChallengeResolutionService

チャレンジ解決の専門ロジックを担当するドメインサービス。

#### 基本API

```typescript
class ChallengeResolutionService {
  /**
   * チャレンジを解決し、結果を計算
   */
  resolveChallenge(
    challenge: Card,
    selectedCards: Card[],
    cardManager: ICardManager,
    stage: GameStage,
    insuranceBurden: number
  ): ChallengeResult
  
  /**
   * 総パワーを計算（保険料負担を考慮）
   */
  private calculateTotalPower(
    cards: Card[], 
    insuranceBurden: number
  ): PowerBreakdown
  
  /**
   * 夢カードの年齢調整パワーを取得
   */
  private getDreamRequiredPower(
    challenge: Card, 
    stage: GameStage
  ): number
}
```

### GameStageManager

ゲームステージの進行と状態管理を担当。

#### 基本API

```typescript
class GameStageManager {
  /**
   * 次のステージに進行可能かチェック
   */
  canAdvanceToNextStage(game: Game): boolean
  
  /**
   * ステージを進行
   */
  advanceStage(game: Game): StageAdvancementResult
  
  /**
   * 現在のステージ情報を取得
   */
  getCurrentStageInfo(stage: GameStage): StageInfo
  
  /**
   * ステージ別の挑戦要求を計算
   */
  calculateStageRequirements(stage: GameStage): StageRequirements
}
```

### InsuranceExpirationManager

保険期限の監視と通知を担当。

#### 基本API

```typescript
class InsuranceExpirationManager {
  /**
   * 期限切れ通知をチェック
   */
  checkExpirations(
    insuranceCards: Card[], 
    currentTurn: number
  ): InsuranceExpirationNotice[]
  
  /**
   * 期限切れ処理を実行
   */
  processExpiredInsurances(
    game: Game, 
    expiredCards: Card[]
  ): ExpirationResult
  
  /**
   * 更新可能性をチェック
   */
  canRenewInsurance(
    card: Card, 
    playerVitality: Vitality
  ): boolean
}
```

### InsurancePremiumCalculationService

保険料計算の専門ロジック。

#### 基本API

```typescript
class InsurancePremiumCalculationService {
  /**
   * 年齢別の保険料を計算
   */
  calculatePremium(
    insuranceType: InsuranceType, 
    age: number
  ): InsurancePremium
  
  /**
   * 総保険料負担を計算
   */
  calculateTotalBurden(
    insuranceCards: Card[], 
    age: number
  ): InsurancePremium
  
  /**
   * 保険料の年齢調整係数を取得
   */
  getAgeAdjustmentFactor(
    age: number, 
    insuranceType: InsuranceType
  ): number
}
```

## 今後の拡張予定

### Phase 1（短期）
- [ ] 音響バリエーション機能
- [ ] サウンドプリセット機能
- [ ] セーブ/ロードシステム
- [ ] 統計・実績システム

### Phase 2（中期）
- [ ] 3D音響対応
- [ ] 音楽シーケンサー統合
- [ ] AI対戦モード
- [ ] オンラインランキング

### Phase 3（長期）
- [ ] VR/AR対応
- [ ] リアルタイム解析
- [ ] 機械学習による最適化
- [ ] 教育機関向けカスタマイズ

---

このAPIドキュメントは、プロジェクトの成長と共に継続的に更新されます。新機能の実装時は、必ずこのドキュメントの該当部分も更新してください。

## 関連ドキュメント

- [開発原則](./PRINCIPLES.md) - プロジェクトの核となる開発思想
- [技術仕様書](../design/TECH_SPEC.md) - 使用技術とアーキテクチャ
- [ゲームデザイン](../design/GAME_DESIGN.md) - ゲームルールと仕様
- [CUI使用ガイド](../CUI_USAGE.md) - CUIツールの詳細な使い方