/**
 * SEO Manager - 検索エンジン最適化管理
 * 
 * 機能:
 * - 動的メタタグ管理
 * - 構造化データの更新
 * - パンくずリスト生成
 * - サイトマップ管理
 * - 言語別SEO最適化
 */

export interface SEOConfig {
  title: string
  description: string
  keywords: string[]
  url: string
  image?: string
  type?: 'website' | 'article' | 'game' | 'app'
  locale?: string
  alternateUrls?: { [lang: string]: string }
}

export interface StructuredData {
  '@context': string
  '@type': string | string[]
  [key: string]: any
}

export class SEOManager {
  private static instance: SEOManager
  private currentConfig: SEOConfig | null = null
  private readonly structuredDataCache = new Map<string, StructuredData>()

  private constructor() {}

  static getInstance(): SEOManager {
    if (!SEOManager.instance) {
      SEOManager.instance = new SEOManager()
    }
    return SEOManager.instance
  }

  /**
   * ページのSEO設定を更新
   */
  updatePageSEO(config: SEOConfig): void {
    this.currentConfig = config
    
    // HTML title の更新
    document.title = config.title
    
    // メタタグの更新
    this.updateMetaTag('description', config.description)
    this.updateMetaTag('keywords', config.keywords.join(','))
    
    // Open Graph メタタグの更新
    this.updateMetaProperty('og:title', config.title)
    this.updateMetaProperty('og:description', config.description)
    this.updateMetaProperty('og:url', config.url)
    this.updateMetaProperty('og:type', config.type || 'website')
    
    if (config.image) {
      this.updateMetaProperty('og:image', config.image)
    }
    
    // Twitter Card メタタグの更新
    this.updateMetaProperty('twitter:title', config.title)
    this.updateMetaProperty('twitter:description', config.description)
    this.updateMetaProperty('twitter:url', config.url)
    
    if (config.image) {
      this.updateMetaProperty('twitter:image', config.image)
    }
    
    // 正規URL の更新
    this.updateCanonicalUrl(config.url)
    
    // 言語別URL の更新
    if (config.alternateUrls) {
      this.updateAlternateUrls(config.alternateUrls)
    }
    
    // 構造化データの更新
    this.updateStructuredData(config)
    
    console.log('📈 SEO設定を更新しました:', config.title)
  }

  /**
   * メタタグの更新
   */
  private updateMetaTag(name: string, content: string): void {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
    
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', name)
      document.head.appendChild(meta)
    }
    
    meta.setAttribute('content', content)
  }

  /**
   * メタプロパティの更新
   */
  private updateMetaProperty(property: string, content: string): void {
    let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
    
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('property', property)
      document.head.appendChild(meta)
    }
    
    meta.setAttribute('content', content)
  }

  /**
   * 正規URLの更新
   */
  private updateCanonicalUrl(url: string): void {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    
    link.setAttribute('href', url)
  }

  /**
   * 言語別URLの更新
   */
  private updateAlternateUrls(alternateUrls: { [lang: string]: string }): void {
    // 既存の hreflang リンクを削除
    const existingLinks = document.querySelectorAll('link[hreflang]')
    existingLinks.forEach(link => { link.remove(); })
    
    // 新しい hreflang リンクを追加
    Object.entries(alternateUrls).forEach(([lang, url]) => {
      const link = document.createElement('link')
      link.setAttribute('rel', 'alternate')
      link.setAttribute('hreflang', lang)
      link.setAttribute('href', url)
      document.head.appendChild(link)
    })
  }

  /**
   * 構造化データの更新
   */
  private updateStructuredData(config: SEOConfig): void {
    // ゲーム用の構造化データを生成
    const gameStructuredData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': ['Game', 'SoftwareApplication', 'WebApplication'],
      name: config.title,
      description: config.description,
      url: config.url,
      gameCategory: ['BoardGame', 'StrategyGame', 'CardGame'],
      genre: ['Strategy', 'Simulation', 'Educational'],
      numberOfPlayers: '1',
      playMode: ['SinglePlayer'],
      operatingSystem: ['Web Browser', 'Progressive Web App'],
      applicationCategory: 'Game',
      applicationSubCategory: 'Board Game',
      inLanguage: config.locale || 'ja',
      isAccessibleForFree: true,
      isFamilyFriendly: true,
      contentRating: 'General Audiences',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: config.locale === 'en' ? 'USD' : 'JPY',
        availability: 'https://schema.org/OnlineOnly'
      }
    }
    
    if (config.image) {
      gameStructuredData.image = config.image
      gameStructuredData.screenshot = config.image
    }
    
    this.setStructuredData('game', gameStructuredData)
    
    // WebSite構造化データ
    const websiteStructuredData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.title,
      url: config.url,
      description: config.description,
      inLanguage: config.locale || 'ja',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${config.url}?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
    
    this.setStructuredData('website', websiteStructuredData)
  }

  /**
   * 構造化データの設定
   */
  setStructuredData(id: string, data: StructuredData): void {
    this.structuredDataCache.set(id, data)
    
    // 既存のスクリプトを削除
    const existingScript = document.getElementById(`structured-data-${id}`)
    if (existingScript) {
      existingScript.remove()
    }
    
    // 新しいスクリプトを追加
    const script = document.createElement('script')
    script.id = `structured-data-${id}`
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data, null, 2)
    document.head.appendChild(script)
    
    console.log(`📊 構造化データを更新: ${id}`)
  }

  /**
   * パンくずリストの生成
   */
  generateBreadcrumbs(items: Array<{ name: string; url: string }>): void {
    const breadcrumbData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    }
    
    this.setStructuredData('breadcrumb', breadcrumbData)
  }

  /**
   * 現在のページURLを取得
   */
  getCurrentUrl(): string {
    return window.location.href
  }

  /**
   * 現在の言語を取得
   */
  getCurrentLanguage(): string {
    return document.documentElement.lang || 'ja'
  }

  /**
   * 言語切り替え時のSEO更新
   */
  updateLanguage(lang: string): void {
    document.documentElement.lang = lang
    
    if (this.currentConfig) {
      const updatedConfig = {
        ...this.currentConfig,
        locale: lang,
        alternateUrls: this.generateAlternateUrls(this.currentConfig.url, lang)
      }
      
      this.updatePageSEO(updatedConfig)
    }
  }

  /**
   * 言語別URLの生成
   */
  private generateAlternateUrls(baseUrl: string): { [lang: string]: string } {
    const supportedLanguages = ['ja', 'en']
    const alternateUrls: { [lang: string]: string } = {}
    
    supportedLanguages.forEach(lang => {
      if (lang === 'ja') {
        alternateUrls[lang] = baseUrl
      } else {
        alternateUrls[lang] = `${baseUrl}?lang=${lang}`
      }
    })
    
    alternateUrls['x-default'] = baseUrl
    
    return alternateUrls
  }

  /**
   * ページビューの追跡
   */
  trackPageView(pageName: string): void {
    // Google Analytics や他の分析ツールとの連携用
    console.log(`📊 Page view tracked: ${pageName}`)
    
    // 将来的に分析ツールのAPIを呼び出す
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: this.currentConfig?.title,
        page_location: this.getCurrentUrl()
      })
    }
  }

  /**
   * イベントの追跡
   */
  trackEvent(eventName: string, parameters: { [key: string]: any } = {}): void {
    console.log(`📊 Event tracked: ${eventName}`, parameters)
    
    // 将来的に分析ツールのAPIを呼び出す
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, parameters)
    }
  }

  /**
   * SEOスコアの計算
   */
  calculateSEOScore(): {
    score: number
    recommendations: string[]
    issues: string[]
  } {
    const recommendations: string[] = []
    const issues: string[] = []
    let score = 100
    
    // タイトルの確認
    const title = document.title
    if (!title || title.length < 30) {
      issues.push('タイトルが短すぎます（30文字以上推奨）')
      score -= 10
    } else if (title.length > 60) {
      recommendations.push('タイトルが長すぎる可能性があります（60文字以下推奨）')
      score -= 5
    }
    
    // メタ説明の確認
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
    if (!description || description.length < 120) {
      issues.push('メタ説明が短すぎます（120文字以上推奨）')
      score -= 10
    } else if (description.length > 160) {
      recommendations.push('メタ説明が長すぎる可能性があります（160文字以下推奨）')
      score -= 5
    }
    
    // 見出しの確認
    const h1 = document.querySelectorAll('h1')
    if (h1.length === 0) {
      issues.push('H1タグが見つかりません')
      score -= 15
    } else if (h1.length > 1) {
      recommendations.push('H1タグは1つまでが推奨されます')
      score -= 5
    }
    
    // 構造化データの確認
    const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]')
    if (structuredDataScripts.length === 0) {
      issues.push('構造化データが見つかりません')
      score -= 10
    }
    
    // 正規URLの確認
    const canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      issues.push('正規URLが設定されていません')
      score -= 10
    }
    
    // パフォーマンス関連の推奨事項
    recommendations.push('画像を最適化してページ読み込み速度を向上させてください')
    recommendations.push('不要なJavaScriptを削除してください')
    
    return {
      score: Math.max(0, score),
      recommendations,
      issues
    }
  }

  /**
   * SEO レポートの生成
   */
  generateSEOReport(): {
    config: SEOConfig | null
    score: ReturnType<SEOManager['calculateSEOScore']>
    structuredData: { [id: string]: StructuredData }
    pageInfo: {
      url: string
      language: string
      title: string
      description: string
    }
  } {
    const scoreInfo = this.calculateSEOScore()
    
    return {
      config: this.currentConfig,
      score: scoreInfo,
      structuredData: Object.fromEntries(this.structuredDataCache),
      pageInfo: {
        url: this.getCurrentUrl(),
        language: this.getCurrentLanguage(),
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      }
    }
  }
}

// エクスポート用インスタンス
export const seoManager = SEOManager.getInstance()