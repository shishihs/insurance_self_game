/**
 * カード種別
 */
export type CardType = 'life' | 'insurance' | 'trouble' | 'challenge' | 'dream' | 'skill' | 'combo' | 'event' | 'legendary' | 'aging' | 'final_challenge'

/**
 * カードカテゴリー（人生カード用）
 */
export type LifeCardCategory =
  | 'health'    // 健康
  | 'career'    // キャリア
  | 'family'    // 家族
  | 'hobby'     // 趣味
  | 'finance'   // 金融

/**
 * 保険種別（保険カード用）
 */
export type InsuranceType =
  | 'life'      // 生命保険
  | 'medical'   // 医療保険
  | 'accident'  // 傷害保険
  | 'income'    // 収入保障保険
  | 'asset'     // 資産形成保険
  | 'health'    // 健康保険
  | 'disability' // 障害保険
  | 'cancer'    // がん保険
  | 'dental'    // 歯科保険
  | 'travel'    // 旅行保険

/**
 * 保険期間種別
 */
export type InsuranceDurationType =
  | 'term'       // 定期保険（期限あり）
  | 'whole_life' // 終身保険（期限なし）


/**
 * 夢カードカテゴリー
 */
export type DreamCategory = 'physical' | 'intellectual' | 'mixed'

/**
 * チャレンジ報酬タイプ
 */
export type RewardType = 'insurance' | 'vitality' | 'card'

/**
 * カード効果タイプ
 */
export type CardEffectType =
  | 'power_boost'       // パワー増加
  | 'draw_cards'        // カードドロー
  | 'heal'              // 活力回復
  | 'shield'            // 防御
  | 'special_action'    // 特殊行動
  | 'vitality_boost'    // 活力上限増加
  | 'insurance_discount' // 保険料割引
  | 'double_effect'     // 効果倍加
  | 'chain_combo'       // 連鎖コンボ
  | 'persistent'        // 永続効果
  | 'trigger_on_event'  // 特定イベント時発動
  | 'multi_turn'        // 複数ターン効果
  | 'resource_generation' // リソース生成
  | 'card_transform'    // カード変換
  | 'synergy'           // 相乗効果
  | 'damage_reduction'   // ダメージ軽減
  | 'turn_heal'          // ターン終了時回復
  | 'challenge_bonus'    // 特定チャレンジへのボーナス
  | 'risk_mitigation'    // リスク軽減
  | 'insurance_coverage' // 保険補償
  | 'aging_penalty'      // 老化ペナルティ

/**
 * ゲームステージ
 */
export type GameStage = 'youth' | 'middle' | 'fulfillment'

/**
 * 難易度
 */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

/**
 * カード効果
 */
export interface CardEffect {
  type: CardEffectType
  value: number
  description: string
  condition?: string // 発動条件
}

/**
 * カードインターフェース
 */
export interface ICard {
  id: string
  name: string
  description: string
  type: CardType
  power: number
  cost: number
  effects: CardEffect[]
  imageUrl?: string

  // 人生カード固有
  category?: LifeCardCategory

  // 保険カード固有
  insuranceType?: InsuranceType
  coverage?: number // 保障額
  durationType?: InsuranceDurationType // 保険期間種別
  remainingTurns?: number // 定期保険の残りターン数（定期保険のみ）
  insuranceEffectType?: InsuranceEffectType // 保険効果タイプ
  insuranceTriggerType?: InsuranceTriggerType // トリガー型保険の発動条件

  // 落とし穴カード固有
  penalty?: number // ペナルティ値

  // 保険カード用年齢ボーナス
  ageBonus?: number

  // Phase 4: 夢カード固有
  dreamCategory?: DreamCategory

  // v2: 老化カード固有
  agingEffects?: CardEffect[]
}

/**
 * 老化カードインターフェース
 */
export interface AgingCard extends ICard {
  type: 'aging'
  // 老化カードはコストを払って除外できるなどの特殊ルールがあるため
  removalCost?: number
}

/**
 * トラブルカードインターフェース
 */
export interface TroubleCard extends ICard {
  type: 'trouble'
  immediateEffect?: CardEffect
}

/**
 * 最終試練カードインターフェース
 */
export interface FinalChallengeCard extends ICard {
  type: 'final_challenge'
  specialCondition?: string
}



/**
 * 夢カードインターフェース
 */
export interface DreamCard extends ICard {
  dreamCategory: DreamCategory
  baseRequiredPower: number
  ageAdjustment: number // 年齢調整値
}

/**
 * スキルカードレア度
 */
export type SkillRarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * スキルカード専用プロパティ
 */
export interface SkillCardProperties {
  rarity: SkillRarity
  cooldown?: number // クールダウンターン数
  remainingCooldown?: number // 残りクールダウン
  usageCount?: number // 使用回数（制限あり）
  maxUsages?: number // 最大使用回数
  prerequisites?: string[] // 前提スキル
  masteryLevel?: number // 熟練度レベル (1-5)
}

/**
 * コンボカード専用プロパティ
 */
export interface ComboCardProperties {
  requiredCards: string[] // 必要なカード名またはタイプ
  comboBonus: number // コンボ時のボーナスパワー
  chainLength?: number // 連鎖の長さ
}

/**
 * イベントカード専用プロパティ
 */
export interface EventCardProperties {
  duration: number // 効果持続ターン数
  triggerCondition?: string // 発動条件
  globalEffect?: boolean // 全体効果かどうか
}

/**
 * 保険効果タイプ
 */
export type InsuranceEffectType =
  | 'offensive'   // 攻撃型（パワー提供）
  | 'defensive'   // 防御型（ダメージ軽減）
  | 'recovery'    // 回復型（体力回復）
  | 'specialized' // 特化型（特定チャレンジ特化）
  | 'comprehensive' // 包括型（複数効果）
  | 'trigger'     // トリガー型（特定条件で一回発動）

/**
 * 保険トリガータイプ（トリガー型保険用）
 * 保険がどの条件で発動するかを定義
 */
export type InsuranceTriggerType =
  | 'on_death'         // 活力0になる瞬間（生命保険）
  | 'on_heavy_damage'  // 10ダメージ以上受ける時（医療保険）
  | 'on_aging_gameover' // 老化カード3枚で手詰まり時（障害保険）
  | 'on_demand'        // いつでも発動可能（就業不能保険）

/**
 * 拡張カードインターフェース
 */
export interface IAdvancedCard extends ICard {
  // スキルカード用
  skillProperties?: SkillCardProperties
  // コンボカード用
  comboProperties?: ComboCardProperties
  // イベントカード用
  eventProperties?: EventCardProperties
  // レジェンダリーカード固有
  isUnlockable?: boolean // アンロック可能かどうか
  unlockCondition?: string // アンロック条件
  // チャレンジカード用
  rewardType?: RewardType // チャレンジ成功時の報酬タイプ
}