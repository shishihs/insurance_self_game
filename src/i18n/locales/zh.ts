/**
 * 中文（简体）翻译文件
 * 保险游戏的中文消息和设置
 */

export default {
  // 基本UI元素
  ui: {
    // 导航
    navigation: {
      home: '首页',
      back: '首页',
      game: '游戏',
      tutorial: '教程',
      statistics: '统计',
      settings: '设置',
      accessibility: '无障碍设置',
      feedback: '反馈'
    },
    
    // 按钮
    buttons: {
      start: '开始',
      startGame: '开始游戏',
      startTutorial: '开始教程',
      close: '关闭',
      cancel: '取消',
      ok: '确定',
      yes: '是',
      no: '否',
      continue: '继续',
      skip: '跳过',
      next: '下一步',
      previous: '上一步',
      finish: '完成',
      reset: '重置',
      save: '保存',
      load: '加载'
    },
    
    // 通用消息
    common: {
      loading: '加载中...',
      error: '发生错误',
      success: '成功',
      warning: '警告',
      info: '信息',
      confirm: '确认',
      welcome: '欢迎',
      congratulations: '恭喜！',
      gameOver: '游戏结束',
      newGame: '新游戏',
      retry: '重试'
    }
  },
  
  // 游戏相关
  game: {
    // 游戏状态
    title: '人生充实游戏',
    subtitle: '战略人生模拟',
    description: '在人生的不同阶段中，平衡风险与保险，追求充实人生的游戏。',
    
    // 人生阶段
    stages: {
      youth: '青年期',
      adult: '成年期',
      middleAge: '中年期',
      elderly: '老年期'
    },
    
    // 游戏元素
    elements: {
      vitality: '生命力',
      turn: '回合',
      phase: '阶段',
      stage: '关卡',
      round: '轮次',
      score: '得分',
      level: '等级'
    },
    
    // 卡牌
    cards: {
      riskCard: '风险卡',
      insuranceCard: '保险卡',
      eventCard: '事件卡',
      actionCard: '行动卡',
      powerCard: '力量卡'
    },
    
    // 行动
    actions: {
      draw: '抽卡',
      play: '出牌',
      discard: '弃牌',
      buyInsurance: '购买保险',
      cancelInsurance: '取消保险',
      takeRisk: '承担风险',
      avoidRisk: '规避风险'
    },
    
    // 保险类型
    insurance: {
      types: {
        life: '人寿保险',
        health: '健康保险',
        auto: '车险',
        home: '房屋保险',
        travel: '旅行保险',
        income: '收入保障保险',
        disability: '意外伤害保险',
        longTermCare: '长期护理保险'
      },
      
      terms: {
        premium: '保费',
        coverage: '保额',
        deductible: '免赔额',
        beneficiary: '受益人',
        policy: '保单',
        claim: '理赔',
        renewal: '续保',
        cancellation: '退保'
      }
    },
    
    // 风险
    risks: {
      categories: {
        health: '健康风险',
        financial: '经济风险',
        accident: '意外风险',
        natural: '自然灾害风险',
        career: '职业风险',
        family: '家庭风险'
      },
      
      levels: {
        low: '低风险',
        medium: '中等风险',
        high: '高风险',
        extreme: '极高风险'
      }
    }
  },
  
  // 教程
  tutorial: {
    title: '游戏教程',
    welcome: '欢迎来到人生充实游戏的世界！',
    steps: {
      introduction: {
        title: '介绍',
        content: '在这个游戏中，您将在人生的不同阶段中平衡风险与保险。'
      },
      basicRules: {
        title: '基本规则',
        content: '每回合抽取卡牌，决定是面对风险还是用保险来防范。'
      },
      cardTypes: {
        title: '卡牌类型',
        content: '有风险卡、保险卡和事件卡。了解它们各自的特点。'
      },
      insuranceSystem: {
        title: '保险系统',
        content: '提前购买保险来防范风险。要考虑保费和保额。'
      },
      strategy: {
        title: '策略要点',
        content: '在维持生命力的同时，制定有效的保险策略是成功的关键。'
      }
    }
  },
  
  // 统计分析
  statistics: {
    title: '统计仪表板',
    sections: {
      overview: '概览',
      performance: '表现',
      trends: '趋势',
      detailed: '详细分析'
    },
    
    metrics: {
      gamesPlayed: '游戏次数',
      winRate: '胜率',
      averageScore: '平均得分',
      bestScore: '最高得分',
      totalPlayTime: '总游戏时间',
      averageGameTime: '平均游戏时间',
      survivalRate: '生存率',
      insuranceEfficiency: '保险效率'
    },
    
    charts: {
      vitalityTrend: '生命力趋势',
      stageAnalysis: '阶段分析',
      cardUsage: '卡牌使用情况',
      decisionAnalysis: '决策分析',
      riskManagement: '风险管理',
      insuranceCoverage: '保险覆盖'
    }
  },
  
  // 无障碍
  accessibility: {
    title: '无障碍设置',
    sections: {
      visual: '视觉设置',
      audio: '音频设置',
      interaction: '交互设置',
      display: '显示设置'
    },
    
    options: {
      highContrast: '高对比度',
      largeText: '大字体',
      reduceMotion: '减少动画',
      screenReader: '屏幕阅读器支持',
      keyboardNavigation: '键盘导航',
      audioCues: '音频提示',
      subtitles: '字幕',
      slowAnimations: '慢速动画'
    },
    
    keyboardShortcuts: {
      title: '键盘快捷键',
      homeScreen: '返回首页 (Alt+H)',
      startGame: '开始游戏 (Alt+G)',
      startTutorial: '开始教程 (Alt+T)',
      openStatistics: '打开统计 (Alt+S)',
      openAccessibility: '无障碍设置 (Alt+A)',
      help: '显示帮助 (F1)'
    }
  },
  
  // 反馈
  feedback: {
    title: '反馈',
    types: {
      bug: '错误报告',
      suggestion: '改进建议',
      general: '一般意见',
      rating: '评价'
    },
    
    form: {
      subject: '主题',
      message: '消息',
      email: '邮箱（可选）',
      category: '类别',
      priority: '优先级',
      submit: '提交',
      thankYou: '感谢您的反馈！'
    }
  },
  
  // 错误消息
  errors: {
    general: '发生错误。',
    network: '网络错误。',
    gameState: '游戏状态加载失败。',
    save: '游戏保存失败。',
    load: '游戏加载失败。',
    invalidAction: '无效操作。',
    cardNotFound: '未找到卡牌。',
    insufficientFunds: '资金不足。',
    insuranceNotActive: '保险未生效。'
  },
  
  // 成功消息
  success: {
    gameSaved: '游戏已保存。',
    gameLoaded: '游戏已加载。',
    insurancePurchased: '保险已购买。',
    riskAvoided: '风险已规避。',
    levelCompleted: '关卡完成！',
    achievementUnlocked: '成就解锁！'
  },
  
  // 地区特定设置（中国）
  region: {
    currency: '人民币',
    currencySymbol: '¥',
    dateFormat: 'YYYY年MM月DD日',
    numberFormat: '1,234',
    
    // 中国保险制度相关术语
    insuranceSystem: {
      nationalHealth: '城镇职工基本医疗保险',
      employeeHealth: '职工医疗保险',
      nationalPension: '城镇职工基本养老保险',
      employeePension: '企业年金',
      longTermCare: '长期护理保险',
      workersComp: '工伤保险',
      unemployment: '失业保险'
    },
    
    // 中国特有风险
    risks: {
      earthquake: '地震',
      flood: '洪水',
      typhoon: '台风',
      smog: '雾霾',
      economicSlowdown: '经济放缓',
      agingPopulation: '人口老龄化'
    }
  },
  
  // 年龄段特定消息
  ageGroups: {
    young: {
      title: '年轻人保险建议',
      message: '为未来打好基础很重要。'
    },
    middle: {
      title: '中年人保险建议',
      message: '考虑为家庭提供保障。'
    },
    senior: {
      title: '老年人保险建议',
      message: '医疗和护理风险的准备至关重要。'
    }
  }
} as const