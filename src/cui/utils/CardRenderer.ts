import type { Card } from '@/domain/entities/Card'
import type { CUIConfig, ThemeColors } from '../config/CUIConfig'
import chalk from 'chalk'
import boxen from 'boxen'

/**
 * Card Rendering Utility
 * Beautiful ASCII art card displays with themes and animations
 */
export class CardRenderer {
  constructor(
    private config: CUIConfig,
    private theme: ThemeColors
  ) {}

  /**
   * Render a single card with beautiful formatting
   */
  renderCard(card: Card, options: CardRenderOptions = {}): string {
    const {
      style = this.config.cardDisplayStyle,
      selected = false,
      dimmed = false,
      showIndex = false,
      index = 0
    } = options

    switch (style) {
      case 'compact':
        return this.renderCompactCard(card, { selected, dimmed, showIndex, index })
      case 'ascii':
        return this.renderAsciiCard(card, { selected, dimmed, showIndex, index })
      case 'unicode':
        return this.renderUnicodeCard(card, { selected, dimmed, showIndex, index })
      case 'detailed':
      default:
        return this.renderDetailedCard(card, { selected, dimmed, showIndex, index })
    }
  }

  /**
   * Render multiple cards in a grid layout
   */
  renderCardGrid(cards: Card[], options: CardGridOptions = {}): string {
    const {
      columns = 3,
      showIndices = true,
      selectedIndices = [],
      maxCards = this.config.maxCardsDisplayed
    } = options

    const cardsToShow = cards.slice(0, maxCards)
    const rows: string[] = []
    
    for (let i = 0; i < cardsToShow.length; i += columns) {
      const rowCards = cardsToShow.slice(i, i + columns)
      const cardStrings = rowCards.map((card, colIndex) => {
        const cardIndex = i + colIndex
        return this.renderCard(card, {
          style: 'compact',
          selected: selectedIndices.includes(cardIndex),
          showIndex: showIndices,
          index: cardIndex + 1
        })
      })

      // Align cards horizontally
      const maxLines = Math.max(...cardStrings.map(s => s.split('\n').length))
      const alignedCards = cardStrings.map(cardStr => {
        const lines = cardStr.split('\n')
        while (lines.length < maxLines) {
          lines.push('')
        }
        return lines
      })

      // Combine cards horizontally
      for (let line = 0; line < maxLines; line++) {
        const rowLine = alignedCards.map(card => card[line] || '').join('  ')
        rows.push(rowLine)
      }
      
      if (i + columns < cardsToShow.length) {
        rows.push('') // Add spacing between rows
      }
    }

    return rows.join('\n')
  }

  /**
   * Detailed card rendering with full information
   */
  private renderDetailedCard(card: Card, options: CardRenderOptions): string {
    const { selected, dimmed, showIndex, index } = options
    
    // Card content
    const title = this.formatCardTitle(card)
    const category = this.formatCardCategory(card)
    const stats = this.formatCardStats(card)
    const description = this.formatCardDescription(card)
    
    let content = ''
    
    // Index number
    if (showIndex) {
      content += chalk.bold.gray(`[${index}] `) + '\n'
    }
    
    // Title with emoji
    content += title + '\n'
    
    // Category
    if (category) {
      content += category + '\n'
    }
    
    // Divider
    content += chalk.gray('─'.repeat(25)) + '\n'
    
    // Description
    if (description) {
      content += description + '\n'
      content += '\n'
    }
    
    // Stats
    if (stats) {
      content += stats
    }

    // Apply styling
    const borderColor = selected 
      ? this.theme.accent 
      : dimmed 
        ? this.theme.secondary 
        : this.theme.border

    const boxOptions = {
      padding: 1,
      margin: 0,
      borderStyle: selected ? 'double' : 'round',
      borderColor: borderColor,
      backgroundColor: selected ? this.theme.background : undefined,
      width: 30
    } as const

    let result = boxen(content.trim(), boxOptions)
    
    if (dimmed) {
      result = chalk.dim(result)
    }
    
    return result
  }

  /**
   * Compact card rendering for grid layouts
   */
  private renderCompactCard(card: Card, options: CardRenderOptions): string {
    const { selected, dimmed, showIndex, index } = options
    
    const emoji = this.getCardEmoji(card)
    const name = this.truncateText(card.name, 15)
    const power = card.power !== undefined ? `P:${card.power}` : ''
    const cost = card.cost !== undefined ? `C:${card.cost}` : ''
    
    let content = ''
    
    if (showIndex) {
      content += chalk.bold.gray(`[${index}] `)
    }
    
    content += `${emoji} ${name}\n`
    
    if (power || cost) {
      const stats = [power, cost].filter(Boolean).join(' ')
      content += chalk.cyan(stats)
    }

    const borderColor = selected ? this.theme.accent : this.theme.border
    const boxOptions = {
      padding: 0,
      margin: 0,
      borderStyle: selected ? 'double' : 'single',
      borderColor: borderColor,
      width: 20
    } as const

    let result = boxen(content.trim(), boxOptions)
    
    if (dimmed) {
      result = chalk.dim(result)
    }
    
    return result
  }

  /**
   * ASCII art card rendering
   */
  private renderAsciiCard(card: Card, options: CardRenderOptions): string {
    const { selected, dimmed, showIndex, index } = options
    
    const lines = [
      '┌─────────────────────┐',
      `│ ${this.padText(card.name, 19)} │`,
      '├─────────────────────┤',
      `│ ${this.padText(this.getCardTypeText(card), 19)} │`,
      '├─────────────────────┤'
    ]

    if (card.power !== undefined || card.cost !== undefined) {
      const stats = `P:${card.power || 0} C:${card.cost || 0}`
      lines.push(`│ ${this.padText(stats, 19)} │`)
    }

    lines.push('└─────────────────────┘')

    if (showIndex) {
      lines[0] = `[${index}] ` + lines[0]
    }

    let result = lines.join('\n')
    
    if (selected) {
      result = chalk.bgBlue.white(result)
    } else if (dimmed) {
      result = chalk.dim(result)
    }
    
    return result
  }

  /**
   * Unicode card rendering with special characters
   */
  private renderUnicodeCard(card: Card, options: CardRenderOptions): string {
    const { selected, dimmed, showIndex, index } = options
    
    const emoji = this.getCardEmoji(card)
    const name = this.truncateText(card.name, 18)
    
    const lines = [
      '╭─────────────────────╮',
      `│ ${emoji} ${this.padText(name, 17)} │`,
      '├─────────────────────┤'
    ]

    if (card.description) {
      const desc = this.truncateText(card.description, 19)
      lines.push(`│ ${this.padText(desc, 19)} │`)
      lines.push('├─────────────────────┤')
    }

    if (card.power !== undefined || card.cost !== undefined) {
      const power = card.power !== undefined ? `💪 ${card.power}` : ''
      const cost = card.cost !== undefined ? `💰 ${card.cost}` : ''
      const stats = `${power} ${cost}`.trim()
      lines.push(`│ ${this.padText(stats, 19)} │`)
    }

    lines.push('╰─────────────────────╯')

    if (showIndex) {
      lines[0] = `[${index}] ` + lines[0]
    }

    let result = lines.join('\n')
    
    if (selected) {
      result = chalk.inverse(result)
    } else if (dimmed) {
      result = chalk.dim(result)
    }
    
    return result
  }

  /**
   * Format card title with appropriate styling
   */
  private formatCardTitle(card: Card): string {
    const emoji = this.getCardEmoji(card)
    const name = chalk.bold(card.name)
    return `${emoji} ${name}`
  }

  /**
   * Format card category with color coding
   */
  private formatCardCategory(card: Card): string {
    if (!card.category) return ''
    
    const categoryColors: Record<string, string> = {
      health: 'green',
      career: 'blue',
      family: 'yellow',
      hobby: 'magenta',
      finance: 'cyan',
      insurance: 'red'
    }
    
    const color = categoryColors[card.category] || 'gray'
    return chalk[color as keyof typeof chalk](`🏷️  ${card.category}`)
  }

  /**
   * Format card stats (power, cost, etc.)
   */
  private formatCardStats(card: Card): string {
    const stats: string[] = []
    
    if (card.power !== undefined) {
      stats.push(chalk.red(`💪 Power: ${card.power}`))
    }
    
    if (card.cost !== undefined) {
      stats.push(chalk.yellow(`💰 Cost: ${card.cost}`))
    }
    
    if (card.type) {
      stats.push(chalk.blue(`🎭 Type: ${card.type}`))
    }
    
    return stats.join('   ')
  }

  /**
   * Format card description with word wrapping
   */
  private formatCardDescription(card: Card): string {
    if (!card.description) return ''
    
    const maxWidth = 25
    const words = card.description.split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxWidth) {
        currentLine = currentLine ? currentLine + ' ' + word : word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    
    if (currentLine) lines.push(currentLine)
    
    return chalk.gray(lines.join('\n'))
  }

  /**
   * Get appropriate emoji for card type/category
   */
  private getCardEmoji(card: Card): string {
    // Category-based emojis
    if (card.category) {
      const categoryEmojis: Record<string, string> = {
        health: '❤️',
        career: '💼',
        family: '👨‍👩‍👧‍👦',
        hobby: '🎨',
        finance: '💰',
        insurance: '🛡️',
        challenge: '⚔️',
        life: '🌟'
      }
      
      if (categoryEmojis[card.category]) {
        return categoryEmojis[card.category]
      }
    }
    
    // Type-based emojis
    if (card.type) {
      const typeEmojis: Record<string, string> = {
        life: '🌟',
        challenge: '⚔️',
        insurance: '🛡️',
        whole_life: '🛡️',
        term: '🛡️'
      }
      
      if (typeEmojis[card.type]) {
        return typeEmojis[card.type]
      }
    }
    
    // Default
    return '🃏'
  }

  /**
   * Get card type display text
   */
  private getCardTypeText(card: Card): string {
    if (card.category) return card.category
    if (card.type) return card.type
    return 'card'
  }

  /**
   * Utility: Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
  }

  /**
   * Utility: Pad text to specified width
   */
  private padText(text: string, width: number): string {
    if (text.length >= width) return text.slice(0, width)
    const padding = width - text.length
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
  }
}

/**
 * Card rendering options
 */
export interface CardRenderOptions {
  style?: 'compact' | 'detailed' | 'ascii' | 'unicode'
  selected?: boolean
  dimmed?: boolean
  showIndex?: boolean
  index?: number
}

/**
 * Card grid rendering options
 */
export interface CardGridOptions {
  columns?: number
  showIndices?: boolean
  selectedIndices?: number[]
  maxCards?: number
}