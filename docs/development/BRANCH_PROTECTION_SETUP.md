# ブランチ保護ルール設定ガイド

> **最終更新**: 2025/02/03  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

このドキュメントでは、GitHub リポジトリの master ブランチに対する保護ルールの設定方法と、その運用方針について説明します。

## 保護ルールの目的

1. **品質保証**: すべてのコードがレビューとテストを通過することを保証
2. **事故防止**: 誤った直接プッシュによるトラブルを防止
3. **履歴管理**: 変更履歴の明確化とトレーサビリティの確保
4. **自動化促進**: CI/CDパイプラインの活用を強制

## master ブランチ保護ルール

### 必須設定

```bash
# GitHub CLIを使用した設定コマンド
gh api repos/shishihs/insurance_self_game/branches/master/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ESLint Check","TypeScript Check","Build Check"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### 保護ルールの詳細

#### 1. Pull Request必須化
- **設定**: Require a pull request before merging
- **承認数**: 1人以上のレビュー承認が必要
- **古いレビューの無効化**: 新しいコミットがプッシュされた場合、既存の承認を無効化

#### 2. ステータスチェック
- **必須チェック**:
  - ✅ ESLint Check
  - ✅ TypeScript Check  
  - ✅ Build Check
- **オプションチェック** (失敗を許容):
  - Unit Tests (既存のテスト問題が解決されるまで)
  - Security Scan (情報提供目的)
  - Code Coverage (品質指標として)

#### 3. その他の制限
- **Force Push**: 禁止
- **Branch Deletion**: 禁止
- **管理者例外**: 無効（管理者も規則に従う）

## 段階的導入計画

### Phase 1: 基本保護（現在）
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ESLint Check", "TypeScript Check", "Build Check"]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  }
}
```

### Phase 2: テスト必須化（テスト環境修正後）
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ESLint Check",
      "TypeScript Check", 
      "Build Check",
      "Unit Tests"
    ]
  }
}
```

### Phase 3: 完全保護（将来）
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ESLint Check",
      "TypeScript Check",
      "Build Check", 
      "Unit Tests",
      "Security Scan",
      "Code Coverage"
    ]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 2
  }
}
```

## 例外処理とトラブルシューティング

### 緊急時の対応

緊急のホットフィックスが必要な場合:

1. **Issue作成**: 緊急対応であることを明記
2. **PRタイトル**: `[HOTFIX]` プレフィックスを使用
3. **レビュー**: 可能な限り迅速にレビュー
4. **事後対応**: 正式な修正PRを後日作成

### よくある問題と解決策

#### チェックが失敗する場合
```bash
# 個別のチェック実行
npm run lint        # ESLint
npm run type-check  # TypeScript
npm run build       # ビルド
npm run test:run    # テスト
```

#### 保護ルールの一時的な無効化
```bash
# 管理者権限で一時的に無効化（非推奨）
gh api repos/shishihs/insurance_self_game/branches/master/protection \
  --method DELETE
```

## モニタリングとメトリクス

### 追跡する指標
- PR承認までの平均時間
- チェック失敗率
- 緊急対応の頻度
- コードレビューの品質

### レポート生成
```bash
# PR統計の取得
gh pr list --state all --json number,title,createdAt,mergedAt,reviews \
  --jq 'map(select(.mergedAt != null)) | 
    { 
      total: length,
      avg_time_to_merge: (map(.mergedAt - .createdAt) | add / length / 3600000 | floor)
    }'
```

## 関連ドキュメント

- [PR Workflow Guide](./PR_WORKFLOW_GUIDE.md)
- [Issue Completion Guide](./ISSUE_COMPLETION_GUIDE.md)
- [Development Principles](./PRINCIPLES.md)