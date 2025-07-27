# 既知の問題と解決策

> **最終更新**: 2025/01/27  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## Claude Code関連

### .npmrcによるClaude Code起動問題
**問題**: `.npmrc`ファイルでPowerShellを指定すると、Claude Codeが起動しなくなる
**原因**: Claude CodeはBashを前提としており、PowerShellの指定と競合する
**解決策**: `.npmrc`ファイルを削除し、デフォルトのシェル設定を使用する
**対応日**: 2025/01/27

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