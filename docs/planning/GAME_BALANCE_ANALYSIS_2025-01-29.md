> **最終更新**: 2025/01/29  
> **文書種別**: 一時文書  
> **更新頻度**: 定期的

# 保険ゲーム ゲームバランス分析と改善提案

## 1. 現状の問題点分析

### 1.1 保険システムの問題点

#### 保険料計算の単純さ
- **問題**: 保険料が単純なコスト計算のみで、現実的な要素が不足
- **影響**: 保険選択の戦略性が低い
- **具体例**: 
  - 健康状態による保険料変動がない
  - 使用履歴によるリスク評価が不完全
  - 年齢による保険料上昇が画一的

#### 保険効果の単調さ
- **問題**: 保険カードが単純にパワーを提供するだけ
- **影響**: 保険の本来の役割（リスクヘッジ）が表現されていない
- **具体例**:
  - ダメージ軽減効果がない
  - 特定チャレンジへの特化がない
  - 保険の組み合わせによるシナジーがない

### 1.2 ゲームバランスの問題点

#### 活力管理の単純さ
- **問題**: 活力が単純な増減のみ
- **影響**: リソース管理の深みが不足
- **具体例**:
  - 活力の最大値が年齢で固定
  - 回復手段が限定的
  - 活力以外のリソースがない

#### チャレンジの難易度カーブ
- **問題**: ステージ間の難易度上昇が急激
- **影響**: プレイヤーの成長曲線と不一致
- **具体例**:
  - 青年期: 4-6パワー
  - 中年期: 8-10パワー（約2倍）
  - 充実期: 11-12パワー

#### 意思決定の浅さ
- **問題**: 選択肢が「強いカードを選ぶ」だけ
- **影響**: 戦略性の欠如
- **具体例**:
  - カード選択時の判断基準が単純
  - 長期的な計画性が不要
  - リスクとリワードのトレードオフがない

### 1.3 コード構造の問題点

#### サービスクラスの責務過多
- **問題**: GameクラスとサービスクラスFの責務が不明確
- **影響**: 保守性・拡張性の低下
- **具体例**:
  - GameInsuranceServiceが状態管理まで行っている
  - ChallengeResolutionServiceがパワー計算も担当
  - ドメインロジックが分散

## 2. 改善提案

### 2.1 保険システムの現実性向上

#### リスクファクターの導入
```typescript
interface RiskFactors {
  age: number           // 年齢リスク（0.0-2.0）
  healthStatus: number  // 健康状態（0.0-1.0、低いほど健康）
  claimHistory: number  // 請求履歴（0.0-1.0、多いほどリスク高）
  lifestyle: number     // ライフスタイルリスク（0.0-1.0）
}
```

#### 動的保険料計算
- 基本保険料 × 年齢係数 × 健康リスク × 請求履歴係数
- プレイヤーの行動により保険料が変動
- 無事故割引の導入

#### 保険効果の多様化
1. **防御型保険**: ダメージを軽減
2. **回復型保険**: ターン終了時に活力回復
3. **特化型保険**: 特定チャレンジに対して効果大
4. **包括型保険**: 複数の効果を持つが高コスト

### 2.2 ゲームバランスの改善

#### 難易度カーブの最適化
```typescript
// 段階的な難易度上昇
const CHALLENGE_POWER_RANGES = {
  youth: { min: 3, max: 6, average: 4.5 },
  middle: { min: 5, max: 9, average: 7 },      // 1.5倍程度
  fulfillment: { min: 7, max: 11, average: 9 } // 2倍程度
}
```

#### 活力システムの深化
1. **一時的活力**: バフ効果による一時的な活力増加
2. **活力の質**: 高品質な活力は効果が高い
3. **活力の変換**: 活力を他のリソースに変換可能

#### リスク・リワードメカニクス
1. **高リスクチャレンジ**: 失敗時のペナルティ大、成功時の報酬も大
2. **保険なしボーナス**: 保険を使わずにクリアすると追加報酬
3. **連続成功ボーナス**: 連続成功で報酬が増加

### 2.3 意思決定の深化

#### 戦略的な保険選択
1. **保険ポートフォリオ**: 複数保険の組み合わせ効果
2. **タイミング戦略**: いつ保険を購入/解約するか
3. **専門化vs汎用化**: 特化型と汎用型の選択

#### 長期計画の必要性
1. **ステージ間の準備**: 次ステージを見据えた準備
2. **資産形成**: 長期的な活力蓄積戦略
3. **保険の更新戦略**: 定期vs終身の選択

### 2.4 コード構造の改善

#### ドメインサービスの責務明確化
1. **保険料計算**: InsurancePremiumCalculationService（純粋計算）
2. **保険管理**: InsuranceManagementService（保険の追加/削除）
3. **保険効果**: InsuranceEffectService（効果の適用）
4. **リスク評価**: RiskAssessmentService（リスク計算）

#### 値オブジェクトの活用強化
- RiskFactor値オブジェクト
- InsurancePortfolio値オブジェクト
- ChallengeResult値オブジェクト

## 3. 実装優先順位

### Phase 1: 基礎改善（優先度: 高）
1. 保険効果の多様化実装
2. リスクファクターの基本実装
3. 難易度カーブの調整

### Phase 2: システム深化（優先度: 中）
1. 動的保険料計算の実装
2. 保険ポートフォリオ効果
3. リスク・リワードメカニクス

### Phase 3: 高度な機能（優先度: 低）
1. AIによる保険推奨
2. マルチエンディング
3. 実績システム

## 4. 期待される効果

### プレイヤー体験の向上
- より深い戦略性
- 繰り返しプレイの価値向上
- 達成感の増大

### ゲームの持続性
- 長期的な目標設定
- 多様なプレイスタイル
- バランスの取れた難易度

### 開発の持続性
- 保守しやすいコード構造
- 機能追加が容易
- バグの減少

## 5. 次のステップ

1. この分析に基づいて具体的な実装計画を作成
2. 優先度の高い改善から順次実装
3. プレイテストによる効果測定
4. フィードバックに基づく調整

---

この文書は、ゲームバランスの現状分析と改善提案をまとめたものです。
実装時はCLAUDE.mdの開発原則に従い、プレイヤー体験を最優先に考慮してください。