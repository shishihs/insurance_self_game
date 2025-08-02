/**
 * 強化されたCardエンティティ
 * 
 * 新しい型システムと関数型プログラミングパターンを適用した
 * Cardエンティティの改良版実装
 */

import type { CardId, PowerValue, VitalityValue } from '../../../types/advanced-types'
import type { DeepReadonly, NonEmptyArray } from '../../../types/advanced-types'
import { Railway, Result } from '../../../errors/railway'
import type { Maybe} from '../../../functional/monads';
import { Either, none, some } from '../../../functional/monads'
import { ImmutableList } from '../../../functional/immutable'
import type { ValidationError } from '../../../errors/error-types';
import { ErrorFactory, InvalidCardOperationError } from '../../../errors/error-types'
import { gameValidators } from '../../../errors/validation'

// ===== 強化された型定義 =====

export type CardType = 'LIFE' | 'INSURANCE' | 'DREAM' | 'SKILL' | 'COMBO' | 'EVENT'
export type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
export type CardStatus = 'ACTIVE' | 'EXHAUSTED' | 'DISABLED' | 'EXPIRED'

export interface CardEffect {
  readonly id: string
  readonly type: string
  readonly value: number
  readonly duration?: number
  readonly condition?: string
}

export interface CardMetadata {
  readonly createdAt: Date
  readonly version: number
  readonly tags: readonly string[]
  readonly sourceSet?: string
}

// ===== 不変なカードデータ =====

export interface CardData {
  readonly id: CardId
  readonly name: string
  readonly description: string
  readonly type: CardType
  readonly power: PowerValue
  readonly cost: number
  readonly rarity: CardRarity
  readonly effects: readonly CardEffect[]
  readonly metadata: CardMetadata
  readonly imageUrl?: string
}

// ===== 強化されたCardクラス =====

export class EnhancedCard {
  private constructor(private readonly data: DeepReadonly<CardData>) {}

  // ===== ファクトリーメソッド =====

  static create(cardData: Omit<CardData, 'id' | 'metadata'>): Result<EnhancedCard, ValidationError> {
    return Railway.of(cardData)
      .bind(data => this.validateCardData(data))
      .map(validData => this.createFromValidData(validData))
      .run()
  }

  static createLifeCard(
    name: string,
    power: number,
    description?: string
  ): Result<EnhancedCard, ValidationError> {
    const cardData = {
      name,
      description: description || `人生カード: ${name}`,
      type: 'LIFE' as const,
      power: power as PowerValue,
      cost: 0,
      rarity: 'COMMON' as const,
      effects: [],
    }

    return this.create(cardData)
  }

  static createInsuranceCard(
    name: string,
    power: number,
    cost: number,
    description?: string
  ): Result<EnhancedCard, ValidationError> {
    const cardData = {
      name,
      description: description || `保険カード: ${name}`,
      type: 'INSURANCE' as const,
      power: power as PowerValue,
      cost,
      rarity: 'COMMON' as const,
      effects: [],
    }

    return this.create(cardData)
  }

  static createSkillCard(
    name: string,
    power: number,
    rarity: CardRarity,
    effects: CardEffect[] = [],
    description?: string
  ): Result<EnhancedCard, ValidationError> {
    const cardData = {
      name,
      description: description || `スキルカード: ${name}`,
      type: 'SKILL' as const,
      power: power as PowerValue,
      cost: 0,
      rarity,
      effects,
    }

    return this.create(cardData)
  }

  // ===== バリデーション =====

  private static validateCardData(
    data: Omit<CardData, 'id' | 'metadata'>
  ): Result<Omit<CardData, 'id' | 'metadata'>, ValidationError> {
    return Railway.of(data)
      .validate(d => d.name.trim().length > 0, ErrorFactory.validation('name', 'カード名は必須です'))
      .validate(d => d.power >= 0, ErrorFactory.validation('power', 'パワーは0以上である必要があります'))
      .validate(d => d.cost >= 0, ErrorFactory.validation('cost', 'コストは0以上である必要があります'))
      .validate(d => d.description.length <= 500, ErrorFactory.validation('description', '説明は500文字以内である必要があります'))
      .run()
  }

  private static createFromValidData(
    validData: Omit<CardData, 'id' | 'metadata'>
  ): EnhancedCard {
    const cardData: CardData = {
      ...validData,
      id: this.generateCardId(),
      metadata: {
        createdAt: new Date(),
        version: 1,
        tags: [],
        sourceSet: 'core'
      }
    }

    return new EnhancedCard(cardData)
  }

  private static generateCardId(): CardId {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as CardId
  }

  // ===== アクセサー =====

  get id(): CardId {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get type(): CardType {
    return this.data.type
  }

  get power(): PowerValue {
    return this.data.power
  }

  get cost(): number {
    return this.data.cost
  }

  get rarity(): CardRarity {
    return this.data.rarity
  }

  get effects(): ImmutableList<CardEffect> {
    return ImmutableList.from(this.data.effects)
  }

  get metadata(): CardMetadata {
    return this.data.metadata
  }

  get imageUrl(): Maybe<string> {
    return this.data.imageUrl ? some(this.data.imageUrl) : none()
  }

  // ===== 状態クエリ =====

  isType(cardType: CardType): boolean {
    return this.data.type === cardType
  }

  isLifeCard(): boolean {
    return this.isType('LIFE')
  }

  isInsuranceCard(): boolean {
    return this.isType('INSURANCE')
  }

  isSkillCard(): boolean {
    return this.isType('SKILL')
  }

  hasEffect(effectType: string): boolean {
    return this.data.effects.some(effect => effect.type === effectType)
  }

  getRarity(): CardRarity {
    return this.data.rarity
  }

  isRare(): boolean {
    return ['RARE', 'EPIC', 'LEGENDARY'].includes(this.data.rarity)
  }

  // ===== 関数型操作 =====

  mapPower<T>(fn: (power: PowerValue) => T): T {
    return fn(this.data.power)
  }

  flatMapPower<T>(fn: (power: PowerValue) => Maybe<T>): Maybe<T> {
    return fn(this.data.power)
  }

  filterByRarity(minRarity: CardRarity): Maybe<EnhancedCard> {
    const rarityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
    const minIndex = rarityOrder.indexOf(minRarity)
    const currentIndex = rarityOrder.indexOf(this.data.rarity)
    
    return currentIndex >= minIndex ? some(this) : none()
  }

  // ===== 不変更新 =====

  withName(newName: string): Result<EnhancedCard, ValidationError> {
    return Railway.of(newName)
      .validate(name => name.trim().length > 0, ErrorFactory.validation('name', 'カード名は必須です'))
      .map(validName => this.createUpdated({ name: validName }))
      .run()
  }

  withDescription(newDescription: string): Result<EnhancedCard, ValidationError> {
    return Railway.of(newDescription)
      .validate(desc => desc.length <= 500, ErrorFactory.validation('description', '説明は500文字以内である必要があります'))
      .map(validDesc => this.createUpdated({ description: validDesc }))
      .run()
  }

  withPower(newPower: number): Result<EnhancedCard, ValidationError> {
    return Railway.of(newPower)
      .validate(power => power >= 0, ErrorFactory.validation('power', 'パワーは0以上である必要があります'))
      .map(validPower => this.createUpdated({ power: validPower as PowerValue }))
      .run()
  }

  addEffect(effect: CardEffect): Result<EnhancedCard, ValidationError> {
    if (this.hasEffect(effect.type)) {
      return Result.err(ErrorFactory.validation('effect', `効果 ${effect.type} は既に存在します`))
    }

    const newEffects = [...this.data.effects, effect]
    return Result.ok(this.createUpdated({ effects: newEffects }))
  }

  removeEffect(effectType: string): Result<EnhancedCard, ValidationError> {
    if (!this.hasEffect(effectType)) {
      return Result.err(ErrorFactory.validation('effect', `効果 ${effectType} が見つかりません`))
    }

    const newEffects = this.data.effects.filter(effect => effect.type !== effectType)
    return Result.ok(this.createUpdated({ effects: newEffects }))
  }

  upgradeRarity(): Result<EnhancedCard, ValidationError> {
    const rarityUpgrades: Record<CardRarity, CardRarity | null> = {
      COMMON: 'UNCOMMON',
      UNCOMMON: 'RARE',
      RARE: 'EPIC',
      EPIC: 'LEGENDARY',
      LEGENDARY: null
    }

    const nextRarity = rarityUpgrades[this.data.rarity]
    if (!nextRarity) {
      return Result.err(ErrorFactory.validation('rarity', 'これ以上レアリティを上げることはできません'))
    }

    return Result.ok(this.createUpdated({ rarity: nextRarity }))
  }

  private createUpdated(updates: Partial<CardData>): EnhancedCard {
    const updatedData: CardData = {
      ...this.data,
      ...updates,
      metadata: {
        ...this.data.metadata,
        version: this.data.metadata.version + 1
      }
    }

    return new EnhancedCard(updatedData)
  }

  // ===== ユーティリティ =====

  equals(other: EnhancedCard): boolean {
    return this.data.id === other.data.id
  }

  clone(): EnhancedCard {
    return new EnhancedCard(this.data)
  }

  toJSON(): CardData {
    return { ...this.data }
  }

  toString(): string {
    return `${this.data.name} (${this.data.type}, Power: ${this.data.power}, Rarity: ${this.data.rarity})`
  }

  // ===== カード間操作 =====

  static combineCards(
    card1: EnhancedCard,
    card2: EnhancedCard
  ): Result<EnhancedCard, InvalidCardOperationError> {
    if (!card1.isSkillCard() || !card2.isSkillCard()) {
      return Result.err(new InvalidCardOperationError(
        'combine',
        card1.id,
        'Only skill cards can be combined'
      ))
    }

    const combinedPower = (card1.data.power + card2.data.power) as PowerValue
    const combinedEffects = [...card1.data.effects, ...card2.data.effects]
    const higherRarity = card1.data.rarity === 'LEGENDARY' || card2.data.rarity === 'LEGENDARY' 
      ? 'LEGENDARY' 
      : card1.data.rarity

    return EnhancedCard.create({
      name: `${card1.name} + ${card2.name}`,
      description: `合成カード: ${card1.name}と${card2.name}の力を合わせたもの`,
      type: 'COMBO' as CardType,
      power: combinedPower,
      cost: 0,
      rarity: higherRarity,
      effects: combinedEffects
    })
  }

  canCombineWith(other: EnhancedCard): boolean {
    return this.isSkillCard() && 
           other.isSkillCard() && 
           !this.equals(other)
  }

  // ===== 効果計算 =====

  calculateEffectivePower(context?: { vitality?: VitalityValue; multipliers?: number[] }): PowerValue {
    let effectivePower = this.data.power

    // 体力ボーナス
    if (context?.vitality && context.vitality > 50) {
      effectivePower = (effectivePower * 1.1) as PowerValue
    }

    // マルチプライヤー適用
    if (context?.multipliers) {
      const totalMultiplier = context.multipliers.reduce((acc, mult) => acc * mult, 1)
      effectivePower = Math.round(effectivePower * totalMultiplier) as PowerValue
    }

    // 効果による修正
    this.data.effects.forEach(effect => {
      if (effect.type === 'POWER_BOOST') {
        effectivePower = (effectivePower + effect.value) as PowerValue
      } else if (effect.type === 'POWER_MULTIPLIER') {
        effectivePower = Math.round(effectivePower * (effect.value / 100 + 1)) as PowerValue
      }
    })

    return effectivePower
  }

  // ===== 静的ユーティリティ =====

  static fromJSON(json: CardData): Result<EnhancedCard, ValidationError> {
    try {
      return Result.ok(new EnhancedCard(json))
    } catch (error) {
      return Result.err(ErrorFactory.validation('json', 'Invalid card JSON data'))
    }
  }

  static createDeck(cards: EnhancedCard[]): ImmutableList<EnhancedCard> {
    return ImmutableList.from(cards)
  }

  static filterByType(cards: ImmutableList<EnhancedCard>, cardType: CardType): ImmutableList<EnhancedCard> {
    return cards.filter(card => card.isType(cardType))
  }

  static sortByPower(cards: ImmutableList<EnhancedCard>, ascending = true): ImmutableList<EnhancedCard> {
    return cards.sort((a, b) => 
      ascending ? a.power - b.power : b.power - a.power
    )
  }

  static sortByRarity(cards: ImmutableList<EnhancedCard>, ascending = true): ImmutableList<EnhancedCard> {
    const rarityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
    return cards.sort((a, b) => {
      const aIndex = rarityOrder.indexOf(a.rarity)
      const bIndex = rarityOrder.indexOf(b.rarity)
      return ascending ? aIndex - bIndex : bIndex - aIndex
    })
  }

  static getTotalPower(cards: ImmutableList<EnhancedCard>): PowerValue {
    return cards.reduce((sum, card) => sum + card.power, 0) as PowerValue
  }

  static getAveragePower(cards: ImmutableList<EnhancedCard>): Maybe<PowerValue> {
    if (cards.isEmpty()) {
      return none()
    }
    const total = this.getTotalPower(cards)
    return some((total / cards.size()) as PowerValue)
  }
}