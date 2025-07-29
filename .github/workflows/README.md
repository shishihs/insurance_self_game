# GitHub Actions Workflows

このディレクトリには、insurance_gameプロジェクトの包括的なCI/CDパイプラインが含まれています。

## 📋 ワークフロー一覧

### 1. Production Deploy Pipeline (`production-deploy.yml`)
- **目的**: 本番環境への安全なデプロイメント
- **トリガー**: `master`ブランチへのプッシュ、手動実行
- **特徴**: 
  - 包括的な品質ゲート（テスト、型チェック、Lint、セキュリティ監査）
  - 段階的なデプロイメント検証
  - 緊急デプロイオプション（テストスキップ）

### 2. Multi-Environment Deploy (`multi-environment.yml`)
- **目的**: 複数環境への段階的デプロイメント
- **トリガー**: 各ブランチへのプッシュ、PR作成
- **特徴**:
  - Development/Staging/Production環境サポート
  - 環境別品質基準設定
  - PRプレビューデプロイメント

### 3. Quality Gates & Security (`quality-gates.yml`)
- **目的**: コード品質とセキュリティの自動検証
- **トリガー**: プッシュ、PR、定期実行
- **特徴**:
  - セキュリティ脆弱性スキャン
  - ライセンス競合チェック
  - コードカバレッジ監視
  - 依存関係分析

### 4. Performance Monitoring (`performance-monitoring.yml`)
- **目的**: パフォーマンス回帰検出と監視
- **トリガー**: プッシュ、PR、定期実行
- **特徴**:
  - バンドルサイズ分析
  - Lighthouseパフォーマンス監査
  - 負荷テスト統合
  - 回帰検出アラート

### 5. Rollback & Recovery (`rollback.yml`)
- **目的**: 緊急時のロールバック機能
- **トリガー**: 手動実行のみ
- **特徴**:
  - 自動/手動/緊急ロールバックオプション
  - システムバックアップ作成
  - ロールバック検証
  - インシデント追跡

### 6. Blue-Green Deployment (`blue-green-deploy.yml`)
- **目的**: ゼロダウンタイムデプロイメント
- **トリガー**: 手動実行のみ
- **特徴**:
  - Blue-Green/Canary/Rolling戦略
  - ヘルスチェック統合
  - 自動トラフィック切り替え
  - デプロイメント監視

### 7. Comprehensive Test Pipeline (`comprehensive-test-pipeline.yml`)
- **目的**: 包括的なテスト実行（既存）
- **トリガー**: プッシュ、PR、定期実行
- **特徴**:
  - 並列テスト実行
  - テスト結果集約
  - レポート生成

## 🚀 使用方法

### 自動実行（推奨）
```bash
# 通常の開発フロー
git push origin feature/new-feature  # → multi-environment.yml
git push origin master              # → production-deploy.yml
```

### 手動実行
```bash
# 特定環境へのデプロイ
gh workflow run multi-environment.yml -f environment=staging

# Blue-Greenデプロイ
gh workflow run blue-green-deploy.yml

# 緊急ロールバック
gh workflow run rollback.yml -f rollback_type=emergency
```

## 📊 監視とメトリクス

### 自動生成されるレポート
- デプロイメント成功率
- パフォーマンスメトリクス
- セキュリティスキャン結果
- テストカバレッジレポート

### アラート設定
- 高/重大セキュリティ脆弱性検出時
- パフォーマンス回帰検出時
- デプロイメント失敗時
- テストカバレッジ低下時

## 🛡️ セキュリティ

### 必要な権限
- `contents: write`
- `pages: write`
- `id-token: write`
- `deployments: write`
- `security-events: write`
- `pull-requests: write`

### シークレット（オプション）
- `SLACK_WEBHOOK_URL`: Slack通知用
- `CODECOV_TOKEN`: Codecov連携用

## 🔧 カスタマイズ

### 品質基準の調整
```yaml
# quality-gates.yml内
MIN_COVERAGE: 75  # カバレッジ最小値
BUNDLE_SIZE_THRESHOLD: 10  # バンドルサイズ増加許容値(%)
PERFORMANCE_THRESHOLD: 85  # Lighthouseスコア最小値
```

### 環境設定
```yaml
# multi-environment.yml内
environments:
  - development
  - staging
  - production
```

## 📚 関連ドキュメント

- [Deployment Guide](../../docs/deployment/DEPLOYMENT_GUIDE.md)
- [Development Principles](../../docs/development/PRINCIPLES.md)
- [Monitoring Setup](../../docs/operations/MONITORING.md)

## 🔄 継続的改善

### メトリクス
- デプロイメント頻度: 1日1回以上
- リードタイム: 30分以内
- 変更失敗率: 5%以下
- 復旧時間: 10分以内

### 今後の改善予定
- [ ] より高度な段階的デプロイメント
- [ ] 自動的なパフォーマンス最適化
- [ ] AI支援によるデプロイメント判定
- [ ] より詳細な監視とアラート