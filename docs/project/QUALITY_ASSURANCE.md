# 品質保証とテスト戦略

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

insurance_gameプロジェクトの品質保証戦略とテスト方針を定義します。「テスト成功率100%の厳守」の原則に基づき、包括的な品質管理を実現します。

## 1. 品質保証の基本方針

### 品質の定義
- **機能性**: 設計通りに動作し、要件を満たす
- **信頼性**: 継続的に安定した動作を提供
- **使用性**: プレイヤーにとって直感的で楽しい
- **効率性**: 高速なレスポンスと適切なリソース使用
- **保守性**: 拡張・修正が容易
- **移植性**: 多様な環境で動作

### 品質管理原則
- **シフトレフト**: 開発初期段階での品質確保
- **継続的テスト**: CI/CDパイプラインでの自動テスト
- **リスクベース**: 重要度に応じたテスト配分
- **データ駆動**: メトリクスに基づく品質判断

## 2. テスト戦略

### 2.1 テストピラミッド

```
        /\
       /  \
      /E2E \     End-to-End Tests (10%)
     /_____\     - ユーザーシナリオ
    /       \    - ブラウザテスト
   /  統合   \   Integration Tests (20%)
  /__________\   - コンポーネント間連携
 /            \  - API統合
/   単体テスト   \ Unit Tests (70%)
/_______________\ - 関数・クラス単位
                  - ロジックの検証
```

#### 単体テスト (Unit Tests) - 70%
**目的**: 個別の関数・クラス・コンポーネントの動作検証

**対象**:
- ドメインロジック（ゲームルール、計算処理）
- ユーティリティ関数
- Vue.jsコンポーネント
- サービスクラス

**ツール**:
- **Vitest**: 高速なテストランナー
- **Vue Test Utils**: Vueコンポーネントテスト
- **@testing-library/vue**: ユーザー視点のテスト

**例**:
```typescript
// GameLogic.test.ts
describe('GameLogic', () => {
  it('should calculate insurance premium correctly', () => {
    const gameLogic = new GameLogic();
    const result = gameLogic.calculatePremium(1000, 0.05);
    expect(result).toBe(1050);
  });

  it('should handle invalid input gracefully', () => {
    const gameLogic = new GameLogic();
    expect(() => gameLogic.calculatePremium(-100, 0.05))
      .toThrow('Premium cannot be negative');
  });
});
```

#### 統合テスト (Integration Tests) - 20%
**目的**: コンポーネント間の連携と外部サービスとの統合検証

**対象**:
- コンポーネント間の通信
- ストアとコンポーネントの連携
- API呼び出しとレスポンス処理
- ルーティング

**例**:
```typescript
// GameIntegration.test.ts
describe('Game Integration', () => {
  it('should update game state when player makes move', async () => {
    const wrapper = mount(GameBoard, {
      global: {
        plugins: [createTestStore()]
      }
    });

    await wrapper.find('[data-testid="card-1"]').trigger('click');
    
    expect(wrapper.vm.$store.state.currentPlayer).toBe('player2');
    expect(wrapper.find('[data-testid="turn-indicator"]').text())
      .toBe('Player 2の番');
  });
});
```

#### E2Eテスト (End-to-End Tests) - 10%
**目的**: 実際のユーザーシナリオでの動作検証

**対象**:
- ゲーム開始から終了までの完全なフロー
- 異なるブラウザでの動作
- モバイル端末での操作
- パフォーマンス測定

**ツール**: Playwright

**例**:
```typescript
// game-flow.spec.ts
test('complete game flow', async ({ page }) => {
  await page.goto('/');
  
  // ゲーム開始
  await page.click('[data-testid="start-game"]');
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  
  // カードを選択してゲーム進行
  await page.click('[data-testid="card-1"]');
  await expect(page.locator('[data-testid="turn-indicator"]'))
    .toContainText('Player 2');
  
  // ゲーム終了まで進行
  // ...
  
  // 結果画面の確認
  await expect(page.locator('[data-testid="game-result"]')).toBeVisible();
});
```

### 2.2 テストの種類と実装

#### 機能テスト
- **正常系テスト**: 期待される動作の確認
- **異常系テスト**: エラー処理の確認
- **境界値テスト**: 限界値での動作確認
- **エッジケーステスト**: 特殊な条件での動作確認

#### 非機能テスト
- **パフォーマンステスト**: レスポンス時間、スループット
- **負荷テスト**: 高負荷時の安定性
- **セキュリティテスト**: 脆弱性の検証
- **アクセシビリティテスト**: 多様なユーザーへの対応

## 3. テスト実装ガイドライン

### 3.1 単体テストの書き方

#### AAA パターン
```typescript
test('should calculate total score correctly', () => {
  // Arrange (準備)
  const player = new Player('test-player');
  const cards = [
    new Card('insurance', 100),
    new Card('bonus', 50)
  ];

  // Act (実行)
  const totalScore = player.calculateTotalScore(cards);

  // Assert (検証)
  expect(totalScore).toBe(150);
});
```

#### テストの命名規則
- `should [期待される動作] when [条件]`
- 日本語での記述も可（プロジェクト内で統一）

#### モックとスタブの活用
```typescript
// 外部依存をモック化
vi.mock('../services/GameService', () => ({
  saveGameState: vi.fn(),
  loadGameState: vi.fn().mockResolvedValue(mockGameState)
}));
```

### 3.2 Vueコンポーネントのテスト

#### コンポーネントの基本テスト
```typescript
describe('GameCard', () => {
  it('should render card information correctly', () => {
    const card = { id: 1, name: 'Test Card', value: 100 };
    const wrapper = mount(GameCard, {
      props: { card }
    });

    expect(wrapper.find('[data-testid="card-name"]').text()).toBe('Test Card');
    expect(wrapper.find('[data-testid="card-value"]').text()).toBe('100');
  });

  it('should emit click event when clicked', async () => {
    const wrapper = mount(GameCard, {
      props: { card: mockCard }
    });

    await wrapper.trigger('click');
    
    expect(wrapper.emitted().click).toHaveLength(1);
    expect(wrapper.emitted().click[0]).toEqual([mockCard]);
  });
});
```

#### ストアとの連携テスト
```typescript
describe('GameBoard with Store', () => {
  it('should dispatch action when card is selected', async () => {
    const store = createTestStore();
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    
    const wrapper = mount(GameBoard, {
      global: { plugins: [store] }
    });

    await wrapper.find('[data-testid="card-1"]').trigger('click');
    
    expect(dispatchSpy).toHaveBeenCalledWith('selectCard', { cardId: 1 });
  });
});
```

### 3.3 E2Eテストの実装

#### Page Object Model
```typescript
// pages/GamePage.ts
export class GamePage {
  constructor(private page: Page) {}

  async startGame() {
    await this.page.click('[data-testid="start-game"]');
  }

  async selectCard(cardIndex: number) {
    await this.page.click(`[data-testid="card-${cardIndex}"]`);
  }

  async getCurrentPlayer() {
    return await this.page.textContent('[data-testid="current-player"]');
  }
}

// game-flow.spec.ts
test('game flow', async ({ page }) => {
  const gamePage = new GamePage(page);
  
  await gamePage.startGame();
  await gamePage.selectCard(1);
  
  expect(await gamePage.getCurrentPlayer()).toBe('Player 2');
});
```

## 4. 品質メトリクス

### 4.1 テストメトリクス

#### カバレッジ目標
- **Line Coverage**: 80%以上
- **Branch Coverage**: 75%以上
- **Function Coverage**: 90%以上
- **Statement Coverage**: 85%以上

#### テスト実行メトリクス
- **テスト成功率**: 100%（必須）
- **テスト実行時間**: 5分以内
- **フレイキーテスト率**: 1%以下

### 4.2 品質メトリクス

#### パフォーマンス指標
- **First Contentful Paint**: 1.5秒以内
- **Largest Contentful Paint**: 2.5秒以内
- **Cumulative Layout Shift**: 0.1以下
- **First Input Delay**: 100ms以内

#### エラー指標
- **JavaScript Error Rate**: 1%以下
- **HTTP Error Rate**: 2%以下
- **Crash Rate**: 0.1%以下

## 5. 継続的品質管理

### 5.1 CI/CDパイプライン

#### GitHub Actions ワークフロー
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run lint
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:run
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

### 5.2 品質ゲート

#### デプロイ前チェック
- [ ] すべてのテストが成功
- [ ] コードカバレッジが基準を満たす
- [ ] Lintエラーがゼロ
- [ ] 型チェックエラーがゼロ
- [ ] セキュリティスキャンをパス
- [ ] パフォーマンステストをパス

#### 品質ゲート違反時の対応
1. **自動ブロック**: デプロイを自動停止
2. **通知**: 関係者への即座の通知
3. **分析**: 原因の特定と影響範囲の確認
4. **修正**: 問題の解決
5. **再実行**: 品質チェックの再実行

## 6. テスト自動化

### 6.1 自動テスト実行

#### 開発時
```bash
# ファイル変更を監視してテスト実行
npm run test:watch

# 特定のファイルのテストを実行
npm run test:run src/domain/GameLogic.test.ts
```

#### CI/CD時
```bash
# 全テストスイートの実行
npm run test:ci

# カバレッジレポート生成
npm run test:coverage

# E2Eテスト実行
npm run test:e2e:ci
```

### 6.2 テストデータ管理

#### テストデータの種類
- **静的データ**: 固定のテストケース
- **動的データ**: ランダム生成データ
- **モックデータ**: 外部サービスの代替データ

#### テストデータベース
```typescript
// test-data/game-scenarios.ts
export const gameScenarios = {
  standardGame: {
    players: 2,
    cards: [...],
    expectedOutcome: 'player1-wins'
  },
  edgeCase: {
    players: 1,
    cards: [],
    expectedOutcome: 'no-game'
  }
};
```

## 7. 品質保証チェックリスト

### 開発者チェックリスト

#### 実装前
- [ ] 要件が明確に定義されている
- [ ] テスト可能な設計になっている
- [ ] テストケースを事前に検討した

#### 実装中
- [ ] TDDサイクルを実践している
- [ ] 適切なテストを書いている
- [ ] リファクタリング時にテストを実行している

#### 実装後
- [ ] すべてのテストが成功している
- [ ] カバレッジが基準を満たしている
- [ ] エッジケースのテストがある
- [ ] パフォーマンステストを実行した

### QAチェックリスト

#### 機能確認
- [ ] 要件通りに動作している
- [ ] エラーハンドリングが適切
- [ ] ユーザビリティが良い
- [ ] アクセシビリティに対応している

#### 非機能確認
- [ ] パフォーマンスが基準を満たす
- [ ] セキュリティに問題がない
- [ ] 多様な環境で動作する
- [ ] 負荷に耐えられる

## 8. 品質文化の醸成

### 品質マインドセット
- **品質は全員の責任**: 開発者だけでなくチーム全体で品質を作る
- **早期発見・早期修正**: 問題を早期に発見し素早く対処
- **継続的改善**: プロセスと品質を継続的に向上させる
- **データに基づく判断**: 感覚ではなくメトリクスで判断

### 学習と成長
- **技術共有**: テスト技術やベストプラクティスの共有
- **振り返り**: 品質問題の振り返りと改善策の検討
- **外部学習**: 業界のベストプラクティスの学習と適用

## 関連ドキュメント

- [テストガイドライン](../development/TEST_GUIDELINES.md)
- [開発プロセス](./DEVELOPMENT_PROCESS.md)
- [コードレビュー基準](./CODE_REVIEW_STANDARDS.md)
- [パフォーマンス監視](../operations/PERFORMANCE_MONITORING.md)