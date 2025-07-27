/**
 * CUI (Character User Interface) Configuration System
 * Customizable settings for terminal-based game experience
 */

export interface CUIConfig {
  // Display theme
  theme: 'default' | 'dark' | 'colorful' | 'minimal' | 'matrix'
  
  // Animation settings
  animationSpeed: 'slow' | 'normal' | 'fast' | 'off'
  
  // Card display style
  cardDisplayStyle: 'compact' | 'detailed' | 'ascii' | 'unicode'
  
  // Interaction settings
  autoAdvance: boolean
  confirmActions: boolean
  
  // Audio/Visual feedback
  soundEnabled: boolean
  visualEffects: boolean
  
  // Performance settings
  maxCardsDisplayed: number
  refreshRate: number // ms
  
  // Accessibility
  colorBlindFriendly: boolean
  reducedMotion: boolean
  highContrast: boolean
  
  // Layout settings
  compactLayout: boolean
  showHelp: boolean
  showDebugInfo: boolean
}

export const defaultCUIConfig: CUIConfig = {
  theme: 'default',
  animationSpeed: 'normal',
  cardDisplayStyle: 'detailed',
  autoAdvance: false,
  confirmActions: true,
  soundEnabled: false,
  visualEffects: true,
  maxCardsDisplayed: 10,
  refreshRate: 100,
  colorBlindFriendly: false,
  reducedMotion: false,
  highContrast: false,
  compactLayout: false,
  showHelp: true,
  showDebugInfo: false
}

/**
 * Theme color definitions
 */
export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
  text: string
  border: string
  background: string
  accent: string
}

export const themes: Record<string, ThemeColors> = {
  default: {
    primary: '#3b82f6',    // blue-500
    secondary: '#6b7280',  // gray-500
    success: '#10b981',    // emerald-500
    warning: '#f59e0b',    // amber-500
    error: '#ef4444',      // red-500
    info: '#06b6d4',       // cyan-500
    text: '#1f2937',       // gray-800
    border: '#d1d5db',     // gray-300
    background: '#ffffff', // white
    accent: '#8b5cf6'      // violet-500
  },
  
  dark: {
    primary: '#60a5fa',    // blue-400
    secondary: '#9ca3af',  // gray-400
    success: '#34d399',    // emerald-400
    warning: '#fbbf24',    // amber-400
    error: '#f87171',      // red-400
    info: '#22d3ee',       // cyan-400
    text: '#f9fafb',       // gray-50
    border: '#4b5563',     // gray-600
    background: '#111827', // gray-900
    accent: '#a78bfa'      // violet-400
  },
  
  colorful: {
    primary: '#ff6b6b',    // red
    secondary: '#4ecdc4',  // teal
    success: '#45b7d1',    // blue
    warning: '#f9ca24',    // yellow
    error: '#e74c3c',      // dark red
    info: '#74b9ff',       // light blue
    text: '#2d3436',       // dark gray
    border: '#fd79a8',     // pink
    background: '#fdcb6e', // light orange
    accent: '#6c5ce7'      // purple
  },
  
  minimal: {
    primary: '#000000',    // black
    secondary: '#808080',  // gray
    success: '#000000',    // black
    warning: '#000000',    // black
    error: '#000000',      // black
    info: '#000000',       // black
    text: '#000000',       // black
    border: '#808080',     // gray
    background: '#ffffff', // white
    accent: '#000000'      // black
  },
  
  matrix: {
    primary: '#00ff00',    // green
    secondary: '#008000',  // dark green
    success: '#00ff00',    // bright green
    warning: '#ffff00',    // yellow
    error: '#ff0000',      // red
    info: '#00ffff',       // cyan
    text: '#00ff00',       // green
    border: '#008000',     // dark green
    background: '#000000', // black
    accent: '#00ff00'      // bright green
  }
}

/**
 * Animation timing configurations
 */
export const animationTimings = {
  slow: {
    cardReveal: 800,
    typewriter: 150,
    transition: 1000,
    pulse: 2000
  },
  normal: {
    cardReveal: 400,
    typewriter: 75,
    transition: 500,
    pulse: 1000
  },
  fast: {
    cardReveal: 200,
    typewriter: 25,
    transition: 250,
    pulse: 500
  },
  off: {
    cardReveal: 0,
    typewriter: 0,
    transition: 0,
    pulse: 0
  }
}

/**
 * CUI Configuration Manager
 */
export class CUIConfigManager {
  private config: CUIConfig
  
  constructor(initialConfig?: Partial<CUIConfig>) {
    this.config = { ...defaultCUIConfig, ...initialConfig }
  }
  
  getConfig(): CUIConfig {
    return { ...this.config }
  }
  
  updateConfig(updates: Partial<CUIConfig>): void {
    this.config = { ...this.config, ...updates }
  }
  
  getTheme(): ThemeColors {
    return themes[this.config.theme] || themes.default
  }
  
  getAnimationTimings() {
    return animationTimings[this.config.animationSpeed]
  }
  
  shouldShowAnimations(): boolean {
    return this.config.animationSpeed !== 'off' && 
           this.config.visualEffects && 
           !this.config.reducedMotion
  }
  
  reset(): void {
    this.config = { ...defaultCUIConfig }
  }
  
  // Accessibility helpers
  getAccessibleColors(): ThemeColors {
    const baseTheme = this.getTheme()
    
    if (this.config.colorBlindFriendly) {
      // Adjust colors for color-blind users
      return {
        ...baseTheme,
        success: this.config.theme === 'dark' ? '#60a5fa' : '#3b82f6', // Use blue instead of green
        error: this.config.theme === 'dark' ? '#fbbf24' : '#f59e0b',   // Use amber instead of red
      }
    }
    
    if (this.config.highContrast) {
      // High contrast adjustments
      return this.config.theme === 'dark' 
        ? {
            ...baseTheme,
            text: '#ffffff',
            background: '#000000',
            border: '#ffffff'
          }
        : {
            ...baseTheme,
            text: '#000000',
            background: '#ffffff',
            border: '#000000'
          }
    }
    
    return baseTheme
  }
}