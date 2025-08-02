# 監視とアラートの設定

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

insurance_gameプロジェクトの包括的な監視戦略とアラート設定について定義します。システムの健全性を維持し、問題の早期発見・対応を実現します。

## 1. 監視戦略

### 監視の目的
- **可用性確保**: サービスの稼働状況を常時監視
- **パフォーマンス最適化**: 応答時間とリソース使用状況の監視
- **品質維持**: エラー率と異常動作の検出
- **ユーザー体験向上**: 実際のユーザー体験の監視

### 監視レベル
1. **インフラ監視**: GitHub Pages、CDN、DNS
2. **アプリケーション監視**: JavaScript エラー、パフォーマンス
3. **ユーザー体験監視**: Core Web Vitals、ユーザー行動
4. **ビジネス監視**: ゲーム利用状況、コンバージョン

## 2. 技術監視

### 2.1 GitHub Actions 監視

#### ワークフロー監視項目
- **実行成功率**: デプロイの成功・失敗状況
- **実行時間**: 各ステップの実行時間
- **キューイング時間**: ワークフロー開始までの待機時間
- **リソース使用量**: CPU、メモリ、ネットワーク使用量

#### 監視設定
```yaml
# .github/workflows/monitoring.yml
name: Workflow Monitoring

on:
  workflow_run:
    workflows: ["Deploy to GitHub Pages"]
    types: [completed]

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Workflow Status Check
        run: |
          if [ "${{ github.event.workflow_run.conclusion }}" == "failure" ]; then
            echo "Deployment failed - sending alert"
            # アラート送信処理
          fi
      
      - name: Performance Metrics
        run: |
          echo "Workflow duration: ${{ github.event.workflow_run.updated_at - github.event.workflow_run.created_at }}"
```

### 2.2 Web サイト監視

#### 可用性監視
```javascript
// monitoring/uptime-check.js
const checkSiteAvailability = async () => {
  const url = 'https://shishihs.github.io/insurance_self_game/';
  
  try {
    const response = await fetch(url);
    const metrics = {
      status: response.status,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('✅ Site is available', metrics);
    return metrics;
  } catch (error) {
    console.error('❌ Site is unavailable', error);
    // アラート送信
    await sendAlert('SITE_DOWN', { url, error: error.message });
  }
};

// 5分間隔で実行
setInterval(checkSiteAvailability, 5 * 60 * 1000);
```

#### パフォーマンス監視
```javascript
// monitoring/performance-monitor.js
const monitorWebVitals = () => {
  // Core Web Vitals の測定
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const metrics = {
        name: entry.name,
        value: entry.value,
        rating: entry.rating,
        timestamp: Date.now()
      };
      
      // メトリクスの送信
      sendMetrics('web_vitals', metrics);
      
      // しきい値チェック
      if (entry.name === 'LCP' && entry.value > 2500) {
        sendAlert('PERFORMANCE_DEGRADATION', {
          metric: 'LCP',
          value: entry.value,
          threshold: 2500
        });
      }
    }
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
};
```

### 2.3 JavaScript エラー監視

#### エラーキャッチングシステム
```javascript
// src/utils/error-monitoring.ts
class ErrorMonitor {
  private errorQueue: ErrorReport[] = [];
  
  constructor() {
    this.setupGlobalErrorHandlers();
  }
  
  private setupGlobalErrorHandlers() {
    // JavaScript エラー
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });
    
    // Promise 拒否
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
    
    // Vue エラー（開発環境）
    if (process.env.NODE_ENV === 'development') {
      app.config.errorHandler = (err, instance, info) => {
        this.captureError({
          type: 'vue',
          message: err.message,
          stack: err.stack,
          componentInfo: info,
          timestamp: Date.now()
        });
      };
    }
  }
  
  private captureError(error: ErrorReport) {
    this.errorQueue.push(error);
    
    // 重要なエラーは即座にアラート
    if (this.isCritical(error)) {
      this.sendAlert('CRITICAL_ERROR', error);
    }
    
    // バッチ送信（5分間隔）
    if (this.errorQueue.length >= 10) {
      this.flushErrors();
    }
  }
  
  private isCritical(error: ErrorReport): boolean {
    const criticalPatterns = [
      /cannot read prop/i,
      /is not a function/i,
      /network error/i,
      /script error/i
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message)
    );
  }
}
```

## 3. ユーザー体験監視

### 3.1 Core Web Vitals

#### 監視対象メトリクス
- **LCP (Largest Contentful Paint)**: 2.5秒以内
- **FID (First Input Delay)**: 100ms以内
- **CLS (Cumulative Layout Shift)**: 0.1以下
- **FCP (First Contentful Paint)**: 1.8秒以内
- **TTI (Time to Interactive)**: 3.8秒以内

#### 実装
```javascript
// src/utils/web-vitals-monitor.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric: Metric) => {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    timestamp: Date.now()
  });
  
  // ビーコンAPIで送信
  if ('sendBeacon' in navigator) {
    navigator.sendBeacon('/api/analytics', body);
  }
};

// 各メトリクスの監視開始
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 3.2 ユーザー行動監視

#### ゲーム固有メトリクス
```javascript
// src/analytics/game-analytics.ts
class GameAnalytics {
  trackGameStart(gameMode: string) {
    this.track('game_start', {
      game_mode: gameMode,
      timestamp: Date.now()
    });
  }
  
  trackGameEnd(result: GameResult) {
    this.track('game_end', {
      duration: result.duration,
      score: result.score,
      moves: result.totalMoves,
      result: result.outcome,
      timestamp: Date.now()
    });
  }
  
  trackError(error: GameError) {
    this.track('game_error', {
      error_type: error.type,
      error_message: error.message,
      game_state: error.gameState,
      timestamp: Date.now()
    });
    
    // 重要なゲームエラーはアラート
    if (error.severity === 'critical') {
      this.sendAlert('GAME_ERROR', error);
    }
  }
  
  private track(event: string, data: any) {
    // Google Analytics 4 への送信
    if (typeof gtag !== 'undefined') {
      gtag('event', event, data);
    }
    
    // カスタム分析システムへの送信
    this.sendCustomEvent(event, data);
  }
}
```

## 4. アラートシステム

### 4.1 アラートレベル

#### 重要度分類
- **Critical**: 即座の対応が必要（サイトダウン、重大なエラー）
- **Warning**: 注意が必要（性能劣化、エラー率上昇）
- **Info**: 情報通知（デプロイ完了、定期レポート）

#### アラート条件
```javascript
// monitoring/alert-rules.js
const alertRules = {
  // Critical アラート
  site_down: {
    condition: 'http_status != 200',
    severity: 'critical',
    cooldown: 300 // 5分間の再送防止
  },
  
  high_error_rate: {
    condition: 'error_rate > 5% in last 5 minutes',
    severity: 'critical',
    cooldown: 600
  },
  
  // Warning アラート
  slow_response: {
    condition: 'avg_response_time > 3000ms in last 10 minutes',
    severity: 'warning',
    cooldown: 900
  },
  
  high_js_errors: {
    condition: 'js_errors > 10 in last 15 minutes',
    severity: 'warning',
    cooldown: 600
  }
};
```

### 4.2 通知方法

#### GitHub Issues 自動作成
```javascript
// monitoring/github-alerting.js
const createGitHubIssue = async (alert) => {
  const issueBody = `
## 🚨 ${alert.severity.toUpperCase()} Alert

**Alert Type**: ${alert.type}
**Time**: ${new Date(alert.timestamp).toISOString()}
**Description**: ${alert.description}

### Details
\`\`\`json
${JSON.stringify(alert.details, null, 2)}
\`\`\`

### Suggested Actions
- [ ] Investigate the root cause
- [ ] Check related metrics
- [ ] Implement fix if needed
- [ ] Update monitoring if necessary

---
*This issue was automatically created by the monitoring system*
  `;
  
  const response = await fetch(`https://api.github.com/repos/shishihs/insurance_self_game/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `🚨 ${alert.type}: ${alert.description}`,
      body: issueBody,
      labels: ['alert', alert.severity, 'monitoring']
    })
  });
  
  return response.json();
};
```

#### Webhook 通知
```javascript
// monitoring/webhook-notifications.js
const sendWebhookAlert = async (alert) => {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  const payload = {
    text: `🚨 ${alert.severity.toUpperCase()}: ${alert.description}`,
    attachments: [{
      color: alert.severity === 'critical' ? 'danger' : 'warning',
      fields: [
        { title: 'Type', value: alert.type, short: true },
        { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true },
        { title: 'Details', value: JSON.stringify(alert.details), short: false }
      ]
    }]
  };
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};
```

## 5. ダッシュボード

### 5.1 リアルタイムダッシュボード

#### HTML ダッシュボード
```html
<!-- monitoring/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Insurance Game - Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard">
        <h1>Insurance Game Monitoring</h1>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Site Status</h3>
                <div id="site-status" class="status-indicator"></div>
            </div>
            
            <div class="metric-card">
                <h3>Response Time</h3>
                <canvas id="response-time-chart"></canvas>
            </div>
            
            <div class="metric-card">
                <h3>Error Rate</h3>
                <canvas id="error-rate-chart"></canvas>
            </div>
            
            <div class="metric-card">
                <h3>Core Web Vitals</h3>
                <canvas id="web-vitals-chart"></canvas>
            </div>
        </div>
        
        <div class="recent-alerts">
            <h3>Recent Alerts</h3>
            <div id="alerts-list"></div>
        </div>
    </div>
    
    <script src="dashboard.js"></script>
</body>
</html>
```

#### ダッシュボード JavaScript
```javascript
// monitoring/dashboard.js
class MonitoringDashboard {
  constructor() {
    this.metrics = new Map();
    this.charts = new Map();
    this.initializeCharts();
    this.startDataRefresh();
  }
  
  initializeCharts() {
    // レスポンス時間チャート
    const responseTimeCtx = document.getElementById('response-time-chart').getContext('2d');
    this.charts.set('responseTime', new Chart(responseTimeCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Response Time (ms)',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    }));
    
    // エラー率チャート
    const errorRateCtx = document.getElementById('error-rate-chart').getContext('2d');
    this.charts.set('errorRate', new Chart(errorRateCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Error Rate (%)',
          data: [],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      }
    }));
  }
  
  async refreshData() {
    try {
      const response = await fetch('/api/monitoring/metrics');
      const data = await response.json();
      
      this.updateSiteStatus(data.siteStatus);
      this.updateCharts(data.metrics);
      this.updateAlerts(data.recentAlerts);
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  }
  
  updateSiteStatus(status) {
    const indicator = document.getElementById('site-status');
    indicator.className = `status-indicator ${status.status}`;
    indicator.textContent = status.status === 'up' ? '🟢 Online' : '🔴 Offline';
  }
  
  startDataRefresh() {
    // 30秒間隔でデータ更新
    setInterval(() => this.refreshData(), 30000);
    this.refreshData(); // 初回実行
  }
}

// ダッシュボード初期化
document.addEventListener('DOMContentLoaded', () => {
  new MonitoringDashboard();
});
```

## 6. 監視データの活用

### 6.1 定期レポート

#### 週次レポート生成
```javascript
// monitoring/weekly-report.js
const generateWeeklyReport = async () => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const metrics = await getMetrics(startDate, endDate);
  
  const report = {
    period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
    availability: calculateAvailability(metrics.uptimeChecks),
    averageResponseTime: calculateAverageResponseTime(metrics.responseTimeData),
    errorRate: calculateErrorRate(metrics.errorData),
    webVitals: analyzeWebVitals(metrics.webVitalsData),
    topErrors: getTopErrors(metrics.errorData),
    trends: analyzeTrends(metrics)
  };
  
  // レポートをMarkdownで生成
  const markdownReport = generateMarkdownReport(report);
  
  // GitHub Issues にレポートを投稿
  await createGitHubIssue({
    title: `📊 Weekly Monitoring Report - ${endDate.toISOString().split('T')[0]}`,
    body: markdownReport,
    labels: ['monitoring', 'report', 'weekly']
  });
};

// 毎週月曜日の9:00に実行
const cron = require('node-cron');
cron.schedule('0 9 * * 1', generateWeeklyReport);
```

### 6.2 パフォーマンス分析

#### トレンド分析
```javascript
// monitoring/trend-analysis.js
const analyzeTrends = (metricsHistory) => {
  const trends = {
    responseTime: calculateTrend(metricsHistory.responseTime),
    errorRate: calculateTrend(metricsHistory.errorRate),
    webVitals: {
      lcp: calculateTrend(metricsHistory.lcp),
      fid: calculateTrend(metricsHistory.fid),
      cls: calculateTrend(metricsHistory.cls)
    }
  };
  
  // 悪化トレンドのアラート
  Object.entries(trends).forEach(([metric, trend]) => {
    if (trend.direction === 'worsening' && trend.significance > 0.1) {
      sendAlert('TREND_DEGRADATION', {
        metric,
        trend: trend.direction,
        change: trend.change,
        significance: trend.significance
      });
    }
  });
  
  return trends;
};
```

## 7. 監視システムの保守

### 7.1 監視設定の更新

#### 設定ファイル管理
```yaml
# monitoring/config.yml
monitoring:
  intervals:
    uptime_check: 300 # 5 minutes
    performance_check: 600 # 10 minutes
    error_rate_check: 900 # 15 minutes
  
  thresholds:
    response_time_warning: 2000 # ms
    response_time_critical: 5000 # ms
    error_rate_warning: 2 # %
    error_rate_critical: 5 # %
    availability_critical: 99.0 # %
  
  notifications:
    github_issues: true
    webhook: true
    email: false
  
  retention:
    raw_metrics: 30 # days
    aggregated_metrics: 365 # days
    alerts: 90 # days
```

### 7.2 監視システムの監視

#### ヘルスチェック
```javascript
// monitoring/health-check.js
const monitoringHealthCheck = async () => {
  const checks = [
    { name: 'Uptime Monitor', check: () => checkUptimeMonitor() },
    { name: 'Error Tracking', check: () => checkErrorTracking() },
    { name: 'Performance Monitor', check: () => checkPerformanceMonitor() },
    { name: 'Alert System', check: () => checkAlertSystem() }
  ];
  
  const results = await Promise.all(
    checks.map(async ({ name, check }) => {
      try {
        const result = await check();
        return { name, status: 'healthy', result };
      } catch (error) {
        return { name, status: 'unhealthy', error: error.message };
      }
    })
  );
  
  const unhealthyServices = results.filter(r => r.status === 'unhealthy');
  
  if (unhealthyServices.length > 0) {
    sendAlert('MONITORING_SYSTEM_FAILURE', {
      failedServices: unhealthyServices.map(s => s.name),
      details: unhealthyServices
    });
  }
  
  return results;
};

// 1時間間隔で監視システム自体をチェック
setInterval(monitoringHealthCheck, 60 * 60 * 1000);
```

## 8. チェックリスト

### 監視設定チェックリスト
- [ ] 可用性監視が設定されている
- [ ] パフォーマンス監視が設定されている
- [ ] エラー監視が設定されている
- [ ] アラートルールが適切に設定されている
- [ ] 通知先が正しく設定されている
- [ ] ダッシュボードが機能している

### アラート対応チェックリスト
- [ ] アラートの内容を確認した
- [ ] 影響範囲を特定した
- [ ] 応急処置を実施した
- [ ] 根本原因を調査した
- [ ] 恒久対策を実施した
- [ ] 再発防止策を検討した

### 定期メンテナンスチェックリスト
- [ ] 監視設定の見直し
- [ ] アラートしきい値の調整
- [ ] 不要なメトリクスの削除
- [ ] 新しい監視項目の追加
- [ ] ダッシュボードの改善
- [ ] レポートの内容見直し

## 関連ドキュメント

- [デプロイメント手順書](./DEPLOYMENT_PROCEDURES.md)
- [パフォーマンス監視](./PERFORMANCE_MONITORING.md)
- [インシデント対応手順](../development/INCIDENT_RESPONSE.md)
- [品質保証戦略](../project/QUALITY_ASSURANCE.md)