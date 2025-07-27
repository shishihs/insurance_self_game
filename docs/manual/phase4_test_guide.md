# Phase 4: 夢カードの年齢調整システム テストガイド

## 概要
Phase 4では、チャレンジカード（夢カード）に年齢による難易度調整を実装しました。年齢が進むにつれて、体力系の夢は難しくなり、知識系の夢は易しくなります。

## 実装内容

### 1. 夢カードのカテゴリー分類
- **体力系（physical）**: 就職活動、一人暮らし、子育て、住宅購入
- **知識系（intellectual）**: 資格試験、定年退職
- **複合系（mixed）**: 親の介護、健康管理

### 2. 年齢調整値
- **青年期**: 調整なし（基本パワーのまま）
- **中年期・充実期**:
  - 体力系: +3パワー（より困難に）
  - 知識系: -2パワー（より容易に）
  - 複合系: 調整なし

### 3. 最小値保証
- 調整後の必要パワーは最小値1を保証

## テストシナリオ

### シナリオ1: 青年期の夢カード
1. 青年期でゲームを開始
2. 「就職活動」（体力系、基本パワー5）のチャレンジを引く
3. 必要パワーは5のまま（調整なし）

### シナリオ2: 中年期の体力系夢カード
1. 中年期に到達
2. 「子育て」（体力系、基本パワー8）のチャレンジを引く
3. 必要パワーは11（8+3）に増加
4. より多くのカードや保険が必要に

### シナリオ3: 充実期の知識系夢カード
1. 充実期に到達
2. 「定年退職」（知識系、基本パワー12）のチャレンジを引く
3. 必要パワーは10（12-2）に減少
4. 経験の蓄積により達成しやすくなる

### シナリオ4: 複合系夢カード
1. どの年齢でも
2. 「親の介護」（複合系、基本パワー9）のチャレンジを引く
3. 必要パワーは9のまま（調整なし）

## デバッグ方法

### コンソールで確認
```javascript
// GameSceneでチャレンジカードの情報を確認
console.log('Challenge:', this.gameInstance.currentChallenge);
console.log('Dream Category:', this.gameInstance.currentChallenge?.dreamCategory);
console.log('Base Power:', this.gameInstance.currentChallenge?.power);
console.log('Adjusted Power:', this.gameInstance.getDreamRequiredPower(this.gameInstance.currentChallenge));
```

### 実装箇所
- `Card.ts`: `dreamCategory`プロパティと`isDreamCard()`メソッド
- `CardFactory.ts`: 各チャレンジカードへのカテゴリー設定
- `Game.ts`: `getDreamRequiredPower()`メソッド
- `Game.ts`: `resolveChallenge()`でのadjusted power使用

## 注意事項
- 夢カードの判定は`dreamCategory`プロパティの有無で行われます
- 年齢調整は中年期・充実期のみで、青年期は調整されません
- UIでは調整後のパワーを表示する必要があります（未実装）

## 今後の拡張案
1. UIで年齢調整の可視化（例：「基本8 + 年齢3 = 11」）
2. 特定の保険が夢カードの調整を軽減する機能
3. 夢カードクリア時の特別な報酬