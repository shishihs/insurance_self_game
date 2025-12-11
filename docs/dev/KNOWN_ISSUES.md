# 既知の問題と解決策

> **最終更新**: 2025/08/02  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## Claude Code関連

### .npmrcによるClaude Code起動問題
**問題**: `.npmrc`ファイルでPowerShellを指定すると、Claude Codeが起動しなくなる
**原因**: Claude CodeはBashを前提としており、PowerShellの指定と競合する
**解決策**: `.npmrc`ファイルを削除し、デフォルトのシェル設定を使用する
**対応日**: 2025/01/27

## セキュリティ関連

### XSS脆弱性（修正済み）
**問題**: innerHTML使用によるXSS攻撃リスクが5箇所で検出
**該当箇所**: 
- FeedbackNotificationSystem.ts (line 328)
- InteractionPerformanceMonitor.ts (line 401)
- KeyboardManager.ts (line 449)
- その他2箇所
**解決策**: DOM操作とサニタイゼーション関数の使用に変更
```typescript
// 危険: innerHTML使用
element.innerHTML = `<div>${userInput}</div>`

// 安全: DOM操作 + サニタイゼーション
const div = document.createElement('div')
div.textContent = sanitizeInput(userInput)
element.appendChild(div)
```
**対応日**: 2025/07/30
**セキュリティスコア**: 92/100 (A-)

### CSP設定の強化（修正済み）
**問題**: 'unsafe-inline', 'unsafe-eval' の使用によるスクリプトインジェクションリスク
**解決策**: 安全なCSP設定への変更
```html
<!-- 修正前 -->
script-src 'self' 'unsafe-inline' 'unsafe-eval'

<!-- 修正後 -->
script-src 'self'; base-uri 'self'; form-action 'self'
```
**対応日**: 2025/07/30

### セキュリティヘッダーの実装（追加済み）
**追加されたヘッダー**:
- Strict-Transport-Security: HTTPS強制
- Cross-Origin-Embedder-Policy: 分離環境構築
- Cross-Origin-Opener-Policy: ウィンドウ分離
**対応日**: 2025/07/30

## 品質・テスト関連

### EventEmitterメモリリーク警告（修正済み）
**問題**: `MaxListenersExceededWarning: 11 exit listeners added to [process]`
**原因**: 複数ファイルでprocess event listenersを追加
- demo-standalone.ts: 3 listeners
- AdvancedCLI.ts: 4 listeners
- cli.ts: 3 listeners
- GamePerformanceAnalyzer.ts: 複数のexit listeners
**解決策**: 
1. `process.setMaxListeners(20)` をテストセットアップに追加
2. ProcessEventCleanup ユーティリティの作成
3. テストでの包括的なクリーンアップシステム実装
**対応日**: 2025/07/31

### PhaserGameRenderer未解決Promise警告
**問題**: PhaserGameRendererで未解決Promise警告が発生
**状態**: 調査中
**影響**: 機能的には問題なし、ログのノイズのみ
**対応予定**: 2025/08/10

### E2Eテスト失敗項目
**問題**: 以下のE2Eテストが不安定
1. ゲーム開始: セレクタの重複により要素特定失敗
2. 保険カード選択: UI要素の競合状態
3. メモリリーク: 要素の不安定状態によるテストタイムアウト
4. タッチデバイス: hasTouch設定不備
**解決策**: セレクタの修正、UIの安定化、タッチイベント設定の改善
**状態**: 部分的に修正済み
**対応日**: 2025/07/31

## デプロイ・本番環境関連

### CSS読み込み問題
**問題**: 4スタイルシートのみ検出、カスタムスタイルが完全に適用されない
**影響**: 見た目は正常だが、自動検証で問題を検出
**状態**: 調査中（視覚的には問題なし）
**対応予定**: 2025/08/10

### CSP関連警告（軽微）
**問題**: 137件のCSP関連警告がコンソールに表示
**原因**: CSPがmetaタグで実装されているため、ブラウザが警告を出力
**影響**: 機能的には問題なし、セキュリティ機能は正常動作
**推奨**: HTTPヘッダーでのCSP実装（GitHub Pages制限により困難）
**対応予定**: GitHub Pages制限解除時

## コード品質関連

### God Classの問題
**問題**: GameScene.ts (5,439行) をはじめとする巨大ファイル
**影響**: 保守性の低下、テストの困難さ
**対象ファイル**:
- GameScene.ts: 5,439行（複雑度375）
- AdvancedCLI.ts: 1,139行（複雑度77）
- GameAnalytics.ts: 1,497行（複雑度84）
**解決策**: 機能別分割（UIManager、EventHandler、GameLogic等）
**優先度**: 高（長期計画）
**対応予定**: 2025年第3四半期

### パースエラー（Critical）
**問題**: src/game/commands/配下の3ファイルでパースエラー
**該当ファイル**:
- CommandHistory.ts (line 3:61)
- GameCommand.ts (line 1:50)
- UndoRedoManager.ts (line 1:50)
**原因**: 無効な文字（全角文字や特殊文字）
**影響**: デプロイブロック
**優先度**: Critical
**対応予定**: 即座修正必要

### 未使用変数によるビルド失敗
**問題**: 複数ファイルで未使用変数がlintエラーを発生
**該当箇所**:
- cui-playtest.mjs:322 - 'totalCards'
- TouchGestureManager.ts:219 - 'event'
- TouchGestureManager.ts:231 - 'fakeTouch'
**解決策**: 未使用変数に `_` プレフィックス追加または削除
**優先度**: Critical（ビルド失敗防止）
**対応予定**: 即座修正必要

## GitHub Actions関連

### メモリ不足エラー
**問題**: vue-tscおよびESLintがメモリ不足でクラッシュする
**原因**: デフォルトのNode.jsメモリ制限が不足
**解決策**: ワークフロー全体で`NODE_OPTIONS="--max-old-space-size=4096"`を設定
**対応日**: 2025/01/27

### GitHub Pages表示問題
**問題**: Vueアプリケーションの代わりにREADMEが表示される
**原因**: 
1. GitHub Pages設定が「Deploy from a branch」になっていた
2. ワークフローが古い`peaceiris/actions-gh-pages`を使用していた
**解決策**: 
1. GitHub Pages設定を「GitHub Actions」に変更
2. GitHub公式のデプロイアクションに移行
**対応日**: 2025/01/27

### ワークフロー並列実行での競合
**問題**: 複数のGitHub Actionsワークフローが同時実行され、リソース競合が発生
**原因**: Deploy、Test、Productionの各パイプラインが独立実行
**解決策**: ワークフロー依存関係の整理とsequential実行設定
**対応日**: 2025/07/30

## 🔧 トラブルシューティング手順

### セキュリティ問題の調査
1. セキュリティ監査レポートの確認
2. CSP違反ログの分析
3. 入力検証の実装確認
4. サニタイゼーション関数の動作確認

### テスト環境問題の調査
1. EventEmitter listener数の確認: `process.listenerCount('exit')`
2. メモリリーク検出: ProcessEventCleanup.checkListeners()
3. コンソールノイズの確認: VITEST_VERBOSE環境変数の使用
4. テストタイムアウト: 複雑な操作は10秒タイムアウト設定

### デプロイ問題の調査
1. GitHub Actionsワークフロー状態の確認
2. ビルドログでのパースエラー確認
3. CSPヘッダーの実装状況確認
4. 本番サイトでの動作確認

## 📊 問題の優先度マトリックス

### Critical（即座対応必要）
- パースエラー（デプロイブロック）
- 未使用変数（ビルド失敗）

### High（1週間以内）
- God Class分割（保守性）
- E2Eテスト安定化（品質保証）

### Medium（1ヶ月以内）
- Promise警告解決（ログクリーンアップ）
- CSS読み込み問題調査（デプロイ検証）

### Low（機会があるとき）
- CSP警告対応（GitHub Pages制限のため）
- パフォーマンス最適化（Bundle size等）