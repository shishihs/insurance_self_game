/**
 * 地域固有のゲーム設定システム
 * 各地域の保険制度や文化的特性に基づいたゲーム設定を提供
 */

import type { SupportedLocale } from './index'

// 地域設定の型定義
export interface RegionalSettings {
  // 基本情報
  locale: SupportedLocale
  region: string
  country: string
  currency: string
  currencySymbol: string
  
  // 数値・日付フォーマット
  numberFormat: Intl.NumberFormatOptions
  dateFormat: string
  timeFormat: '12h' | '24h'
  
  // 保険制度
  insuranceSystem: {
    publicHealthcare: boolean
    nationalPension: boolean
    mandatoryInsurance: string[]
    commonInsurance: string[]
    averagePremiumRatio: number // 収入に対する保険料の平均割合
  }
  
  // 経済指標
  economy: {
    averageIncome: number // 年収（現地通貨）
    livingCostIndex: number // 生活費指数（日本=100）
    healthcareCostIndex: number // 医療費指数
    inflationRate: number // インフレ率
  }
  
  // リスクプロファイル
  risks: {
    naturalDisasters: string[]
    commonHealthRisks: string[]
    economicRisks: string[]
    socialRisks: string[]
    riskPriority: Record<string, number> // リスクの優先度
  }
  
  // 文化的特性
  culture: {
    riskTolerance: 'low' | 'medium' | 'high'
    savingHabits: 'conservative' | 'moderate' | 'aggressive'
    familyStructure: 'nuclear' | 'extended' | 'mixed'
    retirementAge: number
    lifeExpectancy: number
  }
  
  // ゲーム調整
  gameAdjustments: {
    vitalityMultiplier: number // 生命力の基準値調整
    premiumMultiplier: number // 保険料の基準値調整
    riskFrequency: number // リスクイベントの発生頻度
    bonusEvents: string[] // 地域特有のボーナスイベント
  }
}

// 各地域の設定
const regionalConfigs: Record<SupportedLocale, RegionalSettings> = {
  // 日本
  ja: {
    locale: 'ja',
    region: 'East Asia',
    country: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: '24h',
    
    insuranceSystem: {
      publicHealthcare: true,
      nationalPension: true,
      mandatoryInsurance: ['国民健康保険', '国民年金', '介護保険'],
      commonInsurance: ['生命保険', '火災保険', '自動車保険', '医療保険'],
      averagePremiumRatio: 0.08 // 8%
    },
    
    economy: {
      averageIncome: 4500000, // 450万円
      livingCostIndex: 100,
      healthcareCostIndex: 80, // 公的医療制度により低め
      inflationRate: 0.02
    },
    
    risks: {
      naturalDisasters: ['地震', '台風', '洪水', '火山噴火'],
      commonHealthRisks: ['がん', '脳卒中', '心疾患', '認知症'],
      economicRisks: ['不況', 'デフレ', '失業', '年金制度の不安'],
      socialRisks: ['高齢化', '人口減少', '医療費増大'],
      riskPriority: {
        '地震': 9,
        'がん': 8,
        '高齢化': 7,
        '台風': 6,
        '不況': 5
      }
    },
    
    culture: {
      riskTolerance: 'low',
      savingHabits: 'conservative',
      familyStructure: 'nuclear',
      retirementAge: 65,
      lifeExpectancy: 84
    },
    
    gameAdjustments: {
      vitalityMultiplier: 1.0,
      premiumMultiplier: 1.0,
      riskFrequency: 1.0,
      bonusEvents: ['長寿ボーナス', '技術革新', '健康促進']
    }
  },
  
  // 英語圏（主にアメリカ）
  en: {
    locale: 'en',
    region: 'North America',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    insuranceSystem: {
      publicHealthcare: false,
      nationalPension: true,
      mandatoryInsurance: ['Social Security', 'Medicare'],
      commonInsurance: ['Health Insurance', 'Life Insurance', 'Auto Insurance', 'Home Insurance'],
      averagePremiumRatio: 0.15 // 15%
    },
    
    economy: {
      averageIncome: 70000, // $70,000
      livingCostIndex: 120,
      healthcareCostIndex: 200, // 医療費が高い
      inflationRate: 0.025
    },
    
    risks: {
      naturalDisasters: ['Hurricane', 'Tornado', 'Earthquake', 'Wildfire'],
      commonHealthRisks: ['Heart Disease', 'Cancer', 'Diabetes', 'Obesity'],
      economicRisks: ['Recession', 'Job Loss', 'Medical Bankruptcy', 'Market Crash'],
      socialRisks: ['Healthcare Costs', 'Education Debt', 'Income Inequality'],
      riskPriority: {
        'Healthcare Costs': 9,
        'Heart Disease': 8,
        'Job Loss': 7,
        'Hurricane': 6,
        'Recession': 5
      }
    },
    
    culture: {
      riskTolerance: 'medium',
      savingHabits: 'moderate',
      familyStructure: 'nuclear',
      retirementAge: 67,
      lifeExpectancy: 79
    },
    
    gameAdjustments: {
      vitalityMultiplier: 0.9,
      premiumMultiplier: 1.5,
      riskFrequency: 1.2,
      bonusEvents: ['Stock Market Boom', 'Innovation Bonus', 'Career Advancement']
    }
  },
  
  // 中国
  zh: {
    locale: 'zh', 
    region: 'East Asia',
    country: 'China',
    currency: 'CNY',
    currencySymbol: '¥',
    
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: '24h',
    
    insuranceSystem: {
      publicHealthcare: true,
      nationalPension: true,
      mandatoryInsurance: ['城镇职工基本医疗保险', '城镇职工基本养老保险'],
      commonInsurance: ['人寿保险', '健康保险', '意外保险', '财产保险'],
      averagePremiumRatio: 0.06 // 6%
    },
    
    economy: {
      averageIncome: 80000, // 8万元
      livingCostIndex: 70,
      healthcareCostIndex: 60,
      inflationRate: 0.03
    },
    
    risks: {
      naturalDisasters: ['地震', '洪水', '台风', '雾霾'],
      commonHealthRisks: ['癌症', '心血管疾病', '糖尿病', '呼吸系统疾病'],
      economicRisks: ['经济放缓', '房价波动', '就业压力', '通胀'],
      socialRisks: ['人口老龄化', '环境污染', '食品安全'],
      riskPriority: {
        '癌症': 9,
        '人口老龄化': 8,
        '地震': 7,
        '雾霾': 6,
        '经济放缓': 5
      }
    },
    
    culture: {
      riskTolerance: 'low',
      savingHabits: 'conservative',
      familyStructure: 'extended',
      retirementAge: 60,
      lifeExpectancy: 77
    },
    
    gameAdjustments: {
      vitalityMultiplier: 0.95,
      premiumMultiplier: 0.8,
      riskFrequency: 1.1,
      bonusEvents: ['经济发展', '科技创新', '家庭支持']
    }
  },
  
  // 韓国
  ko: {
    locale: 'ko',
    region: 'East Asia', 
    country: 'South Korea',
    currency: 'KRW',
    currencySymbol: '₩',
    
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    dateFormat: 'YYYY년 MM월 DD일',
    timeFormat: '24h',
    
    insuranceSystem: {
      publicHealthcare: true,
      nationalPension: true,
      mandatoryInsurance: ['국민건강보험', '국민연금', '장기요양보험'],
      commonInsurance: ['생명보험', '상해보험', '자동차보험', '화재보험'],
      averagePremiumRatio: 0.07 // 7%
    },
    
    economy: {
      averageIncome: 40000000, // 4천만원
      livingCostIndex: 95,
      healthcareCostIndex: 70,
      inflationRate: 0.02
    },
    
    risks: {
      naturalDisasters: ['지진', '태풍', '홍수', '미세먼지'],
      commonHealthRisks: ['암', '심혈관질환', '당뇨병', '우울증'],
      economicRisks: ['경기침체', '실업', '부동산가격', '가계부채'],
      socialRisks: ['고령화사회', '저출산', '경쟁사회', '스트레스'],
      riskPriority: {
        '암': 9,
        '고령화사회': 8,
        '미세먼지': 7,
        '스트레스': 6,
        '경기침체': 5
      }
    },
    
    culture: {
      riskTolerance: 'low',
      savingHabits: 'conservative',
      familyStructure: 'mixed',
      retirementAge: 62,
      lifeExpectancy: 83
    },
    
    gameAdjustments: {
      vitalityMultiplier: 1.05,
      premiumMultiplier: 0.9,
      riskFrequency: 1.0,
      bonusEvents: ['기술혁신', '건강관리', '교육투자']
    }
  }
}

// 地域設定の取得
export function getRegionalSettings(locale: SupportedLocale): RegionalSettings {
  return regionalConfigs[locale]
}

// 現在の地域設定を取得
export function getCurrentRegionalSettings(): RegionalSettings {
  const currentLocale = document.documentElement.lang as SupportedLocale || 'ja'
  return getRegionalSettings(currentLocale)
}

// 地域に基づく値の調整
export function adjustValueForRegion(baseValue: number, adjustmentType: keyof RegionalSettings['gameAdjustments'], locale?: SupportedLocale): number {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  const multiplier = settings.gameAdjustments[adjustmentType] as number
  return Math.round(baseValue * multiplier)
}

// 地域固有のイベント取得
export function getRegionalEvents(locale?: SupportedLocale): string[] {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  return settings.gameAdjustments.bonusEvents
}

// 地域のリスク優先度取得
export function getRegionalRiskPriority(locale?: SupportedLocale): Record<string, number> {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  return settings.risks.riskPriority
}

// 通貨フォーマット
export function formatCurrency(amount: number, locale?: SupportedLocale): string {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  
  try {
    return new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.currency,
      ...settings.numberFormat
    }).format(amount)
  } catch (error) {
    // フォールバック
    return `${settings.currencySymbol}${amount.toLocaleString()}`
  }
}

// 日付フォーマット
export function formatDate(date: Date, locale?: SupportedLocale): string {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  
  try {
    return new Intl.DateTimeFormat(settings.locale).format(date)
  } catch (error) {
    // フォールバック
    return date.toLocaleDateString()
  }
}

// 地域設定に基づくゲーム難易度調整
export interface DifficultyAdjustment {
  vitalityMultiplier: number
  premiumCostMultiplier: number
  riskFrequencyMultiplier: number
  economicStabilityBonus: number
}

export function getRegionalDifficultyAdjustment(locale?: SupportedLocale): DifficultyAdjustment {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  
  return {
    vitalityMultiplier: settings.gameAdjustments.vitalityMultiplier,
    premiumCostMultiplier: settings.gameAdjustments.premiumMultiplier,
    riskFrequencyMultiplier: settings.gameAdjustments.riskFrequency,
    economicStabilityBonus: settings.culture.riskTolerance === 'low' ? 1.1 : 
                           settings.culture.riskTolerance === 'high' ? 0.9 : 1.0
  }
}

// 地域固有の保険推奨
export function getRegionalInsuranceRecommendations(locale?: SupportedLocale): {
  essential: string[]
  recommended: string[]
  optional: string[]
} {
  const settings = locale ? getRegionalSettings(locale) : getCurrentRegionalSettings()
  
  const essential = settings.insuranceSystem.mandatoryInsurance
  const recommended = settings.insuranceSystem.commonInsurance.slice(0, 3)
  const optional = settings.insuranceSystem.commonInsurance.slice(3)
  
  return { essential, recommended, optional }
}