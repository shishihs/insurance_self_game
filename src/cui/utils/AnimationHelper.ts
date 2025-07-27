import chalk from 'chalk'
import ora, { Ora } from 'ora'
import type { CUIConfig, ThemeColors } from '../config/CUIConfig'

/**
 * Animation Helper Utility
 * Handles animations, transitions, and visual effects for CUI
 */
export class AnimationHelper {
  private spinners: Map<string, Ora> = new Map()
  
  constructor(
    private config: CUIConfig,
    private theme: ThemeColors
  ) {}

  /**
   * Typewriter effect for text display
   */
  async typewriterEffect(text: string, options: TypewriterOptions = {}): Promise<void> {
    if (!this.config.visualEffects || this.config.animationSpeed === 'off') {
      process.stdout.write(text)
      return
    }

    const {
      delay = this.getAnimationTimings().typewriter,
      sound = false,
      color
    } = options

    const outputText = color ? chalk[color as keyof typeof chalk](text) : text
    
    for (const char of outputText) {
      process.stdout.write(char)
      
      if (sound && this.config.soundEnabled) {
        this.playSound('tick')
      }
      
      if (delay > 0) {
        await this.sleep(delay)
      }
    }
  }

  /**
   * Card reveal animation
   */
  async cardRevealAnimation(cardText: string, options: CardRevealOptions = {}): Promise<void> {
    if (!this.config.visualEffects || this.config.animationSpeed === 'off') {
      console.log(cardText)
      return
    }

    const {
      direction = 'fade',
      duration = this.getAnimationTimings().cardReveal
    } = options

    switch (direction) {
      case 'fade':
        await this.fadeInAnimation(cardText, duration)
        break
      case 'slide':
        await this.slideInAnimation(cardText, duration)
        break
      case 'flip':
        await this.flipAnimation(cardText, duration)
        break
      default:
        console.log(cardText)
    }
  }

  /**
   * Loading spinner
   */
  startSpinner(id: string, options: SpinnerOptions = {}): void {
    const {
      text = 'Loading...',
      spinner = 'dots',
      color = 'cyan'
    } = options

    const ora_spinner = ora({
      text: text,
      spinner: spinner,
      color: color as any
    }).start()

    this.spinners.set(id, ora_spinner)
  }

  /**
   * Update spinner text
   */
  updateSpinner(id: string, text: string): void {
    const spinner = this.spinners.get(id)
    if (spinner) {
      spinner.text = text
    }
  }

  /**
   * Stop spinner with success
   */
  succeedSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id)
    if (spinner) {
      spinner.succeed(text)
      this.spinners.delete(id)
    }
  }

  /**
   * Stop spinner with failure
   */
  failSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id)
    if (spinner) {
      spinner.fail(text)
      this.spinners.delete(id)
    }
  }

  /**
   * Stop spinner normally
   */
  stopSpinner(id: string): void {
    const spinner = this.spinners.get(id)
    if (spinner) {
      spinner.stop()
      this.spinners.delete(id)
    }
  }

  /**
   * Pulsing text effect
   */
  async pulseText(text: string, cycles: number = 3): Promise<void> {
    if (!this.config.visualEffects || this.config.animationSpeed === 'off') {
      console.log(text)
      return
    }

    const pulseDelay = this.getAnimationTimings().pulse / cycles / 2

    for (let i = 0; i < cycles; i++) {
      // Bright
      process.stdout.write('\r' + chalk.bold.white(text))
      await this.sleep(pulseDelay)
      
      // Dim
      process.stdout.write('\r' + chalk.dim(text))
      await this.sleep(pulseDelay)
    }
    
    // Final state
    process.stdout.write('\r' + text + '\n')
  }

  /**
   * Screen transition effect
   */
  async screenTransition(fromContent: string, toContent: string, options: TransitionOptions = {}): Promise<void> {
    if (!this.config.visualEffects || this.config.animationSpeed === 'off') {
      console.clear()
      console.log(toContent)
      return
    }

    const {
      type = 'fade',
      duration = this.getAnimationTimings().transition
    } = options

    switch (type) {
      case 'fade':
        await this.fadeTransition(fromContent, toContent, duration)
        break
      case 'slide':
        await this.slideTransition(fromContent, toContent, duration)
        break
      case 'wipe':
        await this.wipeTransition(fromContent, toContent, duration)
        break
      default:
        console.clear()
        console.log(toContent)
    }
  }

  /**
   * Celebrate animation for victories
   */
  async celebrateAnimation(message: string): Promise<void> {
    if (!this.config.visualEffects) {
      console.log(message)
      return
    }

    const celebrationFrames = [
      chalk.yellow('✨ ') + message + chalk.yellow(' ✨'),
      chalk.green('🎉 ') + message + chalk.green(' 🎉'),
      chalk.red('🎊 ') + message + chalk.red(' 🎊'),
      chalk.blue('⭐ ') + message + chalk.blue(' ⭐'),
      chalk.magenta('🌟 ') + message + chalk.magenta(' 🌟')
    ]

    const frameDelay = 300

    for (let cycle = 0; cycle < 3; cycle++) {
      for (const frame of celebrationFrames) {
        process.stdout.write('\r' + frame)
        await this.sleep(frameDelay)
      }
    }

    console.log('\n')
  }

  /**
   * Shake effect for errors or failures
   */
  async shakeEffect(text: string): Promise<void> {
    if (!this.config.visualEffects || this.config.animationSpeed === 'off') {
      console.log(text)
      return
    }

    const shakeFrames = [
      text,
      ' ' + text,
      '  ' + text,
      ' ' + text,
      text
    ]

    for (let i = 0; i < 3; i++) {
      for (const frame of shakeFrames) {
        process.stdout.write('\r' + frame)
        await this.sleep(50)
      }
    }

    console.log()
  }

  /**
   * Matrix-style rain effect (for matrix theme)
   */
  async matrixRain(duration: number = 2000): Promise<void> {
    if (this.config.theme !== 'matrix' || !this.config.visualEffects) {
      return
    }

    const chars = '01ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾔﾕﾗﾘﾜ'
    const width = process.stdout.columns || 80
    const height = 10

    const startTime = Date.now()
    
    while (Date.now() - startTime < duration) {
      let line = ''
      for (let i = 0; i < width; i++) {
        if (Math.random() < 0.1) {
          const char = chars[Math.floor(Math.random() * chars.length)]
          line += chalk.green(char)
        } else {
          line += ' '
        }
      }
      console.log(line)
      await this.sleep(100)
    }
  }

  // Private animation methods

  private async fadeInAnimation(text: string, duration: number): Promise<void> {
    const lines = text.split('\n')
    const steps = 5
    const stepDelay = duration / steps

    for (let step = 1; step <= steps; step++) {
      console.clear()
      const opacity = step / steps
      
      lines.forEach(line => {
        if (opacity < 0.3) {
          console.log(chalk.gray(line))
        } else if (opacity < 0.7) {
          console.log(chalk.dim(line))
        } else {
          console.log(line)
        }
      })
      
      await this.sleep(stepDelay)
    }
  }

  private async slideInAnimation(text: string, duration: number): Promise<void> {
    const lines = text.split('\n')
    const maxWidth = Math.max(...lines.map(line => line.length))
    const steps = maxWidth
    const stepDelay = duration / steps

    for (let step = 1; step <= steps; step++) {
      console.clear()
      
      lines.forEach(line => {
        const visiblePart = line.slice(0, step)
        console.log(visiblePart)
      })
      
      await this.sleep(stepDelay)
    }
  }

  private async flipAnimation(text: string, duration: number): Promise<void> {
    const flipChars = ['|', '/', '-', '\\']
    const steps = 8
    const stepDelay = duration / steps

    for (let step = 0; step < steps; step++) {
      console.clear()
      
      if (step < 4) {
        // Flip phase
        const char = flipChars[step % flipChars.length]
        console.log(chalk.cyan(char.repeat(20)))
      } else {
        // Reveal phase
        console.log(text)
      }
      
      await this.sleep(stepDelay)
    }
  }

  private async fadeTransition(fromContent: string, toContent: string, duration: number): Promise<void> {
    const steps = 5
    const stepDelay = duration / (steps * 2)

    // Fade out
    for (let step = steps; step >= 0; step--) {
      console.clear()
      const opacity = step / steps
      
      if (opacity > 0.7) {
        console.log(fromContent)
      } else if (opacity > 0.3) {
        console.log(chalk.dim(fromContent))
      } else {
        console.log(chalk.gray(fromContent))
      }
      
      await this.sleep(stepDelay)
    }

    // Fade in
    for (let step = 0; step <= steps; step++) {
      console.clear()
      const opacity = step / steps
      
      if (opacity < 0.3) {
        console.log(chalk.gray(toContent))
      } else if (opacity < 0.7) {
        console.log(chalk.dim(toContent))
      } else {
        console.log(toContent)
      }
      
      await this.sleep(stepDelay)
    }
  }

  private async slideTransition(fromContent: string, toContent: string, duration: number): Promise<void> {
    const lines = Math.max(fromContent.split('\n').length, toContent.split('\n').length)
    const steps = lines
    const stepDelay = duration / steps

    for (let step = 0; step < steps; step++) {
      console.clear()
      
      const fromLines = fromContent.split('\n')
      const toLines = toContent.split('\n')
      
      // Show remaining from lines and appearing to lines
      for (let i = step; i < fromLines.length; i++) {
        if (fromLines[i]) console.log(fromLines[i])
      }
      
      for (let i = 0; i < step && i < toLines.length; i++) {
        if (toLines[i]) console.log(toLines[i])
      }
      
      await this.sleep(stepDelay)
    }

    console.clear()
    console.log(toContent)
  }

  private async wipeTransition(fromContent: string, toContent: string, duration: number): Promise<void> {
    const width = process.stdout.columns || 80
    const steps = width
    const stepDelay = duration / steps

    for (let step = 0; step < steps; step++) {
      console.clear()
      
      const wipeChar = '█'
      const wipeLine = chalk.blue(wipeChar.repeat(step))
      
      console.log(wipeLine)
      
      await this.sleep(stepDelay)
    }

    console.clear()
    console.log(toContent)
  }

  private getAnimationTimings() {
    const timings = {
      slow: { typewriter: 150, cardReveal: 800, transition: 1000, pulse: 2000 },
      normal: { typewriter: 75, cardReveal: 400, transition: 500, pulse: 1000 },
      fast: { typewriter: 25, cardReveal: 200, transition: 250, pulse: 500 },
      off: { typewriter: 0, cardReveal: 0, transition: 0, pulse: 0 }
    }
    
    return timings[this.config.animationSpeed]
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private playSound(type: 'tick' | 'success' | 'error'): void {
    if (!this.config.soundEnabled) return

    // Use system beep for basic sound feedback
    try {
      process.stdout.write('\x07') // Bell character
    } catch (e) {
      // Silently fail if sound is not supported
    }
  }
}

/**
 * Typewriter effect options
 */
export interface TypewriterOptions {
  delay?: number
  sound?: boolean
  color?: string
}

/**
 * Card reveal animation options
 */
export interface CardRevealOptions {
  direction?: 'fade' | 'slide' | 'flip'
  duration?: number
}

/**
 * Spinner options
 */
export interface SpinnerOptions {
  text?: string
  spinner?: string
  color?: string
}

/**
 * Transition options
 */
export interface TransitionOptions {
  type?: 'fade' | 'slide' | 'wipe'
  duration?: number
}