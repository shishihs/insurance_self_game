# GitHub Pages セットアップガイド

このプロジェクトは自動デプロイが設定されています。以下の手順でGitHub Pagesを有効にしてください。

## 1. GitHub リポジトリの設定

1. GitHubでリポジトリ `shishihs/insurance_self_game` を開く
2. **Settings** タブをクリック
3. 左サイドバーの **Pages** をクリック

## 2. GitHub Pages の設定

### Source
- **Source**: `GitHub Actions` を選択

### 確認事項
- リポジトリが **public** である必要があります
- プライベートリポジトリの場合は、GitHub ProまたはGitHub Teamが必要です

## 3. 初回デプロイ

1. 変更をコミットしてpush
```bash
git add .
git commit -m "feat: GitHub Actions deploy workflow"
git push origin master
```

2. GitHub の **Actions** タブで、ワークフローの実行状況を確認

3. デプロイが成功すると、以下のURLでアクセス可能になります：
   https://shishihs.github.io/insurance_self_game/

## トラブルシューティング

### ビルドエラーの場合
- Actionsタブでエラーログを確認
- ローカルで `npm run build` が成功することを確認

### ページが表示されない場合
- Settings > Pages で GitHub Actions が Source として選択されているか確認
- デプロイ完了まで数分かかる場合があります
- ブラウザのキャッシュをクリアしてみてください

### 権限エラーの場合
- Settings > Actions > General で以下を確認：
  - Workflow permissions: "Read and write permissions" を選択
  - "Allow GitHub Actions to create and approve pull requests" にチェック