import type { 
  ICard, 
  IAdvancedCard,
  CardType, 
  CardEffect,
  CardEffectType, 
  LifeCardCategory, 
  InsuranceType,
  InsuranceDurationType,
  InsuranceEffectType,
  DreamCategory,
  SkillCardProperties,
  ComboCardProperties,
  EventCardProperties,
  SkillRarity,
  RewardType
} from '../types/card.types'
import { CardPower } from '../valueObjects/CardPower'
import { InsurancePremium } from '../valueObjects/InsurancePremium'
import { IdGenerator } from '../../common/IdGenerator'

/**
 * カードエンティティ - ゲーム内のすべてのカードの基底クラス
 * 
 * このクラスは値オブジェクトを使用してビジネスルールを表現します：
 * - power: CardPower値オブジェクト（カードの効果値）
 * - cost: InsurancePremium値オブジェクト（保険カードの場合）
 * 
 * @implements {IAdvancedCard} 拡張カードインターフェース
 * 
 * @example
 * // 人生カードの作成
 * const lifeCard = Card.createLifeCard('アルバイト収入', 1);
 * 
 * // 保険カードの作成
 * const insuranceCard = Card.createInsuranceCard('健康保険', 2);
 * 
 * // スキルカードの作成
 * const skillCard = Card.createSkillCard('プロフェッショナル', 'rare', 3);
 */
export class Card implements IAdvancedCard {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: CardType
  private readonly _power: CardPower
  private readonly _cost: InsurancePremium
  readonly effects: CardEffect[]
  readonly imageUrl?: string
  readonly category?: LifeCardCategory
  readonly insuranceType?: InsuranceType
  readonly coverage?: number
  readonly penalty?: number
  // 保険カード用プロパティ
  readonly ageBonus?: number
  readonly durationType?: InsuranceDurationType
  remainingTurns?: number // 可変プロパティ（ターンごとに減少）
  readonly insuranceEffectType?: InsuranceEffectType
  // Phase 4 夢カード用プロパティ
  readonly dreamCategory?: DreamCategory
  
  // 拡張カード用プロパティ
  readonly skillProperties?: SkillCardProperties
  readonly comboProperties?: ComboCardProperties
  readonly eventProperties?: EventCardProperties
  readonly isUnlockable?: boolean
  readonly unlockCondition?: string
  readonly rewardType?: RewardType

  /**
   * Cardインスタンスを作成
   * @param {IAdvancedCard} params - カードのパラメータ
   */
  constructor(params: IAdvancedCard) {
    this.id = params.id
    this.name = params.name
    this.description = params.description
    this.type = params.type
    
    // 値オブジェクトでラップ
    this._power = CardPower.create(params.power)
    this._cost = InsurancePremium.create(params.cost)
    
    this.effects = params.effects
    this.imageUrl = params.imageUrl
    this.category = params.category
    this.insuranceType = params.insuranceType
    this.coverage = params.coverage
    this.penalty = params.penalty
    
    // 年齢ボーナスのプロパティ
    if ('ageBonus' in params) {
      this.ageBonus = params.ageBonus
    }
    
    // 保険期間のプロパティ
    if ('durationType' in params) {
      this.durationType = params.durationType
    }
    if ('remainingTurns' in params) {
      this.remainingTurns = params.remainingTurns
    }
    if ('insuranceEffectType' in params) {
      this.insuranceEffectType = params.insuranceEffectType
    }
    
    // Phase 4 夢カードのプロパティ
    if ('dreamCategory' in params) {
      this.dreamCategory = params.dreamCategory
    }
    
    // 拡張カード用プロパティ
    if ('skillProperties' in params) {
      this.skillProperties = params.skillProperties
    }
    if ('comboProperties' in params) {
      this.comboProperties = params.comboProperties
    }
    if ('eventProperties' in params) {
      this.eventProperties = params.eventProperties
    }
    if ('isUnlockable' in params) {
      this.isUnlockable = params.isUnlockable
    }
    if ('unlockCondition' in params) {
      this.unlockCondition = params.unlockCondition
    }
    if ('rewardType' in params) {
      this.rewardType = params.rewardType
    }
  }

  /**
   * 後方互換性のためのgetter - カードのパワー値を取得
   * @returns {number} カードのパワー値
   */
  get power(): number {
    return this._power.getValue()
  }

  /**
   * カードのコストを取得
   * @returns {number} カードのコスト
   */
  get cost(): number {
    return this._cost.getValue()
  }

  /**
   * 値オブジェクトとしてのpower取得
   * @returns {CardPower} カードパワー値オブジェクト
   */
  getPower(): CardPower {
    return this._power
  }

  /**
   * 値オブジェクトとしてのcost取得
   * @returns {InsurancePremium} 保険料値オブジェクト
   */
  getCost(): InsurancePremium {
    return this._cost
  }

  /**
   * カードが特定の効果を持っているか判定
   * @param {CardEffectType} effectType - 確認する効果タイプ
   * @returns {boolean} 効果を持っている場合true
   */
  hasEffect(effectType: CardEffectType): boolean {
    return this.effects.some(effect => effect.type === effectType)
  }

  /**
   * 特定の効果を取得
   * @param {CardEffectType} effectType - 取得する効果タイプ
   * @returns {CardEffect | undefined} 効果オブジェクトまたはundefined
   */
  getEffect(effectType: CardEffectType): CardEffect | undefined {
    return this.effects.find(effect => effect.type === effectType)
  }

  /**
   * 保険カードかどうか判定
   * @returns {boolean} 保険カードの場合true
   */
  isInsurance(): boolean {
    return this.type === 'insurance'
  }

  /**
   * 定期保険かどうか判定
   * @returns {boolean} 定期保険の場合true
   */
  isTermInsurance(): boolean {
    return this.isInsurance() && this.durationType === 'term'
  }

  /**
   * 終身保険かどうか判定
   * @returns {boolean} 終身保険の場合true
   */
  isWholeLifeInsurance(): boolean {
    return this.isInsurance() && this.durationType === 'whole_life'
  }

  /**
   * 保険効果タイプを取得
   * @returns {InsuranceEffectType | undefined} 保険効果タイプ
   */
  getInsuranceEffectType(): InsuranceEffectType | undefined {
    if (!this.isInsurance()) return undefined
    return this.insuranceEffectType || 'offensive' // デフォルトは攻撃型
  }

  /**
   * 防御型保険かどうか判定
   * @returns {boolean} 防御型保険の場合true
   */
  isDefensiveInsurance(): boolean {
    return this.isInsurance() && this.getInsuranceEffectType() === 'defensive'
  }

  /**
   * 回復型保険かどうか判定
   * @returns {boolean} 回復型保険の場合true
   */
  isRecoveryInsurance(): boolean {
    return this.isInsurance() && this.getInsuranceEffectType() === 'recovery'
  }

  /**
   * 特化型保険かどうか判定
   * @returns {boolean} 特化型保険の場合true
   */
  isSpecializedInsurance(): boolean {
    return this.isInsurance() && this.getInsuranceEffectType() === 'specialized'
  }

  /**
   * ダメージ軽減量を計算（防御型保険用）
   * @returns {number} ダメージ軽減量
   */
  calculateDamageReduction(): number {
    if (!this.isDefensiveInsurance()) return 0
    
    // カバレッジがそのままダメージ軽減量となる
    const baseReduction = this.coverage || 0
    
    // ダメージ軽減効果がある場合はその値を加算
    const reductionEffect = this.getEffect('damage_reduction')
    const effectReduction = reductionEffect ? reductionEffect.value : 0
    
    return baseReduction + effectReduction
  }

  /**
   * ターン回復量を計算（回復型保険用）
   * @returns {number} ターン回復量
   */
  calculateTurnHeal(): number {
    if (!this.isRecoveryInsurance()) return 0
    
    // カバレッジに基づいて回復量を計算
    const baseHeal = Math.floor((this.coverage || 0) / 20)
    
    // ターン回復効果がある場合はその値を加算
    const healEffect = this.getEffect('turn_heal')
    const effectHeal = healEffect ? healEffect.value : 0
    
    return baseHeal + effectHeal
  }

  /**
   * 特定チャレンジへのボーナスを計算（特化型保険用）
   * @param {string} challengeType チャレンジタイプ
   * @returns {number} ボーナスパワー
   */
  calculateChallengeBonus(challengeType: string): number {
    if (!this.isSpecializedInsurance()) return 0
    
    // 特定チャレンジボーナス効果を確認
    const bonusEffect = this.getEffect('challenge_bonus')
    if (!bonusEffect?.condition) return 0
    
    // 条件が一致する場合のみボーナスを返す
    if (bonusEffect.condition.includes(challengeType)) {
      return bonusEffect.value
    }
    
    return 0
  }

  /**
   * Phase 4: 夢カードかどうか判定
   * @returns {boolean} 夢カードの場合true
   */
  isDreamCard(): boolean {
    return this.type === 'dream'
  }

  /**
   * カードのコピーを作成（一部のプロパティを更新可能）
   * @param {Partial<IAdvancedCard>} [updates] - 更新するプロパティ
   * @returns {Card} 新しいCardインスタンス
   */
  copy(updates?: Partial<IAdvancedCard>): Card {
    return new Card({
      ...this,
      power: this.power, // getter経由で取得
      cost: this.cost,   // getter経由で取得
      effects: [...this.effects], // 配列の深いコピー
      ...updates
    })
  }

  /**
   * カードのクローンを作成（後方互換性のため）
   * @returns {Card} カードの完全なコピー
   * @deprecated copy()メソッドの使用を推奨
   */
  clone(): Card {
    return this.copy()
  }

  /**
   * 残りターン数を減少させる（定期保険用）
   * @returns {Card} ターン数を減らした新しいCardインスタンス
   */
  decrementRemainingTurns(): Card {
    if (!this.isTermInsurance() || !this.remainingTurns) {
      return this
    }
    
    return this.copy({
      remainingTurns: Math.max(0, this.remainingTurns - 1)
    })
  }

  /**
   * 保険が有効期限切れかどうか判定
   * @returns {boolean} 期限切れの場合true
   */
  isExpired(): boolean {
    if (!this.isTermInsurance()) {
      return false
    }
    return this.remainingTurns === 0
  }

  /**
   * パワーが指定値以上か判定（値オブジェクトを使用）
   * @param {number} threshold - 闾値
   * @returns {boolean} パワーが闾値以上の場合true
   */
  hasPowerAtLeast(requiredPower: number): boolean {
    const required = CardPower.create(requiredPower)
    return this._power.isGreaterThanOrEqual(required)
  }

  /**
   * コストが支払い可能か判定（値オブジェクトを使用）
   */
  isAffordableWith(availableVitality: number): boolean {
    return this._cost.isAffordableWith(availableVitality)
  }

  /**
   * 効果的なパワーを計算（年齢ボーナス等を含む）
   * @param {number} [bonus] - 追加ボーナス（オプション）
   */
  calculateEffectivePower(bonus?: number): number {
    let effectivePower = this.power

    // 保険カードの年齢ボーナスを適用
    if (this.isInsurance() && this.ageBonus) {
      effectivePower += this.ageBonus
    }

    // 引数で渡されたボーナスを加算
    if (bonus !== undefined) {
      effectivePower += bonus
    }
    
    // 攻撃型保険以外はパワーを提供しない
    if (this.isInsurance() && this.getInsuranceEffectType() !== 'offensive') {
      return 0
    }

    return Math.max(0, effectivePower)
  }

  /**
   * ライフカードかどうか判定
   */
  isLifeCard(): boolean {
    return this.type === 'life'
  }

  /**
   * 保険カードかどうか判定（エイリアス）
   */
  isInsuranceCard(): boolean {
    return this.isInsurance()
  }

  /**
   * 落とし穴カードかどうか判定
   */
  isPitfallCard(): boolean {
    return this.type === 'pitfall'
  }

  /**
   * スキルカードかどうか判定
   */
  isSkillCard(): boolean {
    return this.type === 'skill'
  }

  /**
   * コンボカードかどうか判定
   */
  isComboCard(): boolean {
    return this.type === 'combo'
  }

  /**
   * イベントカードかどうか判定
   */
  isEventCard(): boolean {
    return this.type === 'event'
  }

  /**
   * レジェンダリーカードかどうか判定
   */
  isLegendaryCard(): boolean {
    return this.type === 'legendary'
  }

  /**
   * チャレンジカードかどうか判定
   */
  isChallengeCard(): boolean {
    return this.type === 'challenge'
  }

  /**
   * カードの表示用文字列を生成
   */
  toDisplayString(): string {
    let display = `${this.name} - Power: ${this.power}, Cost: ${this.cost}`
    
    if (this.effects.length > 0) {
      const effectDescriptions = this.effects.map(effect => effect.description).join(', ')
      display += ` - Effects: ${effectDescriptions}`
    }
    
    return display
  }

  /**
   * ターン数を減少させる（mutableな操作）
   */
  decrementTurn(): void {
    if (this.remainingTurns !== undefined && this.remainingTurns > 0) {
      this.remainingTurns--
    }
  }

  // === 静的ファクトリーメソッド（TDD: Green Phase） ===

  /**
   * ライフカードを作成
   */
  static createLifeCard(name: string, power: number): Card {
    const powerSign = power > 0 ? '+' : ''
    return new Card({
      id: IdGenerator.generate('life'),
      name,
      description: `パワー: ${powerSign}${power}`,
      type: 'life',
      power,
      cost: 0,
      effects: []
    })
  }

  /**
   * チャレンジカードを作成
   */
  static createChallengeCard(name: string, power: number): Card {
    const card = new Card({
      id: IdGenerator.generate('challenge'),
      name,
      description: `必要パワー: ${power}`,
      type: 'challenge',
      power,
      cost: 0,
      effects: []
    })
    
    return card
  }

  /**
   * 保険カードを作成
   */
  static createInsuranceCard(name: string, power: number, cost: number = 1, ...effects: CardEffect[]): Card {
    return new Card({
      id: IdGenerator.generate('insurance'),
      name,
      description: `保険カード - パワー: +${power}`,
      type: 'insurance',
      power,
      cost,
      effects
    })
  }

  /**
   * スキルカードを作成
   */
  static createSkillCard(name: string, rarity: SkillRarity, power: number, cooldown?: number): Card {
    const rarityDescriptions = {
      common: 'コモン',
      rare: 'レア', 
      epic: 'エピック',
      legendary: 'レジェンダリー'
    }
    
    return new Card({
      id: IdGenerator.generate('skill'),
      name,
      description: `${rarityDescriptions[rarity]}スキル - パワー: +${power}`,
      type: 'skill',
      power,
      cost: 0,
      effects: [],
      skillProperties: {
        rarity,
        cooldown,
        remainingCooldown: 0,
        masteryLevel: 1
      }
    })
  }

  /**
   * コンボカードを作成
   */
  static createComboCard(name: string, power: number, requiredCards: string[], comboBonus: number): Card {
    return new Card({
      id: IdGenerator.generate('combo'),
      name,
      description: `コンボカード - パワー: +${power} (コンボ時: +${comboBonus})`,
      type: 'combo',
      power,
      cost: 0,
      effects: [],
      comboProperties: {
        requiredCards,
        comboBonus
      }
    })
  }

  /**
   * イベントカードを作成
   */
  static createEventCard(name: string, power: number, duration: number, globalEffect = false): Card {
    return new Card({
      id: IdGenerator.generate('event'),
      name,
      description: `イベントカード - ${duration}ターン継続`,
      type: 'event',
      power,
      cost: 0,
      effects: [],
      eventProperties: {
        duration,
        globalEffect
      }
    })
  }

  /**
   * レジェンダリーカードを作成
   */
  static createLegendaryCard(name: string, power: number, unlockCondition: string): Card {
    return new Card({
      id: IdGenerator.generate('legendary'),
      name,
      description: `レジェンダリーカード - パワー: +${power}`,
      type: 'legendary',
      power,
      cost: 0,
      effects: [],
      isUnlockable: true,
      unlockCondition
    })
  }
}