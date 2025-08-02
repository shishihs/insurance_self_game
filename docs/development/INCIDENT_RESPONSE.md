# セキュリティインシデント対応マニュアル

> **最終更新**: 2025/01/31  
> **文書種別**: 正式仕様書  
> **更新頻度**: 四半期更新  
> **緊急度**: 🚨 **CRITICAL**

保険ゲームプロジェクトにおけるセキュリティインシデント発生時の対応手順書です。

## 🚨 緊急連絡先

### インシデント対応チーム
```
🔴 レベル1（即座対応）: プロジェクトリーダー
🟡 レベル2（エスカレーション）: 技術責任者  
🟢 レベル3（最終責任者）: セキュリティ責任者
```

### 外部連絡先
- **GitHub Security**: security@github.com
- **CDN/ホスティング**: 各サービスのサポート
- **セキュリティ専門家**: 必要に応じて

## 📊 インシデント分類システム

### 🔴 レベル1 - CRITICAL（即座対応）
**対応時間**: 15分以内に初動対応

- アクティブな攻撃が進行中
- ユーザーデータの漏洩・改ざん
- サービス完全停止
- 金銭的損失が発生

**例**: 
- XSS攻撃によるセッション乗っ取り
- SQLインジェクションによるデータベース侵害
- DDoS攻撃による完全なサービス停止

### 🟡 レベル2 - HIGH（優先対応）
**対応時間**: 1時間以内に初動対応

- 潜在的なセキュリティ脆弱性
- 部分的なサービス機能停止
- 異常なアクセスパターン

**例**:
- 高危険度の脆弱性発見
- 認証バイパスの可能性
- 異常に多いアクセス試行

### 🟢 レベル3 - MEDIUM（計画対応）
**対応時間**: 24時間以内に初動対応

- 軽微なセキュリティ問題
- パフォーマンス劣化
- 設定ミス

**例**:
- セキュリティヘッダーの不備
- ログの異常
- 軽微な設定ミス

## 🚀 インシデント対応フロー

### フェーズ1: 初動対応（0-15分）

#### 1.1 インシデント確認
```bash
# セキュリティ状況の即座確認
echo "🔍 緊急セキュリティチェック開始: $(date)"

# 1. サイトの基本アクセス確認
curl -I -s https://shishihs.github.io/insurance_self_game/ | head -5

# 2. セキュリティログの緊急確認
node -e "
const fs = require('fs');
const path = 'src/utils/security-audit-logger.ts';
if (fs.existsSync(path)) {
  console.log('✅ セキュリティログシステム: 存在');
} else {
  console.log('❌ セキュリティログシステム: 未確認');
}
"

# 3. GitHub Actionsの状況確認
echo "GitHub Actions status check required"
```

#### 1.2 インシデント記録開始
```markdown
# インシデント記録テンプレート
## 基本情報
- **発生日時**: YYYY/MM/DD HH:MM:SS
- **発見者**: [名前]
- **インシデントレベル**: [CRITICAL/HIGH/MEDIUM]
- **影響範囲**: [詳細記述]

## 症状
[具体的な症状・現象を記述]

## 初動対応
[実行した対応内容を時系列で記録]
```

#### 1.3 緊急通知
```bash
# チーム内緊急通知（Slack/Discord等）
echo "🚨 セキュリティインシデント発生
レベル: [CRITICAL/HIGH/MEDIUM]  
時刻: $(date)
概要: [簡潔な説明]
対応者: [名前]
状況: 調査中"
```

### フェーズ2: 被害拡大防止（15分-1時間）

#### 2.1 攻撃の遮断・軽減
```bash
# 攻撃が確認された場合の緊急対応

# 1. 悪意のあるIPアドレスの特定（ログから）
echo "🔍 悪意のあるアクセスの確認"

# 2. 緊急デプロイ（必要に応じて）
# - 攻撃を受けているページの一時停止
# - セキュリティパッチの緊急適用

# 3. CDN/ホスティングサービスでの対応
echo "CDN/ホスティングサービスへの緊急連絡が必要"
```

#### 2.2 証拠保全
```bash
# ログとデータの保全
echo "📁 証拠保全開始: $(date)"

# 1. セキュリティログのバックアップ
mkdir -p ./incident-evidence/$(date +%Y%m%d-%H%M%S)
EVIDENCE_DIR="./incident-evidence/$(date +%Y%m%d-%H%M%S)"

# 2. システム状態のスナップショット
curl -s https://shishihs.github.io/insurance_self_game/ > "$EVIDENCE_DIR/site-snapshot.html"

# 3. 関連ファイルのコピー
cp -r src/utils/security* "$EVIDENCE_DIR/"
cp -r .github/workflows/security* "$EVIDENCE_DIR/"

echo "✅ 証拠保全完了: $EVIDENCE_DIR"
```

#### 2.3 影響範囲の特定
```bash
# 影響範囲調査スクリプト
echo "📊 影響範囲調査開始"

# 1. 使用技術とバージョンの確認
echo "=== 技術スタック ==="
node --version
npm --version
cat package.json | jq '.dependencies | keys[]'

# 2. セキュリティ設定の確認
echo "=== セキュリティ設定 ==="
if [ -f "eslint.config.mjs" ]; then
  echo "✅ ESLint設定: 存在"
else
  echo "❌ ESLint設定: 不明"
fi

# 3. デプロイメント状況の確認
echo "=== デプロイ状況 ==="
echo "最新コミット: $(git rev-parse HEAD)"
echo "ブランチ: $(git branch --show-current)"
```

### フェーズ3: 詳細調査（1-4時間）

#### 3.1 根本原因分析
```bash
# 詳細なセキュリティ分析
echo "🔬 詳細分析開始: $(date)"

# 1. セキュリティテストの実行
npm run test:run src/__tests__/security -- --verbose

# 2. 脆弱性スキャンの実行
npm audit --audit-level low --json > ./incident-evidence/npm-audit-$(date +%Y%m%d).json

# 3. コード品質チェック
npm run lint > ./incident-evidence/lint-report-$(date +%Y%m%d).txt 2>&1

echo "📋 分析結果を incident-evidence/ に保存しました"
```

#### 3.2 攻撃ベクトルの特定
```markdown
# 攻撃ベクトル分析テンプレート

## 攻撃の種類
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)  
- [ ] SQL Injection
- [ ] NoSQL Injection
- [ ] Path Traversal
- [ ] Command Injection
- [ ] Clickjacking
- [ ] DDoS
- [ ] その他: [詳細記述]

## 侵入経路
- [ ] フォーム入力
- [ ] URL パラメータ
- [ ] HTTP ヘッダー
- [ ] ファイルアップロード
- [ ] 外部API
- [ ] 第三者ライブラリ
- [ ] その他: [詳細記述]

## 利用された脆弱性
[技術的詳細を記述]
```

#### 3.3 被害状況の評価
```bash
# 被害状況評価スクリプト
echo "💹 被害状況評価: $(date)"

# 1. データ整合性チェック
echo "=== データ整合性 ==="
# LocalStorageベースなので、主にクライアントサイドの状態を確認

# 2. 機能影響チェック  
echo "=== 機能影響 ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  https://shishihs.github.io/insurance_self_game/

# 3. ユーザー影響評価
echo "=== ユーザー影響 ==="
echo "影響ユーザー数: [調査中]"
echo "データ漏洩: [調査中]"
echo "機能停止: [調査中]"
```

### フェーズ4: 恒久対策（4-24時間）

#### 4.1 脆弱性修正
```typescript
// セキュリティパッチの実装例

// 1. 入力検証の強化
import { sanitizeInput, validateNumber } from '@/utils/security'

function secureInputHandler(input: unknown): string {
  // より厳格な検証の実装
  if (typeof input !== 'string') {
    throw new SecurityError('Invalid input type')
  }
  
  // 危険なパターンの除去
  const sanitized = sanitizeInput(input)
  
  // 長さ制限の強化
  if (sanitized.length > 200) {
    throw new SecurityError('Input too long')
  }
  
  return sanitized
}

// 2. セキュリティヘッダーの追加
// vite.config.ts で実装
```

#### 4.2 セキュリティ監視強化
```typescript
// 監視強化の実装例
import { SecurityAuditLogger } from '@/utils/security-audit-logger'

class EnhancedSecurityMonitor {
  private auditLogger = SecurityAuditLogger.getInstance()
  
  async monitorSuspiciousActivity(): Promise<void> {
    // より積極的な監視の実装
    setInterval(async () => {
      const report = await this.auditLogger.generateAuditReport()
      
      // 異常パターンの検出
      if (report.summary.criticalEvents > 0) {
        await this.auditLogger.logSecurityEvent(
          'critical_events_detected',
          'critical',
          'enhanced_monitor',
          `Critical security events detected: ${report.summary.criticalEvents}`,
          { report: report.summary }
        )
      }
    }, 60000) // 1分ごとにチェック
  }
}
```

#### 4.3 テストケースの追加
```typescript
// インシデントから学んだ新しいテストケース
describe('Post-Incident Security Tests', () => {
  test('特定の攻撃パターンに対する防御', async () => {
    // インシデントで発見された攻撃パターンのテスト
    const maliciousInput = '[実際の攻撃パターン]'
    
    expect(() => {
      sanitizeInput(maliciousInput)
    }).not.toThrow()
    
    const sanitized = sanitizeInput(maliciousInput)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('eval(')
  })
  
  test('改善されたセキュリティ機能のテスト', async () => {
    // 実装した改善策のテスト
  })
})
```

### フェーズ5: 事後対応（24-72時間）

#### 5.1 インシデントレポート作成
```markdown
# インシデント最終報告書テンプレート

## エグゼクティブサマリー
[経営層向けの簡潔な要約]

## インシデント詳細
- **発生日時**: 
- **発見日時**: 
- **対応完了**: 
- **影響範囲**: 
- **被害規模**: 

## 原因分析
### 根本原因
[技術的な根本原因]

### 寄与要因
[インシデントを助長した要因]

## 対応内容
### 緊急対応
[実施した緊急対応]

### 恒久対策
[実装した恒久的な対策]

## 学んだ教訓
[今回の経験から得られた学び]

## 再発防止策
[具体的な再発防止措置]

## タイムライン
[時系列での対応記録]
```

#### 5.2 セキュリティ体制見直し
```bash
# セキュリティ体制の評価と改善
echo "🔄 セキュリティ体制見直し: $(date)"

# 1. 現在のセキュリティ設定の評価
npm run test:run src/__tests__/security -- --coverage

# 2. 改善項目の特定
echo "=== 改善項目 ==="
echo "- [ ] セキュリティテストの拡充"
echo "- [ ] 監視機能の強化" 
echo "- [ ] インシデント対応の自動化"
echo "- [ ] セキュリティ教育の実施"

# 3. 改善計画の策定
echo "=== 改善計画 ==="
echo "短期（1週間以内）: [緊急改善項目]"
echo "中期（1ヶ月以内）: [重要改善項目]"
echo "長期（3ヶ月以内）: [全体的改善項目]"
```

#### 5.3 ステークホルダー報告
```markdown
# ステークホルダー向け報告テンプレート

## ユーザー向け通知
保険ゲームプロジェクトをご利用いただき、ありがとうございます。

[日時]に発生したセキュリティインシデントについてご報告いたします。

### 何が起こったか
[ユーザー向けの分かりやすい説明]

### 影響について
[ユーザーデータやサービスへの影響]

### 対応について
[実施した対応策]

### 今後の対策
[再発防止のための取り組み]

ご心配をおかけして申し訳ございませんでした。
```

## 🛠️ インシデント対応ツール

### 緊急対応スクリプト
```bash
#!/bin/bash
# incident-response.sh - 緊急対応スクリプト

echo "🚨 保険ゲーム緊急対応スクリプト"
echo "実行時刻: $(date)"

# 基本情報収集
echo "=== システム情報 ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Git: $(git --version)"
echo "現在のブランチ: $(git branch --show-current)"
echo "最新コミット: $(git rev-parse HEAD)"

# セキュリティ状況確認
echo "=== セキュリティ状況 ==="
npm audit --audit-level moderate || echo "脆弱性が検出されました"

# テスト実行
echo "=== セキュリティテスト ==="
npm run test:run src/__tests__/security || echo "セキュリティテストに失敗しました"

# 証拠保全
EVIDENCE_DIR="./incident-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"
cp package.json "$EVIDENCE_DIR/"
cp -r src/utils/security* "$EVIDENCE_DIR/" 2>/dev/null || echo "セキュリティファイルのコピーに失敗"

echo "✅ 緊急対応完了: 証拠は $EVIDENCE_DIR に保存されました"
```

### 復旧確認スクリプト
```bash
#!/bin/bash
# recovery-check.sh - 復旧確認スクリプト

echo "🔍 復旧確認スクリプト"

# 1. 基本機能テスト
echo "=== 基本機能確認 ==="
curl -s -o /dev/null -w "サイト応答: %{http_code} (時間: %{time_total}s)\n" \
  https://shishihs.github.io/insurance_self_game/

# 2. セキュリティテスト
echo "=== セキュリティテスト ==="
npm run test:run src/__tests__/security -- --silent

# 3. E2Eセキュリティテスト
echo "=== E2Eセキュリティテスト ==="
npm run test:e2e tests/e2e/security-e2e.spec.ts || echo "E2Eテストでエラーが発生"

# 4. パフォーマンステスト
echo "=== パフォーマンステスト ==="
curl -o /dev/null -s -w "接続時間: %{time_connect}s\n応答時間: %{time_total}s\n" \
  https://shishihs.github.io/insurance_self_game/

echo "✅ 復旧確認完了"
```

## 📚 参考資料・連絡先

### 緊急時参考サイト
- [OWASP Incident Response](https://owasp.org/www-community/Incident_Response)
- [NIST Computer Security Incident Handling Guide](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)
- [GitHub Security Advisory Database](https://github.com/advisories)

### ツール・サービス
- **セキュリティスキャン**: npm audit、Snyk、GitHub Security
- **ログ分析**: GitHub Actions logs、Browser DevTools
- **緊急連絡**: プロジェクトSlack、GitHub Issues

### トレーニング資料
- セキュリティインシデント対応シミュレーション
- OWASP Top 10 学習資料
- プロジェクト固有のセキュリティガイド

---

## ⚠️ 重要な注意事項

1. **このマニュアルは定期的に更新してください** - 新しい脅威や学んだ教訓を反映
2. **訓練を実施してください** - 定期的にインシデント対応の訓練を行う
3. **連絡先を最新に保ってください** - 緊急連絡先の定期確認
4. **法的要件を確認してください** - 個人情報保護法などの報告義務

🚨 **緊急時は落ち着いて、このマニュアルに従って対応してください** 🚨