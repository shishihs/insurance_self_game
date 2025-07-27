/**
 * CUI (Character User Interface) System
 * Export all CUI components for easy importing
 */

// Main Renderers
export { InteractiveCUIRenderer } from './renderers/InteractiveCUIRenderer'

// Specialized Modes
export { DemoModeRenderer, SmartDemoStrategy, AggressiveDemoStrategy, ConservativeDemoStrategy } from './modes/DemoMode'
export { BenchmarkModeRenderer } from './modes/BenchmarkMode'
export { TutorialModeRenderer } from './modes/TutorialMode'
export { DebugModeRenderer } from './modes/DebugMode'

// Configuration
export { CUIConfigManager, defaultCUIConfig, themes, animationTimings } from './config/CUIConfig'
export type { CUIConfig, ThemeColors } from './config/CUIConfig'

// Utilities
export { CardRenderer } from './utils/CardRenderer'
export { ProgressDisplay } from './utils/ProgressDisplay'
export { AnimationHelper } from './utils/AnimationHelper'
export { InputValidator } from './utils/InputValidator'

// CLI
export { runCLI } from './cli'

// Type exports for external use
export type { CardRenderOptions, CardGridOptions } from './utils/CardRenderer'
export type { VitalityBarOptions, ProgressBarOptions, StageProgressOptions, GameStatsDisplay } from './utils/ProgressDisplay'
export type { TypewriterOptions, CardRevealOptions, SpinnerOptions, TransitionOptions } from './utils/AnimationHelper'
export type { 
  ParsedCardSelection, 
  ParsedConfirmation, 
  ParsedActionChoice, 
  ParsedNumericInput, 
  ParsedTextInput 
} from './utils/InputValidator'

// Demo strategies
export type { DemoStrategy } from './modes/DemoMode'
export type { BenchmarkResults, BenchmarkAnalysis } from './modes/BenchmarkMode'
export type { DebugLogEntry, DebugLogType, DebugCommand } from './modes/DebugMode'

/**
 * Quick factory functions for common use cases
 */

/**
 * Create a basic interactive CUI renderer
 */
export function createInteractiveCUI(theme: 'default' | 'dark' | 'colorful' | 'minimal' | 'matrix' = 'default') {
  return new InteractiveCUIRenderer({ theme })
}

/**
 * Create a demo mode renderer with specified strategy
 */
export function createDemoCUI(
  strategy: 'smart' | 'aggressive' | 'conservative' = 'smart',
  speed: 'slow' | 'normal' | 'fast' | 'turbo' = 'normal'
) {
  const renderer = new DemoModeRenderer({}, speed)
  
  switch (strategy) {
    case 'aggressive':
      renderer.setDemoStrategy(new AggressiveDemoStrategy())
      break
    case 'conservative':
      renderer.setDemoStrategy(new ConservativeDemoStrategy())
      break
    default:
      renderer.setDemoStrategy(new SmartDemoStrategy())
  }
  
  return renderer
}

/**
 * Create a benchmark renderer
 */
export function createBenchmarkCUI(gameCount: number = 100) {
  return new BenchmarkModeRenderer({
    theme: 'minimal',
    animationSpeed: 'off',
    visualEffects: false
  }, gameCount)
}

/**
 * Create a tutorial renderer
 */
export function createTutorialCUI(theme: 'default' | 'dark' | 'colorful' | 'minimal' | 'matrix' = 'default') {
  return new TutorialModeRenderer({ theme })
}

/**
 * Create a debug renderer
 */
export function createDebugCUI(theme: 'default' | 'dark' | 'colorful' | 'minimal' | 'matrix' = 'default') {
  return new DebugModeRenderer({ theme })
}