import type { GameRenderer } from '@/interfaces/GameRenderer'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { PlayerStats, ChallengeResult } from '@/domain/types/game.types'

/**
 * コンソール用ゲームレンダラー
 * CUIでのゲーム実行・テスト・ベンチマークに使用
 */
export class ConsoleRenderer implements GameRenderer {
  private debugMode: boolean = false
  private isWaitingInput: boolean = false
  
  // Node.js環境でのコンソール入力処理
  private readline?: any
  
  constructor() {
    // Node.js環境でのみreadlineを初期化
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        this.readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        })
      } catch (e) {
        console.warn('readline module not available. Using mock input.')
      }
    }
  }

  // === GameRenderer実装 ===

  async initialize(): Promise<void> {
    this.clear()
    console.log('🎮 保険ゲーム - コンソール版')
    console.log('=' .repeat(50))
  }

  dispose(): void {
    if (this.readline) {
      this.readline.close()
    }
  }

  displayGameState(game: Game): void {
    console.log('\n📊 ゲーム状態')
    console.log(`ステージ: ${game.stage} | ターン: ${game.turn} | フェーズ: ${game.phase}`)
    console.log(`状態: ${game.status}`)
  }

  displayHand(cards: Card[]): void {
    console.log('\n🃏 手札:')
    if (cards.length === 0) {
      console.log('  (手札なし)')
      return
    }
    
    cards.forEach((card, index) => {
      const powerStr = card.power !== undefined ? ` [P:${card.power}]` : ''
      const costStr = card.cost !== undefined ? ` [C:${card.cost}]` : ''
      console.log(`  ${index + 1}. ${card.name}${powerStr}${costStr}`)
    })
  }

  displayChallenge(challenge: Card): void {
    console.log('\n⚔️ チャレンジ:')
    console.log(`  ${challenge.name} (必要パワー: ${challenge.power})`)
    if (challenge.description) {
      console.log(`  説明: ${challenge.description}`)
    }
  }

  displayVitality(current: number, max: number): void {
    const percentage = Math.round((current / max) * 100)
    const barLength = 20
    const filledLength = Math.round((current / max) * barLength)
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
    
    console.log(`\n❤️ 体力: ${current}/${max} (${percentage}%) [${bar}]`)
  }

  displayInsuranceCards(insurances: Card[]): void {
    console.log('\n🛡️ 保険:')
    if (insurances.length === 0) {
      console.log('  (保険なし)')
      return
    }
    
    insurances.forEach((insurance, index) => {
      const costStr = insurance.cost !== undefined ? ` [更新コスト:${insurance.cost}]` : ''
      console.log(`  ${index + 1}. ${insurance.name} (${insurance.type})${costStr}`)
    })
  }

  displayInsuranceBurden(burden: number): void {
    if (burden > 0) {
      console.log(`💰 保険料負担: ${burden}`)
    }
  }

  displayProgress(stage: string, turn: number): void {
    const stageEmoji = this.getStageEmoji(stage)
    console.log(`\n${stageEmoji} 進捗: ${stage} - ターン ${turn}`)
  }

  // === ユーザー入力メソッド ===

  async askCardSelection(
    cards: Card[], 
    minSelection: number = 1, 
    maxSelection: number = 1, 
    message?: string
  ): Promise<Card[]> {
    if (cards.length === 0) {
      console.log('選択可能なカードがありません。')
      return []
    }
    
    console.log(`\n${message || 'カードを選択してください:'}`)
    cards.forEach((card, index) => {
      const powerStr = card.power !== undefined ? ` [P:${card.power}]` : ''
      console.log(`  ${index + 1}. ${card.name}${powerStr}`)
    })
    
    if (minSelection === 0 && maxSelection > 0) {
      console.log('  0. (選択しない)')
    }
    
    const prompt = maxSelection === 1 
      ? `番号を入力 (1-${cards.length}): `
      : `番号を入力 (1-${cards.length}, 複数選択可, カンマ区切り): `
    
    const input = await this.askInput(prompt)
    return this.parseCardSelection(input, cards, minSelection, maxSelection)
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    console.log(`\nチャレンジ「${challenge.name}」に挑戦しますか？`)
    console.log('  1. 挑戦する (start)')
    console.log('  2. スキップ (skip)')
    
    const input = await this.askInput('選択 (1-2): ')
    
    if (input === '1' || input.toLowerCase() === 'start') {
      return 'start'
    }
    return 'skip'
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    console.log('\n保険タイプを選択してください:')
    
    availableTypes.forEach((type, index) => {
      const typeName = type === 'whole_life' ? '終身保険' : '定期保険'
      console.log(`  ${index + 1}. ${typeName} (${type})`)
    })
    
    const input = await this.askInput('選択: ')
    const selectedIndex = parseInt(input) - 1
    
    if (selectedIndex >= 0 && selectedIndex < availableTypes.length) {
      return availableTypes[selectedIndex]
    }
    
    return availableTypes[0] // デフォルト
  }

  async askInsuranceChoice(cards: Card[], message?: string): Promise<Card> {
    const selected = await this.askCardSelection(cards, 1, 1, message)
    return selected[0] || cards[0]
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    console.log(`\n保険「${insurance.name}」の更新 (コスト: ${cost})`)
    console.log('  1. 更新する (renew)')
    console.log('  2. 失効させる (expire)')
    
    const input = await this.askInput('選択 (1-2): ')
    
    if (input === '1' || input.toLowerCase() === 'renew') {
      return 'renew'
    }
    return 'expire'
  }

  async askConfirmation(message: string, defaultChoice: 'yes' | 'no' = 'no'): Promise<'yes' | 'no'> {
    const defaultStr = defaultChoice === 'yes' ? ' [Y/n]' : ' [y/N]'
    const input = await this.askInput(message + defaultStr + ': ')
    
    if (input.toLowerCase() === 'y' || input.toLowerCase() === 'yes') {
      return 'yes'
    }
    if (input.toLowerCase() === 'n' || input.toLowerCase() === 'no') {
      return 'no'
    }
    
    return defaultChoice
  }

  // === フィードバック・メッセージ ===

  showChallengeResult(result: ChallengeResult): void {
    console.log('\n⚔️ チャレンジ結果:')
    console.log(`結果: ${result.success ? '✅ 成功' : '❌ 失敗'}`)
    console.log(`プレイヤーパワー: ${result.playerPower} vs チャレンジパワー: ${result.challengePower}`)
    console.log(`体力変化: ${result.vitalityChange > 0 ? '+' : ''}${result.vitalityChange}`)
    console.log(`メッセージ: ${result.message}`)
    
    if (result.powerBreakdown) {
      console.log('パワー内訳:')
      console.log(`  基本: ${result.powerBreakdown.base}`)
      console.log(`  保険: ${result.powerBreakdown.insurance}`)
      console.log(`  負担: ${result.powerBreakdown.burden}`)
      console.log(`  合計: ${result.powerBreakdown.total}`)
    }
  }

  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    const prefix = level === 'success' ? '✅' : level === 'warning' ? '⚠️' : 'ℹ️'
    console.log(`${prefix} ${message}`)
  }

  showError(error: string): void {
    console.log(`❌ エラー: ${error}`)
  }

  showGameOver(stats: PlayerStats): void {
    console.log('\n💀 ゲームオーバー')
    console.log('=' .repeat(30))
    this.showStats(stats)
  }

  showVictory(stats: PlayerStats): void {
    console.log('\n🎉 ゲームクリア！')
    console.log('=' .repeat(30))
    this.showStats(stats)
  }

  showStageClear(stage: string, stats: PlayerStats): void {
    console.log(`\n🏆 ステージ「${stage}」クリア！`)
    console.log('-' .repeat(30))
    this.showStats(stats)
  }

  // === システム制御 ===

  clear(): void {
    if (typeof process !== 'undefined' && process.stdout.clearLine) {
      console.clear()
    } else {
      console.log('\n' .repeat(50)) // フォールバック
    }
  }

  isWaitingForInput(): boolean {
    return this.isWaitingInput
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    console.log(`🔧 デバッグモード: ${enabled ? 'ON' : 'OFF'}`)
  }

  // === プライベートヘルパーメソッド ===

  private async askInput(prompt: string): Promise<string> {
    this.isWaitingInput = true
    
    try {
      if (this.readline) {
        return new Promise<string>((resolve) => {
          this.readline.question(prompt, (answer: string) => {
            resolve(answer.trim())
          })
        })
      } else {
        // ブラウザ環境やreadlineが利用できない場合のフォールバック
        return window.prompt(prompt) || ''
      }
    } finally {
      this.isWaitingInput = false
    }
  }

  private parseCardSelection(
    input: string, 
    cards: Card[], 
    minSelection: number, 
    maxSelection: number
  ): Card[] {
    if (!input || input === '0') {
      return []
    }
    
    const indices = input.split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < cards.length)
    
    // 重複を除去
    const uniqueIndices = [...new Set(indices)]
    
    // 選択数制限
    const selectedIndices = uniqueIndices.slice(0, maxSelection)
    
    return selectedIndices.map(i => cards[i])
  }

  private showStats(stats: PlayerStats): void {
    console.log(`総チャレンジ数: ${stats.totalChallenges}`)
    console.log(`成功: ${stats.successfulChallenges}`)
    console.log(`失敗: ${stats.failedChallenges}`)
    const successRate = stats.totalChallenges > 0 
      ? Math.round((stats.successfulChallenges / stats.totalChallenges) * 100)
      : 0
    console.log(`成功率: ${successRate}%`)
    console.log(`獲得カード数: ${stats.cardsAcquired}`)
    console.log(`最高体力: ${stats.highestVitality}`)
    console.log(`プレイターン数: ${stats.turnsPlayed}`)
  }

  private getStageEmoji(stage: string): string {
    switch (stage) {
      case 'youth': return '🌱'
      case 'adult': return '💪'
      case 'middle_age': return '👔'
      case 'elderly': return '👴'
      default: return '📍'
    }
  }
}

/**
 * 自動プレイ用レンダラー（ベンチマーク・テスト用）
 */
export class AutoPlayRenderer extends ConsoleRenderer {
  private autoPlayDelay: number = 0 // ミリ秒
  
  constructor(delay: number = 0) {
    super()
    this.autoPlayDelay = delay
  }
  
  async askCardSelection(
    cards: Card[], 
    minSelection: number = 1, 
    maxSelection: number = 1, 
    message?: string
  ): Promise<Card[]> {
    await this.delay()
    
    // 自動選択ロジック（簡単な戦略）
    if (cards.length === 0 || minSelection === 0) {
      return []
    }
    
    // パワーの高いカードを優先選択
    const sortedCards = [...cards].sort((a, b) => (b.power || 0) - (a.power || 0))
    const count = Math.min(maxSelection, Math.max(minSelection, sortedCards.length))
    
    return sortedCards.slice(0, count)
  }
  
  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    await this.delay()
    // 基本的に挑戦する戦略
    return 'start'
  }
  
  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    await this.delay()
    // 終身保険を優先
    return availableTypes.includes('whole_life') ? 'whole_life' : availableTypes[0]
  }
  
  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    await this.delay()
    // コストが低い場合は更新
    return cost <= 3 ? 'renew' : 'expire'
  }
  
  async askConfirmation(message: string, defaultChoice: 'yes' | 'no' = 'no'): Promise<'yes' | 'no'> {
    await this.delay()
    return defaultChoice
  }
  
  private async delay(): Promise<void> {
    if (this.autoPlayDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.autoPlayDelay))
    }
  }
}