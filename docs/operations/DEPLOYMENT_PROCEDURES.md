# デプロイメント手順書

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

insurance_gameプロジェクトのデプロイメント手順と運用プロセスを定義します。「1 TODO = 1 Deploy」の原則に基づいた継続的デプロイメントを実現します。

## 1. デプロイメント戦略

### 基本方針
- **継続的デプロイメント**: 小さな変更を頻繁にリリース
- **自動化優先**: 手動作業を最小限に抑制
- **安全性重視**: 問題発生時の迅速なロールバック
- **透明性確保**: デプロイ状況の可視化

### デプロイメント環境
- **本番環境**: GitHub Pages (https://shishihs.github.io/insurance_self_game/)
- **ステージング環境**: 本番と同じ環境構成
- **開発環境**: ローカル開発サーバー

## 2. 自動デプロイメント

### 2.1 GitHub Actions による自動デプロイ

#### ワークフロー構成
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ master ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:run
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 品質ゲート
デプロイ前に以下のチェックが自動実行されます：

1. **テスト実行**: `npm run test:run`
2. **型チェック**: `npm run type-check`
3. **Lint実行**: `npm run lint`
4. **ビルド**: `npm run build`

いずれかが失敗した場合、デプロイは自動的に停止されます。

### 2.2 デプロイトリガー

#### 自動デプロイ
- **masterブランチへのプッシュ**: 即座にデプロイ開始
- **プルリクエストのマージ**: 自動的にmasterにプッシュされデプロイ

#### 手動デプロイ
- **GitHub Actions UI**: `workflow_dispatch`による手動実行
- **緊急時**: 直接的なワークフロー実行

## 3. デプロイメント検証

### 3.1 デプロイ状況の確認

#### GitHub Actions の確認手順
1. **GitHub リポジトリにアクセス**
   - https://github.com/shishihs/insurance_self_game

2. **Actions タブを選択**
   - 最新のワークフロー実行状況を確認

3. **ステータス確認**
   - ✅ 緑色: 成功
   - ❌ 赤色: 失敗
   - 🟡 黄色: 実行中
   - ⏸️ グレー: 待機中

#### ワークフロー詳細確認
```bash
# GitHub CLI を使用した確認（オプション）
gh workflow list
gh run list --workflow=deploy.yml
gh run view [RUN_ID]
```

### 3.2 本番環境の動作確認

#### 基本動作チェック
1. **サイトアクセス**
   - https://shishihs.github.io/insurance_self_game/ にアクセス
   - ページが正常に表示されることを確認

2. **基本機能確認**
   - ゲーム開始ボタンの動作
   - カード選択の動作
   - ゲーム進行の確認

3. **パフォーマンス確認**
   - 初期読み込み時間
   - 操作レスポンス
   - エラーの有無

#### 自動確認スクリプト
```bash
# デプロイ後の自動確認スクリプト
#!/bin/bash

SITE_URL="https://shishihs.github.io/insurance_self_game/"

echo "Checking site availability..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $SITE_URL)

if [ $HTTP_STATUS -eq 200 ]; then
    echo "✅ Site is accessible (HTTP $HTTP_STATUS)"
else
    echo "❌ Site is not accessible (HTTP $HTTP_STATUS)"
    exit 1
fi

echo "Checking for JavaScript errors..."
# Playwright や他のE2Eツールでの詳細チェック
npm run test:e2e:production
```

## 4. 手動デプロイメント

### 4.1 緊急時デプロイ

#### 前提条件
- masterブランチが最新の状態
- すべてのテストが成功
- 緊急修正の必要性が確認されている

#### 手順
1. **コードの準備**
   ```bash
   # 最新のmasterに切り替え
   git checkout master
   git pull origin master
   
   # 修正の実装
   # ... コード修正 ...
   
   # テスト実行
   npm run test:run
   npm run type-check
   npm run lint
   ```

2. **コミットとプッシュ**
   ```bash
   git add <modified-files>
   git commit -m "hotfix: 緊急修正の説明
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   
   git push origin master
   ```

3. **デプロイ確認**
   - GitHub Actions の実行状況を監視
   - 完了後に本番環境での動作確認

### 4.2 ロールバック手順

#### 自動ロールバック（推奨）
```bash
# 前のバージョンのタグに戻す
git checkout v1.0.0

# 一時的なブランチを作成
git checkout -b rollback-temp

# masterに強制プッシュ
git push origin rollback-temp:master --force
```

#### 手動ロールバック
1. **問題の特定**
   - 障害の範囲と影響度を確認
   - ロールバック対象のコミットを特定

2. **ロールバック実行**
   ```bash
   # 特定のコミットに戻す
   git revert [COMMIT_HASH]
   
   # または直前のコミットを取り消し
   git revert HEAD
   
   # プッシュして自動デプロイ
   git push origin master
   ```

3. **確認**
   - GitHub Actions の実行完了を確認
   - 本番環境での動作確認
   - 問題が解決されていることを確認

## 5. デプロイメント監視

### 5.1 リアルタイム監視

#### GitHub Actions 監視
- **実行状況**: ワークフローの成功・失敗状況
- **実行時間**: デプロイにかかる時間の監視
- **失敗原因**: エラーログの確認と分析

#### 本番環境監視
- **可用性監視**: サイトのアクセス可否
- **パフォーマンス監視**: レスポンス時間
- **エラー監視**: JavaScript エラーの発生状況

### 5.2 アラート設定

#### GitHub Actions アラート
- **失敗通知**: デプロイ失敗時の即座の通知
- **実行時間アラート**: 通常より長時間かかる場合の通知
- **依存関係アラート**: セキュリティ脆弱性の検出

#### 外部監視サービス（オプション）
```yaml
# 監視サービスの設定例
services:
  uptime_monitoring:
    - name: "Insurance Game Production"
      url: "https://shishihs.github.io/insurance_self_game/"
      check_interval: 5 # minutes
      alert_threshold: 3 # consecutive failures
      
  performance_monitoring:
    - core_web_vitals: true
    - response_time_threshold: 2000 # ms
    - error_rate_threshold: 1 # %
```

## 6. デプロイメント最適化

### 6.1 ビルド最適化

#### バンドル最適化
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'game-logic': ['./src/domain', './src/game'],
          'ui-components': ['./src/components']
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```

#### キャッシュ戦略
```javascript
// Service Worker設定
const CACHE_NAME = 'insurance-game-v1.0.0';
const urlsToCache = [
  '/',
  '/assets/index.js',
  '/assets/index.css',
  '/assets/images/'
];
```

### 6.2 デプロイ速度の向上

#### 並列処理の活用
```yaml
# GitHub Actions での並列実行
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests in parallel
        run: npm run test:run --parallel
  
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Run lint
        run: npm run lint
  
  build:
    needs: [test, lint]
    runs-on: ubuntu-latest
    steps:
      - name: Build application
        run: npm run build
```

#### 依存関係キャッシュ
```yaml
- name: Cache Node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

## 7. トラブルシューティング

### 7.1 よくある問題と解決方法

#### デプロイが失敗する
**症状**: GitHub Actions でデプロイが失敗する

**原因と対処法**:
1. **テスト失敗**
   ```bash
   # ローカルでテスト実行
   npm run test:run
   # 失敗したテストを修正
   ```

2. **ビルドエラー**
   ```bash
   # ローカルでビルド実行
   npm run build
   # TypeScript エラーや依存関係の問題を修正
   ```

3. **依存関係の問題**
   ```bash
   # node_modules を削除して再インストール
   rm -rf node_modules package-lock.json
   npm install
   ```

#### サイトが表示されない
**症状**: デプロイ成功後もサイトにアクセスできない

**対処法**:
1. **GitHub Pages 設定確認**
   - リポジトリ設定で Pages が有効になっているか確認
   - Source が GitHub Actions になっているか確認

2. **DNS キャッシュクリア**
   ```bash
   # ブラウザのキャッシュクリア
   # または別のブラウザで確認
   ```

3. **CDN キャッシュ待機**
   - 数分待ってから再度アクセス

#### パフォーマンスが悪い
**症状**: ページの読み込みが遅い

**対処法**:
1. **バンドルサイズ分析**
   ```bash
   npm run build -- --analyze
   ```

2. **不要な依存関係の削除**
   ```bash
   npm audit
   npm prune
   ```

### 7.2 緊急時対応手順

#### 重大な障害発生時
1. **即座の対応**
   - 障害の範囲と影響を確認
   - 必要に応じて即座にロールバック

2. **原因調査**
   - GitHub Actions のログ確認
   - ブラウザの開発者ツールでエラー確認
   - 外部サービスの状況確認

3. **修正と検証**
   - 問題の修正
   - ローカル環境での十分なテスト
   - ステージング環境での確認（可能であれば）

4. **再デプロイ**
   - 修正をmasterにプッシュ
   - GitHub Actions の実行確認
   - 本番環境での動作確認

## 8. チェックリスト

### デプロイ前チェックリスト
- [ ] すべてのテストが成功している
- [ ] 型チェックエラーがない
- [ ] Lintエラーがない
- [ ] ローカルでビルドが成功する
- [ ] 新機能の動作確認が完了
- [ ] CHANGELOG.md が更新されている

### デプロイ後チェックリスト
- [ ] GitHub Actions が成功している
- [ ] 本番サイトにアクセスできる
- [ ] 基本機能が正常に動作する
- [ ] JavaScript エラーが発生していない
- [ ] パフォーマンスに問題がない
- [ ] モバイル端末での動作確認（可能であれば）

### 緊急時対応チェックリスト
- [ ] 問題の影響範囲を特定した
- [ ] ロールバックの必要性を判断した
- [ ] 関係者に状況を報告した
- [ ] 修正計画を立てた
- [ ] 再発防止策を検討した

## 関連ドキュメント

- [監視・アラート設定](./MONITORING_ALERTING.md)
- [バックアップ・リカバリ手順](./BACKUP_RECOVERY.md)
- [パフォーマンス監視](./PERFORMANCE_MONITORING.md)
- [リリース管理戦略](../project/RELEASE_MANAGEMENT.md)