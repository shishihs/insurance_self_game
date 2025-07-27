# GitHub Pages 修正手順

> **最終更新**: 2025/01/27
> **文書種別**: 作業記録
> **更新頻度**: 一時文書

## 問題
GitHub Pages (https://shishihs.github.io/insurance_self_game/) がゲームアプリケーションではなくREADME.mdを表示している。

## 原因
GitHub Pagesの Source 設定が「Deploy from a branch」になっている可能性が高い。

## 解決手順

### 1. GitHub リポジトリの Settings にアクセス
1. https://github.com/shishihs/insurance_self_game にアクセス
2. 上部メニューの「Settings」をクリック

### 2. Pages 設定を確認・変更
1. 左側メニューの「Code and automation」セクションで「Pages」をクリック
2. 「Build and deployment」セクションの「Source」を確認

### 3. Source を "GitHub Actions" に変更
現在の設定が「Deploy from a branch」になっている場合：
1. 「Source」のドロップダウンメニューをクリック
2. **「GitHub Actions」** を選択
3. 変更は自動的に保存される

### 4. 再デプロイを実行
設定変更後、次のコミットで自動的に再デプロイされます。
手動で実行する場合：
1. リポジトリの「Actions」タブにアクセス
2. 「Deploy to GitHub Pages」ワークフローを選択
3. 「Run workflow」ボタンをクリック

### 5. デプロイ完了を確認
1. Actions タブでワークフローの実行が成功することを確認
2. https://shishihs.github.io/insurance_self_game/ にアクセス
3. ゲームアプリケーションが表示されることを確認

## 注意事項
- GitHub Actions の Source 設定を使用する場合、.github/workflows/deploy.yml が必要（既に存在）
- デプロイには数分かかる場合がある
- キャッシュの影響で古い内容が表示される場合は、ブラウザで強制リロード（Ctrl+Shift+R）を実行

## 追加の確認事項
- distフォルダに正しくビルドされたファイルが存在するか
- index.htmlが正しく生成されているか
- GitHub Actions のワークフローが成功しているか