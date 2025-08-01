# MEDIUM優先度: CSP frame-ancestors ディレクティブの誤った設定

> **最終更新**: 2025/01/31
> **文書種別**: 作業記録
> **更新頻度**: 一時文書

## 問題の概要
`frame-ancestors` ディレクティブが `<meta>` タグで設定されているが、ブラウザの仕様上無効となっている。

## 症状
- ブラウザコンソールに警告メッセージが表示
- "The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element."

## 影響
- **セキュリティ**: クリックジャッキング攻撃への脆弱性
- **意図した動作**: iframeでの埋め込み制御が効かない
- **開発体験**: 警告メッセージによる混乱

## 技術的背景
`frame-ancestors` ディレクティブは以下の理由でHTTPヘッダーでのみ有効：
- ページのレンダリング前に評価される必要がある
- `<meta>` タグはHTMLパース後に処理される
- W3C仕様で明確に定義されている制限

## 修正案

### 1. HTMLから該当部分を削除
```html
<!-- 削除すべき部分 -->
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none';">
```

### 2. サーバー設定での実装（GitHub Pages向け）
GitHub Pagesでは直接HTTPヘッダーを設定できないため、以下の代替案を検討：

#### 代替案A: JavaScript によるフレーム検出
```javascript
// iframe埋め込みを検出してブロック
if (window.self !== window.top) {
  // iframeから抜け出す
  window.top.location = window.self.location;
}
```

#### 代替案B: .htaccessファイル（他のホスティングに移行時）
```apache
Header always set X-Frame-Options "DENY"
Header always set Content-Security-Policy "frame-ancestors 'none'"
```

### 3. 開発環境での対応
```typescript
// vite.config.ts
export default {
  server: {
    headers: {
      'Content-Security-Policy': "frame-ancestors 'none'"
    }
  }
}
```

## 実装手順
1. `index.html`から問題のmetaタグを削除
2. JavaScriptによるフレーム検出を実装
3. 将来的なサーバー移行に備えてドキュメント化

## 参考ファイル
- `index.html`
- `src/utils/security/csp-manager.ts`
- `vite.config.ts`