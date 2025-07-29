import { Card } from '../entities/Card'
import type { SkillRarity, SkillCardProperties } from '../types/card.types'
import type { GameStage } from '../types/card.types'

/**
 * スキルシステムサービス
 * スキルカードの管理、レベルアップ、クールダウン処理を担当
 */
export class SkillSystemService {
  
  /**
   * スキルカードを使用（クールダウン開始）
   */
  static useSkill(skill: Card): Card {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      throw new Error('Not a skill card')
    }

    const properties = skill.skillProperties
    
    // クールダウン中の場合は使用不可
    if (properties.remainingCooldown && properties.remainingCooldown > 0) {
      throw new Error(`Skill is on cooldown for ${properties.remainingCooldown} more turns`)
    }

    // 使用回数制限がある場合の処理
    if (properties.maxUsages && properties.usageCount !== undefined) {
      if (properties.usageCount >= properties.maxUsages) {
        throw new Error('Skill has reached maximum usage limit')
      }
    }

    // スキル使用処理
    const updatedProperties: SkillCardProperties = {
      ...properties,
      remainingCooldown: properties.cooldown || 0,
      usageCount: (properties.usageCount || 0) + 1
    }

    return skill.copy({
      skillProperties: updatedProperties
    })
  }

  /**
   * ターン終了時のクールダウン処理
   */
  static processSkillCooldowns(skills: Card[]): Card[] {
    return skills.map(skill => {
      if (!skill.isSkillCard() || !skill.skillProperties) {
        return skill
      }

      const properties = skill.skillProperties
      if (!properties.remainingCooldown || properties.remainingCooldown <= 0) {
        return skill
      }

      const updatedProperties: SkillCardProperties = {
        ...properties,
        remainingCooldown: Math.max(0, properties.remainingCooldown - 1)
      }

      return skill.copy({
        skillProperties: updatedProperties
      })
    })
  }

  /**
   * スキルの熟練度を上げる
   */
  static improveMastery(skill: Card): Card {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      throw new Error('Not a skill card')
    }

    const properties = skill.skillProperties
    const currentLevel = properties.masteryLevel || 1
    
    // 最大レベル5まで
    if (currentLevel >= 5) {
      return skill
    }

    const newLevel = currentLevel + 1
    const masteryBonus = this.calculateMasteryBonus(newLevel)

    const updatedProperties: SkillCardProperties = {
      ...properties,
      masteryLevel: newLevel
    }

    // パワーにマスタリーボーナスを追加
    return skill.copy({
      power: skill.power + masteryBonus,
      skillProperties: updatedProperties
    })
  }

  /**
   * 熟練度レベルに応じたボーナスを計算
   */
  private static calculateMasteryBonus(level: number): number {
    const bonusTable = {
      1: 0,  // 初期レベル
      2: 1,  // +1パワー
      3: 2,  // +2パワー
      4: 4,  // +4パワー
      5: 6   // +6パワー
    }
    return bonusTable[level as keyof typeof bonusTable] || 0
  }

  /**
   * スキルレア度に応じた基本効果倍率を取得
   */
  static getRarityMultiplier(rarity: SkillRarity): number {
    const multiplierTable = {
      common: 1.0,
      rare: 1.2,
      epic: 1.5,
      legendary: 2.0
    }
    return multiplierTable[rarity]
  }

  /**
   * スキルが使用可能かどうかを判定
   */
  static canUseSkill(skill: Card): boolean {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      return false
    }

    const properties = skill.skillProperties
    
    // クールダウン中かチェック
    if (properties.remainingCooldown && properties.remainingCooldown > 0) {
      return false
    }

    // 使用回数制限をチェック
    if (properties.maxUsages && properties.usageCount !== undefined) {
      if (properties.usageCount >= properties.maxUsages) {
        return false
      }
    }

    return true
  }

  /**
   * スキルの効果的なパワーを計算（レア度と熟練度を考慮）
   */
  static calculateEffectivePower(skill: Card): number {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      return skill.power
    }

    const properties = skill.skillProperties
    const rarityMultiplier = this.getRarityMultiplier(properties.rarity)
    const masteryLevel = properties.masteryLevel || 1
    const masteryBonus = this.calculateMasteryBonus(masteryLevel)

    return Math.floor((skill.power + masteryBonus) * rarityMultiplier)
  }

  /**
   * スキルの説明文を生成（現在の状態を含む）
   */
  static generateSkillDescription(skill: Card): string {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      return skill.description
    }

    const properties = skill.skillProperties
    const effectivePower = this.calculateEffectivePower(skill)
    let description = `${skill.description} (効果パワー: ${effectivePower})`

    // 熟練度情報
    if (properties.masteryLevel && properties.masteryLevel > 1) {
      description += ` [マスタリーLv.${properties.masteryLevel}]`
    }

    // クールダウン情報
    if (properties.remainingCooldown && properties.remainingCooldown > 0) {
      description += ` [クールダウン: ${properties.remainingCooldown}ターン]`
    } else if (properties.cooldown && properties.cooldown > 0) {
      description += ` [クールダウン: ${properties.cooldown}ターン]`
    }

    // 使用回数制限
    if (properties.maxUsages) {
      const usageCount = properties.usageCount || 0
      description += ` [使用回数: ${usageCount}/${properties.maxUsages}]`
    }

    return description
  }

  /**
   * ステージに応じたスキル習得可能性を判定
   */
  static canLearnSkill(skill: Card, stage: GameStage, playerLevel: number = 1): boolean {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      return false
    }

    const properties = skill.skillProperties
    
    // レア度によるレベル制限
    const levelRequirements = {
      common: 1,
      rare: 5,
      epic: 10,
      legendary: 15
    }

    if (playerLevel < levelRequirements[properties.rarity]) {
      return false
    }

    // ステージ制限
    const stageRequirements = {
      common: ['youth', 'middle', 'fulfillment'],
      rare: ['middle', 'fulfillment'],
      epic: ['fulfillment'],
      legendary: ['fulfillment']
    }

    return stageRequirements[properties.rarity].includes(stage)
  }

  /**
   * 前提スキルの条件をチェック
   */
  static checkPrerequisites(skill: Card, ownedSkills: Card[]): boolean {
    if (!skill.isSkillCard() || !skill.skillProperties?.prerequisites) {
      return true
    }

    const prerequisites = skill.skillProperties.prerequisites
    const ownedSkillNames = ownedSkills
      .filter(s => s.isSkillCard())
      .map(s => s.name)

    return prerequisites.every(prereq => ownedSkillNames.includes(prereq))
  }

  /**
   * スキルを自動的に熟練度アップさせる条件をチェック
   */
  static shouldAutoImprove(skill: Card, successfulUses: number): boolean {
    if (!skill.isSkillCard() || !skill.skillProperties) {
      return false
    }

    const properties = skill.skillProperties
    const currentLevel = properties.masteryLevel || 1
    
    // 各レベルアップに必要な成功使用回数
    const requiredSuccesses = {
      1: 3,   // Lv1→Lv2: 3回成功
      2: 7,   // Lv2→Lv3: 7回成功  
      3: 15,  // Lv3→Lv4: 15回成功
      4: 30   // Lv4→Lv5: 30回成功
    }

    const threshold = requiredSuccesses[currentLevel as keyof typeof requiredSuccesses]
    return threshold && successfulUses >= threshold
  }
}