import { describe, test, expect, beforeEach } from 'vitest'
import { Card } from '../entities/Card'
import { CardFactory } from '../services/CardFactory'
import { SkillSystemService } from '../services/SkillSystemService'
import { AchievementSystemService, type PlayerAchievements } from '../services/AchievementSystemService'
import { PlayerProgressionService, type PlayerProgression } from '../services/PlayerProgressionService'
import { DifficultyBalanceService } from '../services/DifficultyBalanceService'
import { ReplayabilityService } from '../services/ReplayabilityService'

describe('ゲームメカニクスバランステスト', () => {
  let playerProgression: PlayerProgression
  let playerAchievements: PlayerAchievements

  beforeEach(() => {
    playerProgression = PlayerProgressionService.createInitialProgression()
    playerAchievements = AchievementSystemService.createInitialPlayerAchievements()
  })

  describe('新しいカードタイプのバランス', () => {
    test('スキルカードのパワーバランスが適切', () => {
      const commonSkill = Card.createSkillCard('基本スキル', 'common', 3)
      const rareSkill = Card.createSkillCard('レアスキル', 'rare', 5)
      const epicSkill = Card.createSkillCard('エピックスキル', 'epic', 8)
      const legendarySkill = Card.createSkillCard('レジェンダリースキル', 'legendary', 12)

      // レア度に応じたパワー設定が妥当か
      expect(commonSkill.power).toBeLessThan(rareSkill.power)
      expect(rareSkill.power).toBeLessThan(epicSkill.power)
      expect(epicSkill.power).toBeLessThan(legendarySkill.power)

      // 効果的パワーの計算（レア度ボーナス込み）
      const commonEffective = SkillSystemService.calculateEffectivePower(commonSkill)
      const legendaryEffective = SkillSystemService.calculateEffectivePower(legendarySkill)
      
      expect(legendaryEffective).toBeGreaterThan(commonEffective * 2)
      expect(legendaryEffective).toBeLessThan(commonEffective * 4) // 極端すぎない
    })

    test('コンボカードの効果が適切', () => {
      const combo = Card.createComboCard('テストコンボ', 3, ['health', 'career'], 5)
      
      expect(combo.power).toBe(3)
      expect(combo.comboProperties?.comboBonus).toBe(5)
      expect(combo.comboProperties?.requiredCards).toContain('health')
      expect(combo.comboProperties?.requiredCards).toContain('career')
    })

    test('イベントカードの持続効果が適切', () => {
      const shortEvent = Card.createEventCard('短期イベント', 4, 2)
      const longEvent = Card.createEventCard('長期イベント', 6, 5)

      // 長期間のイベントは効果が高い
      expect(longEvent.power).toBeGreaterThan(shortEvent.power)
      expect(longEvent.eventProperties?.duration).toBe(5)
      expect(shortEvent.eventProperties?.duration).toBe(2)
    })
  })

  describe('スキルシステムのバランス', () => {
    test('スキル熟練度システムが適切に機能', () => {
      let skill = Card.createSkillCard('テストスキル', 'common', 5)
      const originalPower = skill.power

      // レベル2への成長
      skill = SkillSystemService.improveMastery(skill)
      expect(skill.skillProperties?.masteryLevel).toBe(2)
      expect(skill.power).toBeGreaterThan(originalPower)

      // レベル5への成長（複数回実行）
      for (let i = 3; i <= 5; i++) {
        skill = SkillSystemService.improveMastery(skill)
      }
      expect(skill.skillProperties?.masteryLevel).toBe(5)
      
      // 最大レベルでは成長しない
      const maxLevelSkill = SkillSystemService.improveMastery(skill)
      expect(maxLevelSkill.skillProperties?.masteryLevel).toBe(5)
    })

    test('クールダウンシステムが正常に動作', () => {
      const skill = Card.createSkillCard('クールダウンスキル', 'rare', 6, 3)
      
      // 使用前はクールダウンなし
      expect(SkillSystemService.canUseSkill(skill)).toBe(true)
      
      // 使用後はクールダウン開始
      const usedSkill = SkillSystemService.useSkill(skill)
      expect(usedSkill.skillProperties?.remainingCooldown).toBe(3)
      expect(SkillSystemService.canUseSkill(usedSkill)).toBe(false)
      
      // クールダウン処理
      let coolingSkill = usedSkill
      for (let turn = 0; turn < 3; turn++) {
        coolingSkill = SkillSystemService.processSkillCooldowns([coolingSkill])[0]
      }
      expect(SkillSystemService.canUseSkill(coolingSkill)).toBe(true)
    })
  })

  describe('アチーブメントシステムのバランス', () => {
    test('アチーブメント報酬が適切', () => {
      const achievements = AchievementSystemService.getAllAchievements()
      
      // 基本的なアチーブメントの報酬は控えめ
      const firstVictory = achievements.find(a => a.id === 'first_victory')
      expect(firstVictory?.reward.experience).toBeLessThan(200)
      
      // 高難易度アチーブメントの報酬は高い
      const lifeMaster = achievements.find(a => a.id === 'life_master')
      expect(lifeMaster?.reward.experience).toBeGreaterThan(3000)
      
      // 永続ボーナスを持つアチーブメント
      const challengeStreak = achievements.find(a => a.id === 'challenge_streak_5')
      expect(challengeStreak?.reward.permanentBonus).toBeDefined()
      expect(challengeStreak?.reward.permanentBonus?.value).toBeGreaterThan(0)
    })

    test('アチーブメント進捗が正確に計算される', () => {
      const stats = { 
        successfulChallenges: 3,
        totalChallenges: 5,
        failedChallenges: 2,
        cardsAcquired: 15,
        highestVitality: 120,
        turnsPlayed: 25
      }
      const gameData = { consecutiveSuccesses: 2 }

      const updated = AchievementSystemService.updateProgress(
        playerAchievements,
        stats,
        gameData
      )

      // 初勝利アチーブメントが達成されているはず
      const firstVictory = updated.achievements.find(a => a.id === 'first_victory')
      expect(firstVictory?.isUnlocked).toBe(true)
      expect(updated.totalExperience).toBeGreaterThan(0)
    })
  })

  describe('プレイヤー進行システムのバランス', () => {
    test('レベルアップ曲線が適切', () => {
      // 初期レベルから複数回レベルアップ
      let progression = playerProgression
      let totalExp = 0

      for (let level = 1; level <= 10; level++) {
        const expNeeded = progression.level.experienceToNext
        expect(expNeeded).toBeGreaterThan(0)
        
        // 経験値を追加してレベルアップ
        const result = PlayerProgressionService.addExperience(progression, expNeeded)
        progression = result.updatedProgression
        totalExp += expNeeded

        // レベルが上がるにつれて必要経験値も増加
        if (level > 1) {
          expect(expNeeded).toBeGreaterThan(100) // 最低限の経験値要求
        }
      }

      expect(progression.level.currentLevel).toBe(10)
    })

    test('活力ボーナスが累積される', () => {
      const level5Bonus = PlayerProgressionService.calculateVitalityBonus(5)
      const level10Bonus = PlayerProgressionService.calculateVitalityBonus(10)
      const level15Bonus = PlayerProgressionService.calculateVitalityBonus(15)

      expect(level10Bonus).toBeGreaterThan(level5Bonus)
      expect(level15Bonus).toBeGreaterThan(level10Bonus)
      
      // 活力ボーナスが合理的な範囲内
      expect(level15Bonus).toBeLessThan(200) // 極端すぎない
    })
  })

  describe('難易度バランスシステム', () => {
    test('動的難易度調整が機能', () => {
      // 高成功率プレイヤー（難易度を上げる）
      const highPerformer = [0.9, 0.8, 0.9, 0.85, 0.9]
      const hardDifficulty = DifficultyBalanceService.calculateDynamicDifficulty(
        playerProgression,
        playerAchievements,
        'youth',
        highPerformer
      )
      expect(hardDifficulty.adjustmentFactor).toBeGreaterThan(0)

      // 低成功率プレイヤー（難易度を下げる）
      const lowPerformer = [0.2, 0.1, 0.3, 0.2, 0.25]
      const easyDifficulty = DifficultyBalanceService.calculateDynamicDifficulty(
        playerProgression,
        playerAchievements,
        'youth',
        lowPerformer
      )
      expect(easyDifficulty.adjustmentFactor).toBeLessThan(0)
    })

    test('チャレンジパワー調整が適切', () => {
      const basePower = 10
      const difficulty = DifficultyBalanceService.createInitialDifficulty()
      
      // 通常難易度
      const normalAdjustment = DifficultyBalanceService.adjustChallengePower(basePower, difficulty, 5)
      expect(normalAdjustment.adjustedPower).toBeCloseTo(basePower, 2)

      // 高難易度設定
      const hardDifficulty = { ...difficulty, baseDifficulty: 'hard' as const }
      const hardAdjustment = DifficultyBalanceService.adjustChallengePower(basePower, hardDifficulty, 5)
      expect(hardAdjustment.adjustedPower).toBeGreaterThan(normalAdjustment.adjustedPower)
    })
  })

  describe('再プレイ性システム', () => {
    test('日替りチャレンジが一意に生成される', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-02')
      
      const challenge1 = ReplayabilityService.generateDailyChallenge(date1)
      const challenge2 = ReplayabilityService.generateDailyChallenge(date2)
      
      expect(challenge1.id).not.toBe(challenge2.id)
      expect(challenge1.date).not.toBe(challenge2.date)
    })

    test('プレイスタイル分析が機能', () => {
      const gameHistory = [
        { mode: 'story' as const, cardsUsed: ['health', 'career'], strategy: 'balanced', result: 'victory' as const, duration: 300 },
        { mode: 'story' as const, cardsUsed: ['health', 'finance'], strategy: 'defensive', result: 'victory' as const, duration: 450 },
        { mode: 'challenge' as const, cardsUsed: ['skill', 'combo'], strategy: 'aggressive', result: 'defeat' as const, duration: 200 },
        { mode: 'story' as const, cardsUsed: ['family', 'hobby'], strategy: 'balanced', result: 'victory' as const, duration: 350 },
        { mode: 'story' as const, cardsUsed: ['health', 'insurance'], strategy: 'defensive', result: 'victory' as const, duration: 400 }
      ]

      const analysis = ReplayabilityService.analyzePlayStyle(gameHistory)
      
      expect(analysis.primaryStyle).toBeDefined()
      expect(analysis.preferences.favoriteCardTypes).toContain('health')
      expect(analysis.preferences.preferredGameLength).toBeDefined()
      expect(analysis.recommendations).toBeInstanceOf(Array)
    })

    test('ランダムイベントの出現率が適切', () => {
      let eventCount = 0
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        const event = ReplayabilityService.generateRandomEvent(
          'youth',
          10,
          DifficultyBalanceService.createInitialDifficulty()
        )
        if (event) eventCount++
      }

      const eventRate = eventCount / iterations
      expect(eventRate).toBeGreaterThan(0.05) // 最低5%
      expect(eventRate).toBeLessThan(0.5)     // 最高50%
    })
  })

  describe('統合バランステスト', () => {
    test('全システムの相互作用が適切', () => {
      // 高レベルプレイヤーのシミュレーション
      let progression = playerProgression
      let achievements = playerAchievements

      // レベル20まで成長
      const { updatedProgression } = PlayerProgressionService.addExperience(progression, 10000)
      progression = updatedProgression

      // いくつかのアチーブメントを達成
      const stats = { 
        successfulChallenges: 25,
        totalChallenges: 30,
        failedChallenges: 5,
        cardsAcquired: 50,
        highestVitality: 150,
        turnsPlayed: 100
      }
      achievements = AchievementSystemService.updateProgress(achievements, stats, {})

      // 難易度調整
      const difficulty = DifficultyBalanceService.calculateDynamicDifficulty(
        progression,
        achievements,
        'middle'
      )

      // 高レベルプレイヤーには適切な難易度が設定される
      expect(difficulty.baseDifficulty).not.toBe('easy')
      expect(progression.level.currentLevel).toBeGreaterThan(15)
      expect(achievements.totalExperience).toBeGreaterThan(0)
    })

    test('ゲーム経済のインフレが制御されている', () => {
      // 異なるレベルでの報酬を比較
      const lowLevelReward = PlayerProgressionService.calculateExperienceBonus(100, 'challenge_success', 1)
      const highLevelReward = PlayerProgressionService.calculateExperienceBonus(100, 'challenge_success', 25)

      // 高レベルでは経験値効率が下がることを確認
      expect(highLevelReward).toBeLessThan(lowLevelReward)
    })
  })

  describe('エッジケースとエラーハンドリング', () => {
    test('無効なスキル操作のエラーハンドリング', () => {
      const nonSkillCard = Card.createLifeCard('通常カード', 3)
      
      expect(() => SkillSystemService.useSkill(nonSkillCard)).toThrow()
      expect(() => SkillSystemService.improveMastery(nonSkillCard)).toThrow()
    })

    test('極端な値での安定性', () => {
      // 極端に高い経験値
      const result = PlayerProgressionService.addExperience(playerProgression, 1000000)
      expect(result.updatedProgression.level.currentLevel).toBeLessThanOrEqual(30)

      // 極端に高いチャレンジパワー
      const extremeDifficulty = DifficultyBalanceService.createInitialDifficulty()
      const adjustment = DifficultyBalanceService.adjustChallengePower(10000, extremeDifficulty, 1)
      expect(adjustment.adjustedPower).toBeGreaterThan(0)
      expect(adjustment.adjustedPower).toBeLessThan(50000) // 現実的な範囲
    })
  })
})

describe('面白さとエンゲージメントのテスト', () => {
  test('プレイヤーの成長実感が適切', () => {
    const progression = PlayerProgressionService.createInitialProgression()
    
    // 複数回の経験値獲得
    const growthPoints = [100, 250, 500, 750, 1000]
    let currentProgression = progression
    
    growthPoints.forEach((exp, index) => {
      const result = PlayerProgressionService.addExperience(currentProgression, exp)
      currentProgression = result.updatedProgression
      
      // レベルアップ時には報酬がある
      if (result.levelUps.length > 0) {
        expect(result.levelUps[0].vitalityBonus).toBeGreaterThan(0)
      }
      
      // 進捗を実感できる
      expect(currentProgression.level.currentLevel).toBeGreaterThanOrEqual(progression.level.currentLevel)
    })
  })

  test('多様な戦略の有効性', () => {
    // 異なる戦略でのカード組み合わせ
    const defensiveStrategy = [
      Card.createInsuranceCard('医療保険', 4),
      Card.createLifeCard('健康管理', 3),
      Card.createSkillCard('リスク回避', 'common', 2)
    ]

    const aggressiveStrategy = [
      Card.createSkillCard('集中力', 'rare', 6),
      Card.createComboCard('パワーコンボ', 4, ['skill', 'life'], 6),
      Card.createLifeCard('挑戦', 5)
    ]

    // 両戦略共に一定の効果を持つ
    const defensiveTotal = defensiveStrategy.reduce((sum, card) => sum + card.power, 0)
    const aggressiveTotal = aggressiveStrategy.reduce((sum, card) => sum + card.power, 0)

    expect(defensiveTotal).toBeGreaterThan(5)
    expect(aggressiveTotal).toBeGreaterThan(5)
    expect(Math.abs(defensiveTotal - aggressiveTotal)).toBeLessThan(10) // バランスが取れている
  })

  test('長期的なやりこみ要素', () => {
    const achievements = AchievementSystemService.getAllAchievements()
    const legendaryCards = CardFactory.createLegendaryCards()
    
    // 長期目標の存在
    const longTermAchievements = achievements.filter(a => a.maxProgress >= 50)
    expect(longTermAchievements.length).toBeGreaterThan(0)
    
    // レア要素の存在
    expect(legendaryCards.length).toBeGreaterThan(0)
    legendaryCards.forEach(card => {
      expect(card.isUnlockable).toBe(true)
      expect(card.unlockCondition).toBeDefined()
    })
  })
})