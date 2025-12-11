# Deployment Guide

## GitHub Pagesへのデプロイ

プロジェクトは GitHub Pages にホストされます。
以下のコマンドでビルドからデプロイまでを自動実行できます。

```bash
npm run deploy
```

このコマンドは以下のステップを実行します：
1. `vue-tsc` で型チェックを実行
2. `vite build` でプロダクションビルドを実行（`dist` ディレクトリ生成）
3. `gh-pages` コマンドで `dist` ディレクトリの内容を `gh-pages` ブランチにプッシュ

## 設定

### vite.config.ts
GitHub Pages（サブディレクトリ `/insurance_self_game/` 上で動作）とローカルプレビュー（ルート `/` 上で動作）の両方に対応するため、`base` 設定は相対パス `./` を採用しています。

```typescript
export default defineConfig({
  base: './', // 相対パスに変更してローカル/GH Pages両対応
  // ...
})
```

### playwright.config.ts
CI環境（GitHub Actions等）とローカル環境で `baseURL` を切り替える設定になっていますが、基本的にはローカルプレビュー (`http://localhost:4173`) を参照するように設定されています。

## トラブルシューティング

### デプロイ後の404エラー
- `vite.config.ts` の `base` 設定が正しいか確認してください。絶対パス（例: `/repo-name/`）の場合、ローカルプレビューで問題が起きることがあります。
- GitHub Pagesの設定で、Sourceが `gh-pages` ブランチになっているか確認してください。

### 反映の遅延
- `npm run deploy` 完了後、GitHub Pagesへの反映には1〜5分程度の時間がかかる場合があります。
- ブラウザのキャッシュにより古いバージョンが表示され続けることがあります。シークレットウィンドウやキャッシュクリアを試してください。
