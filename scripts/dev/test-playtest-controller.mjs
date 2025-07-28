#!/usr/bin/env node

/**
 * PlaytestGameControllerの動作確認用スクリプト
 * TypeScriptビルドなしで直接テスト
 */

import chalk from 'chalk'

// ===== Cardクラスの簡易実装 =====
class Card {
  constructor(params) {
    this.id = params.id
    this.name = params.name
    this.description = params.description
    this.type = params.type
    this.power = params.power || 0
    this.cost = params.cost || 0
    this.effects = params.effects || []
    this.isUsed = undefined
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
    return new Card({
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `必要パワー: ${power}`,
      type: 'challenge',
      power,
      cost: 0,
      effects: []
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
      effects: effects
    })
  }

  isInsurance() {
    return this.type === 'insurance'
  }
}

// ===== Gameクラスの簡易実装 =====
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
    this.vitality = Math.max(0, this.vitality - damage)
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
    this.initializeGame()
  }

  initializeGame() {
    // ゲーム開始
    this.game.start()
    
    // チャレンジカードを生成
    this.challengeCards = this.createChallengeCards()
    
    // ログ出力
    console.log(`🎮 ゲーム初期化完了`)
    console.log(`📊 初期活力: ${this.game.vitality}`)
    console.log(`🎯 初期ステージ: ${this.game.stage}`)
  }

  async playTurn(renderer) {
    if (this.game.isGameOver() || this.game.status !== 'in_progress') {
      return false
    }

    // 1. チャレンジ選択フェーズ
    this.currentChallenges = this.drawChallenges()
    
    // チャレンジが尽きた場合はゲーム終了
    if (this.currentChallenges.length === 0) {
      this.game.status = 'victory'
      return false
    }

    // AIによるチャレンジ選択（ランダム）
    const selectedChallenge = this.selectChallengeByAI(this.currentChallenges)

    // 選択されたチャレンジを使用済みにマーク
    const originalChallenge = this.challengeCards.find(c => c.id === selectedChallenge.id)
    if (originalChallenge) {
      originalChallenge.isUsed = true
    }

    // 2. 挑戦フェーズ - 手札ドロー
    const requiredPower = this.getRequiredPower(selectedChallenge)
    const handCards = this.drawHandCards(requiredPower)

    // 3. パワー計算と成功判定
    const totalPower = this.calculateTotalPower(handCards)
    const success = totalPower >= requiredPower

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

    // ログ記録
    renderer.logTurn(
      this.game.turn - 1, // nextTurn()後なので-1
      this.currentChallenges,
      selectedChallenge,
      handCards,
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

  drawHandCards(requiredPower) {
    const handCards = []
    const cardPool = this.createLifeCardPool()

    // 必要パワー分だけカードをドロー
    for (let i = 0; i < requiredPower; i++) {
      const randomIndex = Math.floor(Math.random() * cardPool.length)
      handCards.push(cardPool[randomIndex])
    }

    return handCards
  }

  createLifeCardPool() {
    const cards = []

    // ポジティブカード（8枚）
    for (let i = 0; i < 4; i++) cards.push(Card.createLifeCard('アルバイト収入', 1))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('親の仕送り', 2))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('友人の励まし', 1))

    // ネガティブカード（10枚）
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('浪費癖', -1))
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('衝動買い', 0))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('ギャンブル', -1))
    cards.push(Card.createLifeCard('友人の結婚式', 0))
    cards.push(Card.createLifeCard('風邪をひく', 0))

    return cards
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

// ===== テスト実行 =====
console.log(chalk.blue('🧪 PlaytestGameController動作テスト開始'))

const mockRenderer = {
  logTurn(turnNumber, challenges, selectedChallenge, handCards, result, gameState) {
    console.log(chalk.magenta(`\n=== ターン ${turnNumber} ===`))
    console.log(chalk.cyan(`🎯 選択: ${selectedChallenge.name} (必要パワー: ${result.requiredPower})`))
    console.log(chalk.white(`🃏 手札: ${handCards.map(c => `${c.name}(${c.power > 0 ? '+' : ''}${c.power})`).join(', ')}`))
    
    const statusIcon = result.success ? '✅' : '❌'
    console.log(chalk.white(`${statusIcon} 結果: 合計パワー${result.totalPower}, ${result.success ? '成功' : '失敗'}`))
    console.log(chalk.blue(`💪 活力: ${gameState.vitality}, 🛡️ 保険: ${gameState.insuranceCards.length}枚`))
  }
}

const controller = new PlaytestGameController({
  difficulty: 'normal',
  startingVitality: 20,
  startingHandSize: 5,
  maxHandSize: 10,
  dreamCardCount: 3
})

// 10ターンプレイ
async function runTest() {
  let continuing = true
  let turnCount = 0
  const maxTurns = 10

  while (continuing && turnCount < maxTurns) {
    continuing = await controller.playTurn(mockRenderer)
    turnCount++
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const gameState = controller.getGameState()
  console.log(chalk.green('\n🎉 テスト完了！'))
  console.log(chalk.blue(`最終結果: 活力${gameState.vitality}, 保険${gameState.insuranceCards.length}枚`))
  console.log(chalk.blue(`最終ステータス: ${gameState.status}`))
  console.log(chalk.blue(`残りチャレンジ: ${controller.getRemainingChallenges()}枚`))
}

runTest()