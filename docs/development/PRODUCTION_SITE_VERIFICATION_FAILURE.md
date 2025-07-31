# 本番サイト検証失敗の記録

> **最終更新**: 2025/01/30  
> **文書種別**: 問題記録  
> **更新頻度**: 問題発生時

## 🚨 問題の概要

本番サイト https://shishihs.github.io/insurance_self_game/ にアクセスした際にエラーが発生している状況について記録します。

## 📋 問題の詳細

### デプロイ検証の誤解
1. **HTTP 200の誤判断**
   - `curl`でHTTP 200が返るため「デプロイ成功」と判断
   - 実際は404ページや古いキャッシュの可能性
   - HTTPステータスコードだけでは実際の動作を保証できない

2. **GitHub Actionsの表面的確認**
   - ワークフローが「完了」していることを「成功」と誤認
   - 実際の成功/失敗ステータスを確認せずに報告
   - WebFetchの制約を理解せずに推測で判断

### 本番サイトで発生している可能性のあるエラー

#### 1. JavaScript/CSS読み込みエラー
```
404 Not Found: /insurance_self_game/js/index-[hash].js
404 Not Found: /insurance_self_game/css/index-[hash].css
```

#### 2. ベースパス設定ミス
```
vite.config.ts の base: '/insurance_self_game/' 設定が間違っている可能性
正しいリポジトリ名との不一致
```

#### 3. GitHub Pages設定問題
```
- Pages設定がgh-pagesブランチを参照していない
- カスタムドメイン設定の問題
- ビルド成果物の配置ミス
```

#### 4. アセットファイルの生成・配置問題
```
- distディレクトリの構造が正しくない
- index.htmlが正しく生成されていない
- manifest.jsonやfavicon.icoの配置ミス
```

## 🔍 検証すべき項目

### 1. 実際のサイトアクセス確認
- [ ] ブラウザで直接アクセスして画面を確認
- [ ] 開発者ツールでNetworkタブを確認
- [ ] Console画面でJavaScriptエラーを確認
- [ ] アセットファイルの読み込み状況を確認

### 2. GitHub Pages設定確認
- [ ] リポジトリ設定 > Pages > Source設定
- [ ] gh-pagesブランチの存在確認
- [ ] Actions secretsの設定確認
- [ ] デプロイ用トークンの有効性確認

### 3. ビルド成果物の確認
- [ ] `npm run build`の実行結果
- [ ] dist/index.htmlの内容確認
- [ ] dist/js/とdist/css/の存在確認
- [ ] ファイルパスの整合性確認

### 4. Vite設定の確認
- [ ] vite.config.tsのbase設定
- [ ] publicPathの設定
- [ ] assetsDir設定
- [ ] 本番ビルド用の環境変数

## 💡 修正アプローチ

### Phase 1: 現状把握
1. **実際の本番サイトの状態確認**
   ```bash
   # 実際のページコンテンツを確認
   curl -v https://shishihs.github.io/insurance_self_game/
   
   # JavaScriptファイルが存在するか確認
   curl -I https://shishihs.github.io/insurance_self_game/js/index-[latest-hash].js
   ```

2. **GitHub Pagesの設定確認**
   - Settings > Pages画面のスクリーンショット
   - 実際のデプロイ設定の確認

### Phase 2: 設定修正
1. **ベースパス設定の確認・修正**
   ```typescript
   // vite.config.ts
   base: '/insurance_self_game/' // リポジトリ名と一致しているか
   ```

2. **GitHub Actions ワークフローの修正**
   ```yaml
   # デプロイ後の実際の動作確認を追加
   - name: Verify deployment
     run: |
       sleep 30
       curl -f https://shishihs.github.io/insurance_self_game/ || exit 1
   ```

### Phase 3: 検証強化
1. **デプロイ確認用エンドポイントの実装**
   ```json
   // public/deploy-info.json
   {
     "deployedAt": "2025-01-30T12:00:00Z",
     "commitHash": "abc123",
     "buildVersion": "1.0.0"
   }
   ```

2. **ヘルスチェック機能の追加**
   ```javascript
   // src/utils/healthCheck.ts
   export const verifyDeployment = () => {
     // アセットファイルの存在確認
     // APIエンドポイントの疎通確認
     // 基本機能の動作確認
   }
   ```

## 🚫 禁止事項

### ❌ やってはいけないこと
1. **HTTP 200だけで成功判定しない**
   - 実際のページ内容を確認せずに判断
   - キャッシュされた古いコンテンツの可能性を無視

2. **GitHub Actionsの表面的確認で満足しない**
   - ワークフローが「完了」≠「成功」
   - ログの詳細を確認せずに推測で判断

3. **本番サイトの直接確認を怠らない**
   - 自動化ツールの報告だけを信用
   - 実際のユーザー体験を検証しない

### ✅ 必ず実行すること
1. **多角的な検証**
   - HTTPステータス + コンテンツ確認
   - GitHub Actions詳細ログ確認
   - 実際のブラウザでの動作確認

2. **エビデンスベースの判断**
   - スクリーンショットの取得
   - エラーログの保存
   - 再現手順の記録

3. **ユーザー視点での検証**
   - 実際にゲームが起動するか
   - 全ての機能が動作するか
   - パフォーマンスは許容範囲か

## 📊 今後の改善方針

1. **デプロイ検証の自動化**
   - E2Eテストの本番環境での実行
   - パフォーマンス測定の自動化
   - 機能テストの自動実行

2. **監視・アラート機能**
   - サイトダウン検知
   - エラー率の監視
   - パフォーマンス劣化の検知

3. **ロールバック機能**
   - 問題発生時の自動ロールバック
   - 安全なデプロイ手順の確立
   - カナリアデプロイの導入

---

**教訓**: 「動いているはず」ではなく「動いていることを確認した」と言えるまで検証を続ける