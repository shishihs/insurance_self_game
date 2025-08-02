/**
 * iframe埋め込み検出とブロック機能
 * CSP frame-ancestorsの代替実装
 */

export class FrameDetector {
  private static instance: FrameDetector
  private isInFrame = false
  private frameCheckInterval: number | null = null

  private constructor() {
    this.detectFrame()
    this.setupFrameProtection()
  }

  static getInstance(): FrameDetector {
    if (!FrameDetector.instance) {
      FrameDetector.instance = new FrameDetector()
    }
    return FrameDetector.instance
  }

  /**
   * iframe内での実行を検出
   */
  private detectFrame(): void {
    try {
      this.isInFrame = window.self !== window.top
    } catch (e) {
      // Same-origin policyによりアクセスできない場合はiframe内と判断
      this.isInFrame = true
    }
  }

  /**
   * iframe埋め込みからの保護を設定
   */
  private setupFrameProtection(): void {
    if (this.isInFrame) {
      console.warn('[Security] サイトがiframe内で実行されています')
      
      // 開発環境では警告のみ
      if (import.meta.env.DEV) {
        console.warn('[Security] 開発環境のため、iframe実行を許可します')
        return
      }

      // 本番環境ではiframeから脱出を試みる
      this.breakOutOfFrame()
    }

    // 定期的にチェック（動的にiframeに読み込まれる場合に対応）
    this.startPeriodicCheck()
  }

  /**
   * iframeから脱出
   */
  private breakOutOfFrame(): void {
    try {
      // トップレベルウィンドウにリダイレクト
      if (window.top) {
        window.top.location = window.self.location
      }
    } catch (e) {
      // クロスオリジンの場合はアクセスできないが、メッセージを表示
      this.showFrameWarning()
    }
  }

  /**
   * iframe内実行の警告を表示
   */
  private showFrameWarning(): void {
    const warning = document.createElement('div')
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: sans-serif;
      text-align: center;
      padding: 20px;
    `
    
    warning.innerHTML = `
      <div>
        <h1 style="font-size: 24px; margin-bottom: 20px;">⚠️ セキュリティ警告</h1>
        <p style="font-size: 18px; line-height: 1.5;">
          このサイトは埋め込み表示を許可していません。<br>
          正規のサイトで表示するには、以下のリンクをクリックしてください：
        </p>
        <a href="${window.location.href}" 
           target="_top" 
           style="
             display: inline-block;
             margin-top: 20px;
             padding: 12px 24px;
             background: #667eea;
             color: white;
             text-decoration: none;
             border-radius: 8px;
             font-size: 16px;
           ">
          正規サイトで開く
        </a>
      </div>
    `
    
    document.body.appendChild(warning)
  }

  /**
   * 定期的なフレームチェックを開始
   */
  private startPeriodicCheck(): void {
    // 5秒ごとにチェック
    this.frameCheckInterval = window.setInterval(() => {
      this.detectFrame()
      if (this.isInFrame && !import.meta.env.DEV) {
        this.breakOutOfFrame()
      }
    }, 5000)
  }

  /**
   * フレーム内で実行されているかを取得
   */
  isRunningInFrame(): boolean {
    return this.isInFrame
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.frameCheckInterval) {
      clearInterval(this.frameCheckInterval)
      this.frameCheckInterval = null
    }
  }
}

// 自動初期化
if (typeof window !== 'undefined') {
  FrameDetector.getInstance()
}