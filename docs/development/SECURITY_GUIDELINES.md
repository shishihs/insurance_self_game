# セキュリティ開発ガイドライン

> **最終更新**: 2025/01/31  
> **文書種別**: 正式仕様書  
> **更新頻度**: 月次更新

保険ゲームプロジェクトのセキュアな開発を実現するための包括的なガイドラインです。

## 🛡️ セキュリティファースト開発原則

### 1. **Zero Trust アーキテクチャ**
```
「すべてを疑い、すべてを検証する」
```
- すべての入力を検証する
- すべてのユーザーを認証する
- すべての通信を暗号化する
- すべての操作をログに記録する

### 2. **多層防御 (Defense in Depth)**
```
「単一の防御に依存しない」
```
- フロントエンド検証 + バックエンド検証
- 入力サニタイゼーション + 出力エスケープ
- HTTPS + CSP + セキュリティヘッダー
- 認証 + 認可 + セッション管理

### 3. **最小権限の原則**
```
「必要最小限のアクセス権のみ付与する」
```
- 必要な機能のみを実装
- 必要なデータのみを取得
- 必要な期間のみアクセス許可

## 🔒 TypeScript セキュリティベストプラクティス

### 厳格な型定義

```typescript
// ❌ 危険: any型の使用
function processUserInput(data: any): any {
  return data.toLowerCase()
}

// ✅ 安全: 明確な型定義
interface UserInput {
  readonly username: string
  readonly email: string
}

function processUserInput(data: UserInput): string {
  if (typeof data.username !== 'string' || data.username.length === 0) {
    throw new Error('Invalid username')
  }
  return sanitizeInput(data.username.toLowerCase())
}
```

### 入力検証の実装

```typescript
import { sanitizeInput, validateNumber } from '@/utils/security'

// ✅ 包括的な入力検証
function validateGameScore(input: unknown): number {
  // 1. 型チェック
  if (typeof input !== 'string' && typeof input !== 'number') {
    throw new SecurityError('Invalid input type for score')
  }
  
  // 2. 数値検証
  const score = validateNumber(input, 0, 1000000)
  if (score === null) {
    throw new SecurityError('Score must be a valid number between 0 and 1,000,000')
  }
  
  // 3. ビジネスロジック検証
  if (score > 100000) {
    // 異常に高いスコアをセキュリティログに記録
    SecurityAuditLogger.getInstance().logSecurityEvent(
      'suspicious_score',
      'medium',
      'score_validator',
      `Unusually high score submitted: ${score}`,
      { score, timestamp: new Date().toISOString() }
    )
  }
  
  return score
}
```

### セキュアなエラーハンドリング

```typescript
// ❌ 危険: 詳細なエラー情報の漏洩
function unsafeErrorHandling(error: Error): string {
  return `Database error: ${error.message} at ${error.stack}`
}

// ✅ 安全: ユーザーフレンドリーなエラー処理
function safeErrorHandling(error: Error): string {
  // セキュリティログに詳細を記録
  SecurityAuditLogger.getInstance().logSecurityEvent(
    'application_error',
    'low',
    'error_handler',
    error.message,
    { stack: error.stack, timestamp: new Date().toISOString() }
  )
  
  // ユーザーには一般的なメッセージのみ表示
  return 'An error occurred. Please try again later.'
}
```

## 🎯 Vue.js セキュリティベストプラクティス

### テンプレートのセキュリティ

```vue
<template>
  <!-- ❌ 危険: v-html の直接使用 -->
  <div v-html="userContent"></div>
  
  <!-- ✅ 安全: サニタイズ後の使用 -->
  <div v-html="sanitizedContent"></div>
  
  <!-- ✅ 最も安全: テキストコンテンツの使用 -->
  <div>{{ userContent }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XSSProtection } from '@/utils/xss-csrf-protection'

const userContent = ref('<script>alert("XSS")</script>Hello World')

// サニタイズされたコンテンツ
const sanitizedContent = computed(() => {
  return XSSProtection.getInstance().sanitizeHTML(userContent.value)
})
</script>
```

### セキュアなイベントハンドリング

```vue
<template>
  <!-- ❌ 危険: インラインイベントハンドラ -->
  <button @click="eval(userCode)">Execute</button>
  
  <!-- ✅ 安全: 定義済みメソッドの使用 -->
  <button @click="handleSecureClick">Execute</button>
</template>

<script setup lang="ts">
import { SecurityMonitor } from '@/utils/security-extensions'

const handleSecureClick = (): void => {
  // セキュリティチェック
  if (!SecurityMonitor.getInstance().checkRateLimit('button_click', 10, 60000)) {
    console.warn('Button click rate limit exceeded')
    return
  }
  
  // 安全な処理の実行
  executeSecureOperation()
}

const executeSecureOperation = (): void => {
  try {
    // 安全な操作
    console.log('Secure operation executed')
  } catch (error) {
    // エラーログ
    SecurityAuditLogger.getInstance().logSecurityEvent(
      'operation_error',
      'low',
      'secure_button',
      'Secure operation failed',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}
</script>
```

## 🔐 認証・認可パターン

### セキュアなセッション管理

```typescript
import { SecureSession } from '@/utils/security'

class GameSessionManager {
  private session = SecureSession.getInstance()
  
  async startGameSession(userId: string): Promise<void> {
    // セッション開始（30分間有効）
    this.session.startSession(30)
    
    // ユーザー情報の安全な保存
    await this.session.setSessionData('userId', userId, true) // 暗号化
    
    // セキュリティログ
    await SecurityAuditLogger.getInstance().logSecurityEvent(
      'session_start',
      'low',
      'session_manager',
      'Game session started',
      { userId, timestamp: new Date().toISOString() }
    )
  }
  
  async validateSession(): Promise<boolean> {
    // セッション有効性チェック
    const isValid = await this.session.isSessionValid()
    
    if (!isValid) {
      await SecurityAuditLogger.getInstance().logSecurityEvent(
        'invalid_session',
        'medium',
        'session_manager',
        'Invalid session detected',
        { timestamp: new Date().toISOString() }
      )
    }
    
    return isValid
  }
}
```

### CSRF保護の実装

```typescript
import { CSRFProtection } from '@/utils/xss-csrf-protection'

class SecureFormHandler {
  private csrfProtection = CSRFProtection.getInstance()
  
  generateSecureForm(action: string): string {
    const csrfToken = this.csrfProtection.generateTokenForAction(action)
    
    return `
      <form action="/api/${action}" method="POST">
        <input type="hidden" name="csrf_token" value="${csrfToken}">
        <!-- その他のフォームフィールド -->
      </form>
    `
  }
  
  async handleFormSubmission(action: string, token: string, data: Record<string, any>): Promise<boolean> {
    // CSRF トークン検証
    if (!this.csrfProtection.validateTokenForAction(action, token)) {
      await SecurityAuditLogger.getInstance().logSecurityEvent(
        'csrf_token_invalid',
        'high',
        'form_handler',
        'Invalid CSRF token detected',
        { action, timestamp: new Date().toISOString() }
      )
      return false
    }
    
    // フォームデータの処理
    return await this.processFormData(data)
  }
}
```

## 🚫 セキュリティアンチパターン（禁止事項）

### 1. **危険なコーディングパターン**

```typescript
// ❌ 絶対禁止
eval(userInput)                    // コード実行攻撃
new Function(userInput)            // 動的関数作成
innerHTML = userInput              // XSS攻撃
document.write(userInput)          // DOM操作攻撃
window[userInput]()               // プロパティアクセス攻撃

// ❌ 危険な正規表現
/(.+)+$/.test(userInput)          // ReDoS攻撃

// ❌ 機密情報のログ出力
console.log('Password:', password) // 情報漏洩
```

### 2. **セキュリティの誤実装**

```typescript
// ❌ クライアントサイドのみの検証
function validateOnClient(data: any): boolean {
  return data.length < 100 // バイパス可能
}

// ❌ 弱い暗号化
function weakEncryption(data: string): string {
  return btoa(data) // Base64は暗号化ではない
}

// ❌ 予測可能な乱数生成
function weakRandom(): string {
  return Math.random().toString() // 予測可能
}
```

## ✅ セキュリティ開発チェックリスト

### 📝 コード作成時
- [ ] すべての入力を検証・サニタイズした
- [ ] 出力を適切にエスケープした
- [ ] エラーハンドリングで機密情報を漏洩しない
- [ ] TypeScriptの厳格な型定義を使用した
- [ ] セキュリティライブラリを適切に使用した

### 🧪 テスト時
- [ ] セキュリティテストを作成した
- [ ] XSS攻撃に対するテストを実行した
- [ ] SQL/NoSQLインジェクションテストを実行した
- [ ] CSRF攻撃に対するテストを実行した
- [ ] 認証・認可のテストを実行した

### 🚀 デプロイ前
- [ ] セキュリティヘッダーを設定した
- [ ] HTTPS を強制した
- [ ] CSP を適切に設定した
- [ ] セキュリティ監査ログが動作している
- [ ] 脆弱性スキャンを実行した

## 🚨 インシデント対応フロー

### 1. **即座の対応（発見から15分以内）**
```bash
# セキュリティインシデント確認
npm run test:run src/__tests__/security

# セキュリティログの確認
node -e "
const { SecurityAuditLogger } = require('./src/utils/security-audit-logger');
SecurityAuditLogger.getInstance().generateAuditReport().then(console.log);
"
```

### 2. **詳細調査（30分以内）**
- 影響範囲の特定
- 攻撃ベクトルの分析
- セキュリティログの詳細確認
- 被害状況の評価

### 3. **緊急対応（1時間以内）**
- 攻撃の遮断
- 脆弱性の一時的修正
- ユーザー通知（必要に応じて）
- 当局への報告（法的要求がある場合）

### 4. **恒久対策（24時間以内）**
- 根本原因の修正
- セキュリティテストの追加
- 監視の強化
- 再発防止策の実装

## 📊 セキュリティメトリクス

### 測定指標
- **脆弱性発見率**: 月次スキャンでの発見数
- **修正時間**: 脆弱性発見から修正完了まで
- **セキュリティテストカバレッジ**: セキュリティテストの網羅率
- **インシデント対応時間**: 発見から対応完了まで

### 目標値
- 🎯 **高危険度脆弱性**: 24時間以内に修正
- 🎯 **中危険度脆弱性**: 1週間以内に修正  
- 🎯 **セキュリティテストカバレッジ**: 80%以上
- 🎯 **セキュリティスキャン**: 毎日実行

## 🔧 開発ツールとワークフロー

### 必須ツール
```bash
# ESLint セキュリティルール
npm run lint

# セキュリティテスト実行
npm run test:run src/__tests__/security

# 脆弱性スキャン
npm audit --audit-level moderate

# セキュリティヘッダーチェック
curl -I https://yoursite.com | grep -E "(X-|Content-Security)"
```

### VS Code拡張機能（推奨）
- **ESLint**: セキュリティルールの自動検出
- **SonarLint**: コード品質とセキュリティ問題の検出
- **GitLens**: コード変更履歴の追跡

## 📚 参考資料

### セキュリティ標準
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE (Common Weakness Enumeration)](https://cwe.mitre.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### TypeScript/Vue.js セキュリティ
- [Vue.js セキュリティガイド](https://vuejs.org/guide/best-practices/security.html)
- [TypeScript セキュリティベストプラクティス](https://snyk.io/blog/10-typescript-security-best-practices/)

### 継続的な学習
- 月次セキュリティ勉強会への参加
- セキュリティニュースレターの購読
- 脆弱性情報データベースの定期確認

---

## ⚠️ 重要な注意事項

1. **このガイドラインは生きた文書です** - 新しい脅威や技術に応じて定期的に更新してください
2. **セキュリティは継続的なプロセスです** - 一度設定すれば終わりではありません
3. **チーム全体での共有が重要です** - すべての開発者がこのガイドラインを理解し、実践してください
4. **疑問がある場合は相談してください** - セキュリティに関する判断に迷った場合は、必ずチームで議論してください

セキュリティは私たち全員の責任です。🛡️