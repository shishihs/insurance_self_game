# Issue #007: スケジュール実行ワークフローの監視漏れ

## 概要
pushトリガーのワークフローは全てグリーンだったが、スケジュール実行（cron）のワークフローの失敗を見逃していた。

## 問題の詳細

### 発生日時
2025年1月31日

### 影響範囲
- Quality Gates & Security Pipeline（スケジュール実行）
- Performance Monitoring & Regression Detection（スケジュール実行）

### 根本原因
1. ワークフロー確認時にトリガータイプを考慮していなかった
2. 最新のpushトリガー成功のみを確認し、全体の健全性と誤認
3. GitHub Actionsには複数のトリガータイプが存在することの認識不足

## 再現手順
1. `gh run list`で最新の実行のみ確認
2. pushトリガーのワークフローが成功していることを確認
3. 「全てグリーン」と判断（誤り）

## 期待される動作
全てのトリガータイプ（push、schedule、workflow_dispatch）のワークフローを確認し、包括的な健全性を判断する。

## 解決策

### 短期的対策
```bash
# 全ワークフローの確認コマンド
gh run list --limit 50

# スケジュール実行のみを確認
gh run list --workflow "*.yml" --event schedule
```

### 長期的対策
1. ワークフロー監視ダッシュボードの作成
2. 失敗時の自動通知（Slack/Email）
3. 定期的な品質レビュープロセス

## 関連ドキュメント
- [パイプライン監視の教訓](../docs/development/PIPELINE_MONITORING_LESSONS.md)
- [GitHub Actions ワークフロー](../.github/workflows/)

## ステータス
- [x] 問題特定
- [x] 原因分析
- [x] 解決策実装
- [x] 文書化完了

## 優先度
High - CI/CDの健全性に直結する重要な問題

## ラベル
- ci/cd
- monitoring
- process-improvement
- documentation