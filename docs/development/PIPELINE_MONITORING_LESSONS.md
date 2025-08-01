# パイプライン監視の教訓と改善策

> **最終更新**: 2025/01/31
> **文書種別**: 正式仕様書
> **更新頻度**: 定期的

## 重要な教訓：スケジュール実行ワークフローの見落とし

### 発生した問題

2025年1月31日、以下の状況が発生：
- pushトリガーのワークフローは全て成功
- しかし、11時間前のスケジュール実行ワークフローが失敗していた
- この失敗を見逃し、「全てグリーン」と誤って報告

### 失敗したワークフロー

1. **Quality Gates & Security Pipeline**
   - トリガー: スケジュール実行
   - 結果: ❌ Failed
   - 失敗内容:
     - Security Audit ❌
     - Performance Gate ❌
     - Coverage Gate ❌

2. **Performance Monitoring & Regression Detection**
   - トリガー: スケジュール実行
   - 結果: ❌ Failed
   - 失敗内容:
     - Lighthouse Performance Audit ❌
     - Bundle Size: 16MB（異常）

## 根本原因

### 1. 確認範囲の限定
```yaml
# 見落としたワークフロー設定例
on:
  schedule:
    - cron: '0 */12 * * *'  # 12時間ごと
  workflow_dispatch:
```

### 2. トリガータイプの理解不足
- **push**: コミット時に実行
- **pull_request**: PR作成/更新時に実行
- **schedule**: 定期的に実行（cronジョブ）
- **workflow_dispatch**: 手動実行

### 3. バンドルサイズの異常
```
phaser-core-DawqAqIN.js: 1448 KB
Total Bundle Size: 16138.9 KB (16MB)
```
通常の10倍以上のサイズ → 重複インポートまたは最適化の失敗

## 改善策

### 1. 包括的な確認プロセス

```bash
# 全ワークフローの確認コマンド
gh workflow list --all

# 最近の実行を全て確認（トリガータイプ問わず）
gh run list --limit 20

# スケジュール実行のみを確認
gh run list --workflow "*.yml" --event schedule
```

### 2. 監視チェックリスト

#### デプロイ前確認事項
- [ ] pushトリガーワークフローの成功
- [ ] スケジュール実行ワークフローの最新状態
- [ ] 手動実行ワークフローの状態
- [ ] バンドルサイズの確認（2MB以下が目標）
- [ ] セキュリティ監査レポートの確認
- [ ] パフォーマンステストの結果確認

### 3. 自動化による改善

```yaml
# .github/workflows/comprehensive-check.yml
name: Comprehensive Pipeline Check

on:
  push:
    branches: [master]

jobs:
  check-all-workflows:
    runs-on: ubuntu-latest
    steps:
      - name: Check all workflow statuses
        run: |
          # 過去24時間の全ワークフロー実行を確認
          gh run list --limit 50 --json conclusion,name,createdAt \
            | jq '.[] | select(.createdAt > (now - 86400 | todate))'
```

### 4. バンドルサイズ監視

```javascript
// vite.config.ts に追加
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'phaser': ['phaser'],
        'vue': ['vue', 'vue-router'],
        'vendor': ['chart.js', 'vue-chartjs']
      }
    }
  },
  // バンドルサイズ警告
  chunkSizeWarningLimit: 500 // 500KB以上で警告
}
```

## 今後の対応

### 即時対応
1. スケジュール実行ワークフローの失敗原因調査
2. バンドルサイズの最適化
3. セキュリティ監査の問題解決

### 長期的改善
1. ワークフロー監視ダッシュボードの作成
2. Slackなどへの通知統合
3. 定期的なパフォーマンス基準の見直し

## 学んだこと

1. **「成功」の定義を明確に**
   - 最新のpush成功 ≠ 全体の健全性
   - 全てのトリガータイプを考慮する

2. **定期実行ジョブの重要性**
   - セキュリティ監査
   - パフォーマンス劣化の検出
   - 長期的な品質維持

3. **バンドルサイズは品質指標**
   - 16MBは明らかに異常
   - 定期的な監視が必要

## 結論

この失敗から、CI/CDパイプラインの「成功」は単一の視点では判断できないことを学びました。
包括的な監視と、全てのワークフロータイプへの理解が不可欠です。