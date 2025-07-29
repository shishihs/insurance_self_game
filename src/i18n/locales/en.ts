/**
 * English Translation File
 * English messages and settings for the insurance game
 */

export default {
  // Basic UI elements
  ui: {
    // Navigation
    navigation: {
      home: 'Home',
      back: 'Home',
      game: 'Game',
      tutorial: 'Tutorial',
      statistics: 'Statistics',
      settings: 'Settings',
      accessibility: 'Accessibility Settings',
      feedback: 'Feedback'
    },
    
    // Buttons
    buttons: {
      start: 'Start',
      startGame: 'Start Game',
      startTutorial: 'Start Tutorial',
      close: 'Close',
      cancel: 'Cancel',
      ok: 'OK',
      yes: 'Yes',
      no: 'No',
      continue: 'Continue',
      skip: 'Skip',
      next: 'Next',
      previous: 'Previous',
      finish: 'Finish',
      reset: 'Reset',
      save: 'Save',
      load: 'Load'
    },
    
    // Common messages
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      confirm: 'Confirm',
      welcome: 'Welcome',
      congratulations: 'Congratulations!',
      gameOver: 'Game Over',
      newGame: 'New Game',
      retry: 'Try Again'
    }
  },
  
  // Game related
  game: {
    // Game state
    title: 'Life Enrichment Game',
    subtitle: 'Strategic Life Simulation',
    description: 'A game where you navigate through different life stages, balancing risks and insurance to achieve a fulfilling life.',
    
    // Life stages
    stages: {
      youth: 'Youth',
      adult: 'Adulthood',
      middleAge: 'Middle Age',
      elderly: 'Elderly'
    },
    
    // Game elements
    elements: {
      vitality: 'Vitality',
      turn: 'Turn',
      phase: 'Phase',
      stage: 'Stage',
      round: 'Round',
      score: 'Score',
      level: 'Level'
    },
    
    // Cards
    cards: {
      riskCard: 'Risk Card',
      insuranceCard: 'Insurance Card',
      eventCard: 'Event Card',
      actionCard: 'Action Card',
      powerCard: 'Power Card'
    },
    
    // Actions
    actions: {
      draw: 'Draw Card',
      play: 'Play Card',
      discard: 'Discard Card',
      buyInsurance: 'Buy Insurance',
      cancelInsurance: 'Cancel Insurance',
      takeRisk: 'Take Risk',
      avoidRisk: 'Avoid Risk'
    },
    
    // Insurance types
    insurance: {
      types: {
        life: 'Life Insurance',
        health: 'Health Insurance',
        auto: 'Auto Insurance',
        home: 'Home Insurance',
        travel: 'Travel Insurance',
        income: 'Income Protection',
        disability: 'Disability Insurance',
        longTermCare: 'Long-term Care Insurance'
      },
      
      terms: {
        premium: 'Premium',
        coverage: 'Coverage',
        deductible: 'Deductible',
        beneficiary: 'Beneficiary',
        policy: 'Policy',
        claim: 'Claim',
        renewal: 'Renewal',
        cancellation: 'Cancellation'
      }
    },
    
    // Risks
    risks: {
      categories: {
        health: 'Health Risk',
        financial: 'Financial Risk',
        accident: 'Accident Risk',
        natural: 'Natural Disaster Risk',
        career: 'Career Risk',
        family: 'Family Risk'
      },
      
      levels: {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
        extreme: 'Extreme Risk'
      }
    }
  },
  
  // Tutorial
  tutorial: {
    title: 'Game Tutorial',
    welcome: 'Welcome to the Life Enrichment Game!',
    steps: {
      introduction: {
        title: 'Introduction',
        content: 'In this game, you\'ll navigate through different life stages while balancing risks and insurance.'
      },
      basicRules: {
        title: 'Basic Rules',
        content: 'Each turn, draw cards and decide whether to face risks or protect yourself with insurance.'
      },
      cardTypes: {
        title: 'Card Types',
        content: 'There are risk cards, insurance cards, and event cards. Learn their characteristics.'
      },
      insuranceSystem: {
        title: 'Insurance System',
        content: 'Purchase insurance in advance to prepare for risks. Consider premiums and coverage amounts.'
      },
      strategy: {
        title: 'Strategy Tips',
        content: 'Maintain your vitality while developing an effective insurance strategy for success.'
      }
    }
  },
  
  // Statistics & Analytics
  statistics: {
    title: 'Statistics Dashboard',
    sections: {
      overview: 'Overview',
      performance: 'Performance',
      trends: 'Trends',
      detailed: 'Detailed Analysis'
    },
    
    metrics: {
      gamesPlayed: 'Games Played',
      winRate: 'Win Rate',
      averageScore: 'Average Score',
      bestScore: 'Best Score',
      totalPlayTime: 'Total Play Time',
      averageGameTime: 'Average Game Time',
      survivalRate: 'Survival Rate',
      insuranceEfficiency: 'Insurance Efficiency'
    },
    
    charts: {
      vitalityTrend: 'Vitality Trend',
      stageAnalysis: 'Stage Analysis',
      cardUsage: 'Card Usage',
      decisionAnalysis: 'Decision Analysis',
      riskManagement: 'Risk Management',
      insuranceCoverage: 'Insurance Coverage'
    }
  },
  
  // Accessibility
  accessibility: {
    title: 'Accessibility Settings',
    sections: {
      visual: 'Visual Settings',
      audio: 'Audio Settings',
      interaction: 'Interaction Settings',
      display: 'Display Settings'
    },
    
    options: {
      highContrast: 'High Contrast',
      largeText: 'Large Text',
      reduceMotion: 'Reduce Motion',
      screenReader: 'Screen Reader Support',
      keyboardNavigation: 'Keyboard Navigation',
      audioCues: 'Audio Cues',
      subtitles: 'Subtitles',
      slowAnimations: 'Slow Animations'
    },
    
    keyboardShortcuts: {
      title: 'Keyboard Shortcuts',
      homeScreen: 'Return to Home Screen (Alt+H)',
      startGame: 'Start Game (Alt+G)',
      startTutorial: 'Start Tutorial (Alt+T)',
      openStatistics: 'Open Statistics (Alt+S)',
      openAccessibility: 'Accessibility Settings (Alt+A)',
      help: 'Show Help (F1)'
    }
  },
  
  // Feedback
  feedback: {
    title: 'Feedback',
    types: {
      bug: 'Bug Report',
      suggestion: 'Suggestion',
      general: 'General Opinion',
      rating: 'Rating'
    },
    
    form: {
      subject: 'Subject',
      message: 'Message',
      email: 'Email (Optional)',
      category: 'Category',
      priority: 'Priority',
      submit: 'Submit',
      thankYou: 'Thank you for your feedback!'
    }
  },
  
  // Error messages
  errors: {
    general: 'An error occurred.',
    network: 'A network error occurred.',
    gameState: 'Failed to load game state.',
    save: 'Failed to save game.',
    load: 'Failed to load game.',
    invalidAction: 'Invalid action.',
    cardNotFound: 'Card not found.',
    insufficientFunds: 'Insufficient funds.',
    insuranceNotActive: 'Insurance is not active.'
  },
  
  // Success messages
  success: {
    gameSaved: 'Game saved.',
    gameLoaded: 'Game loaded.',
    insurancePurchased: 'Insurance purchased.',
    riskAvoided: 'Risk avoided.',
    levelCompleted: 'Level completed!',
    achievementUnlocked: 'Achievement unlocked!'
  },
  
  // Region-specific settings (US/International)
  region: {
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: '1,234',
    
    // US insurance system related terms
    insuranceSystem: {
      nationalHealth: 'Medicare',
      employeeHealth: 'Employer Health Insurance',
      nationalPension: 'Social Security',
      employeePension: '401(k)',
      longTermCare: 'Long-term Care Insurance',
      workersComp: 'Workers\' Compensation',
      unemployment: 'Unemployment Insurance'
    },
    
    // US-specific risks
    risks: {
      earthquake: 'Earthquake',
      hurricane: 'Hurricane',
      flood: 'Flood',
      recession: 'Recession',
      inflation: 'Inflation',
      jobLoss: 'Job Loss'
    }
  },
  
  // Age group specific messages
  ageGroups: {
    young: {
      title: 'Insurance Advice for Young Adults',
      message: 'Building a foundation for your future is important.'
    },
    middle: {
      title: 'Insurance Advice for Working Adults',
      message: 'Consider protection for your family.'
    },
    senior: {
      title: 'Insurance Advice for Seniors',
      message: 'Healthcare and long-term care preparation is essential.'
    }
  }
} as const