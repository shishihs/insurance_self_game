import { describe, expect, it } from 'vitest'
import { Challenge } from '../Challenge'
import { ChallengeId } from '../ChallengeId'
import { Card } from '../../../entities/Card'
import { CardPower } from '../../../valueObjects/CardPower'
import { CardSelectedForChallengeEvent, ChallengeResolvedEvent } from '../events'

describe('Challenge集約', () => {
  const createChallengeCard = (power: number): Card => {
    return Card.createChallengeCard(`challenge_${power}`, 'テストチャレンジ', CardPower.create(power))
  }

  const createLifeCard = (power: number): Card => {
    return Card.createLifeCard(`life_${power}`, 'テストライフカード', CardPower.create(power))
  }

  describe('チャレンジの生成', () => {
    it('チャレンジカードから生成できる', () => {
      const challengeCard = createChallengeCard(30)
      const challenge = Challenge.create(challengeCard)
      
      expect(challenge).toBeDefined()
      expect(challenge.getId()).toBeInstanceOf(ChallengeId)
      expect(challenge.getChallengeCard()).toBe(challengeCard)
      expect(challenge.getRequiredPower().getValue()).toBe(30)
      expect(challenge.getStatus()).toBe('in_progress')
    })
  })

  describe('カード選択', () => {
    it('進行中のチャレンジではカードを選択できる', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      const lifeCard = createLifeCard(10)
      
      const events = challenge.selectCard(lifeCard)
      
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(CardSelectedForChallengeEvent)
      expect(events[0].cardId).toBe(lifeCard.id)
      expect(challenge.getSelectedCards()).toContain(lifeCard)
    })

    it('同じカードを再度選択すると選択解除される', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      const lifeCard = createLifeCard(10)
      
      // 選択
      challenge.selectCard(lifeCard)
      expect(challenge.getSelectedCards()).toContain(lifeCard)
      
      // 選択解除
      const events = challenge.deselectCard(lifeCard)
      expect(events).toHaveLength(1)
      expect(challenge.getSelectedCards()).not.toContain(lifeCard)
    })

    it('解決済みのチャレンジではカードを選択できない', () => {
      const challenge = Challenge.create(createChallengeCard(10))
      const lifeCard = createLifeCard(20)
      
      // チャレンジを解決
      challenge.selectCard(lifeCard)
      challenge.resolve()
      
      // 解決後の選択は失敗
      expect(() => challenge.selectCard(createLifeCard(5)))
        .toThrow('Challenge is already resolved')
    })
  })

  describe('チャレンジの解決', () => {
    it('十分なパワーで成功する', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      challenge.selectCard(createLifeCard(20))
      challenge.selectCard(createLifeCard(15))
      
      const result = challenge.resolve()
      
      expect(result.isSuccess()).toBe(true)
      expect(result.getTotalPower().getValue()).toBe(35)
      expect(result.getRequiredPower().getValue()).toBe(30)
      expect(challenge.getStatus()).toBe('resolved')
    })

    it('不足パワーで失敗する', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      challenge.selectCard(createLifeCard(10))
      challenge.selectCard(createLifeCard(10))
      
      const result = challenge.resolve()
      
      expect(result.isSuccess()).toBe(false)
      expect(result.getTotalPower().getValue()).toBe(20)
      expect(result.getRequiredPower().getValue()).toBe(30)
    })

    it('カードを選択せずに解決すると失敗する', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      
      const result = challenge.resolve()
      
      expect(result.isSuccess()).toBe(false)
      expect(result.getTotalPower().getValue()).toBe(0)
    })

    it('解決時にイベントが発行される', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      challenge.selectCard(createLifeCard(40))
      
      const events = challenge.getUncommittedEvents()
      const initialEventCount = events.length
      
      challenge.resolve()
      
      const newEvents = challenge.getUncommittedEvents()
      expect(newEvents.length).toBe(initialEventCount + 1)
      expect(newEvents[newEvents.length - 1]).toBeInstanceOf(ChallengeResolvedEvent)
    })

    it('解決済みチャレンジは再度解決できない', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      challenge.selectCard(createLifeCard(40))
      challenge.resolve()
      
      expect(() => challenge.resolve())
        .toThrow('Challenge is already resolved')
    })
  })

  describe('選択パワーの計算', () => {
    it('選択されたカードのパワーを合計する', () => {
      const challenge = Challenge.create(createChallengeCard(50))
      challenge.selectCard(createLifeCard(20))
      challenge.selectCard(createLifeCard(15))
      challenge.selectCard(createLifeCard(10))
      
      const totalPower = challenge.calculateSelectedPower()
      expect(totalPower.getValue()).toBe(45)
    })

    it('カードが選択されていない場合は0', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      
      const totalPower = challenge.calculateSelectedPower()
      expect(totalPower.getValue()).toBe(0)
    })
  })

  describe('チャレンジの状態', () => {
    it('作成時は進行中状態', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      expect(challenge.isInProgress()).toBe(true)
      expect(challenge.isResolved()).toBe(false)
    })

    it('解決後は解決済み状態', () => {
      const challenge = Challenge.create(createChallengeCard(30))
      challenge.selectCard(createLifeCard(40))
      challenge.resolve()
      
      expect(challenge.isInProgress()).toBe(false)
      expect(challenge.isResolved()).toBe(true)
    })
  })
})