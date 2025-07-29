# 📋 Deployment Guide

> **最終更新**: 2025/01/29  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

このドキュメントでは、insurance_gameプロジェクトの包括的なCI/CDパイプラインとデプロイメント戦略について説明します。

## 🎯 デプロイメントアーキテクチャ

### 1. マルチ環境構成

```
┌─ Development ─┐    ┌─ Staging ─┐    ┌─ Production ─┐
│   feature/*   │ → │   staging  │ → │    master     │
│   develop      │    │            │    │              │
└───────────────┘    └────────────┘    └──────────────┘
```

### 2. ワークフロー構成

| ワークフロー | 目的 | トリガー |
|------------|------|---------|
| `production-deploy.yml` | 本番デプロイ | master push |
| `multi-environment.yml` | 環境別デプロイ | branch push, PR |
| `quality-gates.yml` | 品質ゲート | push, PR, schedule |
| `performance-monitoring.yml` | パフォーマンス監視 | push, schedule |
| `rollback.yml` | ロールバック | manual dispatch |
| `blue-green-deploy.yml` | Blue-Green デプロイ | manual dispatch |

## 🚀 デプロイメント戦略

### 1. Standard Deployment (標準デプロイ)

**用途**: 通常の機能追加・バグ修正
**対象**: Production環境

```yaml
# 手動実行
gh workflow run production-deploy.yml
```

**フロー**:
1. 品質ゲート (テスト、型チェック、Lint、セキュリティ監査)
2. ビルド & 成果物作成
3. 段階的デプロイメント検証
4. 本番環境への配信

### 2. Multi-Environment Deployment

**用途**: 段階的な機能検証
**対象**: Development → Staging → Production

```yaml
# 環境指定実行
gh workflow run multi-environment.yml -f environment=staging
```

**特徴**:
- 環境ごとの異なる品質基準
- 自動的な環境間プロモーション
- PR環境でのプレビューデプロイ

### 3. Blue-Green Deployment

**用途**: ゼロダウンタイムデプロイ
**対象**: Production環境

```yaml
# Blue-Green デプロイ実行
gh workflow run blue-green-deploy.yml \
  -f deployment_strategy=blue-green \
  -f auto_promote=true
```

**フロー**:
1. Staging スロット (Blue/Green) へのデプロイ
2. ヘルスチェック & 性能検証
3. トラフィック切り替え判定
4. 本番トラフィック切り替え
5. 監視 & クリーンアップ

### 4. Emergency Rollback

**用途**: 緊急時の高速復旧
**対象**: Production環境

```yaml
# 緊急ロールバック
gh workflow run rollback.yml \
  -f rollback_type=emergency \
  -f reason="Critical production issue"
```

## 🛡️ 品質ゲート

### 1. セキュリティゲート

- **NPM Security Audit**: 高・重大脆弱性のチェック
- **License Compliance**: ライセンス競合の検出
- **Dependency Analysis**: 依存関係の脆弱性分析

### 2. パフォーマンスゲート

- **Bundle Size Analysis**: バンドルサイズリグレッション検出
- **Lighthouse Score**: パフォーマンススコア監視
- **Load Testing**: 負荷テスト統合

### 3. コード品質ゲート

- **Type Check**: TypeScript型チェック
- **Lint**: ESLint静的解析
- **Test Coverage**: 80%以上のカバレッジ必須
- **E2E Tests**: 重要機能の動作確認

## 📊 監視とアラート

### 1. デプロイメント監視

```javascript
// 監視メトリクス
const metrics = {
  deploymentFrequency: 'daily',
  leadTime: '< 30min',
  changeFailureRate: '< 5%',
  recoveryTime: '< 10min'
};
```

### 2. パフォーマンス監視

- **Response Time**: 3秒以下を維持
- **Bundle Size**: 10%以上の増加でアラート
- **Lighthouse Score**: 85点以下でアラート
- **Error Rate**: 1%以上でアラート

### 3. 通知設定

- **Slack通知**: デプロイ完了・失敗時
- **GitHub Issues**: ロールバック実行時
- **PR Comments**: パフォーマンス回帰検出時

## 🔧 使用方法

### 1. 開発者ワークフロー

```bash
# 1. 機能開発
git checkout -b feature/new-feature
# ... 開発作業 ...

# 2. PR作成（自動テスト実行）
git push origin feature/new-feature
# → multi-environment.yml が自動実行

# 3. マージ後（自動デプロイ）
# → production-deploy.yml が自動実行
```

### 2. 手動デプロイメント

```bash
# デプロイメントテスト実行
pnpm run deploy:test

# 特定環境へのデプロイ
gh workflow run multi-environment.yml -f environment=staging

# Blue-Greenデプロイ
gh workflow run blue-green-deploy.yml \
  -f deployment_strategy=blue-green

# 緊急ロールバック
gh workflow run rollback.yml \
  -f rollback_type=emergency \
  -f reason="Production incident"
```

### 3. トラブルシューティング

```bash
# ワークフロー実行状況確認
gh run list --workflow=production-deploy.yml

# 特定実行の詳細確認
gh run view [RUN_ID]

# ログ確認
gh run view [RUN_ID] --log

# 再実行
gh run rerun [RUN_ID]
```

## 📋 チェックリスト

### デプロイ前確認

- [ ] すべてのテストが通過している
- [ ] セキュリティスキャンが完了している
- [ ] パフォーマンス回帰がない
- [ ] ドキュメントが更新されている
- [ ] ロールバック手順が準備されている

### デプロイ後確認

- [ ] アプリケーションが正常に動作している
- [ ] ヘルスチェックが成功している
- [ ] パフォーマンスが期待通りである
- [ ] エラー率が正常範囲内である
- [ ] ユーザーからの問題報告がない

## 🚨 緊急時対応

### 1. 即座のロールバック

```bash
# 自動ロールバック（前回の安定版に戻す）
gh workflow run rollback.yml -f rollback_type=automatic

# 手動ロールバック（特定コミットに戻す）
gh workflow run rollback.yml \
  -f rollback_type=manual \
  -f target_commit=abc123
```

### 2. 緊急デプロイ

```bash
# テストスキップの緊急デプロイ
gh workflow run production-deploy.yml \
  -f skip_tests=true
```

### 3. インシデント対応

1. **即座の対応**: ロールバック実行
2. **影響調査**: ユーザー影響とエラー率確認
3. **原因究明**: ログ・メトリクス分析
4. **修正実装**: hotfixブランチでの修正
5. **再デプロイ**: 修正版のデプロイ
6. **事後分析**: ポストモーテム実施

## 📚 関連ドキュメント

- [CI/CD Setup Guide](../development/CI_CD_SETUP.md)
- [Monitoring Guide](../operations/MONITORING.md)
- [Incident Response](../operations/INCIDENT_RESPONSE.md)
- [Performance Optimization](../development/PERFORMANCE.md)

## 🔄 継続的改善

### メトリクス収集

- デプロイメント頻度
- リードタイム
- 変更失敗率
- 復旧時間

### 改善項目

- [ ] さらなる自動化の推進
- [ ] テスト実行時間の短縮
- [ ] デプロイメント時間の短縮
- [ ] 監視とアラートの強化