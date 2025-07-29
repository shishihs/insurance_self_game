/**
 * 한국어 번역 파일
 * 보험 게임의 한국어 메시지와 설정
 */

export default {
  // 기본 UI 요소
  ui: {
    // 내비게이션
    navigation: {
      home: '홈',
      back: '홈',
      game: '게임',
      tutorial: '튜토리얼',
      statistics: '통계',
      settings: '설정',
      accessibility: '접근성 설정',
      feedback: '피드백'
    },
    
    // 버튼
    buttons: {
      start: '시작',
      startGame: '게임 시작',
      startTutorial: '튜토리얼 시작',
      close: '닫기',
      cancel: '취소',
      ok: '확인',
      yes: '예',
      no: '아니오',
      continue: '계속',
      skip: '건너뛰기',
      next: '다음',
      previous: '이전',
      finish: '완료',
      reset: '초기화',
      save: '저장',
      load: '불러오기'
    },
    
    // 일반 메시지
    common: {
      loading: '로딩 중...',
      error: '오류가 발생했습니다',
      success: '성공',
      warning: '경고',
      info: '정보',
      confirm: '확인',
      welcome: '환영합니다',
      congratulations: '축하합니다!',
      gameOver: '게임 종료',
      newGame: '새 게임',
      retry: '다시 시도'
    }
  },
  
  // 게임 관련
  game: {
    // 게임 상태
    title: '인생 충실 게임',
    subtitle: '전략적 인생 시뮬레이션',
    description: '인생의 다양한 단계에서 위험과 보험의 균형을 고려하며 충실한 인생을 목표로 하는 게임입니다.',
    
    // 인생 단계
    stages: {
      youth: '청년기',
      adult: '성인기',
      middleAge: '중년기',
      elderly: '노년기'
    },
    
    // 게임 요소
    elements: {
      vitality: '생명력',
      turn: '턴',
      phase: '페이즈',
      stage: '스테이지',
      round: '라운드',
      score: '점수',
      level: '레벨'
    },
    
    // 카드
    cards: {
      riskCard: '위험 카드',
      insuranceCard: '보험 카드',
      eventCard: '이벤트 카드',
      actionCard: '액션 카드',
      powerCard: '파워 카드'
    },
    
    // 액션
    actions: {
      draw: '카드 뽑기',
      play: '카드 사용',
      discard: '카드 버리기',
      buyInsurance: '보험 구매',
      cancelInsurance: '보험 해지',
      takeRisk: '위험 감수',
      avoidRisk: '위험 회피'
    },
    
    // 보험 유형
    insurance: {
      types: {
        life: '생명보험',
        health: '건강보험',
        auto: '자동차보험',
        home: '화재보험',
        travel: '여행자보험',
        income: '소득보장보험',
        disability: '상해보험',
        longTermCare: '장기요양보험'
      },
      
      terms: {
        premium: '보험료',
        coverage: '보장금액',
        deductible: '자기부담금',
        beneficiary: '수익자',
        policy: '보험증권',
        claim: '보험금 청구',
        renewal: '갱신',
        cancellation: '해지'
      }
    },
    
    // 위험
    risks: {
      categories: {
        health: '건강 위험',
        financial: '경제적 위험',
        accident: '사고 위험',
        natural: '자연재해 위험',
        career: '직업 위험',
        family: '가족 위험'
      },
      
      levels: {
        low: '낮은 위험',
        medium: '중간 위험',
        high: '높은 위험',
        extreme: '극도로 높은 위험'
      }
    }
  },
  
  // 튜토리얼
  tutorial: {
    title: '게임 튜토리얼',
    welcome: '인생 충실 게임의 세계에 오신 것을 환영합니다!',
    steps: {
      introduction: {
        title: '소개',
        content: '이 게임에서는 인생의 다양한 단계에서 위험과 보험의 균형을 고려하며 진행합니다.'
      },
      basicRules: {
        title: '기본 규칙',
        content: '각 턴에서 카드를 뽑고, 위험에 대처하거나 보험으로 대비할지 결정합니다.'
      },
      cardTypes: {
        title: '카드 종류',
        content: '위험 카드, 보험 카드, 이벤트 카드가 있습니다. 각각의 특징을 이해해봅시다.'
      },
      insuranceSystem: {
        title: '보험 시스템',
        content: '미리 보험을 구매하여 위험에 대비할 수 있습니다. 보험료와 보장금액을 고려하여 선택하세요.'
      },
      strategy: {
        title: '전략 포인트',
        content: '생명력을 유지하면서 효과적인 보험 전략을 세우는 것이 성공의 열쇠입니다.'
      }
    }
  },
  
  // 통계 분석
  statistics: {
    title: '통계 대시보드',
    sections: {
      overview: '개요',
      performance: '성과',
      trends: '트렌드',
      detailed: '상세 분석'
    },
    
    metrics: {
      gamesPlayed: '플레이 횟수',
      winRate: '승률',
      averageScore: '평균 점수',
      bestScore: '최고 점수',
      totalPlayTime: '총 플레이 시간',
      averageGameTime: '평균 게임 시간',
      survivalRate: '생존율',
      insuranceEfficiency: '보험 효율성'
    },
    
    charts: {
      vitalityTrend: '생명력 추이',
      stageAnalysis: '스테이지별 분석',
      cardUsage: '카드 사용 현황',
      decisionAnalysis: '의사결정 분석',
      riskManagement: '위험 관리',
      insuranceCoverage: '보험 커버리지'
    }
  },
  
  // 접근성
  accessibility: {
    title: '접근성 설정',
    sections: {
      visual: '시각 설정',
      audio: '음성 설정',
      interaction: '조작 설정',
      display: '표시 설정'
    },
    
    options: {
      highContrast: '고대비',
      largeText: '큰 글자',
      reduceMotion: '애니메이션 감소',
      screenReader: '스크린 리더 지원',
      keyboardNavigation: '키보드 내비게이션',
      audioCues: '음성 신호',
      subtitles: '자막',
      slowAnimations: '느린 애니메이션'
    },
    
    keyboardShortcuts: {
      title: '키보드 단축키',
      homeScreen: '홈 화면으로 돌아가기 (Alt+H)',
      startGame: '게임 시작 (Alt+G)',
      startTutorial: '튜토리얼 시작 (Alt+T)',
      openStatistics: '통계 열기 (Alt+S)',
      openAccessibility: '접근성 설정 (Alt+A)',
      help: '도움말 표시 (F1)'
    }
  },
  
  // 피드백
  feedback: {
    title: '피드백',
    types: {
      bug: '버그 리포트',
      suggestion: '개선 제안',
      general: '일반 의견',
      rating: '평가'
    },
    
    form: {
      subject: '제목',
      message: '메시지',
      email: '이메일 (선택사항)',
      category: '카테고리',
      priority: '우선순위',
      submit: '제출',
      thankYou: '피드백을 주셔서 감사합니다!'
    }
  },
  
  // 오류 메시지
  errors: {
    general: '오류가 발생했습니다.',
    network: '네트워크 오류가 발생했습니다.',
    gameState: '게임 상태 로드에 실패했습니다.',
    save: '게임 저장에 실패했습니다.',
    load: '게임 로드에 실패했습니다.',
    invalidAction: '유효하지 않은 동작입니다.',
    cardNotFound: '카드를 찾을 수 없습니다.',
    insufficientFunds: '자금이 부족합니다.',
    insuranceNotActive: '보험이 유효하지 않습니다.'
  },
  
  // 성공 메시지
  success: {
    gameSaved: '게임을 저장했습니다.',
    gameLoaded: '게임을 로드했습니다.',
    insurancePurchased: '보험을 구매했습니다.',
    riskAvoided: '위험을 회피했습니다.',
    levelCompleted: '레벨을 클리어했습니다!',
    achievementUnlocked: '업적을 달성했습니다!'
  },
  
  // 지역별 설정 (한국)
  region: {
    currency: '원',
    currencySymbol: '₩',
    dateFormat: 'YYYY년 MM월 DD일',
    numberFormat: '1,234',
    
    // 한국 보험제도 관련 용어
    insuranceSystem: {
      nationalHealth: '국민건강보험',
      employeeHealth: '직장건강보험',
      nationalPension: '국민연금',
      employeePension: '퇴직연금',
      longTermCare: '장기요양보험',
      workersComp: '산재보험',
      unemployment: '고용보험'
    },
    
    // 한국 특유의 위험
    risks: {
      earthquake: '지진',
      typhoon: '태풍',
      flood: '홍수',
      fineDust: '미세먼지',
      economicRecession: '경기침체',
      agingSociety: '고령화 사회'
    }
  },
  
  // 연령대별 메시지
  ageGroups: {
    young: {
      title: '젊은 세대를 위한 보험 조언',
      message: '미래를 위한 기반 마련이 중요합니다.'
    },
    middle: {
      title: '직장인 세대를 위한 보험 조언',
      message: '가족을 지키기 위한 보장을 고려해보세요.'
    },
    senior: {
      title: '시니어 세대를 위한 보험 조언',
      message: '의료 및 요양 위험에 대한 대비가 중요합니다.'
    }
  }
} as const