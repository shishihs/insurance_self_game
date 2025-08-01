# MEDIUM優先度: X-Frame-Options の誤った設定

> **最終更新**: 2025/01/31
> **文書種別**: 作業記録
> **更新頻度**: 一時文書

## 問題の概要
`X-Frame-Options` が `<meta>` タグで設定されているが、HTTPヘッダーでのみ有効。

## 症状
- ブラウザコンソールに警告メッセージ
- "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."

## 影響
- **セキュリティ**: iframe埋め込み制御が無効
- **互換性**: 古いブラウザでのクリックジャッキング対策が不完全
- **開発体験**: 警告による混乱

## 技術的背景
- X-Frame-OptionsはHTTPレスポンスヘッダーとしてのみ機能
- レガシーなセキュリティ機能（CSPのframe-ancestorsに置き換えられつつある）
- しかし、古いブラウザのサポートには依然として必要

## 修正案

### 1. HTMLから削除
```html
<!-- 削除すべき部分 -->
<meta http-equiv="X-Frame-Options" content="DENY">
```

### 2. JavaScriptでの代替実装
```javascript
// セキュリティ初期化時に実行
function preventClickjacking() {
  // iframe内での実行を検出
  if (window.self !== window.top) {
    // スタイルを隠す
    document.body.style.display = 'none';
    
    // 警告メッセージ表示
    console.error('This page cannot be displayed in an iframe');
    
    // 親フレームへのリダイレクト試行
    try {
      window.top.location = window.self.location;
    } catch (e) {
      // クロスオリジンの場合はエラーになる
      document.body.innerHTML = 'This content cannot be displayed in an iframe.';
    }
  }
}

// DOMContentLoadedより前に実行
preventClickjacking();
```

### 3. CSPとの統合
```typescript
// csp-manager.ts での実装
export class CSPManager {
  private initializeFrameProtection() {
    // JavaScript ベースの保護
    this.preventClickjacking();
    
    // CSP frame-ancestors も併用（サポートされている場合）
    // ※ただしmetaタグでは無効なので、JavaScriptでの対策がメイン
  }
}
```

## 実装の優先順位
1. 警告を解消するため、metaタグを削除
2. JavaScriptによる代替保護を実装
3. 将来のサーバー移行に備えた設計

## テスト方法
1. iframeでページを埋め込んでテスト
2. 異なるドメインからの埋め込みをテスト
3. 古いブラウザでの動作確認

## 参考ファイル
- `index.html`
- `src/utils/security/csp-manager.ts`
- `src/utils/security/security-init.ts`