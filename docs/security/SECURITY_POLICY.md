# セキュリティポリシー

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 四半期更新

## 概要

insurance_gameプロジェクトの情報セキュリティ方針と実装要件を定義します。プレイヤーのプライバシー保護とシステムの安全性を確保します。

## 1. セキュリティ基本方針

### 1.1 セキュリティ原則

#### CIA Triad
- **機密性 (Confidentiality)**: 権限のない者による情報アクセスの防止
- **完全性 (Integrity)**: データの改ざん・破壊からの保護
- **可用性 (Availability)**: 正当なユーザーへの安定したサービス提供

#### ゼロトラスト原則
- すべての通信を暗号化
- すべての入力を検証
- すべての操作をログ記録
- 最小権限の原則を適用

### 1.2 セキュリティ目標

#### 短期目標（3ヶ月）
- [ ] セキュリティヘッダーの完全実装
- [ ] Content Security Policy (CSP) の最適化
- [ ] 自動セキュリティスキャンの導入
- [ ] 脆弱性対応手順の確立

#### 中期目標（6ヶ月）
- [ ] セキュリティ監査の実施
- [ ] インシデント対応訓練の実施
- [ ] セキュリティ教育プログラムの開始
- [ ] 第三者セキュリティ評価の実施

#### 長期目標（12ヶ月）
- [ ] セキュリティ認証の取得検討
- [ ] セキュリティガバナンス体制の確立
- [ ] 継続的セキュリティ監視システムの構築

## 2. 脅威モデル

### 2.1 想定される脅威

#### 外部脅威
- **悪意のあるユーザー**: 不正な操作やデータ改ざんの試行
- **ボット攻撃**: 自動化されたスパムやDDoS攻撃
- **スクリプトキディ**: 既知の脆弱性を悪用した攻撃
- **競合他社**: 営業秘密や技術情報の窃取

#### 内部脅威
- **開発者のミス**: セキュリティホールを含むコードの実装
- **設定ミス**: セキュリティ設定の不備
- **権限管理**: 過剰な権限付与による情報漏洩リスク

#### 技術的脅威
- **依存関係の脆弱性**: 利用ライブラリのセキュリティホール
- **サプライチェーン攻撃**: 開発ツールやCDNの侵害
- **エッジケース**: 想定外の入力による予期しない動作

### 2.2 リスク評価マトリクス

| 脅威 | 発生確率 | 影響度 | リスクレベル | 対策優先度 |
|------|----------|--------|--------------|------------|
| XSS攻撃 | 中 | 高 | 高 | 1 |
| CSRF攻撃 | 低 | 中 | 中 | 3 |
| データ漏洩 | 低 | 高 | 中 | 2 |
| DDoS攻撃 | 中 | 中 | 中 | 3 |
| 依存関係脆弱性 | 高 | 中 | 高 | 1 |

## 3. セキュリティ実装要件

### 3.1 フロントエンド セキュリティ

#### Content Security Policy (CSP)
```html
<!-- 推奨CSP設定 -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://www.google-analytics.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
">
```

#### セキュリティヘッダー
```html
<!-- セキュリティヘッダー実装 -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
```

#### 入力検証・サニタイゼーション
```typescript
// src/utils/security-validator.ts
export class SecurityValidator {
  // XSS防止のための入力サニタイゼーション
  static sanitizeHtml(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }
  
  // プレイヤー名のバリデーション
  static validatePlayerName(name: string): boolean {
    const pattern = /^[a-zA-Z0-9あ-んア-ヶー\s]{1,20}$/;
    return pattern.test(name) && name.trim().length > 0;
  }
  
  // ゲームデータの整合性チェック
  static validateGameData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // 必須フィールドの存在確認
    const requiredFields = ['gameId', 'playerId', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // データ型の検証
    if (typeof data.gameId !== 'string') return false;
    if (typeof data.playerId !== 'string') return false;
    if (typeof data.timestamp !== 'number') return false;
    
    // 範囲チェック
    if (data.timestamp < Date.now() - 24 * 60 * 60 * 1000) return false; // 24時間以内
    if (data.timestamp > Date.now() + 60 * 1000) return false; // 1分以内の未来
    
    return true;
  }
  
  // URL検証
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}
```

### 3.2 データ保護

#### ローカルデータの暗号化
```typescript
// src/utils/crypto-manager.ts
export class CryptoManager {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  
  // データの暗号化
  static async encryptData(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // パスワードからキーを導出
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt']
    );
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: iv },
      key,
      dataBuffer
    );
    
    // 結果を結合してBase64エンコード
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  // データの復号化
  static async decryptData(encryptedData: string, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Base64デコード
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
      );
      
      // ソルト、IV、暗号化データを分離
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);
      
      // キーの再導出
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ['decrypt']
      );
      
      // 復号化
      const decrypted = await window.crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encrypted
      );
      
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }
  
  // セキュアなランダム文字列生成
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    
    return Array.from(randomValues, byte => chars[byte % chars.length]).join('');
  }
}
```

### 3.3 通信セキュリティ

#### HTTPS強制とHSTS
```javascript
// src/utils/security-headers.ts
export class SecurityHeaders {
  static enforceHTTPS() {
    // HTTP接続時のHTTPS強制リダイレクト
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      location.replace(`https:${location.href.substring(location.protocol.length)}`);
    }
  }
  
  static setupHSTS() {
    // HSTS設定（開発環境では無効）
    if (location.protocol === 'https:' && location.hostname !== 'localhost') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Strict-Transport-Security';
      meta.content = 'max-age=31536000; includeSubDomains; preload';
      document.head.appendChild(meta);
    }
  }
  
  static setupCSP() {
    // CSPヘッダーの動的設定
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://www.google-analytics.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');
    
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);
  }
}
```

## 4. プライバシー保護

### 4.1 個人情報の取り扱い

#### データ最小化の原則
```typescript
// src/utils/privacy-manager.ts
export class PrivacyManager {
  // 収集する最小限のデータ
  static readonly MINIMAL_USER_DATA = {
    sessionId: '',     // セッション識別子
    preferences: {},   // ゲーム設定
    statistics: {}     // 匿名化された統計データ
  };
  
  // 個人識別情報の除去
  static anonymizeUserData(userData: any): any {
    const anonymized = { ...userData };
    
    // 個人識別可能な情報を削除
    delete anonymized.name;
    delete anonymized.email;
    delete anonymized.ip;
    delete anonymized.userAgent;
    
    // IDをハッシュ化
    if (anonymized.userId) {
      anonymized.userId = this.hashId(anonymized.userId);
    }
    
    return anonymized;
  }
  
  // セキュアなハッシュ化
  private static async hashId(id: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(id);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // データ保持期間管理
  static cleanupExpiredData() {
    const now = Date.now();
    const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30日
    
    // ローカルストレージのクリーンアップ
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('game_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.timestamp && (now - data.timestamp) > retentionPeriod) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // 無効なデータは削除
          localStorage.removeItem(key);
        }
      }
    });
  }
}
```

### 4.2 Cookie管理

#### セキュアなCookie設定
```typescript
// src/utils/cookie-manager.ts
export class CookieManager {
  // セキュアなCookie設定
  static setCookie(name: string, value: string, options: CookieOptions = {}) {
    const defaultOptions: CookieOptions = {
      secure: location.protocol === 'https:',
      httpOnly: false, // JavaScript からアクセス可能
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60, // 24時間
      path: '/'
    };
    
    const cookieOptions = { ...defaultOptions, ...options };
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (cookieOptions.maxAge) {
      cookieString += `; Max-Age=${cookieOptions.maxAge}`;
    }
    
    if (cookieOptions.path) {
      cookieString += `; Path=${cookieOptions.path}`;
    }
    
    if (cookieOptions.secure) {
      cookieString += '; Secure';
    }
    
    if (cookieOptions.sameSite) {
      cookieString += `; SameSite=${cookieOptions.sameSite}`;
    }
    
    document.cookie = cookieString;
  }
  
  static getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    }
    
    return null;
  }
  
  static deleteCookie(name: string, path: string = '/') {
    document.cookie = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
  }
  
  // GDPR準拠のCookie同意管理
  static manageCookieConsent() {
    const consent = this.getCookie('cookie_consent');
    
    if (!consent) {
      this.showCookieConsentBanner();
    }
    
    return consent === 'accepted';
  }
  
  private static showCookieConsentBanner() {
    // Cookie同意バナーの表示（実装は省略）
    console.log('Cookie consent banner should be shown');
  }
}

interface CookieOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  path?: string;
}
```

## 5. セキュリティ監視

### 5.1 セキュリティログ

#### セキュリティイベントの記録
```typescript
// src/utils/security-logger.ts
export class SecurityLogger {
  private static logs: SecurityLog[] = [];
  private static readonly MAX_LOGS = 1000;
  
  // セキュリティイベントの記録
  static logSecurityEvent(event: SecurityEvent) {
    const log: SecurityLog = {
      timestamp: Date.now(),
      type: event.type,
      severity: event.severity,
      description: event.description,
      details: event.details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    };
    
    this.logs.push(log);
    
    // ログ数制限
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
    
    // 重要なセキュリティイベントは即座に送信
    if (event.severity === 'critical' || event.severity === 'high') {
      this.sendSecurityAlert(log);
    }
    
    // ローカルストレージに保存
    this.persistLogs();
  }
  
  // XSS攻撃の検出
  static detectXSSAttempt(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi
    ];
    
    const detected = xssPatterns.some(pattern => pattern.test(input));
    
    if (detected) {
      this.logSecurityEvent({
        type: 'xss_attempt',
        severity: 'high',
        description: 'Potential XSS attack detected',
        details: { input: input.substring(0, 200) }
      });
    }
    
    return detected;
  }
  
  // 異常なアクセスパターンの検出
  static detectAnomalousAccess() {
    const accessHistory = this.getAccessHistory();
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5分間
    
    // 短時間での大量アクセス検出
    const recentAccess = accessHistory.filter(access => (now - access.timestamp) < timeWindow);
    
    if (recentAccess.length > 100) {
      this.logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        description: 'Unusual access pattern detected',
        details: { accessCount: recentAccess.length, timeWindow }
      });
    }
  }
  
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('security_session_id');
    
    if (!sessionId) {
      sessionId = CryptoManager.generateSecureToken(16);
      sessionStorage.setItem('security_session_id', sessionId);
    }
    
    return sessionId;
  }
  
  private static persistLogs() {
    try {
      const recentLogs = this.logs.slice(-100); // 直近100件のみ保存
      localStorage.setItem('security_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to persist security logs:', error);
    }
  }
  
  private static sendSecurityAlert(log: SecurityLog) {
    // セキュリティアラートの送信（実装は省略）
    console.warn('Security alert:', log);
  }
  
  private static getAccessHistory(): AccessRecord[] {
    const history = localStorage.getItem('access_history');
    return history ? JSON.parse(history) : [];
  }
}

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: any;
}

interface SecurityLog extends SecurityEvent {
  timestamp: number;
  userAgent: string;
  url: string;
  sessionId: string;
}

interface AccessRecord {
  timestamp: number;
  url: string;
  userAgent: string;
}
```

### 5.2 自動セキュリティスキャン

#### GitHub Actions セキュリティスキャン
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
  schedule:
    - cron: '0 2 * * *' # 毎日2:00に実行

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level high
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run CodeQL analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
      
      - name: Perform CodeQL analysis
        uses: github/codeql-action/analyze@v3
      
      - name: Run OWASP ZAP scan
        run: |
          docker run -v $(pwd):/zap/wrk/:rw \
            -t owasp/zap2docker-stable zap-baseline.py \
            -t https://shishihs.github.io/insurance_self_game/ \
            -J zap-report.json
      
      - name: Upload security scan results
        uses: actions/upload-artifact@v3
        with:
          name: security-scan-results
          path: |
            zap-report.json
            snyk-report.json
```

## 6. インシデント対応

### 6.1 セキュリティインシデント分類

#### 重要度レベル
- **Critical**: システム全体への影響、データ漏洩
- **High**: 重要機能への影響、セキュリティ侵害
- **Medium**: 部分的な機能不全、軽微な脆弱性
- **Low**: 軽微な問題、潜在的リスク

#### 対応時間目標
- **Critical**: 1時間以内に初動対応
- **High**: 4時間以内に初動対応
- **Medium**: 24時間以内に対応開始
- **Low**: 7日以内に対応計画策定

### 6.2 インシデント対応手順

#### 検出・報告フェーズ
1. **自動検出**: 監視システムによる異常検知
2. **手動報告**: ユーザーや開発者からの報告
3. **初期評価**: 影響範囲と重要度の判定
4. **エスカレーション**: 必要に応じて上位者への報告

#### 対応・復旧フェーズ
1. **封じ込め**: 被害拡大の防止
2. **根本原因調査**: 脆弱性の特定と分析
3. **修正実装**: セキュリティパッチの開発
4. **検証**: 修正の効果確認
5. **展開**: 本番環境への適用

#### 事後対応フェーズ
1. **事後分析**: インシデントの詳細分析
2. **再発防止策**: プロセス改善の検討
3. **文書化**: インシデントレポートの作成
4. **学習共有**: チーム内での知見共有

## 7. セキュリティ教育

### 7.1 開発者向けセキュリティ教育

#### 必須学習項目
- [ ] OWASP Top 10 の理解
- [ ] セキュアコーディング実践
- [ ] 脆弱性診断の基本
- [ ] インシデント対応手順

#### 定期トレーニング
- **月次**: セキュリティニュースの共有
- **四半期**: ハンズオンセキュリティ演習
- **年次**: 外部セキュリティ研修への参加

### 7.2 セキュリティ意識向上

#### セキュリティチェックリスト
```markdown
## 開発時セキュリティチェックリスト

### コーディング段階
- [ ] 入力値の検証を実装した
- [ ] 出力値のエスケープを実装した
- [ ] SQLインジェクション対策を実装した
- [ ] XSS対策を実装した
- [ ] CSRF対策を実装した

### テスト段階
- [ ] セキュリティテストを実行した
- [ ] 脆弱性スキャンを実行した
- [ ] ペネトレーションテストを実行した

### デプロイ段階
- [ ] セキュリティヘッダーを設定した
- [ ] HTTPS通信を強制した
- [ ] アクセス権限を適切に設定した
- [ ] 不要なサービスを無効化した
```

## 8. コンプライアンス

### 8.1 法的要件

#### データ保護法への対応
- **GDPR**: EU一般データ保護規則
- **個人情報保護法**: 日本の個人情報保護法
- **CCPA**: カリフォルニア州消費者プライバシー法

#### 実装要件
- データ処理の合法的根拠
- 明確なプライバシーポリシー
- データ主体の権利への対応
- データ侵害通知手順

### 8.2 業界標準

#### セキュリティフレームワーク
- **NIST Cybersecurity Framework**
- **ISO 27001/27002**
- **OWASP Application Security**

#### 実装ガイドライン
- リスクアセスメントの実施
- セキュリティポリシーの策定
- 継続的監視システムの構築
- 定期的な監査の実施

## 9. チェックリスト

### セキュリティ実装チェックリスト
- [ ] CSPヘッダーが適切に設定されている
- [ ] セキュリティヘッダーがすべて実装されている
- [ ] HTTPS通信が強制されている
- [ ] 入力検証が全ての箇所で実装されている
- [ ] 出力エスケープが適切に実装されている
- [ ] セキュリティログが記録されている

### プライバシー保護チェックリスト
- [ ] 個人情報の収集が最小限に抑えられている
- [ ] データの暗号化が実装されている
- [ ] Cookie使用の同意取得が実装されている
- [ ] データ保持期間が適切に管理されている
- [ ] データ主体の権利に対応できる

### コンプライアンスチェックリスト
- [ ] プライバシーポリシーが整備されている
- [ ] 利用規約が適切に作成されている
- [ ] データ処理記録が維持されている
- [ ] セキュリティ監査が定期実施されている
- [ ] インシデント対応手順が確立されている

## 関連ドキュメント

- [セキュリティガイドライン](../development/SECURITY_GUIDELINES.md)
- [プライバシーポリシー](./PRIVACY_POLICY.md)
- [インシデント対応手順](./INCIDENT_RESPONSE.md)
- [監視・アラート設定](../operations/MONITORING_ALERTING.md)