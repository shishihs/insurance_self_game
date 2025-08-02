import Phaser from 'phaser'
import { GameStateManager, type EnhancedPlayerStats } from '../state/GameStateManager'
import { GameAnalytics, type StrategyPattern, type EfficiencyMetrics, type LearningProgress } from '../analytics/GameAnalytics'
import { SaveLoadUtils } from '../state/SaveLoadService'

/**
 * 統計パネルの設定
 */
interface StatisticsPanelConfig {
  scene: Phaser.Scene
  x: number
  y: number
  width: number
  height: number
}

/**
 * 統計表示パネル
 * プレイヤーの詳細な統計情報を表示するUI
 */
export class StatisticsPanel extends Phaser.GameObjects.Container {
  private stateManager: GameStateManager
  private analytics: GameAnalytics
  private background: Phaser.GameObjects.Rectangle
  private scrollContainer: Phaser.GameObjects.Container
  private scrollY = 0
  private maxScrollY = 0
  
  private readonly config: StatisticsPanelConfig
  private currentTab: 'overview' | 'detailed' | 'patterns' | 'achievements' = 'overview'
  
  constructor(config: StatisticsPanelConfig) {
    super(config.scene, config.x, config.y)
    
    this.config = config
    this.stateManager = GameStateManager.getInstance()
    this.analytics = new GameAnalytics()
    
    this.setSize(config.width, config.height)
    this.createUI()
    this.refreshContent()
    
    config.scene.add.existing(this)
  }
  
  /**
   * UIを作成
   */
  private createUI(): void {
    // 背景
    this.background = this.scene.add.rectangle(
      0, 0,
      this.config.width, this.config.height,
      0x1a1a1a, 0.95
    )
    this.add(this.background)
    
    // タイトル
    const title = this.scene.add.text(
      0, -this.config.height / 2 + 20,
      'プレイヤー統計',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    ).setOrigin(0.5, 0)
    this.add(title)
    
    // 閉じるボタン
    const closeButton = this.scene.add.text(
      this.config.width / 2 - 20, -this.config.height / 2 + 15,
      '×',
      {
        fontSize: '28px',
        color: '#ff6b6b',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.close())
    .on('pointerover', () => closeButton.setColor('#ff5252'))
    .on('pointerout', () => closeButton.setColor('#ff6b6b'))
    
    this.add(closeButton)
    
    // タブ
    this.createTabs()
    
    // スクロール可能なコンテンツエリア
    this.scrollContainer = this.scene.add.container(0, -50)
    this.add(this.scrollContainer)
    
    // スクロール機能を設定
    this.setupScrolling()
  }
  
  /**
   * タブを作成
   */
  private createTabs(): void {
    const tabY = -this.config.height / 2 + 60
    const tabs = [
      { key: 'overview', label: '概要' },
      { key: 'detailed', label: '詳細' },
      { key: 'patterns', label: '戦略' },
      { key: 'achievements', label: '実績' }
    ]
    
    const tabWidth = 80
    const totalWidth = tabs.length * tabWidth + (tabs.length - 1) * 10
    const startX = -totalWidth / 2 + tabWidth / 2
    
    tabs.forEach((tab, index) => {
      const x = startX + index * (tabWidth + 10)
      const tabButton = this.createTabButton(
        x, tabY, tabWidth, 30, 
        tab.label, tab.key as any
      )
      this.add(tabButton)
    })
  }
  
  /**
   * タブボタンを作成
   */
  private createTabButton(
    x: number, y: number, width: number, height: number,
    label: string, tabKey: typeof this.currentTab
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    const isActive = this.currentTab === tabKey
    const bgColor = isActive ? 0x4c6ef5 : 0x333333
    
    const background = this.scene.add.rectangle(0, 0, width, height, bgColor)
    const text = this.scene.add.text(0, 0, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 0.5)
    
    container.add([background, text])
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
      Phaser.Geom.Rectangle.Contains
    )
    .on('pointerdown', () => this.switchTab(tabKey))
    .on('pointerover', () => {
      if (this.currentTab !== tabKey) {
        background.setFillStyle(0x444444)
      }
    })
    .on('pointerout', () => {
      if (this.currentTab !== tabKey) {
        background.setFillStyle(0x333333)
      }
    })
    
    container.setData('background', background)
    container.setData('tabKey', tabKey)
    
    return container
  }
  
  /**
   * タブを切り替え
   */
  private switchTab(tabKey: typeof this.currentTab): void {
    this.currentTab = tabKey
    this.updateTabAppearance()
    this.refreshContent()
  }
  
  /**
   * タブの外観を更新
   */
  private updateTabAppearance(): void {
    this.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Container) {
        const tabKey = child.getData('tabKey')
        const background = child.getData('background')
        
        if (tabKey && background) {
          const isActive = tabKey === this.currentTab
          background.setFillStyle(isActive ? 0x4c6ef5 : 0x333333)
        }
      }
    })
  }
  
  /**
   * コンテンツを更新
   */
  private refreshContent(): void {
    // 既存のコンテンツをクリア
    this.scrollContainer.removeAll(true)
    this.scrollY = 0
    
    const stats = this.stateManager.getEnhancedStats()
    
    switch (this.currentTab) {
      case 'overview':
        this.createOverviewContent(stats)
        break
      case 'detailed':
        this.createDetailedContent(stats)
        break
      case 'patterns':
        this.createPatternsContent()
        break
      case 'achievements':
        this.createAchievementsContent(stats)
        break
    }
    
    this.updateScrollBounds()
  }
  
  /**
   * 概要コンテンツを作成
   */
  private createOverviewContent(stats: EnhancedPlayerStats): void {
    let yOffset = 20
    
    // 基本統計
    const basicStats = [
      { label: 'ゲーム完了数', value: stats.gamesCompleted.toString() },
      { label: 'プレイセッション', value: stats.sessionsPlayed.toString() },
      { label: '総プレイ時間', value: SaveLoadUtils.formatPlaytime(stats.totalPlaytime) },
      { label: 'ベストスコア', value: stats.bestScore.toString() },
      { label: '平均ターン数', value: stats.averageTurnsPerGame.toFixed(1) }
    ]
    
    basicStats.forEach(stat => {
      const container = this.createStatRow(stat.label, stat.value, 0, yOffset)
      this.scrollContainer.add(container)
      yOffset += 35
    })
    
    yOffset += 20
    
    // チャレンジ統計
    const challengeSuccessRate = stats.totalChallenges > 0 
      ? (stats.successfulChallenges / stats.totalChallenges * 100).toFixed(1)
      : '0'
    
    const challengeStats = [
      { label: '総チャレンジ数', value: stats.totalChallenges.toString() },
      { label: '成功数', value: stats.successfulChallenges.toString() },
      { label: '成功率', value: `${challengeSuccessRate}%` },
      { label: '失敗数', value: stats.failedChallenges.toString() }
    ]
    
    // セクションヘッダー
    const challengeHeader = this.scene.add.text(
      0, yOffset,
      '🎯 チャレンジ統計',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(challengeHeader)
    yOffset += 30
    
    challengeStats.forEach(stat => {
      const container = this.createStatRow(stat.label, stat.value, 0, yOffset)
      this.scrollContainer.add(container)
      yOffset += 35
    })
    
    yOffset += 20
    
    // 保険統計
    const insuranceHeader = this.scene.add.text(
      0, yOffset,
      '🛡️ 保険統計',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(insuranceHeader)
    yOffset += 30
    
    const insuranceTypes = stats.insuranceUsagePatterns.length
    const totalInsuranceUsage = stats.insuranceUsagePatterns.reduce(
      (sum, pattern) => sum + pattern.usageCount, 0
    )
    
    const insuranceStats = [
      { label: '利用した保険種類', value: `${insuranceTypes}種類` },
      { label: '保険購入回数', value: totalInsuranceUsage.toString() },
      { label: '現在の連続記録', value: `${stats.streaks.current}日` },
      { label: '最長連続記録', value: `${stats.streaks.best}日` }
    ]
    
    insuranceStats.forEach(stat => {
      const container = this.createStatRow(stat.label, stat.value, 0, yOffset)
      this.scrollContainer.add(container)
      yOffset += 35
    })
  }
  
  /**
   * 詳細コンテンツを作成
   */
  private createDetailedContent(stats: EnhancedPlayerStats): void {
    let yOffset = 20
    
    // 効率性指標
    const efficiency = this.analytics.getEfficiencyMetrics()
    
    const efficiencyHeader = this.scene.add.text(
      0, yOffset,
      '⚡ 効率性指標',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(efficiencyHeader)
    yOffset += 30
    
    const efficiencyStats = [
      { label: '平均決定時間', value: `${efficiency.decisionSpeed.toFixed(1)}秒` },
      { label: '最適プレイ率', value: `${efficiency.optimalPlayRate.toFixed(1)}%` },
      { label: 'リソース効率性', value: `${efficiency.resourceEfficiency.toFixed(1)}%` },
      { label: '適応性スコア', value: `${efficiency.adaptabilityScore.toFixed(1)}点` }
    ]
    
    efficiencyStats.forEach(stat => {
      const container = this.createStatRow(stat.label, stat.value, 0, yOffset)
      this.scrollContainer.add(container)
      yOffset += 35
    })
    
    yOffset += 20
    
    // ステージ別成功率
    const stageHeader = this.scene.add.text(
      0, yOffset,
      '📊 ステージ別成功率',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(stageHeader)
    yOffset += 30
    
    const stageNames = { youth: '青年期', middle: '中年期', fulfillment: '充実期' }
    Object.entries(stats.challengeSuccessRates).forEach(([stage, rate]) => {
      const stageName = stageNames[stage as keyof typeof stageNames] || stage
      const container = this.createStatRow(
        stageName, 
        `${(rate * 100).toFixed(1)}%`,
        0, yOffset
      )
      this.scrollContainer.add(container)
      yOffset += 35
    })
    
    yOffset += 20
    
    // 学習進度
    const learning = this.analytics.getLearningProgress()
    
    const learningHeader = this.scene.add.text(
      0, yOffset,
      '🎓 学習進度',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(learningHeader)
    yOffset += 30
    
    const skillLevelNames = {
      beginner: '初心者',
      intermediate: '中級者',
      advanced: '上級者',
      expert: 'エキスパート'
    }
    
    const learningStats = [
      { label: 'スキルレベル', value: skillLevelNames[learning.skillLevel] },
      { label: '改善率', value: `${learning.improvementRate.toFixed(1)}%` },
      { label: '習得概念数', value: `${learning.masteredConcepts.length}個` },
      { label: '次のマイルストーン', value: learning.nextMilestone }
    ]
    
    learningStats.forEach(stat => {
      const container = this.createStatRow(stat.label, stat.value, 0, yOffset)
      this.scrollContainer.add(container)
      yOffset += 35
    })
    
    // パーソナライズされたアドバイス
    yOffset += 20
    const adviceHeader = this.scene.add.text(
      0, yOffset,
      '💡 アドバイス',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(adviceHeader)
    yOffset += 30
    
    const advice = this.analytics.generatePersonalizedAdvice()
    advice.forEach(tip => {
      const adviceText = this.scene.add.text(
        -this.config.width / 2 + 20, yOffset,
        tip,
        {
          fontSize: '12px',
          color: '#cccccc',
          fontFamily: 'Arial',
          wordWrap: { width: this.config.width - 40 }
        }
      )
      this.scrollContainer.add(adviceText)
      yOffset += 60
    })
  }
  
  /**
   * 戦略パターンコンテンツを作成
   */
  private createPatternsContent(): void {
    let yOffset = 20
    
    const patterns = this.analytics.getStrategyPatterns()
    
    if (patterns.length === 0) {
      const noDataText = this.scene.add.text(
        0, yOffset,
        'まだ十分なデータがありません\\n数回プレイすると戦略パターンが表示されます',
        {
          fontSize: '14px',
          color: '#888888',
          fontFamily: 'Arial',
          align: 'center'
        }
      ).setOrigin(0.5, 0)
      this.scrollContainer.add(noDataText)
      return
    }
    
    patterns.forEach((pattern, index) => {
      const patternContainer = this.createPatternCard(pattern, 0, yOffset)
      this.scrollContainer.add(patternContainer)
      yOffset += 150
    })
  }
  
  /**
   * 実績コンテンツを作成
   */
  private createAchievementsContent(stats: EnhancedPlayerStats): void {
    let yOffset = 20
    
    // 実績の進行状況
    const achievementProgress = this.analytics.checkAchievementProgress()
    
    // 取得済み実績
    const unlockedHeader = this.scene.add.text(
      0, yOffset,
      '🏆 取得済み実績',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(unlockedHeader)
    yOffset += 30
    
    if (stats.achievements.length === 0) {
      const noAchievements = this.scene.add.text(
        0, yOffset,
        'まだ実績を獲得していません',
        {
          fontSize: '12px',
          color: '#888888',
          fontFamily: 'Arial'
        }
      ).setOrigin(0.5, 0)
      this.scrollContainer.add(noAchievements)
      yOffset += 40
    } else {
      stats.achievements.forEach(achievement => {
        const achievementCard = this.createAchievementCard(achievement, 0, yOffset, true)
        this.scrollContainer.add(achievementCard)
        yOffset += 80
      })
    }
    
    yOffset += 20
    
    // 進行中の実績
    const progressHeader = this.scene.add.text(
      0, yOffset,
      '📈 進行中の実績',
      {
        fontSize: '16px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.scrollContainer.add(progressHeader)
    yOffset += 30
    
    Object.entries(achievementProgress.progress).forEach(([id, progress]) => {
      const progressCard = this.createProgressCard(id, progress, 0, yOffset)
      this.scrollContainer.add(progressCard)
      yOffset += 60
    })
  }
  
  /**
   * 統計行を作成
   */
  private createStatRow(label: string, value: string, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    const labelText = this.scene.add.text(
      -this.config.width / 2 + 20, 0,
      label,
      {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    )
    
    const valueText = this.scene.add.text(
      this.config.width / 2 - 20, 0,
      value,
      {
        fontSize: '14px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(1, 0)
    
    container.add([labelText, valueText])
    return container
  }
  
  /**
   * 戦略パターンカードを作成
   */
  private createPatternCard(pattern: StrategyPattern, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const cardWidth = this.config.width - 40
    const cardHeight = 130
    
    // 背景
    const background = this.scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a2a)
    container.add(background)
    
    // タイトル
    const title = this.scene.add.text(
      -cardWidth / 2 + 15, -cardHeight / 2 + 15,
      pattern.name,
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    )
    container.add(title)
    
    // 説明
    const description = this.scene.add.text(
      -cardWidth / 2 + 15, -cardHeight / 2 + 40,
      pattern.description,
      {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'Arial',
        wordWrap: { width: cardWidth - 30 }
      }
    )
    container.add(description)
    
    // 統計
    const stats = [
      `使用頻度: ${(pattern.frequency * 100).toFixed(1)}%`,
      `成功率: ${(pattern.successRate * 100).toFixed(1)}%`,
      `平均活力: ${pattern.averageVitality.toFixed(0)}`
    ]
    
    stats.forEach((stat, index) => {
      const statText = this.scene.add.text(
        -cardWidth / 2 + 15, -cardHeight / 2 + 80 + index * 15,
        stat,
        {
          fontSize: '11px',
          color: '#aaaaaa',
          fontFamily: 'Arial'
        }
      )
      container.add(statText)
    })
    
    return container
  }
  
  /**
   * 実績カードを作成
   */
  private createAchievementCard(
    achievement: any, x: number, y: number, unlocked: boolean
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const cardWidth = this.config.width - 40
    const cardHeight = 60
    
    // 背景
    const bgColor = unlocked ? 0x2a4a2a : 0x2a2a2a
    const background = this.scene.add.rectangle(0, 0, cardWidth, cardHeight, bgColor)
    container.add(background)
    
    // アイコン
    const icon = this.scene.add.text(
      -cardWidth / 2 + 25, 0,
      achievement.icon || '🏆',
      {
        fontSize: '24px'
      }
    ).setOrigin(0.5, 0.5)
    container.add(icon)
    
    // 名前
    const name = this.scene.add.text(
      -cardWidth / 2 + 60, -10,
      achievement.name,
      {
        fontSize: '14px',
        color: unlocked ? '#4caf50' : '#888888',
        fontFamily: 'Arial'
      }
    )
    container.add(name)
    
    // 説明
    const description = this.scene.add.text(
      -cardWidth / 2 + 60, 10,
      achievement.description,
      {
        fontSize: '11px',
        color: '#cccccc',
        fontFamily: 'Arial'
      }
    )
    container.add(description)
    
    return container
  }
  
  /**
   * 進行度カードを作成
   */
  private createProgressCard(id: string, progress: number, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const cardWidth = this.config.width - 40
    
    // プログレスバー
    const barWidth = cardWidth - 100
    const barHeight = 20
    
    const barBackground = this.scene.add.rectangle(
      50, 0, barWidth, barHeight, 0x333333
    )
    container.add(barBackground)
    
    const barFill = this.scene.add.rectangle(
      50 - barWidth / 2 + (barWidth * progress / 100) / 2, 0,
      barWidth * progress / 100, barHeight, 0x4c6ef5
    )
    container.add(barFill)
    
    // ラベル
    const label = this.scene.add.text(
      -cardWidth / 2 + 10, 0,
      id.replace('_', ' '),
      {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    ).setOrigin(0, 0.5)
    container.add(label)
    
    // 進行度テキスト
    const progressText = this.scene.add.text(
      cardWidth / 2 - 10, 0,
      `${progress.toFixed(0)}%`,
      {
        fontSize: '12px',
        color: '#4c6ef5',
        fontFamily: 'Arial'
      }
    ).setOrigin(1, 0.5)
    container.add(progressText)
    
    return container
  }
  
  /**
   * スクロール機能を設定
   */
  private setupScrolling(): void {
    const scrollZone = this.scene.add.zone(
      0, 0, this.config.width, this.config.height - 120
    ).setInteractive()
    
    this.add(scrollZone)
    
    scrollZone.on('wheel', (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => {
      this.scroll(deltaY > 0 ? 50 : -50)
    })
  }
  
  /**
   * スクロール実行
   */
  private scroll(deltaY: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY, -this.maxScrollY, 0)
    this.scrollContainer.setY(-50 + this.scrollY)
  }
  
  /**
   * スクロール範囲を更新
   */
  private updateScrollBounds(): void {
    const contentHeight = this.getContentHeight()
    const visibleHeight = this.config.height - 120
    this.maxScrollY = Math.max(0, contentHeight - visibleHeight)
  }
  
  /**
   * コンテンツの高さを取得
   */
  private getContentHeight(): number {
    let maxY = 0
    this.scrollContainer.each((child) => {
      if (child instanceof Phaser.GameObjects.GameObject) {
        const bounds = child.getBounds()
        maxY = Math.max(maxY, bounds.bottom)
      }
    })
    return maxY + 50
  }
  
  /**
   * パネルを閉じる
   */
  close(): void {
    this.scene.events.emit('statisticsPanelClosed')
    this.destroy()
  }
  
  /**
   * パネルを表示
   */
  show(): void {
    this.setVisible(true)
    this.refreshContent()
  }
  
  /**
   * パネルを非表示
   */
  hide(): void {
    this.setVisible(false)
  }
}