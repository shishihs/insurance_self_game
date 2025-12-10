---
description: タスク完了時のデプロイワークフロー (Test, Build, Push, Deploy)
---

タスクが完了し、成果物を反映させる際は以下の手順を必ず実行してください。

1. **テストの実行**
   回帰バグを防ぐため、テストスイートを実行します。
   ```bash
   npm run test:run
   ```

2. **ビルドの実行**
   本番用ビルドを作成し、型エラーやビルドエラーがないか確認します。
   ```bash
   npm run build
   ```

3. **Gitへのコミットとプッシュ**
   変更内容を保存します。コミットメッセージは変更内容を具体的に記述してください。
   ```bash
   git add .
   git commit -m "feat: バランス調整とUI刷新 (v0.2.8)" 
   # メッセージは適宜変更してください
   git push
   ```

4. **デプロイ**
   GitHub Pagesへデプロイします。
   ```bash
   npm run deploy
   ```

// turbo-all
