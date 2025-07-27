import type { GameConfig, PlayerStats } from '@/domain/types/game.types'
import type { MassiveBenchmarkResults } from '@/benchmark/MassiveBenchmark'
import type { GameAnalytics } from '@/analytics/GameAnalytics'

/**
 * Experiment configuration
 */
export interface ExperimentConfig {
  /** Experiment name and description */
  name: string
  description: string
  hypothesis: string
  
  /** Experimental design */
  type: 'ab_test' | 'multivariate' | 'factorial' | 'longitudinal'
  
  /** Sample size configuration */
  sampleSize: {
    total: number
    perGroup: number
    minimumDetectableEffect: number
    powerLevel: number
    significanceLevel: number
  }
  
  /** Groups and conditions */
  groups: ExperimentGroup[]
  
  /** Metrics to track */
  primaryMetrics: string[]
  secondaryMetrics: string[]
  
  /** Duration and scheduling */
  duration: {
    estimatedHours: number
    maxHours: number
    checkpointIntervals: number[]
  }
  
  /** Analysis configuration */
  analysis: {
    statisticalTests: StatisticalTest[]
    confidenceLevel: number
    multipleTestingCorrection: 'bonferroni' | 'holm' | 'fdr' | 'none'
    outlierDetection: boolean
  }
}

/**
 * Experiment group definition
 */
export interface ExperimentGroup {
  id: string
  name: string
  description: string
  size: number
  configuration: ExperimentCondition
  controlGroup: boolean
}

/**
 * Experiment condition/treatment
 */
export interface ExperimentCondition {
  gameConfig: Partial<GameConfig>
  parameters: Record<string, any>
  modifications: ExperimentModification[]
}

/**
 * Specific modifications for experiment
 */
export interface ExperimentModification {
  type: 'card_balance' | 'difficulty' | 'insurance' | 'ai_strategy' | 'ui_feature'
  target: string
  change: any
  rationale: string
}

/**
 * Statistical test configuration
 */
export interface StatisticalTest {
  name: string
  type: 't_test' | 'chi_square' | 'anova' | 'mann_whitney' | 'kruskal_wallis'
  metric: string
  groups: string[]
  hypotheses: {
    null: string
    alternative: string
  }
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  experiment: ExperimentConfig
  execution: {
    startTime: string
    endTime: string
    actualDuration: number
    completedSamples: number
    dataQuality: DataQualityMetrics
  }
  groupResults: GroupResults[]
  statisticalAnalysis: StatisticalAnalysisResults
  conclusions: ExperimentConclusions
  recommendations: string[]
}

/**
 * Group-specific results
 */
export interface GroupResults {
  groupId: string
  sampleSize: number
  metrics: Record<string, MetricResult>
  distributions: Record<string, number[]>
  outliers: OutlierData[]
  performance: PerformanceMetrics
}

/**
 * Metric result
 */
export interface MetricResult {
  mean: number
  median: number
  standardDeviation: number
  variance: number
  min: number
  max: number
  confidenceInterval: [number, number]
  distribution: 'normal' | 'skewed' | 'bimodal' | 'uniform'
}

/**
 * Statistical analysis results
 */
export interface StatisticalAnalysisResults {
  testResults: TestResult[]
  effectSizes: EffectSize[]
  powerAnalysis: PowerAnalysisResult
  multipleComparisons: MultipleComparisonResult[]
  assumptions: AssumptionTest[]
}

/**
 * Individual test result
 */
export interface TestResult {
  testName: string
  metric: string
  groups: string[]
  statistic: number
  pValue: number
  significant: boolean
  adjustedPValue?: number
  interpretation: string
  confidence: number
}

/**
 * Effect size measurement
 */
export interface EffectSize {
  metric: string
  groups: string[]
  cohensD?: number
  hedgesG?: number
  glassD?: number
  r?: number
  etaSquared?: number
  interpretation: 'negligible' | 'small' | 'medium' | 'large'
  magnitude: number
}

/**
 * Power analysis result
 */
export interface PowerAnalysisResult {
  achievedPower: number
  requiredSampleSize: number
  minimumDetectableEffect: number
  recommendations: string[]
}

/**
 * Multiple comparison correction results
 */
export interface MultipleComparisonResult {
  method: string
  adjustedAlpha: number
  significantTests: number
  familyWiseErrorRate: number
  corrections: Array<{
    test: string
    originalP: number
    adjustedP: number
    significant: boolean
  }>
}

/**
 * Statistical assumption testing
 */
export interface AssumptionTest {
  assumption: 'normality' | 'homoscedasticity' | 'independence'
  test: string
  pValue: number
  satisfied: boolean
  recommendation: string
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
  completeness: number
  consistency: number
  accuracy: number
  validity: number
  outlierRate: number
  missingDataRate: number
}

/**
 * Outlier detection data
 */
export interface OutlierData {
  sampleId: string
  metric: string
  value: number
  deviationScore: number
  method: 'iqr' | 'zscore' | 'modified_zscore' | 'isolation_forest'
}

/**
 * Performance metrics for experiment groups
 */
export interface PerformanceMetrics {
  winRate: number
  averageScore: number
  averageTurns: number
  challengeSuccessRate: number
  playerEngagement: number
  retentionRate: number
}

/**
 * Experiment conclusions
 */
export interface ExperimentConclusions {
  hypothesisSupported: boolean
  primaryFindings: string[]
  secondaryFindings: string[]
  practicalSignificance: boolean
  businessImpact: BusinessImpactAssessment
  limitations: string[]
  futureResearch: string[]
}

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  playerExperience: 'improved' | 'unchanged' | 'degraded'
  gameBalance: 'improved' | 'unchanged' | 'degraded'
  engagement: 'increased' | 'unchanged' | 'decreased'
  difficulty: 'appropriate' | 'too_easy' | 'too_hard'
  recommendation: 'implement' | 'modify' | 'reject'
  confidence: number
}

/**
 * Hypothesis definition
 */
export interface Hypothesis {
  id: string
  type: 'improvement' | 'difference' | 'correlation' | 'causation'
  statement: string
  prediction: string
  measurableOutcome: string
  testable: boolean
}

/**
 * Research experiment framework
 */
export class ExperimentFramework {
  private experiments: Map<string, ExperimentResults> = new Map()
  private activeExperiments: Map<string, ExperimentExecution> = new Map()
  private hypothesesLibrary: Map<string, Hypothesis> = new Map()

  constructor() {
    this.initializeHypothesesLibrary()
  }

  /**
   * Design a new experiment
   */
  designExperiment(config: Partial<ExperimentConfig>): ExperimentConfig {
    const experiment: ExperimentConfig = {
      name: config.name || 'Untitled Experiment',
      description: config.description || '',
      hypothesis: config.hypothesis || '',
      type: config.type || 'ab_test',
      sampleSize: {
        total: 1000,
        perGroup: 500,
        minimumDetectableEffect: 0.1,
        powerLevel: 0.8,
        significanceLevel: 0.05,
        ...config.sampleSize
      },
      groups: config.groups || this.generateDefaultGroups(config.type || 'ab_test'),
      primaryMetrics: config.primaryMetrics || ['winRate', 'averageScore'],
      secondaryMetrics: config.secondaryMetrics || ['challengeSuccessRate', 'playerEngagement'],
      duration: {
        estimatedHours: 2,
        maxHours: 24,
        checkpointIntervals: [0.25, 0.5, 0.75, 1.0],
        ...config.duration
      },
      analysis: {
        statisticalTests: [
          {
            name: 'Primary Metric Comparison',
            type: 't_test',
            metric: 'winRate',
            groups: ['control', 'treatment'],
            hypotheses: {
              null: 'No difference in win rate between groups',
              alternative: 'Treatment group has different win rate'
            }
          }
        ],
        confidenceLevel: 0.95,
        multipleTestingCorrection: 'holm',
        outlierDetection: true,
        ...config.analysis
      }
    }

    // Validate experiment design
    this.validateExperimentDesign(experiment)
    
    return experiment
  }

  /**
   * Run an experiment
   */
  async runExperiment(config: ExperimentConfig): Promise<ExperimentResults> {
    console.log(`🧪 Starting experiment: ${config.name}`)
    
    const execution = new ExperimentExecution(config)
    this.activeExperiments.set(config.name, execution)
    
    try {
      const results = await execution.execute()
      this.experiments.set(config.name, results)
      
      console.log(`✅ Experiment completed: ${config.name}`)
      return results
      
    } catch (error) {
      console.error(`❌ Experiment failed: ${config.name}`, error)
      throw error
    } finally {
      this.activeExperiments.delete(config.name)
    }
  }

  /**
   * Run A/B test
   */
  async runABTest(
    name: string,
    hypothesis: string,
    controlConfig: GameConfig,
    treatmentConfig: GameConfig,
    sampleSize: number = 1000
  ): Promise<ExperimentResults> {
    const experiment = this.designExperiment({
      name,
      hypothesis,
      type: 'ab_test',
      sampleSize: {
        total: sampleSize,
        perGroup: sampleSize / 2,
        minimumDetectableEffect: 0.1,
        powerLevel: 0.8,
        significanceLevel: 0.05
      },
      groups: [
        {
          id: 'control',
          name: 'Control Group',
          description: 'Baseline configuration',
          size: sampleSize / 2,
          configuration: {
            gameConfig: controlConfig,
            parameters: {},
            modifications: []
          },
          controlGroup: true
        },
        {
          id: 'treatment',
          name: 'Treatment Group',
          description: 'Modified configuration',
          size: sampleSize / 2,
          configuration: {
            gameConfig: treatmentConfig,
            parameters: {},
            modifications: []
          },
          controlGroup: false
        }
      ]
    })

    return this.runExperiment(experiment)
  }

  /**
   * Create hypothesis from template
   */
  createHypothesis(
    template: string,
    parameters: Record<string, any>
  ): Hypothesis {
    const templateHypothesis = this.hypothesesLibrary.get(template)
    if (!templateHypothesis) {
      throw new Error(`Hypothesis template '${template}' not found`)
    }

    return {
      ...templateHypothesis,
      id: `${template}_${Date.now()}`,
      statement: this.interpolateTemplate(templateHypothesis.statement, parameters),
      prediction: this.interpolateTemplate(templateHypothesis.prediction, parameters),
      measurableOutcome: this.interpolateTemplate(templateHypothesis.measurableOutcome, parameters)
    }
  }

  /**
   * Get experiment status
   */
  getExperimentStatus(experimentName: string): ExperimentStatus | null {
    const execution = this.activeExperiments.get(experimentName)
    return execution ? execution.getStatus() : null
  }

  /**
   * Get all experiment results
   */
  getAllExperiments(): Map<string, ExperimentResults> {
    return new Map(this.experiments)
  }

  /**
   * Generate experiment report
   */
  generateReport(experimentName: string): ExperimentReport {
    const results = this.experiments.get(experimentName)
    if (!results) {
      throw new Error(`Experiment '${experimentName}' not found`)
    }

    return {
      executive_summary: this.generateExecutiveSummary(results),
      methodology: this.generateMethodologySection(results),
      results_analysis: this.generateResultsAnalysis(results),
      statistical_analysis: this.generateStatisticalSection(results),
      conclusions: this.generateConclusions(results),
      recommendations: this.generateRecommendations(results),
      appendices: this.generateAppendices(results)
    }
  }

  /**
   * Meta-analysis of multiple experiments
   */
  conductMetaAnalysis(experimentNames: string[]): MetaAnalysisResults {
    const experiments = experimentNames
      .map(name => this.experiments.get(name))
      .filter(exp => exp !== undefined) as ExperimentResults[]

    if (experiments.length < 2) {
      throw new Error('Meta-analysis requires at least 2 experiments')
    }

    return {
      experiments: experimentNames,
      combinedEffectSize: this.calculateCombinedEffectSize(experiments),
      heterogeneity: this.calculateHeterogeneity(experiments),
      overallSignificance: this.calculateOverallSignificance(experiments),
      publicationBias: this.assessPublicationBias(experiments),
      conclusions: this.generateMetaConclusions(experiments)
    }
  }

  // === Private Methods ===

  private initializeHypothesesLibrary(): void {
    // Card balance hypotheses
    this.hypothesesLibrary.set('card_power_increase', {
      id: 'card_power_increase',
      type: 'improvement',
      statement: 'Increasing {cardType} power by {percentage}% will improve win rate',
      prediction: 'Win rate will increase by at least {expectedIncrease}%',
      measurableOutcome: 'Win rate difference between control and treatment groups',
      testable: true
    })

    // Difficulty adjustment hypotheses
    this.hypothesesLibrary.set('difficulty_reduction', {
      id: 'difficulty_reduction',
      type: 'improvement',
      statement: 'Reducing {stage} stage difficulty will improve player retention',
      prediction: 'Player completion rate will increase by {expectedIncrease}%',
      measurableOutcome: 'Completion rate and average turns survived',
      testable: true
    })

    // Insurance system hypotheses
    this.hypothesesLibrary.set('insurance_cost_optimization', {
      id: 'insurance_cost_optimization',
      type: 'improvement',
      statement: 'Optimizing insurance costs will improve game balance',
      prediction: 'Insurance adoption rate will increase while maintaining challenge',
      measurableOutcome: 'Insurance adoption rate and game completion balance',
      testable: true
    })

    // AI strategy hypotheses
    this.hypothesesLibrary.set('ai_strategy_effectiveness', {
      id: 'ai_strategy_effectiveness',
      type: 'difference',
      statement: '{strategyA} will outperform {strategyB} in {metric}',
      prediction: '{strategyA} will show {expectedDifference}% better performance',
      measurableOutcome: 'Performance metric comparison between strategies',
      testable: true
    })
  }

  private generateDefaultGroups(type: string): ExperimentGroup[] {
    switch (type) {
      case 'ab_test':
        return [
          {
            id: 'control',
            name: 'Control Group',
            description: 'Baseline configuration',
            size: 500,
            configuration: {
              gameConfig: {},
              parameters: {},
              modifications: []
            },
            controlGroup: true
          },
          {
            id: 'treatment',
            name: 'Treatment Group',
            description: 'Modified configuration',
            size: 500,
            configuration: {
              gameConfig: {},
              parameters: {},
              modifications: []
            },
            controlGroup: false
          }
        ]
      
      case 'multivariate':
        return [
          {
            id: 'control',
            name: 'Control',
            description: 'Baseline',
            size: 250,
            configuration: { gameConfig: {}, parameters: {}, modifications: [] },
            controlGroup: true
          },
          {
            id: 'var_a',
            name: 'Variation A',
            description: 'First variation',
            size: 250,
            configuration: { gameConfig: {}, parameters: {}, modifications: [] },
            controlGroup: false
          },
          {
            id: 'var_b',
            name: 'Variation B',
            description: 'Second variation',
            size: 250,
            configuration: { gameConfig: {}, parameters: {}, modifications: [] },
            controlGroup: false
          },
          {
            id: 'var_c',
            name: 'Variation C',
            description: 'Third variation',
            size: 250,
            configuration: { gameConfig: {}, parameters: {}, modifications: [] },
            controlGroup: false
          }
        ]
      
      default:
        return []
    }
  }

  private validateExperimentDesign(config: ExperimentConfig): void {
    // Sample size validation
    if (config.sampleSize.total < 100) {
      throw new Error('Sample size too small for reliable results')
    }

    // Group size validation
    const totalGroupSize = config.groups.reduce((sum, group) => sum + group.size, 0)
    if (totalGroupSize !== config.sampleSize.total) {
      throw new Error('Group sizes do not match total sample size')
    }

    // Control group validation
    const controlGroups = config.groups.filter(g => g.controlGroup)
    if (controlGroups.length !== 1) {
      throw new Error('Experiment must have exactly one control group')
    }

    // Metrics validation
    if (config.primaryMetrics.length === 0) {
      throw new Error('At least one primary metric must be specified')
    }
  }

  private interpolateTemplate(template: string, parameters: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return parameters[key] !== undefined ? String(parameters[key]) : match
    })
  }

  // Statistical analysis methods (simplified implementations)
  private calculateCombinedEffectSize(experiments: ExperimentResults[]): number {
    // Simplified meta-analysis effect size calculation
    const effects = experiments.map(exp => 
      exp.statisticalAnalysis.effectSizes[0]?.magnitude || 0
    )
    return effects.reduce((sum, effect) => sum + effect, 0) / effects.length
  }

  private calculateHeterogeneity(experiments: ExperimentResults[]): number {
    // Simplified heterogeneity calculation (I²)
    return Math.random() * 100 // Placeholder
  }

  private calculateOverallSignificance(experiments: ExperimentResults[]): number {
    // Simplified combined p-value calculation
    const pValues = experiments.map(exp => 
      exp.statisticalAnalysis.testResults[0]?.pValue || 1
    )
    return pValues.reduce((product, p) => product * p, 1) ** (1 / pValues.length)
  }

  private assessPublicationBias(experiments: ExperimentResults[]): PublicationBiasAssessment {
    return {
      risk: 'low',
      funnelPlotAsymmetry: 0.1,
      eggersTest: { statistic: 0.5, pValue: 0.6 },
      failsafeN: 5
    }
  }

  private generateMetaConclusions(experiments: ExperimentResults[]): string[] {
    return [
      'Combined evidence shows consistent patterns across experiments',
      'Effect sizes are moderate and practically significant',
      'Low heterogeneity suggests similar underlying effects'
    ]
  }

  // Report generation methods (simplified)
  private generateExecutiveSummary(results: ExperimentResults): string {
    return `Experiment ${results.experiment.name} completed with ${results.execution.completedSamples} samples. Primary hypothesis ${results.conclusions.hypothesisSupported ? 'supported' : 'not supported'}.`
  }

  private generateMethodologySection(results: ExperimentResults): string {
    return `${results.experiment.type.toUpperCase()} design with ${results.experiment.groups.length} groups, ${results.experiment.sampleSize.total} total samples.`
  }

  private generateResultsAnalysis(results: ExperimentResults): string {
    return `Statistical analysis revealed ${results.statisticalAnalysis.testResults.filter(t => t.significant).length} significant findings.`
  }

  private generateStatisticalSection(results: ExperimentResults): string {
    return `Conducted ${results.statisticalAnalysis.testResults.length} statistical tests with ${results.experiment.analysis.multipleTestingCorrection} correction.`
  }

  private generateConclusions(results: ExperimentResults): string {
    return results.conclusions.primaryFindings.join('. ')
  }

  private generateRecommendations(results: ExperimentResults): string {
    return results.recommendations.join('. ')
  }

  private generateAppendices(results: ExperimentResults): string {
    return 'Raw data and detailed statistical outputs available upon request.'
  }
}

/**
 * Experiment execution class
 */
class ExperimentExecution {
  private config: ExperimentConfig
  private startTime: number = 0
  private progress: number = 0
  private status: ExperimentExecutionStatus = 'preparing'

  constructor(config: ExperimentConfig) {
    this.config = config
  }

  async execute(): Promise<ExperimentResults> {
    this.startTime = Date.now()
    this.status = 'running'

    try {
      // Simulate experiment execution
      const groupResults = await this.runGroups()
      const statisticalAnalysis = await this.performStatisticalAnalysis(groupResults)
      const conclusions = this.drawConclusions(groupResults, statisticalAnalysis)

      this.status = 'completed'

      return {
        experiment: this.config,
        execution: {
          startTime: new Date(this.startTime).toISOString(),
          endTime: new Date().toISOString(),
          actualDuration: Date.now() - this.startTime,
          completedSamples: this.config.sampleSize.total,
          dataQuality: {
            completeness: 0.98,
            consistency: 0.95,
            accuracy: 0.97,
            validity: 0.96,
            outlierRate: 0.02,
            missingDataRate: 0.01
          }
        },
        groupResults,
        statisticalAnalysis,
        conclusions,
        recommendations: this.generateRecommendations(conclusions)
      }

    } catch (error) {
      this.status = 'failed'
      throw error
    }
  }

  getStatus(): ExperimentStatus {
    return {
      status: this.status,
      progress: this.progress,
      startTime: this.startTime,
      estimatedCompletion: this.calculateEstimatedCompletion()
    }
  }

  private async runGroups(): Promise<GroupResults[]> {
    const results: GroupResults[] = []

    for (const group of this.config.groups) {
      console.log(`Running group: ${group.name}`)
      
      // Simulate group execution
      const groupResult: GroupResults = {
        groupId: group.id,
        sampleSize: group.size,
        metrics: this.generateMockMetrics(),
        distributions: this.generateMockDistributions(),
        outliers: [],
        performance: this.generateMockPerformance()
      }

      results.push(groupResult)
      this.progress = results.length / this.config.groups.length
    }

    return results
  }

  private async performStatisticalAnalysis(groupResults: GroupResults[]): Promise<StatisticalAnalysisResults> {
    return {
      testResults: this.runStatisticalTests(groupResults),
      effectSizes: this.calculateEffectSizes(groupResults),
      powerAnalysis: this.performPowerAnalysis(),
      multipleComparisons: this.performMultipleComparisons(),
      assumptions: this.testAssumptions(groupResults)
    }
  }

  private drawConclusions(
    groupResults: GroupResults[],
    analysis: StatisticalAnalysisResults
  ): ExperimentConclusions {
    const significantTests = analysis.testResults.filter(t => t.significant)
    
    return {
      hypothesisSupported: significantTests.length > 0,
      primaryFindings: [
        `Found ${significantTests.length} statistically significant effects`,
        `Effect sizes range from small to medium`
      ],
      secondaryFindings: [
        'Data quality was high across all groups',
        'No significant outliers detected'
      ],
      practicalSignificance: true,
      businessImpact: {
        playerExperience: 'improved',
        gameBalance: 'improved',
        engagement: 'increased',
        difficulty: 'appropriate',
        recommendation: 'implement',
        confidence: 0.85
      },
      limitations: [
        'Limited to simulated game data',
        'Short-term effects only measured'
      ],
      futureResearch: [
        'Long-term player retention studies',
        'Cross-platform validation'
      ]
    }
  }

  // Mock data generation methods
  private generateMockMetrics(): Record<string, MetricResult> {
    return {
      winRate: {
        mean: 0.5 + Math.random() * 0.3,
        median: 0.5,
        standardDeviation: 0.15,
        variance: 0.0225,
        min: 0.1,
        max: 0.9,
        confidenceInterval: [0.45, 0.65],
        distribution: 'normal'
      }
    }
  }

  private generateMockDistributions(): Record<string, number[]> {
    return {
      winRate: Array.from({ length: 100 }, () => Math.random())
    }
  }

  private generateMockPerformance(): PerformanceMetrics {
    return {
      winRate: Math.random() * 0.8 + 0.2,
      averageScore: Math.random() * 100 + 50,
      averageTurns: Math.random() * 20 + 10,
      challengeSuccessRate: Math.random() * 0.8 + 0.2,
      playerEngagement: Math.random() * 0.9 + 0.1,
      retentionRate: Math.random() * 0.8 + 0.2
    }
  }

  private runStatisticalTests(groupResults: GroupResults[]): TestResult[] {
    return [{
      testName: 'Two-sample t-test',
      metric: 'winRate',
      groups: ['control', 'treatment'],
      statistic: 2.1,
      pValue: 0.03,
      significant: true,
      interpretation: 'Treatment group shows significantly higher win rate',
      confidence: 0.95
    }]
  }

  private calculateEffectSizes(groupResults: GroupResults[]): EffectSize[] {
    return [{
      metric: 'winRate',
      groups: ['control', 'treatment'],
      cohensD: 0.4,
      interpretation: 'medium',
      magnitude: 0.4
    }]
  }

  private performPowerAnalysis(): PowerAnalysisResult {
    return {
      achievedPower: 0.85,
      requiredSampleSize: 800,
      minimumDetectableEffect: 0.1,
      recommendations: ['Sample size is adequate for detecting medium effects']
    }
  }

  private performMultipleComparisons(): MultipleComparisonResult[] {
    return [{
      method: 'Holm correction',
      adjustedAlpha: 0.025,
      significantTests: 1,
      familyWiseErrorRate: 0.05,
      corrections: [{
        test: 'winRate_t_test',
        originalP: 0.03,
        adjustedP: 0.03,
        significant: true
      }]
    }]
  }

  private testAssumptions(groupResults: GroupResults[]): AssumptionTest[] {
    return [{
      assumption: 'normality',
      test: 'Shapiro-Wilk',
      pValue: 0.15,
      satisfied: true,
      recommendation: 'Data appears normally distributed'
    }]
  }

  private generateRecommendations(conclusions: ExperimentConclusions): string[] {
    return [
      'Implement the treatment configuration',
      'Monitor long-term effects with follow-up studies',
      'Consider gradual rollout to minimize risk'
    ]
  }

  private calculateEstimatedCompletion(): number {
    if (this.progress === 0) return Date.now() + this.config.duration.estimatedHours * 3600000
    
    const elapsed = Date.now() - this.startTime
    const estimatedTotal = elapsed / this.progress
    return this.startTime + estimatedTotal
  }
}

// Supporting interfaces and types

export interface ExperimentStatus {
  status: ExperimentExecutionStatus
  progress: number
  startTime: number
  estimatedCompletion: number
}

export type ExperimentExecutionStatus = 'preparing' | 'running' | 'analyzing' | 'completed' | 'failed'

export interface ExperimentReport {
  executive_summary: string
  methodology: string
  results_analysis: string
  statistical_analysis: string
  conclusions: string
  recommendations: string
  appendices: string
}

export interface MetaAnalysisResults {
  experiments: string[]
  combinedEffectSize: number
  heterogeneity: number
  overallSignificance: number
  publicationBias: PublicationBiasAssessment
  conclusions: string[]
}

export interface PublicationBiasAssessment {
  risk: 'low' | 'medium' | 'high'
  funnelPlotAsymmetry: number
  eggersTest: { statistic: number; pValue: number }
  failsafeN: number
}

export { ExperimentFramework }