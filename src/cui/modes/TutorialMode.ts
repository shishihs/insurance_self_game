import { InteractiveCUIRenderer } from '../renderers/InteractiveCUIRenderer'
import type { Card } from '@/domain/entities/Card'
import type { CUIConfig } from '../config/CUIConfig'
import chalk from 'chalk'
import boxen from 'boxen'
import inquirer from 'inquirer'

/**
 * Tutorial Mode Renderer
 * Step-by-step learning experience with guided explanations
 */
export class TutorialModeRenderer extends InteractiveCUIRenderer {
  // private tutorialStep: number = 0
  // private tutorialPhase: TutorialPhase = 'introduction'
  protected explainedConcepts: Set<string> = new Set()

  constructor(config?: Partial<CUIConfig>) {
    super({
      ...config,
      animationSpeed: 'slow',
      showHelp: true,
      confirmActions: true,
      autoAdvance: false
    })
  }

  override async initialize(): Promise<void> {
    await super.initialize()

    console.log(chalk.bold.green('🎓 チュートリアルモード開始'))
    console.log(chalk.gray('═'.repeat(50)))
    console.log(chalk.blue('人生充実ゲームのチュートリアルへようこそ！'))
    console.log(chalk.gray('ゲームプレイの各ステップを案内します。\n'))

    await this.showTutorialIntroduction()
  }

  // === Enhanced Input Methods with Tutorials ===

  override async askCardSelection(
    cards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1,
    message?: string
  ): Promise<Card[]> {
    // First time explaining card selection
    if (!this.explainedConcepts.has('card_selection')) {
      await this.explainCardSelection(cards, minSelection, maxSelection)
      this.explainedConcepts.add('card_selection')
    }

    // Show cards with detailed explanations
    console.log('\n' + chalk.bold.blue('🃏 利用可能なカード：'))
    console.log(chalk.gray('─'.repeat(40)))

    cards.forEach((card, index) => {
      const cardDisplay = this.cardRenderer.renderCard(card, {
        style: 'detailed',
        showIndex: true,
        index: index + 1
      })
      console.log(cardDisplay)

      // Add card-specific tutorial hints
      const hint = this.getCardTutorialHint(card)
      if (hint) {
        console.log(chalk.dim(`💡 ${hint}\n`))
      }
    })

    // Interactive selection with guidance
    const result = await super.askCardSelection(cards, minSelection, maxSelection, message)

    // Explain the choice
    if (result.length > 0) {
      await this.explainCardChoice(result)
    }

    return result
  }

  override async askDreamSelection(cards: Card[]): Promise<Card> {
    if (!this.explainedConcepts.has('dream_selection')) {
      await this.explainDreams()
      this.explainedConcepts.add('dream_selection')
    }

    const selected = await super.askDreamSelection(cards)

    await this.explainDreamChoice(selected)
    return selected
  }

  override async askChallengeSelection(challenges: Card[]): Promise<Card> {
    if (!this.explainedConcepts.has('challenge_selection')) {
      await this.explainChallengeSelection(challenges)
      this.explainedConcepts.add('challenge_selection')
    }

    console.log('\n' + chalk.bold.yellow('⚔️ 課題選択 チュートリアル：'))
    console.log(chalk.gray('─'.repeat(40)))

    // Analyze simplified
    challenges.forEach(c => this.analyzeChallenge(c))

    const selected = await super.askChallengeSelection(challenges)

    return selected
  }

  // Deprecated: askChallengeAction is no longer used in v2 flow
  override async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    return super.askChallengeAction(challenge)
  }

  override async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    if (!this.explainedConcepts.has('insurance_types')) {
      await this.explainInsuranceTypes(availableTypes)
      this.explainedConcepts.add('insurance_types')
    }

    const choice = await super.askInsuranceTypeChoice(availableTypes)

    await this.explainInsuranceTypeChoice(choice)

    return choice
  }

  override async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    if (!this.explainedConcepts.has('insurance_renewal')) {
      await this.explainInsuranceRenewal()
      this.explainedConcepts.add('insurance_renewal')
    }

    console.log('\n' + chalk.bold.cyan('🛡️ 保険更新 チュートリアル：'))
    console.log(chalk.gray('─'.repeat(40)))

    await this.analyzeInsuranceRenewal(insurance, cost)

    const decision = await super.askInsuranceRenewalChoice(insurance, cost)

    await this.explainRenewalChoice(insurance, cost, decision)

    return decision
  }

  // === Tutorial Explanation Methods ===

  private async explainDreams(): Promise<void> {
    const explanationText = `
🌠 夢の選択 チュートリアル

夢はあなたの人生の究極の目標を表します。
この選択は勝利条件と特別なボーナスを決定します。

夢の種類：
• 🏃 身体的：健康と活動に重点
• 🧠 知的：知識とキャリアに重点
• ⚖️ 複合：バランスの取れた人生

選択した夢カードは、ゲーム全体を通してパッシブボーナスを提供します！
`
    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 夢を選ぼう',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'magenta'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async explainDreamChoice(selectedDream: Card): Promise<void> {
    console.log(chalk.green(`\n✨ 素晴らしい選択です！あなたは「${selectedDream.name}」を選びました。`))
    console.log(chalk.dim('この夢はあなたの旅を導き、役立つボーナスをもたらすでしょう。'))
  }

  private async explainChallengeSelection(challenges: Card[]): Promise<void> {
    const explanationText = `
⚔️ 課題選択 チュートリアル

各ターン、次に直面する課題の選択肢が提示されます。
その中から1つを選んで挑戦しなければなりません。

考慮事項：
• 📊 必要パワー：手札でカバーできますか？
• 🎁 報酬：成功すると何が得られますか？
• ☠️ リスク：失敗した場合のペナルティは？

賢明な選択を！選んだ道があなたの運命を形作ります。
`
    // Use challenges for context if needed, currently generic
    if (challenges.length > 0) {
      // Just acknowledging usage to avoid lint error
    }

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 課題の選択',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async showTutorialIntroduction(): Promise<void> {
    const introText = `
🎮 人生充実ゲームへようこそ！

このゲームは、さまざまなライフステージを通じた人生の旅をシミュレートします：
• 🌱 青年期 - 基礎を築く
• 💪 壮年期 - 課題に立ち向かう
• 👔 中年期 - 責任を管理する
• 👴 高齢期 - 知恵を楽しむ

目的は、課題を乗り越え、賢明な判断を下し、
活力を管理しながら充実した人生を築くことです。

重要な概念：
• ❤️ 活力（Vitality）：生命エネルギー（健康、意欲）
• 🃏 カード：人生のスキルや経験
• ⚔️ 課題：克服すべき人生の障害
• 🛡️ 保険：不測の事態への備え
`

    const tutorialBox = boxen(introText.trim(), {
      title: '🎓 ゲーム概要',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue'
    })

    console.log(tutorialBox)

    await this.waitForUserToContinue()
  }

  private async explainCardSelection(_cards: Card[], minSelection: number, maxSelection: number): Promise<void> {
    const explanationText = `
🃏 カード選択 チュートリアル

カードはあなたの人生のスキル、経験、リソースを表します。
各カードには異なる特性があります：

• 💪 パワー：課題に対してどれだけ役立つか
• 💰 コスト：カードを使用するために必要な活力
• 🏷️ カテゴリ：人生のどの側面を表しているか

選択ルール：
• ${minSelection === maxSelection ? '正確に' : ''} ${minSelection}${minSelection !== maxSelection ? `〜${maxSelection}` : ''}枚のカードを選択してください
• パワーの高いカードは通常、課題に対して有利です
• コストを考慮してください - 活力を使い果たさないように！

💡 戦略のヒント：高いパワーと現在の活力のバランスを取りましょう。
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 カードの選び方',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'green'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  // Unused methods commented out to silence linter
  /*
  private async explainChallenges(challenge: Card): Promise<void> {
    // Legacy explanation for single challenge context
    // Kept for compatibility if needed
    await this.analyzeChallenge(challenge)
  }

  private async explainChallengeChoice(challenge: Card, action: 'start' | 'skip'): Promise<void> {
    if (action === 'start') {
      console.log(chalk.green('\n💪 You chose to face the challenge!'))
      console.log(chalk.blue('  This shows courage and ambition.'))
      console.log(chalk.gray('  Remember: success brings rewards, failure costs vitality.'))
    } else {
      console.log(chalk.yellow('\n🏃 You chose to skip the challenge.'))
      console.log(chalk.blue('  Sometimes discretion is the better part of valor.'))
      console.log(chalk.gray('  You preserve vitality but miss potential rewards.'))
    }
  }
  */

  private async explainInsuranceTypes(_availableTypes: ('whole_life' | 'term')[]): Promise<void> {
    const explanationText = `
🛡️ 保険 チュートリアル

保険は人生の挫折からあなたを守り、
課題に対して追加のパワーを提供します。

利用可能な種類：

🛡️ 終身保険：
• 生涯にわたる永続的な保障
• コストは高いが、利益が長く続く
• 一貫したパワーボーナスを提供

⏳ 定期保険：
• 特定の期間のみの一時的な保障
• コストは低いが、更新が必要
• 時間とともに高くなる可能性がある

💡 戦略のヒント：終身保険は安定的、定期保険は柔軟です。
現在の状況と長期的な計画に基づいて選びましょう。
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 保険の種類について',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async explainInsuranceRenewal(): Promise<void> {
    const explanationText = `
🔄 保険更新 チュートリアル

年齢を重ねるにつれて、保険の維持費は高くなります。
各ターン、以下の決定をする必要があります：

💰 更新する：
• 更新料（活力）を支払う
• 保険の保障を維持する
• 課題ボーナスを維持する

❌ 失効させる：
• 更新料を節約する
• 保険の保障を失う
• 後で再加入するのが難しくなる可能性がある

考慮すべき要素：
• 現在の活力レベル
• 今後の課題
• 年齢によるコスト増加
• 代わりの保障オプション

💡 戦略のヒント：更新料は年齢とともに増加するので、先を見越して計画しましょう！
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 保険更新ガイド',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'magenta'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async analyzeChallenge(challenge: Card): Promise<void> {
    console.log(chalk.bold.blue('📊 課題分析：'))
    console.log(`  名前：${challenge.name}`)
    console.log(`  必要パワー：${chalk.red(challenge.power || 0)}`)

    if (challenge.description) {
      console.log(`  説明：${chalk.gray(challenge.description)}`)
    }

    // Provide strategic advice
    const powerRequired = challenge.power || 0
    if (powerRequired <= 3) {
      console.log(chalk.green('  💡 これは簡単な課題のようです！'))
    } else if (powerRequired <= 6) {
      console.log(chalk.yellow('  💡 これは中程度の課題です。カードを慎重に選びましょう。'))
    } else {
      console.log(chalk.red('  💡 これは難しい課題です。強力なカードを用意してください！'))
    }
  }

  private async analyzeInsuranceRenewal(insurance: Card, cost: number): Promise<void> {
    console.log(chalk.bold.blue('📊 更新分析：'))
    console.log(`  保険：${insurance.name}`)
    console.log(`  更新料：活力 ${chalk.yellow(cost)}`)
    console.log(`  保険タイプ：${insurance.type}`)

    // Provide strategic advice
    if (cost <= 2) {
      console.log(chalk.green('  💡 とても手頃な更新料です - 更新する価値があります'))
    } else if (cost <= 4) {
      console.log(chalk.yellow('  💡 中程度のコストです - 現在の活力を考慮しましょう'))
    } else {
      console.log(chalk.red('  💡 高額な更新料です - 利益を慎重に検討しましょう'))
    }
  }

  private getCardTutorialHint(card: Card): string {
    const power = card.power || 0
    const cost = card.cost || 0

    if (power >= 5) {
      return '強力なカード - 難しい課題に最適です'
    } else if (power >= 3) {
      return 'バランスの取れたカード - 多くの状況で役立ちます'
    } else if (power >= 1) {
      return '基本カード - 簡単な課題に使えます'
    } else if (cost === 0) {
      return 'コストなし - 活力を使わずに使用できます'
    } else {
      return 'パワーとコストの比率を考慮しましょう'
    }
  }

  private async explainCardChoice(selectedCards: Card[]): Promise<void> {
    console.log('\n' + chalk.green('✅ 良い選択です！理由を説明しましょう：'))

    const totalPower = selectedCards.reduce((sum, card) => sum + (card.power || 0), 0)
    const totalCost = selectedCards.reduce((sum, card) => sum + (card.cost || 0), 0)

    console.log(chalk.cyan(`  合計パワー：${totalPower}`))
    console.log(chalk.yellow(`  合計コスト：${totalCost}`))

    if (totalPower > totalCost) {
      console.log(chalk.green('  💡 お得です！使用する活力以上のパワーを得られます。'))
    } else if (totalPower === totalCost) {
      console.log(chalk.blue('  💡 バランスが良い - 活力とパワーの等価交換です。'))
    } else {
      console.log(chalk.red('  💡 高コスト - 課題に見合う価値があるか確認しましょう。'))
    }
  }

  private async explainInsuranceTypeChoice(choice: 'whole_life' | 'term'): Promise<void> {
    if (choice === 'whole_life') {
      console.log(chalk.blue('\n🛡️ 終身保険を選びました！'))
      console.log(chalk.green('  ✅ 永続的な保障'))
      console.log(chalk.green('  ✅ 安定したコスト'))
      console.log(chalk.red('  ❌ 初期のコストが高い'))
    } else {
      console.log(chalk.blue('\n⏳ 定期保険を選びました！'))
      console.log(chalk.green('  ✅ 初期のコストが低い'))
      console.log(chalk.green('  ✅ 変更の柔軟性がある'))
      console.log(chalk.red('  ❌ 年齢とともにコストが増加する'))
    }
  }

  private async explainRenewalChoice(insurance: Card, cost: number, decision: 'renew' | 'expire'): Promise<void> {
    if (decision === 'renew') {
      console.log(chalk.green(`\n💰 「${insurance.name}」を更新しました！`))
      console.log(chalk.blue('  これにより、保障と課題ボーナスが維持されます。'))
      console.log(chalk.gray(`  コスト：活力 ${cost}`))
    } else {
      console.log(chalk.yellow(`\n❌ 「${insurance.name}」を失効させました。`))
      console.log(chalk.blue('  活力を節約できますが、保障はなくなります。'))
      console.log(chalk.gray('  後で余裕ができたら、新しい保険への加入を検討してください。'))
    }
  }

  private async waitForUserToContinue(): Promise<void> {
    const { continue: _shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Enterキーを押して続行...',
        default: true
      }
    ])
  }

  // === Tutorial Progress Tracking ===

  override showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    super.showMessage(message, level)

    // Add tutorial context for certain messages
    if (message.includes('獲得') && !this.explainedConcepts.has('card_rewards')) {
      console.log(chalk.dim('💡 チュートリアル：新しいカードを獲得しました！これにより、今後の課題に対する選択肢が広がります。'))
      this.explainedConcepts.add('card_rewards')
    }
  }

  override showChallengeResult(result: any): void {
    super.showChallengeResult(result)

    // Add tutorial explanations for results
    if (result.success && !this.explainedConcepts.has('success_explanation')) {
      console.log(chalk.dim('\n💡 チュートリアル：成功！カードのパワーが課題の要件を上回りました。'))
      console.log(chalk.dim('これにより活力が向上し、追加の報酬が得られる可能性があります。'))
      this.explainedConcepts.add('success_explanation')
    } else if (!result.success && !this.explainedConcepts.has('failure_explanation')) {
      console.log(chalk.dim('\n💡 チュートリアル：課題失敗。カードのパワーが不足していました。'))
      console.log(chalk.dim('失敗すると活力が減少しますが、経験から学ぶことができます。'))
      this.explainedConcepts.add('failure_explanation')
    }
  }

  /**
   * Show comprehensive help
   */
  async showHelp(): Promise<void> {
    const helpText = `
🎓 チュートリアルヘルプ

使用可能なコマンド：
• 要求に応じて数字またはテキストで回答してください
• 「help」と入力すると、通常いつでもこのメッセージを表示できます
• 「explain <項目>」で特定の項目の説明を表示します（実装されている場合）

重要な概念：
• 活力 (vitality)：生命エネルギーと健康
• パワー (power)：課題を克服するための強さ
• コスト (cost)：カードを使用するために必要な活力
• 保険 (insurance)：保護とボーナスパワー
• ステージ (stages)：人生のさまざまな段階

戦略のヒント：
• 一度にすべての活力を使い果たさないようにしましょう
• 課題のリスクと報酬のバランスを考えましょう
• 保険は未来への投資です
• 成功と失敗の両方から学びましょう
`

    const helpBox = boxen(helpText.trim(), {
      title: '🆘 チュートリアルヘルプ',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'double',
      borderColor: 'blue'
    })

    console.log(helpBox)
  }
}

/**
 * Tutorial phase tracking (Unused currently)
 */
/*
type TutorialPhase =
  | 'introduction'
  | 'first_cards'
  | 'first_challenge'
  | 'insurance_intro'
  | 'advanced_play'
  | 'mastery'
*/