# 貢献ガイドライン

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 四半期更新

## 🎮 一人でも多くの方と、最高のゲーム体験を

insurance_gameプロジェクトへのご参加を心より歓迎いたします！このゲームは「一人の時間を最高の冒険に」をビジョンに掲げ、プレイヤーファーストの精神で開発されています。

## 📋 目次

1. [貢献の種類](#貢献の種類)
2. [開発環境のセットアップ](#開発環境のセットアップ)
3. [コーディング規約](#コーディング規約)
4. [プルリクエストの流れ](#プルリクエストの流れ)
5. [Issue報告](#issue報告)
6. [コミュニケーション](#コミュニケーション)
7. [行動規範](#行動規範)

## 🤝 貢献の種類

### 🐛 バグ報告・修正
プレイヤーの快適な体験のために、バグの発見と修正は最重要課題です。

**歓迎する貢献**:
- ゲームの動作不良の報告
- UI/UXの問題の指摘
- パフォーマンス問題の特定
- アクセシビリティ問題の報告

### ✨ 新機能提案・実装
ゲームをより楽しくする新機能のアイデアをお待ちしています。

**歓迎する貢献**:
- 新しいゲームモードの提案
- UI/UXの改善案
- アニメーション効果の追加
- サウンド効果の実装

### 📚 ドキュメント改善
わかりやすいドキュメントは、より多くの人がゲームを楽しむために不可欠です。

**歓迎する貢献**:
- ゲームルールの説明改善
- 開発者向けドキュメントの充実
- 多言語対応
- チュートリアルの改善

### 🎨 デザイン・アート
視覚的な魅力はゲーム体験の重要な要素です。

**歓迎する貢献**:
- カードデザインの改善
- UIコンポーネントのデザイン
- アイコンやイラストの作成
- カラーパレットの提案

### 🧪 テスト・品質向上
品質の高いゲーム体験を提供するためのテスト強化です。

**歓迎する貢献**:
- 自動テストの追加
- エッジケースのテスト
- パフォーマンステスト
- セキュリティテスト

## 🛠 開発環境のセットアップ

### 前提条件
- **Node.js**: 18.0以上
- **npm**: 9.0以上
- **Git**: 最新版
- **モダンブラウザ**: Chrome, Firefox, Safari, Edge

### セットアップ手順

#### 1. リポジトリのフォーク・クローン
```bash
# フォークしたリポジトリをクローン
git clone https://github.com/YOUR_USERNAME/insurance_self_game.git
cd insurance_self_game

# 元のリポジトリをupstreamとして追加
git remote add upstream https://github.com/shishihs/insurance_self_game.git
```

#### 2. 依存関係のインストール
```bash
# 依存関係のインストール
npm install

# 開発環境の動作確認
npm run dev
```

#### 3. 開発サーバーの起動
```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173 にアクセス
```

#### 4. テスト実行
```bash
# 全テスト実行
npm run test:run

# テスト監視モード
npm run test:watch

# カバレッジ確認
npm run test:coverage
```

### 開発ツールの設定

#### VSCode推奨拡張機能
```json
{
  "recommendations": [
    "vue.volar",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

#### ESLintとPrettier設定
設定済みの`.eslintrc.cjs`と`.prettierrc`を使用してください。

```bash
# リント実行
npm run lint

# 自動修正
npm run lint:fix

# フォーマット実行
npm run format
```

## 📝 コーディング規約

### TypeScript/JavaScript規約

#### 基本原則
- **型安全性**: `any`型の使用は避け、適切な型定義を行う
- **可読性**: 分かりやすい変数名・関数名を使用
- **保守性**: DRY原則に従い、重複コードを避ける
- **テスト性**: テストしやすい構造で実装

#### 命名規約
```typescript
// ✅ 良い例
const gameState: GameState = getInitialGameState();
const isPlayerTurn = (playerId: string): boolean => { ... };
const INSURANCE_CARD_TYPES = ['fire', 'flood', 'earthquake'] as const;

// ❌ 悪い例
const gs: any = getGs();
const check = (id: any): any => { ... };
const types = ['fire', 'flood', 'earthquake'];
```

#### 関数の書き方
```typescript
// ✅ 純粋関数を優先
const calculatePremium = (basePremium: number, riskFactor: number): number => {
  return basePremium * riskFactor;
};

// ✅ 副作用のある関数は明確に
const updateGameState = (newState: Partial<GameState>): void => {
  // 状態更新処理
};

// ✅ エラーハンドリング
const makeMove = (move: GameMove): Result<GameState, Error> => {
  try {
    // 処理
    return Ok(newGameState);
  } catch (error) {
    return Err(new GameError('Invalid move'));
  }
};
```

### Vue.js規約

#### コンポーネント構造
```vue
<template>
  <!-- シンプルで読みやすいテンプレート -->
  <div class="game-board">
    <GameCard
      v-for="card in cards"
      :key="card.id"
      :card="card"
      @click="handleCardClick"
    />
  </div>
</template>

<script setup lang="ts">
// TypeScript Composition APIを使用
interface Props {
  cards: GameCard[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  cardSelected: [card: GameCard];
}>();

const handleCardClick = (card: GameCard) => {
  emit('cardSelected', card);
};
</script>

<style scoped>
/* スコープ付きスタイル */
.game-board {
  @apply grid grid-cols-4 gap-4 p-4;
}
</style>
```

#### コンポーネント命名
- **PascalCase**: コンポーネントファイル名とコンポーネント名
- **kebab-case**: テンプレート内での使用
- **2語以上**: 単語の衝突を避ける

```typescript
// ✅ 良い例
GameBoard.vue
GameCard.vue
PlayerStatus.vue

// ❌ 悪い例
Board.vue
Card.vue
Status.vue
```

### CSS/Tailwind規約

#### クラス名の順序
```html
<!-- レイアウト → サイズ → 外観 → インタラクション -->
<div class="flex items-center justify-center w-full h-screen bg-gray-100 hover:bg-gray-200 transition-colors">
```

#### カスタムスタイル
```css
/* コンポーネント固有のスタイルのみ */
.game-card {
  @apply relative overflow-hidden rounded-lg shadow-lg;
  
  /* カスタムプロパティを活用 */
  transition: transform var(--transition-duration, 0.2s);
}

.game-card:hover {
  @apply shadow-xl;
  transform: translateY(-2px);
}
```

### テストコード規約

#### テスト構造
```typescript
describe('GameLogic', () => {
  describe('calculateScore', () => {
    it('should return correct score for valid cards', () => {
      // Arrange
      const cards: GameCard[] = [
        { id: '1', type: 'insurance', value: 100 },
        { id: '2', type: 'bonus', value: 50 }
      ];

      // Act
      const score = calculateScore(cards);

      // Assert
      expect(score).toBe(150);
    });

    it('should throw error for invalid cards', () => {
      // Arrange
      const invalidCards: GameCard[] = [];

      // Act & Assert
      expect(() => calculateScore(invalidCards)).toThrow('No cards provided');
    });
  });
});
```

#### テスト命名
- **describe**: 機能やクラス名
- **it/test**: 「should [期待される動作] when [条件]」

## 🔄 プルリクエストの流れ

### 1. 作業開始前の準備

#### ブランチの同期
```bash
# 最新の変更を取得
git fetch upstream
git checkout master
git merge upstream/master

# 新しいブランチを作成
git checkout -b feature/new-game-mode
# または
git checkout -b fix/card-selection-bug
```

#### ブランチ命名規約
- **feature/**: 新機能追加
- **fix/**: バグ修正
- **docs/**: ドキュメント更新
- **refactor/**: リファクタリング
- **test/**: テスト追加・修正
- **chore/**: その他の作業

### 2. 開発・コミット

#### コミットメッセージ規約
```bash
# 形式: <type>: <subject>
git commit -m "feat: add new card shuffle animation"
git commit -m "fix: resolve card overlap issue on mobile"
git commit -m "docs: update game rules documentation"
```

#### コミットタイプ
- **feat**: 新機能
- **fix**: バグ修正
- **docs**: ドキュメント
- **style**: コードスタイル（機能変更なし）
- **refactor**: リファクタリング
- **test**: テスト関連
- **chore**: その他

#### 品質チェック
```bash
# プッシュ前の必須チェック
npm run lint        # リント実行
npm run type-check  # 型チェック
npm run test:run    # 全テスト実行
npm run build       # ビルド確認
```

### 3. プルリクエスト作成

#### PRテンプレート
```markdown
## 📋 変更概要
<!-- 何を変更したかを簡潔に説明 -->

## 🎯 変更の種類
- [ ] 🐛 バグ修正
- [ ] ✨ 新機能
- [ ] 📚 ドキュメント更新
- [ ] 🎨 スタイル・UI改善
- [ ] ♻️ リファクタリング
- [ ] 🧪 テスト追加・修正

## 🧪 テスト
<!-- テスト方法を説明 -->
- [ ] 既存テストが全て通る
- [ ] 新しいテストを追加した
- [ ] 手動でテストした

## 📱 動作確認
<!-- 動作確認した環境 -->
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] モバイル（Chrome）

## 📸 スクリーンショット
<!-- UIの変更がある場合はスクリーンショットを添付 -->

## 🔗 関連Issue
<!-- 関連するIssue番号 -->
Closes #123

## ✅ チェックリスト
- [ ] コードレビューガイドラインに従っている
- [ ] 適切なテストが追加されている
- [ ] ドキュメントが更新されている（必要に応じて）
- [ ] 破壊的変更がある場合は明記している
```

### 4. レビュープロセス

#### レビュー観点
- **機能性**: 仕様通りに動作するか
- **品質**: コードの可読性・保守性
- **性能**: パフォーマンスに問題がないか
- **セキュリティ**: セキュリティホールがないか
- **テスト**: 適切なテストがあるか

#### レビュー後の対応
```bash
# フィードバック対応後
git add .
git commit -m "review: address feedback on error handling"
git push origin feature/new-game-mode
```

## 🐛 Issue報告

### バグレポート

#### テンプレート
```markdown
---
name: 🐛 バグレポート
about: バグを報告してゲームを改善しましょう
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 バグの説明
バグの内容を明確に説明してください。

## 🔄 再現手順
1. '...'をクリック
2. '...'をスクロール
3. '...'を入力
4. エラーが発生

## 📋 期待される動作
何が起こるべきだったかを説明してください。

## 📸 スクリーンショット
可能であれば、問題を示すスクリーンショットを添付してください。

## 🖥 環境情報
- OS: [例: Windows 11]
- ブラウザ: [例: Chrome 120.0]
- デバイス: [例: Desktop, Mobile]
- 画面サイズ: [例: 1920x1080]

## 📝 追加情報
その他、問題解決に役立つ情報があれば記載してください。
```

### 機能提案

#### テンプレート
```markdown
---
name: ✨ 機能提案
about: 新しい機能のアイデアを提案しましょう
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 🎯 機能の概要
提案する機能について簡潔に説明してください。

## 🤔 問題・課題
この機能が解決する問題や改善する体験を説明してください。

## 💡 提案する解決策
どのような機能・変更で問題を解決できるかを説明してください。

## 🎮 ユーザー体験
この機能により、プレイヤーの体験がどう向上するかを説明してください。

## 📋 実装の詳細（任意）
技術的な実装アイデアがあれば記載してください。

## 🚀 優先度
- [ ] 低（あったら良い）
- [ ] 中（重要）
- [ ] 高（必須）

## 📸 モックアップ（任意）
UI/UXの変更がある場合は、ラフなスケッチやモックアップを添付してください。
```

### Issue分類・ラベル

#### 種類
- `bug`: バグ報告
- `enhancement`: 機能追加・改善
- `documentation`: ドキュメント関連
- `question`: 質問・相談
- `help wanted`: 支援募集

#### 優先度
- `priority: low`: 低優先度
- `priority: medium`: 中優先度
- `priority: high`: 高優先度
- `priority: critical`: 緊急

#### 難易度
- `good first issue`: 初心者歓迎
- `easy`: 簡単
- `medium`: 中程度
- `hard`: 難しい

## 💬 コミュニケーション

### コミュニケーションチャンネル

#### GitHub Discussions
- **一般的な議論**: アイデア交換、質問
- **機能提案**: 大きな機能の議論
- **フィードバック**: ゲーム体験に関する意見

#### GitHub Issues
- **バグ報告**: 具体的な問題の報告
- **機能要求**: 明確な機能追加の要求
- **作業管理**: 開発タスクの管理

### コミュニケーションガイドライン

#### 建設的な議論
- **具体的**: 抽象的でなく具体的な内容
- **建設的**: 批判ではなく改善提案
- **尊重**: 他者の意見を尊重
- **協力的**: みんなで良いゲームを作る

#### 質問の仕方
```markdown
## 質問のテンプレート

### 🤔 何を実現したいか
[目標を明確に記載]

### 💻 現在のコード
[関連するコードがあれば記載]

### 🚫 うまくいかないこと
[エラーメッセージや期待と異なる動作]

### 🔍 試したこと
[これまでに試した解決方法]

### 📋 環境情報
[OS、ブラウザ、Node.jsバージョンなど]
```

## 📜 行動規範

### 基本原則

#### 包容性と多様性
- 経験レベルに関係なく、すべての貢献者を歓迎
- 多様な背景・意見を尊重
- 学習意欲がある方をサポート

#### 協力と尊重
- 建設的なフィードバックを心がける
- 個人攻撃や侮辱的な言動を禁止
- 意見の相違は学習の機会として捉える

#### プロフェッショナリズム
- 責任を持って行動
- 約束したことは実行
- 困った時は早めに相談

### 禁止事項
- ハラスメント（性的、人種的、その他）
- 個人攻撃や侮辱
- スパムや宣伝
- 機密情報の漏洩
- 著作権侵害

### 報告・対応
問題行動を発見した場合は、GitHub Issues または直接連絡でご報告ください。

## 🎉 貢献の認識

### 貢献者一覧
すべての貢献者はREADME.mdの貢献者一覧に記載されます。

### 貢献の種類
- **コード**: 機能実装、バグ修正
- **ドキュメント**: 文書作成、翻訳
- **デザイン**: UI/UX設計、アート作成
- **テスト**: テストケース作成、品質向上
- **アイデア**: 機能提案、改善案
- **レビュー**: コードレビュー、フィードバック

### 特別な貢献
特に大きな貢献をされた方には：
- スペシャルサンクス記載
- 貢献者バッジ
- プロジェクトへの特別な権限

## 🔄 継続的改善

### このガイドの改善
このガイドライン自体も改善の対象です。

- 不明な点があれば質問を
- 改善提案があれば積極的に
- 実際の運用で問題があれば報告を

### プロジェクトの成長
みなさんの貢献により、このプロジェクトは成長します：

- **品質向上**: バグ修正、機能改善
- **機能拡充**: 新しいゲームモード、UI改善
- **ユーザー拡大**: ドキュメント改善、多言語対応
- **コミュニティ強化**: 議論活発化、知見共有

## 📞 サポート

### ヘルプが必要な時
- **GitHub Discussions**: 一般的な質問
- **GitHub Issues**: 具体的な問題
- **コードレビュー**: PRでの質問・相談

### 学習リソース
- [Vue.js公式ドキュメント](https://vuejs.org/)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/)
- [Vite公式ドキュメント](https://vitejs.dev/)
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/)

---

## 🙏 最後に

insurance_gameプロジェクトに関心を持っていただき、ありがとうございます。

このプロジェクトは「一人の時間を最高の冒険に」というビジョンのもと、プレイヤーに最高の体験を提供することを目指しています。

あなたの貢献が、世界中のプレイヤーの笑顔につながります。

一緒に素晴らしいゲームを作りましょう！

---

**質問・相談があれば、いつでもお気軽にお声がけください。**
**あなたの参加を心よりお待ちしています！** 🎮✨