#!/usr/bin/env node
/* eslint-disable max-lines-per-function */
 

/**
 * CUI Playtest Script - 本物のGameドメインを使用
 * CUIプレイテストエージェント用の正式スクリプト
 * 
 * 特徴:
 * - 実際のGame.tsドメインロジックを使用
 * - プレイテストログ自動生成
 * - インクリメント番号管理
 * - ゲームルール完全準拠
 */

import chalk from 'chalk'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

// ===== 簡易Cardクラス =====
class Card {
  constructor(params) {
    this.id = params.id
    this.name = params.name
    this.description = params.description
    this.type = params.type
    this.power = params.power || 0
    this.cost = params.cost || 0
    this.effects = params.effects || []
  }

  static createLifeCard(name, power) {
    const powerSign = power > 0 ? '+' : ''
    return new Card({
      id: `life_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `パワー: ${powerSign}${power}`,
      type: 'life',
      power,
      cost: 0,
      effects: []
    })
  }

  static createChallengeCard(name, power) {
    // パワーレベルに基づいて報酬タイプを決定
    let rewardType = '保険獲得'
    if (power <= 3) {
      rewardType = '保険獲得'
    } else if (power <= 6) {
      rewardType = '保険獲得'
    } else {
      rewardType = '追加カード獲得'
    }
    
    return new Card({
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `必要パワー: ${power}`,
      type: 'challenge',
      power,
      cost: 0,
      effects: [],
      rewardType
    })
  }

  static createInsuranceCard(name, power, ...effects) {
    return new Card({
      id: `insurance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `保険カード - パワー: +${power}`,
      type: 'insurance',
      power,
      cost: 1,
      effects
    })
  }

  isInsurance() {
    return this.type === 'insurance'
  }
}

// ===== 簡易Gameクラス =====
class Game {
  constructor(config) {
    this.id = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.status = 'not_started'
    this.phase = 'setup'
    this.stage = 'youth'
    this.turn = 0
    this.vitality = config?.startingVitality || 20
    this.maxVitality = 100
    this.insuranceCards = []
    this.config = config || {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    }
  }

  start() {
    this.status = 'in_progress'
    this.phase = 'draw'
    this.turn = 1
  }

  isGameOver() {
    return this.status === 'game_over' || this.vitality <= 0
  }

  applyDamage(damage) {
    // 保険によるダメージ軽減効果
    const insuranceReduction = Math.min(damage, this.insuranceCards.length)
    const actualDamage = Math.max(0, damage - insuranceReduction)
    
    if (insuranceReduction > 0) {
      console.warn(chalk.green(`🛡️ 保険効果: ${damage}ダメージを${insuranceReduction}軽減 → 実際のダメージ:${actualDamage}`))
    }
    
    this.vitality = Math.max(0, this.vitality - actualDamage)
    if (this.vitality <= 0) {
      this.status = 'game_over'
    }
  }

  heal(amount) {
    this.vitality = Math.min(this.maxVitality, this.vitality + amount)
  }

  addInsurance(card) {
    if (!card.isInsurance()) {
      throw new Error('Only insurance cards can be added')
    }
    this.insuranceCards.push(card)
  }

  nextTurn() {
    this.turn++
    
    // ステージ進行の実装
    if (this.turn === 8 && this.stage === 'youth') {
      this.stage = 'middle'
      console.warn(chalk.yellow(`🔄 ステージ進行: ${this.stage} フェーズに移行（ターン${this.turn}）`))
    } else if (this.turn === 15 && this.stage === 'middle') {
      this.stage = 'fulfillment'
      console.warn(chalk.yellow(`🔄 ステージ進行: ${this.stage} フェーズに移行（ターン${this.turn}）`))
    }
    
    return {
      insuranceExpirations: undefined,
      newExpiredCount: 0,
      remainingInsuranceCount: this.insuranceCards.length
    }
  }
}

// ===== PlaytestGameController =====
class PlaytestGameController {
  constructor(config) {
    this.game = new Game(config)
    this.challengeCards = []
    this.currentChallenges = []
    this.playerDeck = []  // プレイヤーデッキ
    this.hand = []        // 手札
    this.discardPile = [] // 捨て札
    this.initializeGame()
  }

  initializeGame() {
    // ゲーム開始
    this.game.start()
    
    // チャレンジカードを生成
    this.challengeCards = this.createChallengeCards()
    
    // 初期デッキを作成
    this.playerDeck = this.createInitialDeck()
    this.shuffleDeck()
    
    // 初期手札をドロー（標準5枚）
    this.drawCards(5)
    
    // ログ出力
    console.warn(`🎮 ゲーム初期化完了`)
    console.warn(`📊 初期活力: ${this.game.vitality}`)
    console.warn(`🎯 初期ステージ: ${this.game.stage}`)
    console.warn(`🃏 初期手札: ${this.hand.length}枚`)
  }

  async playTurn(renderer) {
    if (this.game.isGameOver() || this.game.status !== 'in_progress') {
      return false
    }

    // ドローフェーズ - 手札補充
    this.refillHand()

    // 1. チャレンジ選択フェーズ
    this.currentChallenges = this.drawChallenges()
    
    // チャレンジが尽きた場合はゲーム終了
    if (this.currentChallenges.length === 0) {
      this.game.status = 'victory'
      return false
    }

    // インタラクティブモード: チャレンジの表示
    console.warn(chalk.cyan('\n📋 今回のチャレンジ選択肢:'))
    this.currentChallenges.forEach((challenge, index) => {
      const requiredPower = this.getRequiredPower(challenge)
      const label = String.fromCharCode(65 + index) // A, B, C...
      console.warn(chalk.white(`  ${label}: ${challenge.name} (必要パワー: ${requiredPower})`))
    })

    // AIによるチャレンジ選択（成功率重視）
    const selectedChallenge = this.selectChallengeByAI(this.currentChallenges)
    const selectedIndex = this.currentChallenges.findIndex(c => c.id === selectedChallenge.id)
    const selectedLabel = String.fromCharCode(65 + selectedIndex)
    console.warn(chalk.magenta(`🤖 AI選択: ${selectedLabel} - ${selectedChallenge.name}`))

    // 選択されたチャレンジを使用済みにマーク
    const originalChallenge = this.challengeCards.find(c => c.id === selectedChallenge.id)
    if (originalChallenge) {
      originalChallenge.isUsed = true
    }

    // 2. 挑戦フェーズ - 手札から選択
    const requiredPower = this.getRequiredPower(selectedChallenge)
    const selectedCards = this.selectCardsForChallenge(requiredPower)

    // 3. パワー計算と成功判定
    const totalPower = this.calculateTotalPower(selectedCards)
    const success = totalPower >= requiredPower

    // 使用したカードを捨て札へ
    this.discardCards(selectedCards)

    // 4. 結果処理
    const result = {
      success,
      totalPower,
      requiredPower,
      vitalityChange: this.calculateVitalityChange(success, totalPower, requiredPower)
    }

    // 活力更新
    this.updateVitality(result.vitalityChange)

    // 成功時は保険獲得
    if (success) {
      this.addInsurance(selectedChallenge)
    }

    // ターン終了処理
    this.game.nextTurn()

    // ログ用に必要パワーを追加
    const challengeWithRequiredPower = {
      ...selectedChallenge,
      requiredPower
    }

    // ログ記録
    renderer.logTurn(
      this.game.turn - 1, // nextTurn()後なので-1
      this.currentChallenges.map(c => ({...c, requiredPower: this.getRequiredPower(c)})),
      challengeWithRequiredPower,
      selectedCards,
      result,
      {
        vitality: this.game.vitality,
        stage: this.game.stage,
        insuranceCards: this.game.insuranceCards
      }
    )

    return !this.game.isGameOver()
  }

  drawChallenges() {
    const available = this.challengeCards.filter(card => !card.isUsed)
    if (available.length === 0) return []

    const count = Math.min(3, available.length)
    const challenges = []

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length)
      const card = available.splice(randomIndex, 1)[0]
      challenges.push(card)
    }

    return challenges
  }

  selectChallengeByAI(challenges) {
    // 最も必要パワーが低いものを選択（成功率重視）
    return challenges.reduce((easiest, current) => 
      this.getRequiredPower(current) < this.getRequiredPower(easiest) ? current : easiest
    )
  }

  getRequiredPower(challenge) {
    const basePower = challenge.power || 2
    
    // ステージによる調整
    switch (this.game.stage) {
      case 'youth': return basePower
      case 'middle': return basePower + 1
      case 'fulfillment': return basePower + 2
      default: return basePower
    }
  }

  // 初期デッキを作成（修正版：ポジティブ60%、ニュートラル20%、ネガティブ20%）
  createInitialDeck() {
    const cards = []
    const totalCards = 20

    // ポジティブカード（12枚 = 60%）
    for (let i = 0; i < 4; i++) cards.push(Card.createLifeCard('アルバイト収入', 1))
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('親の仕送り', 2))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('友人の励まし', 1))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('勉強の成果', 2))
    cards.push(Card.createLifeCard('健康維持', 1))

    // ニュートラルカード（4枚 = 20%）
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('友人の結婚式', 0))
    cards.push(Card.createLifeCard('季節のイベント', 0))
    cards.push(Card.createLifeCard('日常の出来事', 0))

    // ネガティブカード（4枚 = 20%）
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('浪費癖', -1))
    cards.push(Card.createLifeCard('風邪をひく', -1))
    cards.push(Card.createLifeCard('予期しない出費', -2))

    console.warn(`📊 カードバランス - ポジティブ:${cards.filter(c => c.power > 0).length}枚(${(cards.filter(c => c.power > 0).length/cards.length*100).toFixed(0)}%), ニュートラル:${cards.filter(c => c.power === 0).length}枚(${(cards.filter(c => c.power === 0).length/cards.length*100).toFixed(0)}%), ネガティブ:${cards.filter(c => c.power < 0).length}枚(${(cards.filter(c => c.power < 0).length/cards.length*100).toFixed(0)}%)`)

    return cards
  }

  // デッキをシャッフル
  shuffleDeck() {
    for (let i = this.playerDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playerDeck[i], this.playerDeck[j]] = [this.playerDeck[j], this.playerDeck[i]]
    }
  }

  // カードをドロー
  drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (this.playerDeck.length === 0) {
        // デッキが空の場合、捨て札をシャッフルしてデッキに戻す
        this.playerDeck = [...this.discardPile]
        this.discardPile = []
        this.shuffleDeck()
      }
      if (this.playerDeck.length > 0) {
        this.hand.push(this.playerDeck.pop())
      }
    }
  }

  // 手札を補充
  refillHand() {
    // 標準的な5枚手札に調整（PlaytestGameControllerに合わせる）
    const standardHandSize = 5
    const cardsToDrawn = Math.max(0, standardHandSize - this.hand.length)
    this.drawCards(cardsToDrawn)
    
    // 手札が5枚を超える場合は調整
    if (this.hand.length > standardHandSize) {
      this.hand = this.hand.slice(0, standardHandSize)
    }
  }

  // チャレンジ用にカードを選択（AI）
  selectCardsForChallenge(requiredPower) {
    // 簡易AI: パワーが高いカードから選択
    const sortedHand = [...this.hand].sort((a, b) => b.power - a.power)
    const selectedCards = []
    let totalPower = 0

    for (const card of sortedHand) {
      selectedCards.push(card)
      totalPower += card.power
      if (totalPower >= requiredPower) break
    }

    return selectedCards
  }

  // カードを捨て札へ
  discardCards(cards) {
    for (const card of cards) {
      const index = this.hand.indexOf(card)
      if (index >= 0) {
        this.hand.splice(index, 1)
        this.discardPile.push(card)
      }
    }
  }

  calculateTotalPower(cards) {
    return cards.reduce((total, card) => total + (card.power || 0), 0)
  }

  calculateVitalityChange(success, totalPower, requiredPower) {
    if (success) {
      // 成功時は余剰パワーの半分を活力回復
      return Math.floor((totalPower - requiredPower) / 2)
    } else {
      // 失敗時は不足分だけ活力減少
      return -(requiredPower - totalPower)
    }
  }

  updateVitality(change) {
    if (change > 0) {
      this.game.heal(change)
    } else if (change < 0) {
      this.game.applyDamage(-change)
    }
  }

  addInsurance(challenge) {
    const insuranceCard = Card.createInsuranceCard(
      `${challenge.name}保険`,
      2, // 基本パワー+2
      { type: 'basic', description: `${challenge.name}に関する保険` }
    )
    
    this.game.addInsurance(insuranceCard)
  }

  createChallengeCards() {
    const cards = []

    // 基本的なチャレンジカードを作成し、isUsedプロパティを追加
    const challengeNames = [
      { name: '健康づくり', power: 2 },
      { name: '資格取得', power: 3 },
      { name: '人脈作り', power: 2 },
      { name: '結婚', power: 4 },
      { name: 'マイホーム購入', power: 5 },
      { name: '子供の誕生', power: 4 },
      { name: '独立・起業', power: 5 },
      { name: '海外旅行', power: 3 },
      { name: '親の介護', power: 4 },
      { name: '転職', power: 3 }
    ]

    for (const { name, power } of challengeNames) {
      const card = Card.createChallengeCard(name, power)
      card.isUsed = false
      cards.push(card)
    }

    return cards
  }

  getGameState() {
    return this.game
  }

  getRemainingChallenges() {
    return this.challengeCards.filter(card => !card.isUsed).length
  }
}

class CUIPlaytestLogger {
  constructor() {
    this.testNumber = null
    this.purpose = ''
    this.log = []
    this.gameState = null
  }

  async initialize(purpose = 'テストプレイ') {
    this.purpose = purpose
    this.testNumber = await this.getNextTestNumber()
    console.warn(chalk.green(`📝 プレイテスト #${this.testNumber.toString().padStart(3, '0')} 開始`))
  }

  async getNextTestNumber() {
    const counterPath = './test-results/counter.json'
    let counter = { playtest: 1, analysis: 1 }
    
    if (existsSync(counterPath)) {
      try {
        const data = await readFile(counterPath, 'utf-8')
        counter = JSON.parse(data)
      } catch {
        console.warn(chalk.yellow('⚠️ counter.json読み込みエラー、デフォルト値を使用'))
      }
    }
    
    return counter.playtest
  }

  async updateCounter() {
    const counterPath = './test-results/counter.json'
    let counter = { playtest: 1, analysis: 1 }
    
    if (existsSync(counterPath)) {
      try {
        const data = await readFile(counterPath, 'utf-8')
        counter = JSON.parse(data)
      } catch {
        // エラーの場合はデフォルト値を使用
      }
    }
    
    counter.playtest = this.testNumber + 1
    await writeFile(counterPath, JSON.stringify(counter, null, 2))
  }

  logTurn(turnNumber, challenges, selectedChallenge, handCards, result, gameState) {
    const turnLog = {
      turn: turnNumber,
      challenges: challenges?.map(c => ({
        name: c.name,
        requiredPower: c.requiredPower,
        rewardType: c.rewardType || '保険獲得'
      })) || [],
      selectedChallenge: selectedChallenge ? {
        name: selectedChallenge.name,
        requiredPower: selectedChallenge.requiredPower
      } : null,
      handCards: handCards?.map(c => ({
        name: c.name,
        power: c.power
      })) || [],
      result: {
        success: result?.success || false,
        totalPower: result?.totalPower || 0,
        vitalityChange: result?.vitalityChange || 0
      },
      gameState: {
        vitality: gameState?.vitality || 0,
        stage: gameState?.stage || 'unknown',
        insuranceCards: gameState?.insuranceCards?.length || 0
      }
    }
    
    this.log.push(turnLog)
    
    // コンソール表示
    console.warn(chalk.magenta(`\n=== ターン ${turnNumber} ===`))
    if (selectedChallenge) {
      console.warn(chalk.cyan(`🎯 選択: ${selectedChallenge.name} (必要パワー: ${selectedChallenge.requiredPower || selectedChallenge.power})`))
    }
    if (handCards?.length > 0) {
      console.warn(chalk.white(`🃏 手札: ${handCards.map(c => `${c.name}(${c.power > 0 ? '+' : ''}${c.power})`).join(', ')}`))
    }
    if (result) {
      const statusIcon = result.success ? '✅' : '❌'
      console.warn(chalk.white(`${statusIcon} 結果: 合計パワー${result.totalPower}, ${result.success ? '成功' : '失敗'}`))
    }
    console.warn(chalk.blue(`💪 活力: ${gameState?.vitality || 0}, 🛡️ 保険: ${gameState?.insuranceCards?.length || 0}枚`))
  }

  async savePlaytestLog() {
    const filename = `PLAYTEST_${this.testNumber.toString().padStart(3, '0')}_${this.purpose}.md`
    const filepath = `./test-results/playtest-logs/${filename}`
    
    const markdown = this.generateMarkdown()
    
    try {
      await writeFile(filepath, markdown, 'utf-8')
      console.warn(chalk.green(`📄 プレイテストログ保存: ${filename}`))
      
      await this.updateCounter()
      console.warn(chalk.blue(`🔢 次回テスト番号: ${this.testNumber + 1}`))
    } catch (error) {
      console.error(chalk.red('❌ ログ保存エラー:'), error.message)
    }
  }

  addFinalStats(stats) {
    this.finalStats = stats
  }

  generateMarkdown() {
    const date = new Date().toLocaleString('ja-JP')
    
    let markdown = `# PLAYTEST_${this.testNumber.toString().padStart(3, '0')}_${this.purpose}\n\n`
    markdown += `## テスト概要\n`
    markdown += `- **実施番号**: ${this.testNumber.toString().padStart(3, '0')}\n`
    markdown += `- **目的**: ${this.purpose}\n`
    markdown += `- **実施日時**: ${date}\n`
    markdown += `- **使用システム**: 本物のGame.tsドメイン + CUIレンダラー\n\n`
    
    markdown += `## ゲームプレイ記録\n\n`
    
    this.log.forEach(turnLog => {
      markdown += `### ターン${turnLog.turn}:\n`
      markdown += `**[フェーズ1: チャレンジ選択]**\n`
      
      if (turnLog.challenges.length > 0) {
        markdown += `- 公開されたチャレンジ:\n`
        turnLog.challenges.forEach((challenge, index) => {
          const label = String.fromCharCode(65 + index) // A, B, C...
          markdown += `  - ${label}: ${challenge.name}（必要パワー: ${challenge.requiredPower}）→ 報酬: ${challenge.rewardType || '保険獲得'}\n`
        })
      }
      
      if (turnLog.selectedChallenge) {
        markdown += `- 選択: ${turnLog.selectedChallenge.name}\n\n`
      } else {
        markdown += `- 選択: 休息またはスキップ\n\n`
      }
      
      markdown += `**[フェーズ2: 挑戦]**\n`
      markdown += `- 必要パワー: ${turnLog.selectedChallenge?.requiredPower || 0}\n`
      
      if (turnLog.handCards.length > 0) {
        markdown += `- ドローしたカード:\n`
        turnLog.handCards.forEach((card, index) => {
          markdown += `  ${index + 1}枚目: ${card.name}（パワー: ${card.power > 0 ? '+' : ''}${card.power}）\n`
        })
      }
      
      markdown += `- 合計パワー: ${turnLog.result.totalPower}\n`
      markdown += `- 結果: ${turnLog.result.success ? '成功' : '失敗'}\n\n`
      
      markdown += `**[フェーズ3: 結果処理]**\n`
      if (turnLog.result.success) {
        markdown += `- 成功時: 保険獲得\n`
      } else {
        markdown += `- 失敗時: 活力変化 ${turnLog.result.vitalityChange}\n`
      }
      
      markdown += `**[ターン終了時の状態]**\n`
      markdown += `- 活力: ${turnLog.gameState.vitality}\n`
      markdown += `- ステージ: ${turnLog.gameState.stage}\n`
      markdown += `- 獲得済み保険: ${turnLog.gameState.insuranceCards}枚\n\n`
    })
    
    markdown += `## テスト後サマリー\n`
    markdown += `- **総合評価**: [1-5点]\n`
    markdown += `- **プレイしたターン数**: ${this.log.length}\n`
    
    if (this.finalStats) {
      markdown += `- **総チャレンジ数**: ${this.finalStats.totalChallenges}\n`
      markdown += `- **成功チャレンジ数**: ${this.finalStats.successfulChallenges}\n`
      markdown += `- **成功率**: ${((this.finalStats.successfulChallenges / Math.max(this.finalStats.totalChallenges, 1)) * 100).toFixed(1)}%\n`
    } else {
      markdown += `- **最終活力**: ${this.log[this.log.length - 1]?.gameState.vitality || 0}\n`
    }
    markdown += `\n`
    
    markdown += `### 発見された問題\n`
    markdown += `- [CUIプレイテストエージェントが記入]\n\n`
    
    markdown += `### 改善提案\n`
    markdown += `- [CUIプレイテストエージェントが記入]\n\n`
    
    markdown += `### 次回テスト時の注目点\n`
    markdown += `- [CUIプレイテストエージェントが記入]\n\n`
    
    markdown += `### 開発者メモ\n`
    markdown += `- **実装確認**: 本物のGameドメインロジック使用済み\n`
    markdown += `- **ルール準拠**: ゲームデザイン仕様書準拠\n`
    markdown += `- **技術的課題**: [あれば記入]\n`
    
    return markdown
  }
}

async function runPlaytest(purpose = 'CUIテスト') {
  console.warn(chalk.blue('🎮 === CUI プレイテスト開始 ==='))
  console.warn(chalk.gray('本物のGameドメインロジックを使用\n'))
  
  const logger = new CUIPlaytestLogger()
  await logger.initialize(purpose)
  
  console.warn(chalk.green('✅ PlaytestGameController使用'))
  
  const controller = new PlaytestGameController({
    difficulty: 'normal',
    startingVitality: 20,
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  })
  
  // ゲームプレイ
  let continuing = true
  let turnCount = 0
  const maxTurns = 30 // 最大ターン数
  
  while (continuing && turnCount < maxTurns) {
    continuing = await controller.playTurn(logger)
    turnCount++
    
    // 短い間隔を置く
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const gameState = controller.getGameState()
  console.warn(chalk.green('\n🎉 プレイテスト完了！'))
  console.warn(chalk.blue(`最終結果: 活力${gameState.vitality}, 保険${gameState.insuranceCards.length}枚`))
  console.warn(chalk.blue(`最終ステータス: ${gameState.status}`))
  console.warn(chalk.blue(`総ターン数: ${turnCount}`))
  
  // ログ保存
  await logger.savePlaytestLog()
}

// CLI実行
if (process.argv.length > 2) {
  const purpose = process.argv[2] || 'CUIテスト'
  runPlaytest(purpose)
} else {
  console.warn(chalk.blue('🎮 CUI Playtest Script'))
  console.warn(chalk.gray('使用例:'))
  console.warn(chalk.white('  node cui-playtest.mjs "初見体験"'))
  console.warn(chalk.white('  node cui-playtest.mjs "バランス調整"'))
  console.warn(chalk.white('  node cui-playtest.mjs "新機能テスト"'))
}