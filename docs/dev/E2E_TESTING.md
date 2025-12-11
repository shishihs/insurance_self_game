# E2E Testing Guide (Playwright)

## 概要
Playwrightを使用したEnd-to-Endテストのガイドラインです。
v2アップデートに伴い、テストのディレクトリ構成やセレクタ戦略が整理されました。

## 実行方法

### ローカルテスト (開発環境)
ローカルでビルド済みのプレビュー環境に対してテストを実行します。
`vite preview` サーバー (`http://localhost:4173`) が使用されます。

```bash
# 全テスト実行
npm run test:e2e

# 特定のファイルを指定
npx playwright test tests/e2e/game-loop-verification.spec.ts
```

`game-loop-verification.spec.ts` は、ゲームの主要なループ（スタート -> 夢選択 -> ドロー -> 試練選択 -> 解決）をカバーしています。

### 本番環境テスト (GitHub Pages)
デプロイ済みのGitHub Pagesに対してテストを実行します。

```bash
npx playwright test tests/e2e/github-pages-verification.spec.ts
```

このテストは、本番URLにアクセスし、アセットの読み込みや基本UIの表示を確認します。

### ゲームクリア検証 (実験的)
ゲーム開始から最終クリア画面までを検証する長時間実行テストです。
実行時間が長いため、デフォルトではスキップ (`.skip`) されています。
検証時はコード内の `.skip` を外して実行してください。

```bash
npx playwright test tests/e2e/game-clear-verification.spec.ts
```



## テスト作成のガイドライン

### セレクタの指定
コンポーネントにはテスト用の属性 `data-testid` を付与し、これを使用して要素を特定してください。
CSSクラスやテキストへの依存は最小限に留めてください。

**コンポーネント実装 (Vue):**
```html
<div data-testid="card" class="...">
  <!-- ... -->
</div>
```

**テストコード (TypeScript):**
```typescript
const card = page.locator('[data-testid="card"]').first();
await expect(card).toBeVisible();
```

### 待機処理 (Waits)
SPA (Single Page Application) のテストでは、タイミングの問題が発生しやすいため注意が必要です。

1.  **ページ遷移待ち**: `networkidle` は不安定な場合があるため、`domcontentloaded` または `commit` を使用し、その後に要素の `toBeVisible` で状態を確認することを推奨します。
2.  **アニメーション待ち**: `animate-fade-in` などのCSSアニメーションがある場合、要素がDOMに存在してもクリックできないことがあります。必要に応じて `await page.waitForTimeout(ms)` を使用するか、`click({ force: true })` を検討してください。

```typescript
// 推奨: 特定の要素が表示されるのを待つ
await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
```

### デバッグ
テストが失敗する場合、`console.log` を使用してブラウザ内の状態を出力することが有効です。

```typescript
test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
});
```
