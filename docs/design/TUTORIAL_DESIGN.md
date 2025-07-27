# チュートリアルシステム設計書

> **最終更新**: 2025/1/27  
> **文書種別**: 設計ドキュメント  
> **更新頻度**: 実装時に随時更新

## 📖 概要

GAME_RULES_REALISTIC_FINALの複雑なシステムを新規プレイヤーに分かりやすく教えるチュートリアルシステムの設計。

## 🎯 設計目標

1. **学習効率**: 15分以内でゲームの核心を理解
2. **実践重視**: 読むだけでなく実際に操作
3. **段階的習得**: 簡単な操作から複雑な戦略まで
4. **リアル感**: 実際の保険選択に活かせる知識を提供

## 📚 チュートリアルステップ

### Step 1: 基本操作 (3分)
**目標**: カード操作とターンの概念を理解

1. **手札とカード**
   - 手札の確認方法
   - カードの情報（名前、パワー、コスト）
   - カードの選択方法

2. **チャレンジの基本**
   - チャレンジカードの選択
   - 手札からカードを選んで挑戦
   - 成功・失敗の判定

3. **活力システム**
   - 活力の意味と重要性
   - 活力の増減

### Step 2: 保険の基本 (4分)
**目標**: 保険カードの役割と基本的な選択を理解

1. **保険カードの効果**
   - パワーボーナスの理解
   - 年齢効果の説明
   - 保険なしのリスク体験

2. **終身vs定期保険**
   - 終身保険：高コスト・永続・安心
   - 定期保険：低コスト・期限付き・計画性必要
   - 実際に選択して違いを体験

### Step 3: 年齢とライフステージ (3分)
**目標**: 年齢による変化と戦略的思考を理解

1. **活力の変化**
   - 青年期→中年期→充実期での活力上限減少
   - 実際にステージ移行を体験

2. **保険料負担**
   - 3枚ルールの説明
   - 負担の計算方法
   - バランスの重要性

### Step 4: 期限管理と更新 (3分)
**目標**: 保険の期限管理と更新システムを理解

1. **期限切れ警告**
   - 警告表示の見方
   - 残りターンの確認

2. **更新の判断**
   - 更新コストの計算
   - 更新vs失効の判断基準
   - 実際に更新選択を体験

### Step 5: 戦略的思考 (2分)
**目標**: 総合的な戦略立案能力の基礎を習得

1. **年齢に応じた保険選択**
   - 若い時は定期保険中心
   - 年齢とともに終身保険検討
   - 負担とのバランス

2. **夢の実現**
   - 年齢による難易度変化
   - 体力系vs知識系の選択

## 🎨 UI設計

### TutorialOverlay コンポーネント
```typescript
interface TutorialStep {
  id: string
  title: string
  description: string
  targetElement?: string  // ハイライト対象
  action: 'click' | 'hover' | 'wait' | 'none'
  nextCondition: 'manual' | 'action' | 'timer'
  duration?: number
}
```

### ハイライト機能
- **スポットライト効果**: 対象要素以外を暗くする
- **パルスアニメーション**: 注目すべき要素を点滅
- **吹き出し**: 説明テキストを分かりやすく表示

### 進行制御
- **「次へ」ボタン**: 手動で進める
- **「スキップ」ボタン**: チュートリアル終了
- **「戻る」ボタン**: 前のステップに戻る
- **進捗表示**: 現在のステップ数 (3/15)

## 💾 データ構造

### TutorialManager
```typescript
class TutorialManager {
  private currentStep: number = 0
  private steps: TutorialStep[]
  private isActive: boolean = false
  
  startTutorial(): void
  nextStep(): void
  previousStep(): void
  skipTutorial(): void
  highlightElement(selector: string): void
  showMessage(title: string, text: string): void
}
```

### 保存データ
```typescript
interface TutorialProgress {
  completed: boolean
  currentStep: number
  skipped: boolean
  completedAt?: Date
}
```

## 🎮 GameScene連携

### チュートリアルモード判定
```typescript
// GameSceneでチュートリアルモードかチェック
private isTutorialMode(): boolean {
  return this.tutorialManager.isActive
}

// チュートリアル専用の簡略化された処理
private handleTutorialAction(action: string): void {
  this.tutorialManager.processAction(action)
}
```

### 既存機能の制限
- チュートリアル中は一部機能を制限
- 特定の選択肢のみ表示
- エラーが起きにくいよう調整

## 📱 アクセシビリティ

1. **キーボード操作**: Enterキーで次へ、Escでスキップ
2. **読み上げ対応**: aria-labelでスクリーンリーダー対応
3. **色覚サポート**: 色だけでなく形やアニメーションで区別
4. **文字サイズ**: 調整可能な説明テキスト

## 🚀 実装優先度

### Phase 1 (高優先度)
- TutorialManagerクラス実装
- 基本的なステップ進行システム
- シンプルなメッセージ表示

### Phase 2 (中優先度)  
- ハイライト機能実装
- GameSceneとの連携
- 進捗保存機能

### Phase 3 (低優先度)
- アニメーション強化
- 音声サポート
- 詳細な分析機能

## 🎯 成功指標

1. **完了率**: 80%以上のプレイヤーがチュートリアル完了
2. **理解度**: チュートリアル後にゲームを15分以上プレイ
3. **満足度**: フィードバックで4.0/5.0以上の評価
4. **効率性**: 平均完了時間15分以内

## 🔄 継続的改善

1. **ユーザーテスト**: 定期的な操作性確認
2. **データ分析**: どのステップで離脱が多いか分析
3. **内容更新**: ゲーム機能追加に合わせてチュートリアル更新