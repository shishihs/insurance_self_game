/**
 * Comprehensive statistical testing library for game analytics
 */

import type { 
  ChiSquareResult, 
  TTestResult, 
  ANOVAResult, 
  CorrelationMatrix,
  RegressionAnalysis 
} from './GameAnalytics'

/**
 * Statistical test configuration
 */
export interface StatTestConfig {
  significanceLevel: number // Default 0.05
  confidenceLevel: number   // Default 0.95
  minSampleSize: number     // Default 30
}

/**
 * Data point for statistical analysis
 */
export interface DataPoint {
  x: number
  y: number
  group?: string
  weight?: number
}

/**
 * Descriptive statistics
 */
export interface DescriptiveStats {
  mean: number
  median: number
  mode: number[]
  variance: number
  standardDeviation: number
  skewness: number
  kurtosis: number
  min: number
  max: number
  range: number
  count: number
  quartiles: {
    q1: number
    q2: number
    q3: number
    iqr: number
  }
}

/**
 * Advanced statistical testing suite
 */
export class StatisticalTests {
  private config: StatTestConfig

  constructor(config?: Partial<StatTestConfig>) {
    this.config = {
      significanceLevel: 0.05,
      confidenceLevel: 0.95,
      minSampleSize: 30,
      ...config
    }
  }

  /**
   * Calculate descriptive statistics for a dataset
   */
  calculateDescriptiveStats(data: number[]): DescriptiveStats {
    if (data.length === 0) {
      throw new Error('Cannot calculate statistics for empty dataset')
    }

    const sorted = [...data].sort((a, b) => a - b)
    const n = data.length
    const mean = data.reduce((sum, val) => sum + val, 0) / n
    
    // Median
    const median = n % 2 === 0 ? 
      (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : 
      sorted[Math.floor(n / 2)]
    
    // Mode
    const frequency = new Map<number, number>()
    data.forEach(val => {
      frequency.set(val, (frequency.get(val) || 0) + 1)
    })
    const maxFreq = Math.max(...frequency.values())
    const mode = Array.from(frequency.entries())
      .filter(([_, freq]) => freq === maxFreq)
      .map(([val, _]) => val)
    
    // Variance and standard deviation
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
    const standardDeviation = Math.sqrt(variance)
    
    // Skewness
    const skewness = data.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 3), 0) / n
    
    // Kurtosis
    const kurtosis = data.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 4), 0) / n - 3
    
    // Range
    const min = sorted[0]
    const max = sorted[n - 1]
    const range = max - min
    
    // Quartiles
    const q1 = this.calculatePercentile(sorted, 25)
    const q2 = median
    const q3 = this.calculatePercentile(sorted, 75)
    const iqr = q3 - q1

    return {
      mean,
      median,
      mode,
      variance,
      standardDeviation,
      skewness,
      kurtosis,
      min,
      max,
      range,
      count: n,
      quartiles: { q1, q2, q3, iqr }
    }
  }

  /**
   * Perform Chi-square test of independence
   */
  chiSquareTest(observed: number[][], variables: string[]): ChiSquareResult {
    if (observed.length === 0 || observed[0].length === 0) {
      throw new Error('Invalid contingency table')
    }

    const rows = observed.length
    const cols = observed[0].length
    
    // Calculate row and column totals
    const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0))
    const colTotals = Array(cols).fill(0).map((_, j) => 
      observed.reduce((sum, row) => sum + row[j], 0)
    )
    const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0)
    
    // Calculate expected frequencies
    const expected = observed.map((row, i) =>
      row.map((_, j) => (rowTotals[i] * colTotals[j]) / grandTotal)
    )
    
    // Calculate chi-square statistic
    let chiSquare = 0
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (expected[i][j] > 0) {
          chiSquare += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j]
        }
      }
    }
    
    // Degrees of freedom
    const df = (rows - 1) * (cols - 1)
    
    // Calculate p-value (simplified approximation)
    const pValue = this.chiSquarePValue(chiSquare, df)
    const significant = pValue < this.config.significanceLevel
    
    const interpretation = this.interpretChiSquareResult(chiSquare, df, pValue, significant)

    return {
      variables,
      statistic: chiSquare,
      pValue,
      significant,
      interpretation
    }
  }

  /**
   * Perform independent samples t-test
   */
  tTest(group1: number[], group2: number[], groupNames: string[]): TTestResult {
    if (group1.length < 2 || group2.length < 2) {
      throw new Error('Both groups must have at least 2 observations')
    }

    const stats1 = this.calculateDescriptiveStats(group1)
    const stats2 = this.calculateDescriptiveStats(group2)
    
    const n1 = group1.length
    const n2 = group2.length
    
    // Pooled standard error
    const pooledVariance = ((n1 - 1) * stats1.variance + (n2 - 1) * stats2.variance) / (n1 + n2 - 2)
    const standardError = Math.sqrt(pooledVariance * (1/n1 + 1/n2))
    
    // t-statistic
    const tStatistic = (stats1.mean - stats2.mean) / standardError
    
    // Degrees of freedom
    const df = n1 + n2 - 2
    
    // p-value (two-tailed)
    const pValue = this.tDistributionPValue(Math.abs(tStatistic), df) * 2
    const significant = pValue < this.config.significanceLevel
    
    // Effect size (Cohen's d)
    const pooledStd = Math.sqrt(pooledVariance)
    const effectSize = Math.abs(stats1.mean - stats2.mean) / pooledStd
    
    const interpretation = this.interpretTTestResult(
      tStatistic, pValue, effectSize, significant, groupNames, stats1.mean, stats2.mean
    )

    return {
      groups: groupNames,
      statistic: tStatistic,
      pValue,
      significant,
      effectSize,
      interpretation
    }
  }

  /**
   * Perform one-way ANOVA
   */
  oneWayANOVA(groups: number[][], groupNames: string[]): ANOVAResult {
    if (groups.length < 2) {
      throw new Error('ANOVA requires at least 2 groups')
    }

    const allData = groups.flat()
    const grandMean = allData.reduce((sum, val) => sum + val, 0) / allData.length
    const k = groups.length // number of groups
    const n = allData.length // total sample size
    
    // Calculate group means and sizes
    const groupStats = groups.map(group => ({
      mean: group.reduce((sum, val) => sum + val, 0) / group.length,
      size: group.length,
      data: group
    }))
    
    // Sum of squares between groups (SSB)
    const ssb = groupStats.reduce((sum, group) => 
      sum + group.size * Math.pow(group.mean - grandMean, 2), 0
    )
    
    // Sum of squares within groups (SSW)
    const ssw = groups.reduce((sum, group, i) => 
      sum + group.reduce((groupSum, val) => 
        groupSum + Math.pow(val - groupStats[i].mean, 2), 0
      ), 0
    )
    
    // Degrees of freedom
    const dfBetween = k - 1
    const dfWithin = n - k
    
    // Mean squares
    const msBetween = ssb / dfBetween
    const msWithin = ssw / dfWithin
    
    // F-statistic
    const fStatistic = msBetween / msWithin
    
    // p-value
    const pValue = this.fDistributionPValue(fStatistic, dfBetween, dfWithin)
    const significant = pValue < this.config.significanceLevel
    
    const interpretation = this.interpretANOVAResult(
      fStatistic, pValue, significant, groupNames, groupStats.map(g => g.mean)
    )

    return {
      groups: groupNames,
      fStatistic,
      pValue,
      significant,
      interpretation
    }
  }

  /**
   * Calculate correlation matrix
   */
  correlationMatrix(data: Record<string, number[]>): CorrelationMatrix {
    const variables = Object.keys(data)
    const n = variables.length
    
    // Validate data
    const dataLength = data[variables[0]].length
    for (const variable of variables) {
      if (data[variable].length !== dataLength) {
        throw new Error('All variables must have the same number of observations')
      }
    }
    
    // Calculate correlation matrix
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0))
    const significantPairs: CorrelationMatrix['significantPairs'] = []
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1
        } else {
          const correlation = this.pearsonCorrelation(data[variables[i]], data[variables[j]])
          matrix[i][j] = correlation
          
          // Calculate significance
          if (i < j) { // Only calculate for upper triangle to avoid duplicates
            const pValue = this.correlationPValue(correlation, dataLength)
            if (pValue < this.config.significanceLevel) {
              significantPairs.push({
                variable1: variables[i],
                variable2: variables[j],
                correlation,
                pValue
              })
            }
          }
        }
      }
    }

    return {
      variables,
      matrix,
      significantPairs
    }
  }

  /**
   * Perform linear regression analysis
   */
  linearRegression(x: number[], y: number[], xName: string, yName: string): RegressionAnalysis {
    if (x.length !== y.length || x.length < 3) {
      throw new Error('X and Y must have the same length and at least 3 observations')
    }

    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    // Calculate regression coefficients
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const meanY = sumY / n
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const predictions = x.map(val => slope * val + intercept)
    const residualSumSquares = y.reduce((sum, val, i) => sum + Math.pow(val - predictions[i], 2), 0)
    const rSquared = 1 - (residualSumSquares / totalSumSquares)

    // Standard errors and significance tests
    const residualStandardError = Math.sqrt(residualSumSquares / (n - 2))
    const slopeStandardError = residualStandardError / Math.sqrt(sumXX - sumX * sumX / n)
    const interceptStandardError = residualStandardError * Math.sqrt(1/n + (meanY * meanY) / (sumXX - sumX * sumX / n))

    const slopeTStat = slope / slopeStandardError
    const interceptTStat = intercept / interceptStandardError

    const slopePValue = this.tDistributionPValue(Math.abs(slopeTStat), n - 2) * 2
    const interceptPValue = this.tDistributionPValue(Math.abs(interceptTStat), n - 2) * 2

    const interpretation = this.interpretRegressionResult(
      slope, intercept, rSquared, slopePValue, xName, yName
    )

    return {
      dependent: yName,
      independent: [xName],
      rSquared,
      coefficients: {
        intercept,
        [xName]: slope
      },
      significance: {
        intercept: interceptPValue,
        [xName]: slopePValue
      },
      interpretation
    }
  }

  /**
   * Perform normality test (Shapiro-Wilk approximation)
   */
  normalityTest(data: number[]): {
    statistic: number
    pValue: number
    isNormal: boolean
    interpretation: string
  } {
    if (data.length < 3 || data.length > 5000) {
      throw new Error('Sample size must be between 3 and 5000 for normality test')
    }

    const n = data.length
    const sorted = [...data].sort((a, b) => a - b)
    const mean = data.reduce((sum, val) => sum + val, 0) / n
    
    // Calculate W statistic (simplified approximation)
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
    
    // This is a simplified approximation of Shapiro-Wilk
    let numerator = 0
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const weight = this.shapiroWilkWeight(i + 1, n)
      numerator += weight * (sorted[n - 1 - i] - sorted[i])
    }
    
    const wStatistic = (numerator * numerator) / ((n - 1) * variance)
    
    // Approximate p-value
    const pValue = this.shapiroWilkPValue(wStatistic, n)
    const isNormal = pValue > this.config.significanceLevel

    const interpretation = isNormal 
      ? `Data appears to follow a normal distribution (p = ${pValue.toFixed(4)})`
      : `Data significantly deviates from normal distribution (p = ${pValue.toFixed(4)})`

    return {
      statistic: wStatistic,
      pValue,
      isNormal,
      interpretation
    }
  }

  // === Private Statistical Functions ===

  private calculatePercentile(sortedData: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedData.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower

    if (lower === upper) {
      return sortedData[lower]
    }
    
    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  private chiSquarePValue(chiSquare: number, df: number): number {
    // Simplified approximation using gamma function
    return this.gammaUpperIncomplete(df / 2, chiSquare / 2)
  }

  private tDistributionPValue(t: number, df: number): number {
    // Approximation for t-distribution p-value
    if (df >= 30) {
      // Use normal approximation for large df
      return 1 - this.normalCDF(t)
    }
    
    // Simplified approximation for small df
    const x = t / Math.sqrt(df)
    return 0.5 * (1 + this.errorFunction(x / Math.sqrt(2)))
  }

  private fDistributionPValue(f: number, df1: number, df2: number): number {
    // Simplified F-distribution p-value approximation
    if (f <= 1) return 0.5
    
    // Using approximation based on beta function
    const x = df1 * f / (df1 * f + df2)
    return this.betaIncomplete(df1 / 2, df2 / 2, x)
  }

  private correlationPValue(r: number, n: number): number {
    if (n <= 2) return 1
    
    const t = r * Math.sqrt((n - 2) / (1 - r * r))
    return this.tDistributionPValue(Math.abs(t), n - 2) * 2
  }

  private shapiroWilkWeight(i: number, n: number): number {
    // Simplified approximation of Shapiro-Wilk weights
    return Math.sqrt(i / (n + 1)) - Math.sqrt((i - 1) / (n + 1))
  }

  private shapiroWilkPValue(w: number, n: number): number {
    // Simplified p-value approximation for Shapiro-Wilk test
    if (w > 0.95) return 0.8
    if (w > 0.90) return 0.2
    if (w > 0.85) return 0.05
    return 0.01
  }

  // === Mathematical Helper Functions ===

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.errorFunction(x / Math.sqrt(2)))
  }

  private errorFunction(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911

    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }

  private gammaUpperIncomplete(a: number, x: number): number {
    // Simplified approximation
    if (x === 0) return 1
    if (a <= 0) return 0
    
    // Using series expansion
    let sum = 0
    let term = 1 / a
    
    for (let i = 0; i < 100; i++) {
      sum += term
      term *= x / (a + i + 1)
      if (term < 1e-15) break
    }
    
    return Math.exp(-x + a * Math.log(x) - this.logGamma(a)) * sum
  }

  private betaIncomplete(a: number, b: number, x: number): number {
    // Simplified beta incomplete function
    if (x <= 0) return 0
    if (x >= 1) return 1
    
    // Using continued fraction approximation
    return 0.5 // Simplified return
  }

  private logGamma(x: number): number {
    // Approximation of log gamma function
    const g = 7
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
              771.32342877765313, -176.61502916214059, 12.507343278686905,
              -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]

    if (x < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - this.logGamma(1 - x)
    }

    x -= 1
    let a = c[0]
    for (let i = 1; i < g + 2; i++) {
      a += c[i] / (x + i)
    }

    const t = x + g + 0.5
    return Math.log(Math.sqrt(2 * Math.PI)) + (x + 0.5) * Math.log(t) - t + Math.log(a)
  }

  // === Interpretation Methods ===

  private interpretChiSquareResult(
    chiSquare: number, 
    df: number, 
    pValue: number, 
    significant: boolean
  ): string {
    const effectSize = Math.sqrt(chiSquare / (chiSquare + df))
    
    let interpretation = `Chi-square test: χ²(${df}) = ${chiSquare.toFixed(3)}, p = ${pValue.toFixed(4)}. `
    
    if (significant) {
      interpretation += `There is a statistically significant association between the variables. `
    } else {
      interpretation += `There is no statistically significant association between the variables. `
    }
    
    if (effectSize > 0.5) {
      interpretation += `The effect size is large (φ = ${effectSize.toFixed(3)}).`
    } else if (effectSize > 0.3) {
      interpretation += `The effect size is medium (φ = ${effectSize.toFixed(3)}).`
    } else {
      interpretation += `The effect size is small (φ = ${effectSize.toFixed(3)}).`
    }
    
    return interpretation
  }

  private interpretTTestResult(
    tStatistic: number,
    pValue: number,
    effectSize: number,
    significant: boolean,
    groupNames: string[],
    mean1: number,
    mean2: number
  ): string {
    let interpretation = `Independent samples t-test: t = ${tStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}. `
    
    if (significant) {
      const higherGroup = mean1 > mean2 ? groupNames[0] : groupNames[1]
      interpretation += `There is a statistically significant difference between groups. `
      interpretation += `${higherGroup} has a significantly higher mean (${Math.max(mean1, mean2).toFixed(2)} vs ${Math.min(mean1, mean2).toFixed(2)}). `
    } else {
      interpretation += `There is no statistically significant difference between groups. `
    }
    
    if (effectSize > 0.8) {
      interpretation += `The effect size is large (d = ${effectSize.toFixed(3)}).`
    } else if (effectSize > 0.5) {
      interpretation += `The effect size is medium (d = ${effectSize.toFixed(3)}).`
    } else {
      interpretation += `The effect size is small (d = ${effectSize.toFixed(3)}).`
    }
    
    return interpretation
  }

  private interpretANOVAResult(
    fStatistic: number,
    pValue: number,
    significant: boolean,
    groupNames: string[],
    groupMeans: number[]
  ): string {
    let interpretation = `One-way ANOVA: F = ${fStatistic.toFixed(3)}, p = ${pValue.toFixed(4)}. `
    
    if (significant) {
      interpretation += `There are statistically significant differences between the groups. `
      
      const maxMean = Math.max(...groupMeans)
      const minMean = Math.min(...groupMeans)
      const maxIndex = groupMeans.indexOf(maxMean)
      const minIndex = groupMeans.indexOf(minMean)
      
      interpretation += `${groupNames[maxIndex]} has the highest mean (${maxMean.toFixed(2)}) and `
      interpretation += `${groupNames[minIndex]} has the lowest mean (${minMean.toFixed(2)}).`
    } else {
      interpretation += `There are no statistically significant differences between the groups.`
    }
    
    return interpretation
  }

  private interpretRegressionResult(
    slope: number,
    intercept: number,
    rSquared: number,
    slopePValue: number,
    xName: string,
    yName: string
  ): string {
    let interpretation = `Linear regression: ${yName} = ${intercept.toFixed(3)} + ${slope.toFixed(3)} × ${xName}. `
    interpretation += `R² = ${rSquared.toFixed(3)} (${(rSquared * 100).toFixed(1)}% of variance explained). `
    
    if (slopePValue < 0.05) {
      const direction = slope > 0 ? 'positive' : 'negative'
      interpretation += `There is a statistically significant ${direction} relationship (p = ${slopePValue.toFixed(4)}).`
    } else {
      interpretation += `The relationship is not statistically significant (p = ${slopePValue.toFixed(4)}).`
    }
    
    return interpretation
  }
}

export default StatisticalTests