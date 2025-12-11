import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../Game'
import { Card } from '../Card'
import { CardFactory } from '../../services/CardFactory'
import type { GameConfig } from '../../types/game.types'

describe('Game - Phase 4: 夢カードの年齢調整', () => {
  let game: Game
  const config: GameConfig = {
    difficulty: 'normal',
    startingVitality: 25,
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }

  beforeEach(() => {
    game = new Game(config)
  })

  describe('getDreamRequiredPower', () => {
    it('通常のチャレンジカードは調整なし', () => {
      const normalChallenge = new Card({
        id: 'test1',
        name: 'テストチャレンジ',
        description: 'テスト',
        type: 'life',
        power: 10,
        cost: 0,
        effects: []
      })

      // どの年齢でも基本パワーのまま
      expect(game.getDreamRequiredPower(normalChallenge)).toBe(10)
    })

    it('青年期は夢カードでも調整なし', () => {
      const dreamChallenge = new Card({
        id: 'test2',
        name: '就職活動',
        description: '新たなキャリアの始まり',
        type: 'life', // Corrected to 'life' as per original intention, but has dreamCategory
        power: 5,
        cost: 0,
        effects: [],
        dreamCategory: 'physical'
      })

      game.setStage('youth')
      expect(game.getDreamRequiredPower(dreamChallenge)).toBe(5)
    })

    it('中年期・充実期で体力系夢カードは難しくなる', () => {
      const physicalDream = new Card({
        id: 'test3',
        name: '子育て',
        description: '家族の成長',
        type: 'life',
        power: 8,
        cost: 0,
        effects: [],
        dreamCategory: 'physical'
      })

      // 中年期: +3
      game.setStage('middle')
      expect(game.getDreamRequiredPower(physicalDream)).toBe(11) // 8 + 3

      // 充実期: +3
      game.setStage('fulfillment')
      expect(game.getDreamRequiredPower(physicalDream)).toBe(11) // 8 + 3
    })

    it('中年期・充実期で知識系夢カードは易しくなる', () => {
      const intellectualDream = new Card({
        id: 'test4',
        name: '資格試験',
        description: 'スキルアップのチャンス',
        type: 'life',
        power: 6,
        cost: 0,
        effects: [],
        dreamCategory: 'intellectual'
      })

      // 中年期: -2
      game.setStage('middle')
      expect(game.getDreamRequiredPower(intellectualDream)).toBe(4) // 6 - 2

      // 充実期: -2
      game.setStage('fulfillment')
      expect(game.getDreamRequiredPower(intellectualDream)).toBe(4) // 6 - 2
    })

    it('複合系夢カードは調整なし', () => {
      const mixedDream = new Card({
        id: 'test5',
        name: '親の介護',
        description: '家族の支え合い',
        type: 'life',
        power: 9,
        cost: 0,
        effects: [],
        dreamCategory: 'mixed'
      })

      // どの年齢でも調整なし
      game.setStage('middle')
      expect(game.getDreamRequiredPower(mixedDream)).toBe(9)

      game.setStage('fulfillment')
      expect(game.getDreamRequiredPower(mixedDream)).toBe(9)
    })

    it('調整後のパワーは最小値1を保証', () => {
      const weakIntellectualDream = new Card({
        id: 'test6',
        name: '弱い知識系チャレンジ',
        description: 'テスト',
        type: 'life',
        power: 2, // 基本パワー2
        cost: 0,
        effects: [],
        dreamCategory: 'intellectual'
      })

      // 中年期: 2 - 2 = 0 → 1に調整
      game.setStage('middle')
      expect(game.getDreamRequiredPower(weakIntellectualDream)).toBe(1)
    })
  })

  describe('CardFactory - 夢カードカテゴリーの設定', () => {
    it('各ステージのチャレンジカードに適切なカテゴリーが設定される', () => {
      // 青年期
      const youthChallenges = CardFactory.createChallengeCards('youth')
      const jobHunt = youthChallenges.find(c => c.name === '就職活動')
      const livingAlone = youthChallenges.find(c => c.name === '一人暮らし')
      const qualification = youthChallenges.find(c => c.name === '資格試験')

      if (jobHunt) expect(jobHunt.dreamCategory).toBe('physical')
      if (livingAlone) expect(livingAlone.dreamCategory).toBe('physical')
      if (qualification) expect(qualification.dreamCategory).toBe('intellectual')

      // 中年期
      const middleChallenges = CardFactory.createChallengeCards('middle')
      const childRearing = middleChallenges.find(c => c.name === '子育て')
      const housePurchase = middleChallenges.find(c => c.name === '住宅購入')
      const parentCare = middleChallenges.find(c => c.name === '親の介護')

      if (childRearing) expect(childRearing.dreamCategory).toBe('physical')
      if (housePurchase) expect(housePurchase.dreamCategory).toBe('physical')
      if (parentCare) expect(parentCare.dreamCategory).toBe('mixed')

      // 充実期
      const fulfillmentChallenges = CardFactory.createChallengeCards('fulfillment')
      const retirement = fulfillmentChallenges.find(c => c.name === '定年退職')
      const healthManagement = fulfillmentChallenges.find(c => c.name === '健康管理')

      if (retirement) expect(retirement.dreamCategory).toBe('intellectual')
      if (healthManagement) expect(healthManagement.dreamCategory).toBe('mixed')
    })
  })

  describe('resolveChallenge - 年齢調整の適用', () => {
    beforeEach(async () => {
      game.start() // Sets phase to character_selection
      game.selectCharacter('solid') // Proceed to dream_selection

      // Select a dream from the actual choices generated by the game
      const choices = game.cardChoices
      if (!choices || choices.length === 0) {
        throw new Error('No dream choices available in game')
      }
      const dreamCard = choices[0]!
      await game.selectDream(dreamCard) // Proceed to draw

      // 手札に強力なカードを追加
      const powerfulCard = new Card({
        id: 'powerful',
        name: '強力カード',
        description: 'テスト',
        type: 'life',
        power: 15,
        cost: 1,
        effects: []
      })
      game.setHand([powerfulCard])
    })

    it('夢カードのチャレンジで年齢調整が適用される', () => {
      // 中年期に移行
      game.setStage('middle')

      // 体力系夢カード（基本パワー8）
      const physicalDream = new Card({
        id: 'test_dream',
        name: '子育て',
        description: '家族の成長',
        type: 'life',
        power: 8,
        cost: 0,
        effects: [],
        dreamCategory: 'physical'
      })

      game.startChallenge(physicalDream)
      game.toggleCardSelection(game.hand[0]!)

      const result = game.resolveChallenge()

      // プレイヤーパワー15 vs チャレンジパワー11（8+3）
      expect(result.success).toBe(true)
      expect(result.challengePower).toBe(11)
    })

    it('知識系夢カードは年齢で易しくなる', () => {
      // 充実期に移行
      game.setStage('fulfillment')

      // 知識系夢カード（基本パワー12）
      const intellectualDream = new Card({
        id: 'test_dream2',
        name: '定年退職',
        description: '新しい人生のスタート',
        type: 'life',
        power: 12,
        cost: 0,
        effects: [],
        dreamCategory: 'intellectual'
      })

      game.startChallenge(intellectualDream)
      game.toggleCardSelection(game.hand[0]!)

      const result = game.resolveChallenge()

      // プレイヤーパワー15 vs チャレンジパワー10（12-2）
      expect(result.success).toBe(true)
      expect(result.challengePower).toBe(10)
    })
  })
})