# Issues ディレクトリ

このディレクトリには、プロジェクトで発生した問題と解決策を記録しています。

## Issue 番号体系

- `001-006`: 初期の技術的問題（Playwrightテストで発見）
- `007-010`: CI/CDとパフォーマンス関連（2025年1月31日）
- `browser-console-errors-analysis.md`: コンソールエラーの包括的分析
- 優先度別ファイル: high/medium/low-priority-*.md

## 最近追加されたIssue（2025年1月31日）

### 🚨 Critical
- [#008: バンドルサイズの異常な増大（16MB）](008-bundle-size-explosion.md) - ✅ 解決済み
  - 86%のサイズ削減を達成（16MB→2.22MB）

### 🔴 High Priority
- [#007: スケジュール実行ワークフローの監視漏れ](007-scheduled-workflow-monitoring.md) - ✅ 解決済み
- [#010: GitHub Actionsワークフローのコマンドエラー](010-workflow-command-errors.md) - ✅ 解決済み

### 🟡 Medium Priority
- [#009: セキュリティシステムのパフォーマンス問題](009-security-system-performance.md) - ✅ 解決済み

## 以前のIssue（Playwrightテストで発見）

### 🔴 高優先度

#### [#001 CSPエラーと動的インポートの失敗](./001-csp-and-dynamic-import-errors.md)
- FeedbackButtonコンポーネントが読み込まれない
- Content Security Policyエラーが発生
- ユーザーフィードバック機能が使用不可

#### [#003 Long Task検出によるパフォーマンス問題](./003-long-task-performance.md)
- メインスレッドのブロッキング
- UIの応答性低下
- 複数のLong Task警告が発生

#### [#005 モバイル環境でのエラーハンドリング改善](./005-mobile-error-handling.md)
- エラーメッセージが不親切
- リカバリー方法が不明確
- モバイルUXの改善が必要

### 🟡 中優先度

#### [#002 ローディングインジケーターのタイミング問題](./002-loading-indicator-timing.md)
- ローディング表示が適切に表示されない
- ユーザーへのフィードバック不足

#### [#004 フォーカスインジケーター設定パネルの不適切な表示](./004-focus-indicator-visibility.md)
- ゲーム画面に設定パネルが常時表示
- ゲームプレイを妨げる可能性

## テスト成功項目 ✅
- ホーム画面の基本的な表示と機能
- レスポンシブデザイン（各解像度での表示）
- キーボードナビゲーション機能
- 基本的なゲーム起動フロー

## Issue作成ガイドライン

新しいIssueを作成する際は、以下のテンプレートを使用してください：

```markdown
# Issue #XXX: [簡潔なタイトル]

## 概要
[1-2文で問題を説明]

## 問題の詳細

### 発生日時
[YYYY年MM月DD日]

### 影響範囲
- [影響を受けるコンポーネント]
- [ユーザーへの影響]

### 根本原因
1. [原因1]
2. [原因2]

## 解決策

### 実装済み
[実装した解決策]

### 今後の改善案
[将来的な改善提案]

## 関連ファイル
- [ファイルへのリンク]

## ステータス
- [ ] 問題特定
- [ ] 原因分析
- [ ] 解決策実装
- [ ] 効果確認

## 優先度
[Critical/High/Medium/Low] - [理由]

## ラベル
- [関連するラベル]
```

## 優先度の定義

- **Critical**: 本番環境でサービスが利用できない、データ損失のリスク
- **High**: 主要機能の障害、パフォーマンスの深刻な低下
- **Medium**: 副次的機能の問題、回避策が存在
- **Low**: UIの小さな問題、将来的な改善項目

## 関連ドキュメント

- [開発原則](../docs/development/PRINCIPLES.md)
- [パイプライン監視の教訓](../docs/development/PIPELINE_MONITORING_LESSONS.md)
- [バンドル最適化レポート](../docs/development/BUNDLE_OPTIMIZATION_REPORT.md)

## テストコード
- [game-play-analysis.spec.ts](../tests/e2e/game-play-analysis.spec.ts)