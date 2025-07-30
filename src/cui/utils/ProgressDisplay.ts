import chalk from 'chalk'
import cliProgress from 'cli-progress'
import type { CUIConfig, ThemeColors } from '../config/CUIConfig'

/**
 * Progress Display Utility
 * Beautiful progress bars and status indicators
 */
export class ProgressDisplay {
  private progressBars: Map<string, cliProgress.SingleBar> = new Map()
  
  constructor(
    private config: CUIConfig,
    private theme: ThemeColors
  ) {}

  /**
   * Create a vitality/health bar display
   */
  renderVitalityBar(current: number, max: number, options: VitalityBarOptions = {}): string {
    const {
      width = 20,
      showNumbers = true,
      showPercentage = true,
      style = 'blocks'
    } = options

    const percentage = Math.max(0, Math.min(100, Math.round((current / max) * 100)))
    const filledLength = Math.round((current / max) * width)
    
    let bar: string
    let color: keyof typeof chalk
    
    // Determine color based on health level
    if (percentage >= 70) {
      color = 'green'
    } else if (percentage >= 40) {
      color = 'yellow'
    } else if (percentage >= 20) {
      color = 'red'
    } else {
      color = 'magenta' // Critical
    }

    // Create the bar based on style
    switch (style) {
      case 'blocks':
        bar = this.createBlockBar(filledLength, width - filledLength, color)
        break
      case 'dots':
        bar = this.createDotBar(filledLength, width - filledLength, color)
        break
      case 'ascii':
        bar = this.createAsciiBar(filledLength, width - filledLength)
        break
      case 'hearts':
        bar = this.createHeartBar(current, max)
        break
      default:
        bar = this.createBlockBar(filledLength, width - filledLength, color)
    }

    let result = `❤️  ${bar}`
    
    if (showNumbers) {
      result += ` ${current}/${max}`
    }
    
    if (showPercentage) {
      result += ` (${percentage}%)`
    }

    return result
  }

  /**
   * Create an animated progress bar for loading/processing
   */
  createProgressBar(id: string, options: ProgressBarOptions = {}): cliProgress.SingleBar {
    const {
      total = 100,
      format = '{label} {bar} {percentage}% | {value}/{total}',
      barCompleteChar = '█',
      barIncompleteChar = '░',
      hideCursor = true,
      clearOnComplete = false
    } = options

    const bar = new cliProgress.SingleBar({
      format: format,
      barCompleteChar: barCompleteChar,
      barIncompleteChar: barIncompleteChar,
      hideCursor: hideCursor,
      clearOnComplete: clearOnComplete,
      barsize: 30,
      stopOnComplete: true
    }, cliProgress.Presets.shades_classic)

    this.progressBars.set(id, bar)
    bar.start(total, 0)
    
    return bar
  }

  /**
   * Update progress bar
   */
  updateProgressBar(id: string, value: number, label?: string): void {
    const bar = this.progressBars.get(id)
    if (bar) {
      bar.update(value, { label: label || '' })
    }
  }

  /**
   * Complete and remove progress bar
   */
  completeProgressBar(id: string): void {
    const bar = this.progressBars.get(id)
    if (bar) {
      bar.stop()
      this.progressBars.delete(id)
    }
  }

  /**
   * Create a turn/stage progress indicator
   */
  renderStageProgress(currentStage: string, currentTurn: number, options: StageProgressOptions = {}): string {
    const {
      showStageEmoji = true,
      showTurnNumber = true,
      maxTurns
    } = options

    const stageEmojis: Record<string, string> = {
      youth: '🌱',
      adult: '💪',
      middle_age: '👔',
      elderly: '👴'
    }

    let result = ''
    
    if (showStageEmoji) {
      const emoji = stageEmojis[currentStage] || '📍'
      result += `${emoji} `
    }

    result += chalk.bold.blue(`Stage: ${currentStage}`)
    
    if (showTurnNumber) {
      result += chalk.gray(` | Turn: ${currentTurn}`)
      
      if (maxTurns) {
        const progress = Math.round((currentTurn / maxTurns) * 100)
        result += chalk.gray(` (${progress}%)`)
      }
    }

    return result
  }

  /**
   * Create a statistics dashboard
   */
  renderStatsDashboard(stats: GameStatsDisplay): string {
    const lines: string[] = []
    
    // Header
    lines.push(chalk.bold.cyan('📊 Game Statistics'))
    lines.push(chalk.gray('─'.repeat(40)))
    
    // Success rate with visual indicator
    const successRate = stats.totalChallenges > 0 
      ? Math.round((stats.successfulChallenges / stats.totalChallenges) * 100)
      : 0
    
    const successBar = this.createMiniBar(successRate, 100, 20, 'green')
    lines.push(`Success Rate: ${successBar} ${successRate}%`)
    
    // Challenges
    lines.push(`Total Challenges: ${chalk.yellow(stats.totalChallenges)}`)
    lines.push(`✅ Successful: ${chalk.green(stats.successfulChallenges)}`)
    lines.push(`❌ Failed: ${chalk.red(stats.failedChallenges)}`)
    
    // Other stats
    lines.push(`🃏 Cards Acquired: ${chalk.blue(stats.cardsAcquired)}`)
    lines.push(`💪 Highest Vitality: ${chalk.magenta(stats.highestVitality)}`)
    lines.push(`🎮 Turns Played: ${chalk.cyan(stats.turnsPlayed)}`)
    
    return lines.join('\n')
  }

  /**
   * Create insurance burden indicator
   */
  renderInsuranceBurden(burden: number, maxBurden: number = 20): string {
    const percentage = Math.round((burden / maxBurden) * 100)
    
    let color: keyof typeof chalk
    if (percentage < 30) {
      color = 'green'
    } else if (percentage < 60) {
      color = 'yellow'
    } else if (percentage < 80) {
      color = 'red'
    } else {
      color = 'magenta'
    }

    const bar = this.createMiniBar(burden, maxBurden, 15, color)
    return `💰 Insurance Burden: ${bar} ${burden}/${maxBurden}`
  }

  // Private helper methods

  private createBlockBar(filled: number, empty: number, color: keyof typeof chalk): string {
    const filledBlocks = chalk[color]('█'.repeat(filled))
    const emptyBlocks = chalk.gray('░'.repeat(empty))
    return `[${filledBlocks}${emptyBlocks}]`
  }

  private createDotBar(filled: number, empty: number, color: keyof typeof chalk): string {
    const filledDots = chalk[color]('●'.repeat(filled))
    const emptyDots = chalk.gray('○'.repeat(empty))
    return `[${filledDots}${emptyDots}]`
  }

  private createAsciiBar(filled: number, empty: number): string {
    const filledChars = '='.repeat(filled)
    const emptyChars = '-'.repeat(empty)
    return `[${filledChars}${emptyChars}]`
  }

  private createHeartBar(current: number, max: number): string {
    const hearts = Math.ceil(max / 5) // Each heart represents ~5 vitality
    const clampedCurrent = Math.max(0, Math.min(current, max))
    const fullHearts = Math.floor((clampedCurrent / max) * hearts)
    const emptyHearts = Math.max(0, hearts - fullHearts)
    
    const full = chalk.red('❤️'.repeat(fullHearts))
    const empty = chalk.gray('🤍'.repeat(emptyHearts))
    
    return full + empty
  }

  private createMiniBar(value: number, max: number, width: number, color: keyof typeof chalk): string {
    // Clamp value to be between 0 and max
    const clampedValue = Math.max(0, Math.min(value, max))
    const filledLength = Math.round((clampedValue / max) * width)
    const emptyLength = Math.max(0, width - filledLength)
    
    const filled = chalk[color]('█'.repeat(filledLength))
    const empty = chalk.gray('░'.repeat(emptyLength))
    
    return `[${filled}${empty}]`
  }
}

/**
 * Vitality bar options
 */
export interface VitalityBarOptions {
  width?: number
  showNumbers?: boolean
  showPercentage?: boolean
  style?: 'blocks' | 'dots' | 'ascii' | 'hearts'
}

/**
 * Progress bar options
 */
export interface ProgressBarOptions {
  total?: number
  format?: string
  barCompleteChar?: string
  barIncompleteChar?: string
  hideCursor?: boolean
  clearOnComplete?: boolean
}

/**
 * Stage progress options
 */
export interface StageProgressOptions {
  showStageEmoji?: boolean
  showTurnNumber?: boolean
  maxTurns?: number
}

/**
 * Game statistics display interface
 */
export interface GameStatsDisplay {
  totalChallenges: number
  successfulChallenges: number
  failedChallenges: number
  cardsAcquired: number
  highestVitality: number
  turnsPlayed: number
}