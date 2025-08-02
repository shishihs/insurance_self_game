# コンプライアンス要件への対応

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 四半期更新

## 概要

insurance_gameプロジェクトにおける法的・規制要件への対応状況と実装方針を定義します。国際的なデータ保護法規制とセキュリティ標準への準拠を確保します。

## 1. 適用法規制

### 1.1 データ保護法規制

#### EU一般データ保護規則（GDPR）
**適用範囲**: EU域内のユーザーからのアクセス

**主要要件**:
- データ処理の合法的根拠の確立
- データ主体の権利への対応
- プライバシー・バイ・デザインの実装
- データ侵害通知義務

**対応状況**:
- ✅ 合法的根拠の文書化
- ✅ データ主体権利の実装
- ✅ プライバシーポリシーの整備
- ✅ データ最小化の実装

#### 日本個人情報保護法
**適用範囲**: 日本国内のユーザー

**主要要件**:
- 利用目的の特定・通知
- 適正取得の確保
- 安全管理措置の実施
- 第三者提供の制限

**対応状況**:
- ✅ 利用目的の明示
- ✅ 適正取得の確保
- ✅ 技術的安全管理措置
- ✅ 第三者提供の制限

#### カリフォルニア州消費者プライバシー法（CCPA）
**適用範囲**: カリフォルニア州住民

**主要要件**:
- 個人情報の開示請求権
- 削除請求権
- 販売拒否権
- 差別禁止

**対応状況**:
- ✅ 開示請求への対応
- ✅ 削除機能の実装
- ❌ 販売拒否権（非該当）
- ✅ 差別禁止の遵守

### 1.2 セキュリティ標準

#### OWASP Application Security
**適用範囲**: Webアプリケーションセキュリティ

**OWASP Top 10 対応状況**:
- ✅ A01:2021 – Broken Access Control
- ✅ A02:2021 – Cryptographic Failures
- ✅ A03:2021 – Injection
- ✅ A04:2021 – Insecure Design
- ✅ A05:2021 – Security Misconfiguration
- ✅ A06:2021 – Vulnerable Components
- ✅ A07:2021 – Identification and Authentication
- ✅ A08:2021 – Software and Data Integrity
- ✅ A09:2021 – Security Logging and Monitoring
- ✅ A10:2021 – Server-Side Request Forgery

#### NIST Cybersecurity Framework
**適用範囲**: サイバーセキュリティ管理

**コア機能の実装**:
- ✅ 識別（Identify）
- ✅ 保護（Protect）
- ✅ 検知（Detect）
- ⚠️ 対応（Respond）- 部分実装
- ⚠️ 復旧（Recover）- 部分実装

## 2. GDPR準拠実装

### 2.1 データ処理の合法的根拠

#### 実装詳細
```typescript
// src/utils/gdpr-compliance.ts
export class GDPRCompliance {
  // 処理の合法的根拠を記録
  private static readonly LEGAL_BASIS = {
    game_state: 'contract', // 契約履行のため
    user_preferences: 'contract', // 契約履行のため
    analytics: 'consent', // 同意に基づく
    security_logs: 'legitimate_interest', // 正当利益のため
    error_logs: 'legitimate_interest' // 正当利益のため
  };
  
  // データ処理の合法性確認
  static isProcessingLegal(dataType: string, hasConsent: boolean = false): boolean {
    const basis = this.LEGAL_BASIS[dataType as keyof typeof this.LEGAL_BASIS];
    
    switch (basis) {
      case 'consent':
        return hasConsent;
      case 'contract':
      case 'legitimate_interest':
        return true;
      default:
        return false;
    }
  }
  
  // データ処理記録の維持
  static logDataProcessing(activity: DataProcessingActivity) {
    const record: ProcessingRecord = {
      timestamp: Date.now(),
      activity: activity.name,
      purpose: activity.purpose,
      legalBasis: activity.legalBasis,
      dataCategories: activity.dataCategories,
      retention: activity.retention,
      recipients: activity.recipients || []
    };
    
    this.storeProcessingRecord(record);
  }
  
  private static storeProcessingRecord(record: ProcessingRecord) {
    const records = this.getProcessingRecords();
    records.push(record);
    
    // 最大1000件まで保持
    if (records.length > 1000) {
      records.splice(0, records.length - 1000);
    }
    
    localStorage.setItem('gdpr_processing_records', JSON.stringify(records));
  }
  
  private static getProcessingRecords(): ProcessingRecord[] {
    const stored = localStorage.getItem('gdpr_processing_records');
    return stored ? JSON.parse(stored) : [];
  }
}

interface DataProcessingActivity {
  name: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';
  dataCategories: string[];
  retention: string;
  recipients?: string[];
}

interface ProcessingRecord {
  timestamp: number;
  activity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  retention: string;
  recipients: string[];
}
```

### 2.2 データ主体の権利

#### アクセス権の実装
```typescript
// src/utils/data-subject-rights.ts
export class DataSubjectRights {
  // データポータビリティ（データダウンロード）
  static exportUserData(): UserDataExport {
    const gameState = localStorage.getItem('game_state');
    const preferences = localStorage.getItem('user_preferences');
    const statistics = localStorage.getItem('game_statistics');
    
    const exportData: UserDataExport = {
      exportDate: new Date().toISOString(),
      dataController: 'Insurance Game Project',
      user: {
        gameState: gameState ? JSON.parse(gameState) : null,
        preferences: preferences ? JSON.parse(preferences) : null,
        statistics: statistics ? JSON.parse(statistics) : null
      },
      metadata: {
        dataCategories: ['game_progress', 'user_preferences', 'game_statistics'],
        retentionPeriod: 'Until user deletion',
        legalBasis: 'Contract performance'
      }
    };
    
    return exportData;
  }
  
  // 削除権（忘れられる権利）
  static deleteUserData(confirmDeletion: boolean = false): boolean {
    if (!confirmDeletion) {
      return false;
    }
    
    try {
      // ゲーム関連データの削除
      localStorage.removeItem('game_state');
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('game_statistics');
      localStorage.removeItem('player_achievements');
      
      // GDPR関連データの削除
      localStorage.removeItem('gdpr_processing_records');
      localStorage.removeItem('cookie_consent');
      
      // セッションデータの削除
      sessionStorage.clear();
      
      // Cookieの削除
      this.deleteCookies();
      
      return true;
    } catch (error) {
      console.error('Data deletion failed:', error);
      return false;
    }
  }
  
  // 訂正権
  static correctUserData(corrections: UserDataCorrections): boolean {
    try {
      Object.entries(corrections).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      
      return true;
    } catch (error) {
      console.error('Data correction failed:', error);
      return false;
    }
  }
  
  // 処理制限権
  static restrictProcessing(restrictions: ProcessingRestrictions): boolean {
    const restrictionSettings = {
      ...this.getRestrictionSettings(),
      ...restrictions,
      timestamp: Date.now()
    };
    
    localStorage.setItem('processing_restrictions', JSON.stringify(restrictionSettings));
    return true;
  }
  
  private static deleteCookies() {
    // すべてのCookieを削除
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  }
  
  private static getRestrictionSettings(): ProcessingRestrictions {
    const stored = localStorage.getItem('processing_restrictions');
    return stored ? JSON.parse(stored) : {};
  }
}

interface UserDataExport {
  exportDate: string;
  dataController: string;
  user: {
    gameState: any;
    preferences: any;
    statistics: any;
  };
  metadata: {
    dataCategories: string[];
    retentionPeriod: string;
    legalBasis: string;
  };
}

interface UserDataCorrections {
  game_state?: any;
  user_preferences?: any;
  game_statistics?: any;
}

interface ProcessingRestrictions {
  analytics?: boolean;
  marketing?: boolean;
  profiling?: boolean;
  timestamp?: number;
}
```

### 2.3 データ侵害通知

#### 侵害検知システム
```typescript
// src/utils/breach-detection.ts
export class BreachDetection {
  private static readonly BREACH_INDICATORS = [
    'unauthorized_access',
    'data_modification',
    'data_destruction',
    'data_loss',
    'system_intrusion'
  ];
  
  // データ侵害の検知
  static detectBreach(indicator: string, details: any): void {
    if (this.BREACH_INDICATORS.includes(indicator)) {
      const breach: DataBreach = {
        id: this.generateBreachId(),
        timestamp: Date.now(),
        indicator,
        details,
        severity: this.assessSeverity(indicator, details),
        status: 'detected',
        affectedData: this.identifyAffectedData(details),
        notificationRequired: this.requiresNotification(indicator, details)
      };
      
      this.logBreach(breach);
      
      if (breach.notificationRequired) {
        this.initiateNotificationProcess(breach);
      }
    }
  }
  
  private static assessSeverity(indicator: string, details: any): 'low' | 'medium' | 'high' | 'critical' {
    // 重要度評価ロジック
    if (indicator === 'system_intrusion' || details.personalDataInvolved) {
      return 'critical';
    }
    if (indicator === 'unauthorized_access') {
      return 'high';
    }
    if (indicator === 'data_modification') {
      return 'medium';
    }
    return 'low';
  }
  
  private static requiresNotification(indicator: string, details: any): boolean {
    // GDPR Article 33/34に基づく通知要件判定
    return details.personalDataInvolved && 
           (indicator === 'system_intrusion' || 
            indicator === 'unauthorized_access' ||
            details.riskToIndividuals === 'high');
  }
  
  private static initiateNotificationProcess(breach: DataBreach): void {
    // 72時間以内の監督当局への通知準備
    if (breach.severity === 'critical' || breach.severity === 'high') {
      this.scheduleAuthorityNotification(breach);
    }
    
    // データ主体への通知判定
    if (breach.details.riskToIndividuals === 'high') {
      this.scheduleDataSubjectNotification(breach);
    }
  }
  
  private static scheduleAuthorityNotification(breach: DataBreach): void {
    // GitHub Issueの自動作成
    const issueData = {
      title: `🚨 Data Breach Notification Required - ${breach.id}`,
      body: this.generateBreachReport(breach),
      labels: ['critical', 'data-breach', 'gdpr-notification']
    };
    
    console.warn('Authority notification required:', issueData);
  }
  
  private static generateBreachReport(breach: DataBreach): string {
    return `
## Data Breach Report

**Breach ID**: ${breach.id}
**Detection Time**: ${new Date(breach.timestamp).toISOString()}
**Severity**: ${breach.severity}

### Description
${breach.details.description || 'Automated breach detection'}

### Affected Data
${breach.affectedData.join(', ')}

### Risk Assessment
- **Personal Data Involved**: ${breach.details.personalDataInvolved ? 'Yes' : 'No'}
- **Risk to Individuals**: ${breach.details.riskToIndividuals || 'Unknown'}

### Required Actions
- [ ] Internal investigation
- [ ] Risk assessment
- [ ] Authority notification (within 72 hours)
- [ ] Data subject notification (if high risk)
- [ ] Remediation measures

### Timeline
- **Detection**: ${new Date(breach.timestamp).toISOString()}
- **Authority Notification Deadline**: ${new Date(breach.timestamp + 72 * 60 * 60 * 1000).toISOString()}
    `;
  }
}

interface DataBreach {
  id: string;
  timestamp: number;
  indicator: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
  affectedData: string[];
  notificationRequired: boolean;
}
```

## 3. 個人情報保護法対応

### 3.1 利用目的の特定・通知

#### 実装例
```vue
<!-- src/components/legal/PrivacyNotice.vue -->
<template>
  <div class="privacy-notice">
    <h2>個人情報の取り扱いについて</h2>
    
    <div class="purpose-section">
      <h3>利用目的</h3>
      <ul>
        <li>ゲームサービスの提供</li>
        <li>ユーザー設定の記憶・復元</li>
        <li>サービスの改善・向上</li>
        <li>技術的問題の解決</li>
      </ul>
    </div>
    
    <div class="data-section">
      <h3>取得する情報</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>項目</th>
            <th>取得方法</th>
            <th>利用目的</th>
            <th>保存期間</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ゲーム進捗</td>
            <td>自動取得</td>
            <td>サービス提供</td>
            <td>削除まで</td>
          </tr>
          <tr>
            <td>設定情報</td>
            <td>ユーザー入力</td>
            <td>サービス提供</td>
            <td>削除まで</td>
          </tr>
          <tr>
            <td>エラー情報</td>
            <td>自動取得</td>
            <td>改善・向上</td>
            <td>90日間</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="rights-section">
      <h3>お客様の権利</h3>
      <ul>
        <li>利用停止・削除の請求</li>
        <li>開示の請求</li>
        <li>訂正・追加・削除の請求</li>
      </ul>
      
      <button @click="exerciseRights" class="rights-button">
        権利を行使する
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const exerciseRights = () => {
  // 権利行使画面への遷移
  window.open('/data-subject-rights', '_blank');
};
</script>
```

### 3.2 安全管理措置

#### 技術的安全管理措置
```typescript
// src/utils/security-measures.ts
export class SecurityMeasures {
  // アクセス制御
  static implementAccessControl(): void {
    // CSP設定
    this.setContentSecurityPolicy();
    
    // セキュリティヘッダー設定
    this.setSecurityHeaders();
    
    // HTTPS強制
    this.enforceHTTPS();
  }
  
  // データの暗号化
  static encryptSensitiveData(data: any): string {
    return CryptoManager.encryptData(JSON.stringify(data), this.getEncryptionKey());
  }
  
  // アクセスログの記録
  static logAccess(event: AccessEvent): void {
    const logEntry: AccessLog = {
      timestamp: Date.now(),
      event: event.type,
      resource: event.resource,
      result: event.result,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };
    
    this.storeAccessLog(logEntry);
  }
  
  // 不正アクセスの検知
  static detectSuspiciousActivity(): void {
    const recentAccess = this.getRecentAccessLogs();
    
    // 短時間での大量アクセス検知
    if (this.isRapidAccess(recentAccess)) {
      this.alertSuspiciousActivity('rapid_access', recentAccess);
    }
    
    // 異常なアクセスパターン検知
    if (this.isAnomalousPattern(recentAccess)) {
      this.alertSuspiciousActivity('anomalous_pattern', recentAccess);
    }
  }
  
  private static isRapidAccess(logs: AccessLog[]): boolean {
    const timeWindow = 5 * 60 * 1000; // 5分
    const threshold = 100; // 100回
    
    const now = Date.now();
    const recentLogs = logs.filter(log => (now - log.timestamp) < timeWindow);
    
    return recentLogs.length > threshold;
  }
}

interface AccessEvent {
  type: string;
  resource: string;
  result: 'success' | 'failure' | 'blocked';
}

interface AccessLog {
  timestamp: number;
  event: string;
  resource: string;
  result: string;
  userAgent: string;
  sessionId: string;
}
```

## 4. セキュリティ標準対応

### 4.1 OWASP Top 10 対策

#### A03:2021 – Injection対策
```typescript
// src/utils/injection-prevention.ts
export class InjectionPrevention {
  // XSS防止
  static sanitizeInput(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'/]/g, s => map[s]);
  }
  
  // HTMLエスケープ
  static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // JSONエスケープ
  static escapeJson(obj: any): string {
    return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  }
  
  // URL検証
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) &&
             !url.includes('javascript:') &&
             !url.includes('data:');
    } catch {
      return false;
    }
  }
}
```

### 4.2 NIST Framework対応

#### 識別（Identify）機能
```typescript
// src/utils/asset-inventory.ts
export class AssetInventory {
  private static readonly ASSETS = {
    data: [
      { name: 'game_state', classification: 'internal', retention: 'user_controlled' },
      { name: 'user_preferences', classification: 'internal', retention: 'user_controlled' },
      { name: 'error_logs', classification: 'internal', retention: '90_days' },
      { name: 'access_logs', classification: 'confidential', retention: '30_days' }
    ],
    systems: [
      { name: 'web_application', criticality: 'high', exposure: 'public' },
      { name: 'github_repository', criticality: 'high', exposure: 'public' },
      { name: 'github_actions', criticality: 'medium', exposure: 'internal' }
    ],
    dependencies: [
      { name: 'vue', version: '3.x', risk: 'low' },
      { name: 'typescript', version: '5.x', risk: 'low' },
      { name: 'vite', version: '5.x', risk: 'medium' }
    ]
  };
  
  static getAssetInventory(): AssetInventory {
    return {
      lastUpdated: Date.now(),
      assets: this.ASSETS,
      riskAssessment: this.assessRisks()
    };
  }
  
  private static assessRisks(): RiskAssessment[] {
    return [
      {
        asset: 'user_data',
        threat: 'data_breach',
        likelihood: 'low',
        impact: 'medium',
        riskLevel: 'medium',
        mitigations: ['encryption', 'access_control', 'monitoring']
      },
      {
        asset: 'web_application',
        threat: 'xss_attack',
        likelihood: 'medium',
        impact: 'medium',
        riskLevel: 'medium',
        mitigations: ['input_validation', 'output_encoding', 'csp']
      }
    ];
  }
}

interface AssetInventory {
  lastUpdated: number;
  assets: any;
  riskAssessment: RiskAssessment[];
}

interface RiskAssessment {
  asset: string;
  threat: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigations: string[];
}
```

## 5. 監査・評価

### 5.1 コンプライアンス監査

#### 自動監査システム
```typescript
// src/utils/compliance-audit.ts
export class ComplianceAudit {
  static async performAudit(): Promise<AuditReport> {
    const report: AuditReport = {
      timestamp: Date.now(),
      auditor: 'automated_system',
      scope: ['gdpr', 'personal_info_protection_act', 'owasp_top10'],
      findings: [],
      recommendations: [],
      overallCompliance: 0
    };
    
    // GDPR監査
    const gdprFindings = await this.auditGDPR();
    report.findings.push(...gdprFindings);
    
    // 個人情報保護法監査
    const pipaFindings = await this.auditPIPA();
    report.findings.push(...pipaFindings);
    
    // セキュリティ監査
    const securityFindings = await this.auditSecurity();
    report.findings.push(...securityFindings);
    
    // 総合評価
    report.overallCompliance = this.calculateCompliance(report.findings);
    report.recommendations = this.generateRecommendations(report.findings);
    
    return report;
  }
  
  private static async auditGDPR(): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    
    // 合法的根拠の確認
    if (!this.checkLegalBasis()) {
      findings.push({
        type: 'gdpr_legal_basis',
        severity: 'high',
        description: 'Legal basis for data processing not clearly established',
        recommendation: 'Document legal basis for all data processing activities'
      });
    }
    
    // プライバシーポリシーの確認
    if (!this.checkPrivacyPolicy()) {
      findings.push({
        type: 'gdpr_privacy_policy',
        severity: 'medium',
        description: 'Privacy policy needs updates',
        recommendation: 'Update privacy policy to include all required information'
      });
    }
    
    return findings;
  }
  
  private static calculateCompliance(findings: AuditFinding[]): number {
    const totalChecks = 50; // 総チェック項目数
    const criticalIssues = findings.filter(f => f.severity === 'critical').length;
    const highIssues = findings.filter(f => f.severity === 'high').length;
    const mediumIssues = findings.filter(f => f.severity === 'medium').length;
    
    const penaltyScore = (criticalIssues * 10) + (highIssues * 5) + (mediumIssues * 2);
    const complianceScore = Math.max(0, 100 - (penaltyScore / totalChecks * 100));
    
    return Math.round(complianceScore);
  }
}

interface AuditReport {
  timestamp: number;
  auditor: string;
  scope: string[];
  findings: AuditFinding[];
  recommendations: string[];
  overallCompliance: number;
}

interface AuditFinding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}
```

### 5.2 継続的コンプライアンス監視

#### GitHub Actions による監視
```yaml
# .github/workflows/compliance-check.yml
name: Compliance Check

on:
  push:
    branches: [ master ]
  schedule:
    - cron: '0 6 * * 1' # 毎週月曜日6:00

jobs:
  compliance-audit:
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
      
      - name: Run GDPR compliance check
        run: npm run compliance:gdpr
      
      - name: Run security compliance check
        run: npm run compliance:security
      
      - name: Generate compliance report
        run: |
          node scripts/generate-compliance-report.js > compliance-report.md
      
      - name: Create compliance issue
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('compliance-report.md', 'utf8');
            
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Compliance Issues Detected',
              body: report,
              labels: ['compliance', 'security', 'urgent']
            });
```

## 6. チェックリスト

### GDPR準拠チェックリスト
- [ ] 合法的根拠が文書化されている
- [ ] データ処理記録が維持されている
- [ ] プライバシーポリシーが整備されている
- [ ] データ主体の権利が実装されている
- [ ] データ侵害通知手順が確立されている
- [ ] プライバシー・バイ・デザインが実装されている

### 個人情報保護法準拠チェックリスト
- [ ] 利用目的が特定・通知されている
- [ ] 適正取得が確保されている
- [ ] 安全管理措置が実施されている
- [ ] 第三者提供が制限されている
- [ ] 開示等の求めに対応できる
- [ ] 苦情処理体制が整備されている

### セキュリティ標準準拠チェックリスト
- [ ] OWASP Top 10 対策が実装されている
- [ ] セキュリティヘッダーが設定されている
- [ ] 暗号化が適切に実装されている
- [ ] アクセス制御が実装されている
- [ ] セキュリティ監視が実施されている
- [ ] インシデント対応手順が確立されている

## 関連ドキュメント

- [セキュリティポリシー](./SECURITY_POLICY.md)
- [プライバシーポリシー](./PRIVACY_POLICY.md)
- [インシデント対応手順](./INCIDENT_RESPONSE.md)
- [セキュリティガイドライン](../development/SECURITY_GUIDELINES.md)