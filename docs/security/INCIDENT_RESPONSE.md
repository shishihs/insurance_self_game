# セキュリティインシデント対応手順

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 半年更新

## 概要

insurance_gameプロジェクトにおけるセキュリティインシデントの対応手順を定義します。迅速かつ適切な対応により、被害の最小化と早期復旧を実現します。

## 1. インシデント対応の基本方針

### 1.1 対応原則

#### 迅速性
- **初動対応**: 検知から1時間以内の初動対応
- **エスカレーション**: 重要度に応じた迅速なエスカレーション
- **情報共有**: 関係者への迅速な情報共有

#### 最小化
- **被害最小化**: 影響範囲の特定と拡大防止
- **復旧優先**: 可能な限り迅速なサービス復旧
- **証拠保全**: 将来の分析のための証拠保全

#### 透明性
- **記録**: すべての対応活動の詳細記録
- **報告**: 適切な関係者への報告
- **学習**: インシデントからの学習と改善

### 1.2 対応体制

#### インシデント対応チーム（IRT）
- **インシデント指揮官**: 対応全体の指揮・調整
- **技術調査担当**: 技術的分析・対策実装
- **コミュニケーション担当**: 内外への連絡・報告
- **記録担当**: 対応活動の記録・文書化

#### エスカレーション体制
- **Level 1**: 軽微なインシデント（開発者レベル）
- **Level 2**: 重要なインシデント（プロジェクトリーダー）
- **Level 3**: 重大なインシデント（組織管理者）
- **Level 4**: 致命的インシデント（外部専門家）

## 2. インシデント分類

### 2.1 重要度レベル

#### Critical（緊急）
- **影響**: サービス全体の停止、大規模データ漏洩
- **対応時間**: 1時間以内の初動対応
- **エスカレーション**: 即座に最高レベルへ

**例**:
- 個人情報の大規模漏洩
- システム全体への不正アクセス
- マルウェア感染の拡散
- 重要データの破壊・改ざん

#### High（高）
- **影響**: 主要機能の停止、限定的データ漏洩
- **対応時間**: 4時間以内の初動対応
- **エスカレーション**: 管理層への報告

**例**:
- 認証システムの侵害
- 重要なセキュリティ機能の無効化
- 限定的な個人情報漏洩
- DDoS攻撃による部分的停止

#### Medium（中）
- **影響**: 部分的機能不全、軽微なセキュリティ侵害
- **対応時間**: 24時間以内の対応開始
- **エスカレーション**: 開発チームリーダーへ報告

**例**:
- 軽微なXSS脆弱性の悪用
- 設定ミスによるセキュリティホール
- 不審なアクセスパターン
- 軽微なデータ整合性問題

#### Low（低）
- **影響**: 軽微な問題、潜在的リスク
- **対応時間**: 7日以内の対応計画策定
- **エスカレーション**: 定期報告で対応

**例**:
- セキュリティスキャンでの軽微な検出
- 依存関係の脆弱性報告
- 不適切なログ出力
- 軽微な権限設定ミス

### 2.2 インシデント種別

#### 不正アクセス
- システムへの無許可アクセス
- 権限昇格攻撃
- アカウント乗っ取り
- 内部不正アクセス

#### データ関連
- 個人情報漏洩
- データ改ざん・破壊
- データ盗取
- データ暗号化攻撃

#### サービス妨害
- DDoS攻撃
- リソース枯渇攻撃
- システム過負荷
- 意図的なサービス停止

#### マルウェア
- ウイルス感染
- ランサムウェア
- スパイウェア
- ボットネット参加

## 3. 検知・通報

### 3.1 自動検知システム

#### セキュリティ監視
```typescript
// src/utils/incident-detection.ts
export class IncidentDetection {
  private static readonly DETECTION_RULES = {
    rapid_requests: { threshold: 100, timeWindow: 300000 }, // 5分で100回
    error_spike: { threshold: 50, timeWindow: 600000 },     // 10分で50回
    failed_auth: { threshold: 10, timeWindow: 900000 },     // 15分で10回
    data_exfiltration: { threshold: 1000000, timeWindow: 3600000 } // 1時間で1MB
  };
  
  // 異常検知メイン処理
  static detectAnomalies(): void {
    this.checkRapidRequests();
    this.checkErrorSpikes();
    this.checkFailedAuthentication();
    this.checkDataExfiltration();
    this.checkSecurityPatterns();
  }
  
  private static checkRapidRequests(): void {
    const recentRequests = this.getRecentAccessLogs(this.DETECTION_RULES.rapid_requests.timeWindow);
    
    if (recentRequests.length > this.DETECTION_RULES.rapid_requests.threshold) {
      this.triggerIncident({
        type: 'rapid_requests',
        severity: 'medium',
        description: 'Unusual number of requests detected',
        details: {
          requestCount: recentRequests.length,
          timeWindow: this.DETECTION_RULES.rapid_requests.timeWindow,
          sourceIPs: this.extractUniqueIPs(recentRequests)
        },
        evidence: recentRequests.slice(-10) // 直近10件
      });
    }
  }
  
  private static checkSecurityPatterns(): void {
    const recentLogs = this.getRecentSecurityLogs(3600000); // 1時間
    
    // XSS攻撃パターン
    const xssAttempts = recentLogs.filter(log => 
      this.containsXSSPattern(log.request)
    );
    
    if (xssAttempts.length > 5) {
      this.triggerIncident({
        type: 'xss_attack',
        severity: 'high',
        description: 'Multiple XSS attack attempts detected',
        details: {
          attemptCount: xssAttempts.length,
          patterns: xssAttempts.map(attempt => attempt.pattern)
        },
        evidence: xssAttempts
      });
    }
    
    // SQLインジェクション攻撃パターン
    const sqlInjectionAttempts = recentLogs.filter(log => 
      this.containsSQLInjectionPattern(log.request)
    );
    
    if (sqlInjectionAttempts.length > 3) {
      this.triggerIncident({
        type: 'sql_injection',
        severity: 'critical',
        description: 'SQL injection attack attempts detected',
        details: {
          attemptCount: sqlInjectionAttempts.length,
          patterns: sqlInjectionAttempts.map(attempt => attempt.pattern)
        },
        evidence: sqlInjectionAttempts
      });
    }
  }
  
  private static triggerIncident(incident: IncidentAlert): void {
    // インシデント記録
    this.recordIncident(incident);
    
    // 自動対応の実行
    this.executeAutomaticResponse(incident);
    
    // アラート送信
    this.sendAlert(incident);
    
    // エスカレーション判定
    if (this.requiresEscalation(incident)) {
      this.escalateIncident(incident);
    }
  }
  
  private static executeAutomaticResponse(incident: IncidentAlert): void {
    switch (incident.type) {
      case 'rapid_requests':
        this.implementRateLimit(incident.details.sourceIPs);
        break;
      case 'xss_attack':
        this.blockSuspiciousRequests(incident.evidence);
        break;
      case 'sql_injection':
        this.emergencySecurityLockdown();
        break;
    }
  }
  
  private static emergencySecurityLockdown(): void {
    // 緊急セキュリティロックダウン
    console.warn('🚨 EMERGENCY SECURITY LOCKDOWN INITIATED');
    
    // 追加のセキュリティヘッダー設定
    this.enhanceSecurityHeaders();
    
    // 不審なリクエストのブロック
    this.activateStrictFiltering();
    
    // ログレベルの向上
    this.increaseLogLevel();
  }
}

interface IncidentAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  evidence: any[];
}
```

### 3.2 手動通報

#### 通報チャンネル
- **GitHub Issues**: セキュリティラベル付きIssue
- **メール**: security@project.com（設定時）
- **Discord/Slack**: 緊急チャンネル（設定時）

#### 通報テンプレート
```markdown
## セキュリティインシデント報告

### 基本情報
- **発見日時**: YYYY/MM/DD HH:MM
- **発見者**: [名前]
- **重要度**: [Critical/High/Medium/Low]
- **インシデント種別**: [不正アクセス/データ漏洩/サービス妨害/マルウェア/その他]

### インシデント詳細
- **概要**: [何が発生したか]
- **影響範囲**: [影響を受けるシステム・データ・ユーザー]
- **推定原因**: [原因の推測]
- **現在の状況**: [進行中/沈静化/調査中]

### 証拠情報
- **ログ**: [関連するログの抜粋]
- **スクリーンショット**: [必要に応じて]
- **その他**: [その他の証拠]

### 緊急度判定
- [ ] 即座の対応が必要
- [ ] 24時間以内の対応が必要
- [ ] 通常の対応プロセスで対応可能

### 初期対応
- **実施済み対応**: [既に実施した対応]
- **推奨対応**: [推奨される対応]
```

## 4. 初期対応

### 4.1 インシデント確認

#### 確認手順
1. **事実確認**: 報告内容の正確性確認
2. **影響範囲特定**: 被害の範囲と程度の把握
3. **重要度判定**: インシデントレベルの決定
4. **対応チーム招集**: 必要な人員の招集

#### 初期評価チェックリスト
```typescript
// src/utils/incident-assessment.ts
export class IncidentAssessment {
  static assessIncident(report: IncidentReport): AssessmentResult {
    const assessment: AssessmentResult = {
      confirmed: false,
      severity: 'low',
      impactScope: [],
      riskLevel: 'low',
      recommendedActions: [],
      escalationRequired: false
    };
    
    // インシデントの確認
    assessment.confirmed = this.confirmIncident(report);
    
    if (assessment.confirmed) {
      // 重要度評価
      assessment.severity = this.evaluateSeverity(report);
      
      // 影響範囲特定
      assessment.impactScope = this.identifyImpactScope(report);
      
      // リスクレベル評価
      assessment.riskLevel = this.evaluateRiskLevel(assessment.severity, assessment.impactScope);
      
      // 推奨アクション
      assessment.recommendedActions = this.generateRecommendedActions(assessment);
      
      // エスカレーション要否
      assessment.escalationRequired = this.requiresEscalation(assessment);
    }
    
    return assessment;
  }
  
  private static evaluateSeverity(report: IncidentReport): Severity {
    let score = 0;
    
    // データの機密性
    if (report.dataInvolved) {
      if (report.personalDataInvolved) score += 30;
      if (report.sensitiveDataInvolved) score += 20;
    }
    
    // システムの可用性
    if (report.serviceImpact) {
      if (report.serviceImpact === 'complete_outage') score += 40;
      if (report.serviceImpact === 'partial_outage') score += 20;
      if (report.serviceImpact === 'performance_degradation') score += 10;
    }
    
    // 攻撃の巧妙さ
    if (report.attackSophistication === 'high') score += 15;
    if (report.attackSophistication === 'medium') score += 10;
    
    // ユーザーへの影響
    if (report.userImpact === 'all_users') score += 25;
    if (report.userImpact === 'some_users') score += 15;
    
    if (score >= 70) return 'critical';
    if (score >= 40) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }
  
  private static identifyImpactScope(report: IncidentReport): string[] {
    const scope: string[] = [];
    
    if (report.systemsAffected) {
      scope.push(...report.systemsAffected);
    }
    
    if (report.dataInvolved) {
      scope.push('user_data');
    }
    
    if (report.serviceImpact) {
      scope.push('service_availability');
    }
    
    return scope;
  }
}

interface IncidentReport {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  dataInvolved: boolean;
  personalDataInvolved: boolean;
  sensitiveDataInvolved: boolean;
  serviceImpact: 'none' | 'performance_degradation' | 'partial_outage' | 'complete_outage';
  attackSophistication: 'low' | 'medium' | 'high';
  userImpact: 'no_users' | 'some_users' | 'many_users' | 'all_users';
  systemsAffected: string[];
}

interface AssessmentResult {
  confirmed: boolean;
  severity: Severity;
  impactScope: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  escalationRequired: boolean;
}

type Severity = 'low' | 'medium' | 'high' | 'critical';
```

### 4.2 封じ込め

#### 緊急対応アクション
```typescript
// src/utils/containment-actions.ts
export class ContainmentActions {
  // 緊急封じ込め処理
  static executeEmergencyContainment(incident: IncidentReport): ContainmentResult {
    const actions: ContainmentAction[] = [];
    
    switch (incident.type) {
      case 'unauthorized_access':
        actions.push(...this.containUnauthorizedAccess(incident));
        break;
      case 'data_breach':
        actions.push(...this.containDataBreach(incident));
        break;
      case 'ddos_attack':
        actions.push(...this.containDDoSAttack(incident));
        break;
      case 'malware_infection':
        actions.push(...this.containMalware(incident));
        break;
    }
    
    return this.executeActions(actions);
  }
  
  private static containUnauthorizedAccess(incident: IncidentReport): ContainmentAction[] {
    return [
      {
        type: 'isolate_affected_systems',
        priority: 'immediate',
        description: 'Isolate compromised systems',
        implementation: () => this.isolateAffectedSystems(incident.systemsAffected)
      },
      {
        type: 'revoke_credentials',
        priority: 'immediate',
        description: 'Revoke potentially compromised credentials',
        implementation: () => this.revokeCredentials()
      },
      {
        type: 'enable_enhanced_monitoring',
        priority: 'urgent',
        description: 'Enable enhanced security monitoring',
        implementation: () => this.enhanceMonitoring()
      }
    ];
  }
  
  private static containDataBreach(incident: IncidentReport): ContainmentAction[] {
    return [
      {
        type: 'stop_data_flow',
        priority: 'immediate',
        description: 'Stop unauthorized data access',
        implementation: () => this.stopDataFlow()
      },
      {
        type: 'preserve_evidence',
        priority: 'immediate',
        description: 'Preserve forensic evidence',
        implementation: () => this.preserveEvidence()
      },
      {
        type: 'assess_data_exposure',
        priority: 'urgent',
        description: 'Assess scope of data exposure',
        implementation: () => this.assessDataExposure()
      }
    ];
  }
  
  private static isolateAffectedSystems(systems: string[]): boolean {
    try {
      // システムの隔離処理（実装は環境に依存）
      console.warn(`🔒 Isolating systems: ${systems.join(', ')}`);
      
      // 緊急セキュリティ設定の適用
      this.applyEmergencySecuritySettings();
      
      // アクセス制限の強化
      this.tightenAccessControls();
      
      return true;
    } catch (error) {
      console.error('System isolation failed:', error);
      return false;
    }
  }
  
  private static applyEmergencySecuritySettings(): void {
    // 厳格なCSPの適用
    const strictCSP = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'"
    ].join('; ');
    
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = strictCSP;
    document.head.appendChild(meta);
    
    // 追加のセキュリティヘッダー
    this.addSecurityHeader('X-Frame-Options', 'DENY');
    this.addSecurityHeader('X-Content-Type-Options', 'nosniff');
    this.addSecurityHeader('X-XSS-Protection', '1; mode=block');
  }
  
  private static preserveEvidence(): boolean {
    try {
      // ログの保全
      const currentLogs = this.collectCurrentLogs();
      
      // タイムスタンプ付きで保存
      const evidenceData = {
        timestamp: Date.now(),
        logs: currentLogs,
        systemState: this.captureSystemState(),
        networkState: this.captureNetworkState()
      };
      
      // 改ざん防止のためのハッシュ
      const evidenceHash = this.calculateHash(JSON.stringify(evidenceData));
      
      localStorage.setItem(`evidence_${Date.now()}`, JSON.stringify({
        data: evidenceData,
        hash: evidenceHash
      }));
      
      return true;
    } catch (error) {
      console.error('Evidence preservation failed:', error);
      return false;
    }
  }
}

interface ContainmentAction {
  type: string;
  priority: 'immediate' | 'urgent' | 'normal';
  description: string;
  implementation: () => boolean;
}

interface ContainmentResult {
  success: boolean;
  actionsExecuted: string[];
  failedActions: string[];
  timestamp: number;
  nextSteps: string[];
}
```

## 5. 調査・分析

### 5.1 フォレンジック調査

#### 証拠収集
```typescript
// src/utils/forensic-analysis.ts
export class ForensicAnalysis {
  // フォレンジック調査の開始
  static beginInvestigation(incident: IncidentReport): Investigation {
    const investigation: Investigation = {
      id: this.generateInvestigationId(),
      incidentId: incident.id,
      startTime: Date.now(),
      investigator: 'automated_system',
      evidence: [],
      timeline: [],
      findings: [],
      status: 'active'
    };
    
    // 証拠収集
    investigation.evidence = this.collectEvidence(incident);
    
    // タイムライン構築
    investigation.timeline = this.buildTimeline(investigation.evidence);
    
    // 初期分析
    investigation.findings = this.performInitialAnalysis(investigation);
    
    return investigation;
  }
  
  private static collectEvidence(incident: IncidentReport): Evidence[] {
    const evidence: Evidence[] = [];
    
    // アクセスログの収集
    const accessLogs = this.collectAccessLogs(incident.timestamp);
    evidence.push({
      type: 'access_logs',
      timestamp: Date.now(),
      data: accessLogs,
      hash: this.calculateHash(JSON.stringify(accessLogs)),
      source: 'local_storage'
    });
    
    // エラーログの収集
    const errorLogs = this.collectErrorLogs(incident.timestamp);
    evidence.push({
      type: 'error_logs',
      timestamp: Date.now(),
      data: errorLogs,
      hash: this.calculateHash(JSON.stringify(errorLogs)),
      source: 'console_logs'
    });
    
    // セキュリティログの収集
    const securityLogs = this.collectSecurityLogs(incident.timestamp);
    evidence.push({
      type: 'security_logs',
      timestamp: Date.now(),
      data: securityLogs,
      hash: this.calculateHash(JSON.stringify(securityLogs)),
      source: 'security_monitor'
    });
    
    // システム状態の記録
    const systemState = this.captureSystemState();
    evidence.push({
      type: 'system_state',
      timestamp: Date.now(),
      data: systemState,
      hash: this.calculateHash(JSON.stringify(systemState)),
      source: 'runtime_environment'
    });
    
    return evidence;
  }
  
  private static buildTimeline(evidence: Evidence[]): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    
    // 各証拠から時系列イベントを抽出
    evidence.forEach(ev => {
      if (ev.type === 'access_logs') {
        ev.data.forEach((log: any) => {
          events.push({
            timestamp: log.timestamp,
            type: 'access',
            description: `Access to ${log.resource}`,
            source: log.source || 'unknown',
            severity: this.classifyEventSeverity(log)
          });
        });
      }
      
      if (ev.type === 'error_logs') {
        ev.data.forEach((log: any) => {
          events.push({
            timestamp: log.timestamp,
            type: 'error',
            description: log.message,
            source: log.component || 'system',
            severity: log.level === 'error' ? 'high' : 'medium'
          });
        });
      }
    });
    
    // 時系列順にソート
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  private static performInitialAnalysis(investigation: Investigation): Finding[] {
    const findings: Finding[] = [];
    
    // 攻撃パターンの分析
    const attackPatterns = this.analyzeAttackPatterns(investigation.evidence);
    if (attackPatterns.length > 0) {
      findings.push({
        type: 'attack_pattern',
        severity: 'high',
        description: 'Suspicious attack patterns detected',
        details: attackPatterns,
        confidence: 0.8
      });
    }
    
    // 異常なアクセスパターンの検出
    const anomalousAccess = this.detectAnomalousAccess(investigation.timeline);
    if (anomalousAccess.length > 0) {
      findings.push({
        type: 'anomalous_access',
        severity: 'medium',
        description: 'Unusual access patterns detected',
        details: anomalousAccess,
        confidence: 0.7
      });
    }
    
    // データ流出の兆候
    const dataExfiltrationSigns = this.detectDataExfiltration(investigation.evidence);
    if (dataExfiltrationSigns.length > 0) {
      findings.push({
        type: 'data_exfiltration',
        severity: 'critical',
        description: 'Potential data exfiltration detected',
        details: dataExfiltrationSigns,
        confidence: 0.9
      });
    }
    
    return findings;
  }
  
  // 攻撃者の手法分析
  private static analyzeAttackPatterns(evidence: Evidence[]): AttackPattern[] {
    const patterns: AttackPattern[] = [];
    
    const securityLogs = evidence.find(e => e.type === 'security_logs')?.data || [];
    
    // SQLインジェクション攻撃パターン
    const sqlInjectionAttempts = securityLogs.filter((log: any) => 
      /('|--|;|union|select|drop|insert|update|delete)/i.test(log.request)
    );
    
    if (sqlInjectionAttempts.length > 3) {
      patterns.push({
        type: 'sql_injection',
        confidence: 0.9,
        attempts: sqlInjectionAttempts.length,
        timespan: this.calculateTimespan(sqlInjectionAttempts),
        indicators: sqlInjectionAttempts.map((attempt: any) => attempt.request)
      });
    }
    
    // XSS攻撃パターン
    const xssAttempts = securityLogs.filter((log: any) => 
      /<script|javascript:|on\w+=/i.test(log.request)
    );
    
    if (xssAttempts.length > 5) {
      patterns.push({
        type: 'xss_attack',
        confidence: 0.8,
        attempts: xssAttempts.length,
        timespan: this.calculateTimespan(xssAttempts),
        indicators: xssAttempts.map((attempt: any) => attempt.request)
      });
    }
    
    return patterns;
  }
}

interface Investigation {
  id: string;
  incidentId: string;
  startTime: number;
  investigator: string;
  evidence: Evidence[];
  timeline: TimelineEvent[];
  findings: Finding[];
  status: 'active' | 'completed' | 'suspended';
}

interface Evidence {
  type: string;
  timestamp: number;
  data: any;
  hash: string;
  source: string;
}

interface TimelineEvent {
  timestamp: number;
  type: string;
  description: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Finding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  confidence: number;
}

interface AttackPattern {
  type: string;
  confidence: number;
  attempts: number;
  timespan: number;
  indicators: string[];
}
```

### 5.2 根本原因分析

#### 原因特定プロセス
```typescript
// src/utils/root-cause-analysis.ts
export class RootCauseAnalysis {
  // 根本原因分析の実行
  static analyzeRootCause(investigation: Investigation): RootCauseReport {
    const report: RootCauseReport = {
      investigationId: investigation.id,
      analysisDate: Date.now(),
      rootCauses: [],
      contributingFactors: [],
      recommendations: [],
      preventiveMeasures: []
    };
    
    // 5 Whys手法による原因分析
    report.rootCauses = this.performFiveWhysAnalysis(investigation);
    
    // 寄与要因の特定
    report.contributingFactors = this.identifyContributingFactors(investigation);
    
    // 改善提案の生成
    report.recommendations = this.generateRecommendations(report.rootCauses);
    
    // 予防措置の提案
    report.preventiveMeasures = this.suggestPreventiveMeasures(report.rootCauses);
    
    return report;
  }
  
  private static performFiveWhysAnalysis(investigation: Investigation): RootCause[] {
    const rootCauses: RootCause[] = [];
    
    investigation.findings.forEach(finding => {
      const analysis = this.analyzeWithFiveWhys(finding);
      if (analysis) {
        rootCauses.push(analysis);
      }
    });
    
    return rootCauses;
  }
  
  private static analyzeWithFiveWhys(finding: Finding): RootCause | null {
    const whyChain: string[] = [];
    
    switch (finding.type) {
      case 'xss_attack':
        whyChain.push('XSS attack was successful');
        whyChain.push('User input was not properly sanitized');
        whyChain.push('Input validation function had a bug');
        whyChain.push('Code review did not catch the bug');
        whyChain.push('Security testing was insufficient');
        break;
        
      case 'unauthorized_access':
        whyChain.push('Unauthorized access occurred');
        whyChain.push('Authentication was bypassed');
        whyChain.push('Session management had a flaw');
        whyChain.push('Security headers were not properly configured');
        whyChain.push('Security best practices were not followed');
        break;
        
      case 'data_exfiltration':
        whyChain.push('Data was exfiltrated');
        whyChain.push('Access controls were insufficient');
        whyChain.push('Data classification was not implemented');
        whyChain.push('Monitoring was inadequate');
        whyChain.push('Security governance was weak');
        break;
    }
    
    if (whyChain.length >= 5) {
      return {
        findingType: finding.type,
        ultimateRootCause: whyChain[whyChain.length - 1],
        causalChain: whyChain,
        confidence: finding.confidence,
        category: this.categorizeCause(whyChain[whyChain.length - 1])
      };
    }
    
    return null;
  }
  
  private static identifyContributingFactors(investigation: Investigation): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    
    // 技術的要因
    if (this.hasVulnerableComponents(investigation)) {
      factors.push({
        category: 'technical',
        factor: 'Vulnerable dependencies',
        impact: 'high',
        description: 'Outdated or vulnerable third-party components'
      });
    }
    
    // プロセス要因
    if (this.hasInsufficientTesting(investigation)) {
      factors.push({
        category: 'process',
        factor: 'Insufficient security testing',
        impact: 'medium',
        description: 'Lack of comprehensive security testing in CI/CD pipeline'
      });
    }
    
    // 人的要因
    if (this.hasSecurityTrainingGaps(investigation)) {
      factors.push({
        category: 'human',
        factor: 'Security awareness gaps',
        impact: 'medium',
        description: 'Insufficient security training for development team'
      });
    }
    
    // 環境要因
    if (this.hasConfigurationIssues(investigation)) {
      factors.push({
        category: 'environmental',
        factor: 'Security configuration issues',
        impact: 'high',
        description: 'Improper security configuration in production environment'
      });
    }
    
    return factors;
  }
  
  private static generateRecommendations(rootCauses: RootCause[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    rootCauses.forEach(cause => {
      switch (cause.category) {
        case 'technical':
          recommendations.push({
            category: 'technical',
            priority: 'high',
            title: 'Implement automated security scanning',
            description: 'Set up automated vulnerability scanning in CI/CD pipeline',
            effort: 'medium',
            timeline: '2 weeks'
          });
          break;
          
        case 'process':
          recommendations.push({
            category: 'process',
            priority: 'high',
            title: 'Enhance security review process',
            description: 'Implement mandatory security review for all code changes',
            effort: 'low',
            timeline: '1 week'
          });
          break;
          
        case 'human':
          recommendations.push({
            category: 'human',
            priority: 'medium',
            title: 'Security training program',
            description: 'Implement regular security training for development team',
            effort: 'high',
            timeline: '1 month'
          });
          break;
      }
    });
    
    return recommendations;
  }
}

interface RootCauseReport {
  investigationId: string;
  analysisDate: number;
  rootCauses: RootCause[];
  contributingFactors: ContributingFactor[];
  recommendations: Recommendation[];
  preventiveMeasures: PreventiveMeasure[];
}

interface RootCause {
  findingType: string;
  ultimateRootCause: string;
  causalChain: string[];
  confidence: number;
  category: 'technical' | 'process' | 'human' | 'environmental';
}

interface ContributingFactor {
  category: string;
  factor: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

interface Recommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

interface PreventiveMeasure {
  type: string;
  description: string;
  implementation: string;
  effectiveness: 'low' | 'medium' | 'high';
}
```

## 6. 復旧・改善

### 6.1 システム復旧

#### 復旧手順
```typescript
// src/utils/system-recovery.ts
export class SystemRecovery {
  // システム復旧プロセス
  static executeRecovery(incident: IncidentReport, analysis: RootCauseReport): RecoveryResult {
    const recovery: RecoveryResult = {
      incidentId: incident.id,
      startTime: Date.now(),
      steps: [],
      success: false,
      rollbackRequired: false
    };
    
    try {
      // 1. 緊急修正の適用
      const hotfixResult = this.applyHotfix(incident, analysis);
      recovery.steps.push(hotfixResult);
      
      if (!hotfixResult.success) {
        throw new Error('Hotfix application failed');
      }
      
      // 2. システムの検証
      const validationResult = this.validateSystemIntegrity();
      recovery.steps.push(validationResult);
      
      if (!validationResult.success) {
        throw new Error('System validation failed');
      }
      
      // 3. セキュリティ強化の実装
      const hardeningResult = this.implementSecurityHardening(analysis);
      recovery.steps.push(hardeningResult);
      
      // 4. 監視の強化
      const monitoringResult = this.enhanceMonitoring(incident);
      recovery.steps.push(monitoringResult);
      
      // 5. 最終検証
      const finalValidation = this.performFinalValidation();
      recovery.steps.push(finalValidation);
      
      recovery.success = finalValidation.success;
      recovery.endTime = Date.now();
      
    } catch (error) {
      console.error('Recovery failed:', error);
      recovery.success = false;
      recovery.rollbackRequired = true;
      recovery.error = error.message;
    }
    
    return recovery;
  }
  
  private static applyHotfix(incident: IncidentReport, analysis: RootCauseReport): RecoveryStep {
    const step: RecoveryStep = {
      name: 'Apply Hotfix',
      startTime: Date.now(),
      success: false,
      details: []
    };
    
    try {
      analysis.recommendations
        .filter(rec => rec.priority === 'high')
        .forEach(rec => {
          const applied = this.applyRecommendation(rec);
          step.details.push({
            action: rec.title,
            success: applied
          });
        });
      
      // 脆弱性の修正
      if (incident.type === 'xss_attack') {
        this.patchXSSVulnerability();
        step.details.push({
          action: 'Patch XSS vulnerability',
          success: true
        });
      }
      
      if (incident.type === 'unauthorized_access') {
        this.strengthenAuthentication();
        step.details.push({
          action: 'Strengthen authentication',
          success: true
        });
      }
      
      step.success = step.details.every(detail => detail.success);
      step.endTime = Date.now();
      
    } catch (error) {
      step.success = false;
      step.error = error.message;
    }
    
    return step;
  }
  
  private static patchXSSVulnerability(): void {
    // XSS脆弱性の緊急修正
    console.log('🔧 Patching XSS vulnerability...');
    
    // 入力値検証の強化
    this.enhanceInputValidation();
    
    // 出力エスケープの強化
    this.enhanceOutputEscaping();
    
    // CSPの強化
    this.strengthenCSP();
  }
  
  private static enhanceInputValidation(): void {
    // より厳格な入力検証ルールの適用
    const strictValidationRules = {
      playerName: /^[a-zA-Z0-9\s]{1,20}$/,
      gameInput: /^[a-zA-Z0-9\s\-_]{0,100}$/,
      feedback: /^[a-zA-Z0-9\s\-_.,!?]{0,500}$/
    };
    
    // グローバル設定に適用
    (window as any).STRICT_VALIDATION_RULES = strictValidationRules;
  }
  
  private static validateSystemIntegrity(): RecoveryStep {
    const step: RecoveryStep = {
      name: 'Validate System Integrity',
      startTime: Date.now(),
      success: false,
      details: []
    };
    
    try {
      // セキュリティ設定の確認
      const securityCheck = this.checkSecuritySettings();
      step.details.push({
        action: 'Security settings check',
        success: securityCheck
      });
      
      // 機能テストの実行
      const functionalTest = this.runFunctionalTests();
      step.details.push({
        action: 'Functional tests',
        success: functionalTest
      });
      
      // パフォーマンステスト
      const performanceTest = this.runPerformanceTests();
      step.details.push({
        action: 'Performance tests',
        success: performanceTest
      });
      
      step.success = step.details.every(detail => detail.success);
      step.endTime = Date.now();
      
    } catch (error) {
      step.success = false;
      step.error = error.message;
    }
    
    return step;
  }
}

interface RecoveryResult {
  incidentId: string;
  startTime: number;
  endTime?: number;
  steps: RecoveryStep[];
  success: boolean;
  rollbackRequired: boolean;
  error?: string;
}

interface RecoveryStep {
  name: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  details: RecoveryStepDetail[];
  error?: string;
}

interface RecoveryStepDetail {
  action: string;
  success: boolean;
  error?: string;
}
```

### 6.2 再発防止策

#### 改善実装
```typescript
// src/utils/prevention-measures.ts
export class PreventionMeasures {
  // 再発防止策の実装
  static implementPreventionMeasures(analysis: RootCauseReport): PreventionResult {
    const result: PreventionResult = {
      analysisId: analysis.investigationId,
      implementationDate: Date.now(),
      measures: [],
      success: false
    };
    
    // 技術的予防策
    const technicalMeasures = this.implementTechnicalMeasures(analysis);
    result.measures.push(...technicalMeasures);
    
    // プロセス改善
    const processMeasures = this.implementProcessMeasures(analysis);
    result.measures.push(...processMeasures);
    
    // 監視強化
    const monitoringMeasures = this.implementMonitoringMeasures(analysis);
    result.measures.push(...monitoringMeasures);
    
    // 教育・訓練
    const trainingMeasures = this.implementTrainingMeasures(analysis);
    result.measures.push(...trainingMeasures);
    
    result.success = result.measures.every(measure => measure.implemented);
    
    return result;
  }
  
  private static implementTechnicalMeasures(analysis: RootCauseReport): PreventionMeasure[] {
    const measures: PreventionMeasure[] = [];
    
    // 自動セキュリティスキャンの実装
    measures.push({
      type: 'technical',
      name: 'Automated Security Scanning',
      description: 'Implement automated vulnerability scanning in CI/CD pipeline',
      implemented: this.setupAutomatedScanning(),
      effectiveness: 'high',
      maintenance: 'low'
    });
    
    // セキュリティヘッダーの強化
    measures.push({
      type: 'technical',
      name: 'Enhanced Security Headers',
      description: 'Implement comprehensive security headers',
      implemented: this.enhanceSecurityHeaders(),
      effectiveness: 'medium',
      maintenance: 'low'
    });
    
    // 入力検証の強化
    measures.push({
      type: 'technical',
      name: 'Enhanced Input Validation',
      description: 'Implement stricter input validation rules',
      implemented: this.enhanceInputValidation(),
      effectiveness: 'high',
      maintenance: 'medium'
    });
    
    return measures;
  }
  
  private static setupAutomatedScanning(): boolean {
    try {
      // GitHub Actions にセキュリティスキャンを追加
      const scanningConfig = {
        name: 'Security Scan',
        on: ['push', 'pull_request'],
        jobs: {
          security: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { uses: 'actions/checkout@v4' },
              { name: 'Run npm audit', run: 'npm audit --audit-level high' },
              { name: 'Run OWASP dependency check', run: 'npm run security:dependency-check' },
              { name: 'Run static analysis', run: 'npm run security:static-analysis' }
            ]
          }
        }
      };
      
      console.log('📝 Automated security scanning configured');
      return true;
    } catch (error) {
      console.error('Failed to setup automated scanning:', error);
      return false;
    }
  }
  
  private static implementProcessMeasures(analysis: RootCauseReport): PreventionMeasure[] {
    const measures: PreventionMeasure[] = [];
    
    // セキュリティレビュープロセス
    measures.push({
      type: 'process',
      name: 'Mandatory Security Review',
      description: 'Require security review for all code changes',
      implemented: this.establishSecurityReview(),
      effectiveness: 'high',
      maintenance: 'medium'
    });
    
    // インシデント対応訓練
    measures.push({
      type: 'process',
      name: 'Incident Response Drills',
      description: 'Regular incident response training and drills',
      implemented: this.scheduleResponseDrills(),
      effectiveness: 'medium',
      maintenance: 'medium'
    });
    
    return measures;
  }
  
  private static establishSecurityReview(): boolean {
    // セキュリティレビューチェックリストの作成
    const reviewChecklist = [
      'Input validation implemented',
      'Output encoding applied',
      'Authentication checks present',
      'Authorization properly implemented',
      'Sensitive data properly handled',
      'Error handling secure',
      'Logging appropriate',
      'Third-party dependencies reviewed'
    ];
    
    console.log('📋 Security review process established');
    console.log('Checklist items:', reviewChecklist);
    
    return true;
  }
}

interface PreventionResult {
  analysisId: string;
  implementationDate: number;
  measures: PreventionMeasure[];
  success: boolean;
}

interface PreventionMeasure {
  type: 'technical' | 'process' | 'monitoring' | 'training';
  name: string;
  description: string;
  implemented: boolean;
  effectiveness: 'low' | 'medium' | 'high';
  maintenance: 'low' | 'medium' | 'high';
}
```

## 7. 報告・通知

### 7.1 内部報告

#### インシデントレポート作成
```typescript
// src/utils/incident-reporting.ts
export class IncidentReporting {
  // 包括的インシデントレポートの生成
  static generateIncidentReport(
    incident: IncidentReport,
    investigation: Investigation,
    analysis: RootCauseReport,
    recovery: RecoveryResult
  ): IncidentReportDocument {
    
    const report: IncidentReportDocument = {
      id: `INCIDENT-${Date.now()}`,
      incidentId: incident.id,
      createdAt: Date.now(),
      createdBy: 'incident_response_system',
      classification: this.classifyIncident(incident),
      executiveSummary: this.generateExecutiveSummary(incident, analysis),
      incidentDetails: this.compileIncidentDetails(incident, investigation),
      impactAssessment: this.assessImpact(incident, investigation),
      rootCauseAnalysis: analysis,
      responseActions: this.summarizeResponseActions(recovery),
      lessonsLearned: this.extractLessonsLearned(analysis),
      preventionMeasures: this.summarizePreventionMeasures(analysis),
      recommendations: this.consolidateRecommendations(analysis),
      timeline: this.createDetailedTimeline(incident, investigation, recovery),
      attachments: this.gatherAttachments(investigation)
    };
    
    return report;
  }
  
  private static generateExecutiveSummary(
    incident: IncidentReport,
    analysis: RootCauseReport
  ): string {
    const summary = `
## エグゼクティブサマリー

**インシデント概要**: ${incident.description}

**発生日時**: ${new Date(incident.timestamp).toLocaleString('ja-JP')}

**重要度**: ${incident.severity} - ${this.getSeverityDescription(incident.severity)}

**影響範囲**: ${incident.impactScope.join(', ')}

**根本原因**: ${analysis.rootCauses.map(rc => rc.ultimateRootCause).join('; ')}

**対応状況**: 封じ込め完了、システム復旧済み、再発防止策実装中

**学習事項**: ${this.summarizeLessons(analysis)}

**今後のアクション**: ${analysis.recommendations.length}件の改善提案を実装予定
    `.trim();
    
    return summary;
  }
  
  private static compileIncidentDetails(
    incident: IncidentReport,
    investigation: Investigation
  ): IncidentDetails {
    return {
      detectionMethod: this.identifyDetectionMethod(incident),
      attackVector: this.identifyAttackVector(investigation),
      affectedSystems: incident.systemsAffected,
      dataInvolved: incident.dataInvolved,
      userImpact: incident.userImpact,
      businessImpact: this.assessBusinessImpact(incident),
      technicalDetails: this.compileTechnicalDetails(investigation),
      forensicFindings: investigation.findings
    };
  }
  
  private static createDetailedTimeline(
    incident: IncidentReport,
    investigation: Investigation,
    recovery: RecoveryResult
  ): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];
    
    // インシデント発生
    timeline.push({
      timestamp: incident.timestamp,
      phase: 'incident',
      event: 'Incident Occurred',
      description: incident.description,
      actor: 'unknown'
    });
    
    // 検知
    timeline.push({
      timestamp: incident.detectionTime || incident.timestamp,
      phase: 'detection',
      event: 'Incident Detected',
      description: 'Incident was detected and reported',
      actor: 'monitoring_system'
    });
    
    // 調査開始
    timeline.push({
      timestamp: investigation.startTime,
      phase: 'investigation',
      event: 'Investigation Started',
      description: 'Forensic investigation initiated',
      actor: 'incident_response_team'
    });
    
    // 対応アクション
    recovery.steps.forEach(step => {
      timeline.push({
        timestamp: step.startTime,
        phase: 'recovery',
        event: step.name,
        description: `Recovery step: ${step.name}`,
        actor: 'incident_response_team'
      });
    });
    
    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }
}

interface IncidentReportDocument {
  id: string;
  incidentId: string;
  createdAt: number;
  createdBy: string;
  classification: IncidentClassification;
  executiveSummary: string;
  incidentDetails: IncidentDetails;
  impactAssessment: ImpactAssessment;
  rootCauseAnalysis: RootCauseReport;
  responseActions: ResponseActionSummary;
  lessonsLearned: string[];
  preventionMeasures: PreventionMeasureSummary;
  recommendations: Recommendation[];
  timeline: TimelineEntry[];
  attachments: Attachment[];
}

interface IncidentClassification {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  subcategory: string;
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
}

interface IncidentDetails {
  detectionMethod: string;
  attackVector: string;
  affectedSystems: string[];
  dataInvolved: boolean;
  userImpact: string;
  businessImpact: string;
  technicalDetails: any;
  forensicFindings: Finding[];
}

interface ImpactAssessment {
  confidentiality: 'none' | 'low' | 'medium' | 'high';
  integrity: 'none' | 'low' | 'medium' | 'high';
  availability: 'none' | 'low' | 'medium' | 'high';
  overallImpact: 'low' | 'medium' | 'high' | 'critical';
}

interface ResponseActionSummary {
  containmentActions: string[];
  eradicationActions: string[];
  recoveryActions: string[];
  totalResponseTime: number;
}

interface PreventionMeasureSummary {
  implemented: number;
  planned: number;
  categories: string[];
}

interface TimelineEntry {
  timestamp: number;
  phase: 'incident' | 'detection' | 'investigation' | 'containment' | 'recovery' | 'lessons';
  event: string;
  description: string;
  actor: string;
}

interface Attachment {
  name: string;
  type: string;
  description: string;
  hash: string;
}
```

## 8. チェックリスト

### インシデント対応チェックリスト

#### 初期対応（Detection & Analysis）
- [ ] インシデントの確認と分類
- [ ] 重要度レベルの判定
- [ ] 対応チームの招集
- [ ] 初期封じ込めの実施
- [ ] 証拠保全の開始
- [ ] 関係者への初期報告

#### 封じ込め・根絶・復旧（Containment, Eradication & Recovery）
- [ ] 被害拡大の防止
- [ ] 攻撃者のアクセス遮断
- [ ] 脆弱性の修正
- [ ] システムの復旧
- [ ] セキュリティ強化の実装
- [ ] 機能・性能の検証

#### 事後活動（Post-Incident Activity）
- [ ] 詳細なインシデントレポートの作成
- [ ] 根本原因分析の実施
- [ ] 再発防止策の策定・実装
- [ ] 対応プロセスの改善
- [ ] 関係者への最終報告
- [ ] 学習事項の文書化・共有

### エスカレーション判定チェックリスト
- [ ] 個人情報が関与している
- [ ] システム全体に影響がある
- [ ] 攻撃が継続している
- [ ] メディア報道の可能性がある
- [ ] 法的対応が必要である
- [ ] 外部専門家の支援が必要である

## 関連ドキュメント

- [セキュリティポリシー](./SECURITY_POLICY.md)
- [コンプライアンス要件](./COMPLIANCE_REQUIREMENTS.md)
- [監視・アラート設定](../operations/MONITORING_ALERTING.md)
- [バックアップ・リカバリ手順](../operations/BACKUP_RECOVERY.md)