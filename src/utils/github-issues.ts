/**
 * GitHub Issues API統合ユーティリティ
 * GitHub Pages環境でのフィードバック・バグレポート機能
 */

export interface BugReportData {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  stepsToReproduce: string
  expectedBehavior?: string
  actualBehavior?: string
  reproductionRate: string
  errorMessage?: string
  systemInfo?: any
  contactInfo?: {
    email?: string
    name?: string
  }
  screenshots?: string[]
}

export interface FeedbackData {
  title: string
  description: string
  category: string
  contactInfo?: {
    email?: string
    name?: string
  }
}

/**
 * GitHub Issues統合クラス
 * GitHub Pages環境でのissue作成機能
 */
export class GitHubIssuesIntegration {
  private readonly repoOwner: string
  private readonly repoName: string
  private readonly issueTemplate: string

  constructor() {
    // プロジェクトのGitHubリポジトリ情報
    this.repoOwner = 'shishihs'
    this.repoName = 'insurance_self_game'
    this.issueTemplate = 'bug_report'
  }

  /**
   * バグレポートをGitHub Issueとして作成
   */
  async createBugReport(data: BugReportData): Promise<{
    success: boolean
    issueUrl?: string
    fallbackMethod?: 'email' | 'copy'
    issueBody?: string
    errorMessage?: string
  }> {
    try {
      // GitHub Issues URLを構築（New Issue画面への直接リンク）
      const issueBody = this.formatBugReportForGitHub(data)
      const title = `[BUG] ${data.title}`
      
      // GitHub Issues作成用URLを生成
      const issueUrl = this.createIssueUrl(title, issueBody, ['bug', this.getSeverityLabel(data.severity)])
      
      // ユーザーをGitHub Issues作成画面に誘導
      if (typeof window !== 'undefined') {
        window.open(issueUrl, '_blank')
      }
      
      return {
        success: true,
        issueUrl,
        issueBody
      }
    } catch (error) {
      console.error('GitHub Issues作成に失敗:', error)
      
      // フォールバック: メール送信またはクリップボードコピー
      const issueBody = this.formatBugReportForGitHub(data)
      return {
        success: false,
        fallbackMethod: data.contactInfo?.email ? 'email' : 'copy',
        issueBody,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 一般的なフィードバックをGitHub Issueとして作成
   */
  async createFeedback(data: FeedbackData): Promise<{
    success: boolean
    issueUrl?: string
    fallbackMethod?: 'email' | 'copy'
    issueBody?: string
    errorMessage?: string
  }> {
    try {
      const issueBody = this.formatFeedbackForGitHub(data)
      const title = `[FEEDBACK] ${data.title}`
      
      const issueUrl = this.createIssueUrl(title, issueBody, ['feedback', 'enhancement'])
      
      if (typeof window !== 'undefined') {
        window.open(issueUrl, '_blank')
      }
      
      return {
        success: true,
        issueUrl,
        issueBody
      }
    } catch (error) {
      console.error('GitHub Issues作成に失敗:', error)
      
      const issueBody = this.formatFeedbackForGitHub(data)
      return {
        success: false,
        fallbackMethod: data.contactInfo?.email ? 'email' : 'copy',
        issueBody,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * GitHub Issues作成URLを構築
   */
  private createIssueUrl(title: string, body: string, labels: string[]): string {
    const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/issues/new`
    const params = new URLSearchParams({
      title,
      body,
      labels: labels.join(','),
      template: this.issueTemplate
    })
    
    return `${baseUrl}?${params.toString()}`
  }

  /**
   * バグレポートをGitHub Issue形式にフォーマット
   */
  private formatBugReportForGitHub(data: BugReportData): string {
    let body = `## バグの概要\n${data.description}\n\n`
    
    body += `## 重要度\n**${this.getSeverityLabel(data.severity)}**\n\n`
    
    body += `## カテゴリー\n${data.category}\n\n`
    
    body += `## 再現手順\n${data.stepsToReproduce}\n\n`
    
    if (data.expectedBehavior) {
      body += `## 期待される動作\n${data.expectedBehavior}\n\n`
    }
    
    if (data.actualBehavior) {
      body += `## 実際の動作\n${data.actualBehavior}\n\n`
    }
    
    body += `## 再現頻度\n${data.reproductionRate}\n\n`
    
    if (data.errorMessage) {
      body += `## エラーメッセージ\n\`\`\`\n${data.errorMessage}\n\`\`\`\n\n`
    }
    
    if (data.systemInfo) {
      body += `## システム情報\n`
      body += `- **ブラウザ**: ${data.systemInfo.browserName || 'Unknown'}\n`
      body += `- **バージョン**: ${data.systemInfo.browserVersion || 'Unknown'}\n`
      body += `- **OS**: ${data.systemInfo.os || 'Unknown'}\n`
      body += `- **画面解像度**: ${data.systemInfo.screenResolution || 'Unknown'}\n`
      body += `- **ゲーム状態**: ${data.systemInfo.gameState || 'Unknown'}\n`
      body += `- **報告日時**: ${new Date().toLocaleString('ja-JP')}\n\n`
    }
    
    if (data.contactInfo?.email || data.contactInfo?.name) {
      body += `## 連絡先情報\n`
      if (data.contactInfo.name) body += `- **名前**: ${data.contactInfo.name}\n`
      if (data.contactInfo.email) body += `- **メール**: ${data.contactInfo.email}\n`
      body += `\n`
    }
    
    body += `---\n`
    body += `*このバグレポートは [人生充実ゲーム](https://shishihs.github.io/insurance_self_game/) から自動生成されました。*`
    
    return body
  }

  /**
   * フィードバックをGitHub Issue形式にフォーマット
   */
  private formatFeedbackForGitHub(data: FeedbackData): string {
    let body = `## フィードバック内容\n${data.description}\n\n`
    
    body += `## カテゴリー\n${data.category}\n\n`
    
    if (data.contactInfo?.email || data.contactInfo?.name) {
      body += `## 連絡先情報\n`
      if (data.contactInfo.name) body += `- **名前**: ${data.contactInfo.name}\n`
      if (data.contactInfo.email) body += `- **メール**: ${data.contactInfo.email}\n`
      body += `\n`
    }
    
    body += `## 報告日時\n${new Date().toLocaleString('ja-JP')}\n\n`
    
    body += `---\n`
    body += `*このフィードバックは [人生充実ゲーム](https://shishihs.github.io/insurance_self_game/) から送信されました。*`
    
    return body
  }

  /**
   * 重要度ラベルを取得
   */
  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      low: '🟢 軽微',
      medium: '🟡 中程度',
      high: '🟠 重大',
      critical: '🔴 致命的'
    }
    return labels[severity] || severity
  }

  /**
   * メール送信用URLを生成
   */
  createEmailUrl(subject: string, body: string, to: string = 'feedback@example.com'): string {
    const params = new URLSearchParams({
      subject,
      body
    })
    return `mailto:${to}?${params.toString()}`
  }

  /**
   * テキストをクリップボードにコピー
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        return true
      } else {
        // フォールバック
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        return success
      }
    } catch (error) {
      console.error('クリップボードへのコピーに失敗:', error)
      return false
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const githubIssues = new GitHubIssuesIntegration()