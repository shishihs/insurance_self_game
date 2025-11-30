# MCP & SubAgent ガイドライン

## SubAgent の仲間たち
SubAgent に依頼した方が良さそうなことがあればどんどん依頼しましょう。

### ゲームロジックの実装
/agents use game-logic

### UIの実装
/agents use ui-designer

### データ管理
/agents use data-manager

### テスト作成
/agents use test-specialist

### パフォーマンス最適化
/agents use performance-optimizer

### 🚀 デプロイ実行
/agents use deploy-specialist

#### deploy-specialist 改良版指示書 v3.0

**重要**: 正確なデプロイ確認ができなかった教訓については[DEPLOYMENT_VERIFICATION_LESSONS.md](../development/DEPLOYMENT_VERIFICATION_LESSONS.md)を参照

**🚨 総合禁止事項**: 本番サイト https://shishihs.github.io/insurance_self_game/ には直接アクセスしないこと。エラーが発生している可能性があります。詳細は[PRODUCTION_SITE_VERIFICATION_FAILURE.md](../development/PRODUCTION_SITE_VERIFICATION_FAILURE.md)を参照。

```
【🔍 技術的制約と回避策】
1. WebFetchの制約
   - ❌ GitHub Actionsのアイコン（✅/❌）は取得できない
   - ✅ 代替策: ワークフローURLで"failed"や"success"のテキストを探す
   - ✅ 代替策: 実行時間が異常に短い場合は失敗の可能性

2. HTTPステータスコードの誤解
   - ❌ curlで200が返っても、古いデプロイ内容の可能性
   - ✅ 代替策: deploy-info.jsonを生成してコミットハッシュを確認

3. GitHub CLIが使えない
   - ❌ ghコマンドでAPIレベルの確認ができない
   - ✅ 代替策: 具体的なワークフローURLを直接確認

【デプロイ前必須確認事項】
1. ローカルでのテスト実行と成功確認
   - npm run test:run が全て成功すること（1つでも失敗したらデプロイ禁止）
   - npm run lint が成功すること（警告は許容）
   - npm run type-check が成功すること（エラーが1つでもあればデプロイ禁止）

2. ビルドの確認
   - npm run build が成功すること
   - distディレクトリが正しく生成されること

【デプロイ実行手順】
1. git status で変更内容を確認
2. 必要に応じてコミット（テスト成功後のみ）
3. git push でリモートにプッシュ
4. GitHub Actions の全ワークフローの状態を具体的に確認

【🔍 GitHub Actions確認手順（必須）】
1. https://github.com/shishihs/insurance_self_game/actions にアクセス
2. 各ワークフローのステータスを確認：
   - ✅ 緑色チェックマーク = 成功
   - ❌ 赤色Xマーク = 失敗
   - 🟡 黄色 = 実行中
   - ⏸️ グレー = キュー待機中

3. 失敗したワークフローがある場合：
   a. ワークフロー名をクリックして詳細ページへ
   b. 失敗したジョブをクリック
   c. 失敗したステップを特定
   d. エラーログをコピーして報告

4. 全ワークフローの状態を報告：
   ```
   ワークフロー状態：
   - Deploy to GitHub Pages: ✅ 成功
   - Comprehensive Test Pipeline: ❌ 失敗 (Unit Testsでエラー)
   - Production Deploy Pipeline: 🟡 実行中
   等
   ```

【📄 失敗ワークフローの詳細確認】
1. 失敗したワークフローのURLを取得
   例: https://github.com/shishihs/insurance_self_game/actions/runs/[RUN_ID]

2. 以下の情報を収集：
   - 失敗したジョブ名
   - 失敗したステップ名
   - エラーメッセージ（最初の10行と最後の10行）
   - exit code

3. エラーパターンの分類：
   - テスト失敗: 失敗したテスト名とエラー内容
   - ビルド失敗: コンパイルエラーの詳細
   - 依存関係エラー: npm installの失敗原因
   - 設定エラー: 環境変数や設定ファイルの問題

【📊 デプロイ完了の定義】
以下の全てが満たされた時のみ「デプロイ完了」と報告すること：

1. 必須ワークフローの成功：
   ✅ Deploy to GitHub Pages: 以下のいずれかで確認
      - WebFetchで"success"テキストを確認
      - ワークフローURLでエラーがないことを確認
      - 最新コミットのワークフローが実行完了
   ✅ 本番URLの検証:
      - https://shishihs.github.io/insurance_self_game/ が200を返す
      - 可能であればdeploy-info.jsonでコミットハッシュを確認

2. その他のワークフローの状態を明記：
   - 成功/失敗/実行中の状態を全て報告
   - 失敗がある場合は、その原因と影響を説明

3. 確認できない場合の報告:
   - 「確認できませんでした」と正直に報告
   - 推測ではなく、確認できた事実のみを報告

【🔧 失敗時の対応フロー】
1. 失敗ワークフローのログURLを取得
2. WebFetchで詳細ログを取得
3. エラー内容を分析し、修正方法を特定
4. ローカルで同じエラーを再現し、修正
5. 修正後、ローカルでテスト→ビルド→デプロイ

【🚨 重要な注意事項】
❌ 「実行された」だけで「成功」と判断しない
❌ ステータスアイコンを確認せずに推測しない
❌ 失敗ログを読まずに修正を試みない
❌ HTTP 200だけでデプロイ成功と判断しない
❌「errorsが見えない」だけで成功と判断しない
✅ 必ず具体的なエラー内容を含めて報告
✅ 不明な点はワークフローURLを提供して確認依頼
✅ 確認できない場合は「確認できません」と正直に報告

【📦 デプロイ検証のベストプラクティス】
1. ビルド時にバージョン情報を埋め込む
   ```javascript
   // vite.config.ts
   define: {
     '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
     '__COMMIT_HASH__': JSON.stringify(process.env.GITHUB_SHA || 'local')
   }
   ```

2. デプロイ確認用エンドポイントを設置
   ```json
   // public/deploy-info.json
   {
     "deployedAt": "2025-01-30T12:00:00Z",
     "commitHash": "abc123",
     "workflowRunId": "12345678"
   }
   ```

3. 「推測」ではなく「確実な証拠」に基づいた判断
```

## 🔗 MCP (Model Context Protocol) 統合

### 🌟 Serena MCP 最優先利用ルール
```
開発作業開始時の必須復唱:
「まずSerena MCPに相談して、最適なアプローチを決めよう」
```

#### Serena MCP をデフォルトで使う場面
- **コード実装開始前**: 既存コードの理解、ベストプラクティスの確認
- **問題解決時**: エラーやバグの原因調査、修正方法の検討
- **リファクタリング時**: コード品質向上のための分析と提案
- **新機能追加時**: アーキテクチャへの影響分析、実装戦略の立案
- **テスト作成時**: テストケースの網羅性確認、エッジケースの発見

**🚨 重要**: 推測で実装を始める前に、必ずSerena MCPに相談してプロジェクト全体の文脈を理解すること

### 🧠 Gemini MCP 必須利用ルール
```
不安になったとき・最新情報が必要なときの復唱:
「わからないことがあったら、まずGemini MCPに相談しよう」
```
- **技術的不安や疑問**: 実装方法に不安を感じたら即座にGemini MCPで相談
- **最新情報の取得**: WEB上の最新情報、フレームワークの仕様変更、ベストプラクティスの確認
- **実装順序の判断**: 複数のタスクがある時の優先度決定
- **技術選択の検証**: ライブラリ選択、アーキテクチャ決定時の情報収集
- **トラブルシューティング**: エラーや問題の解決方法の検索

### 利用可能なツール
**[🛠️ MCP セットアップガイド](../development/MCP_SETUP.md)** - **初回設定方法とトラブルシューティング**

- **Serena MCP**: 🌟 **最優先** - インテリジェントなコード支援とプロジェクト管理
- **Gemini MCP**: 最新情報取得、技術相談、実装判断支援
- **filesystem**: プロジェクトファイルの安全なアクセス
- **playwright**: デプロイ後のWebサイト動作確認・自動テスト
- **github**: GitHub Actions確認、Issues管理、PR操作

### GitHub MCP の活用例
```bash
# デプロイ状況の確認
GitHub Actions の最新実行結果を確認

# Issue 管理
新しいバグレポートや機能要望をIssueとして作成

# PR レビュー
Pull Request の作成・レビュー・マージ操作
```

### セキュリティ設定
- Personal Access Token は適切な権限のみ付与
- プロジェクトファイルのみアクセス許可
- `.env` ファイルや `node_modules` はアクセス禁止
