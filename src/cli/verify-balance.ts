
import { BeginnerPersona, IntermediatePersona, AdvancedPersona } from '@/ai/Personas'
import { PersonaGameRenderer } from '@/ai/PersonaGameRenderer'
import { GameControllerFactory } from '@/controllers/GameController'
import type { GameConfig, PlayerStats } from '@/domain/types/game.types'
import chalk from 'chalk'

const GAMES_PER_PERSONA = 20;

const runVerification = async () => {
    console.log(chalk.bold.cyan('🎮 Starting Level Design Verification (Balance Check)'));
    console.log(`Running ${GAMES_PER_PERSONA} games per persona...\n`);

    const personas = [
        new BeginnerPersona(),
        new IntermediatePersona(),
        new AdvancedPersona()
    ];

    const results: Record<string, { win: number, loss: number, stats: PlayerStats[] }> = {};

    for (const persona of personas) {
        console.log(chalk.blue(`👤 Testing Persona: ${persona.name}`));
        results[persona.name] = { win: 0, loss: 0, stats: [] };

        for (let i = 0; i < GAMES_PER_PERSONA; i++) {
            process.stdout.write(`\r   Game ${i + 1}/${GAMES_PER_PERSONA}`);

            const renderer = new PersonaGameRenderer(persona);
            const controller = GameControllerFactory.createDefault(renderer);

            // Disable debug logs if any
            controller.setDebugMode(false);

            try {
                const finalStats = await controller.playGame();
                const game = controller.getGameState(); // Access game to check status directly if stats doesn't have it

                if (game.status === 'victory') {
                    results[persona.name].win++;
                } else {
                    results[persona.name].loss++;
                }

                results[persona.name].stats.push(finalStats);
            } catch (e) {
                console.error(`\nError in game ${i}:`, e);
            }
        }
        console.log('\n   Done.');
    }

    printReport(results);
}

const printReport = (results: Record<string, { win: number, loss: number, stats: PlayerStats[] }>) => {
    console.log(chalk.bold.green('\n📊 Verification Report'));
    console.log('='.repeat(60));

    for (const [name, data] of Object.entries(results)) {
        const total = data.win + data.loss;
        const winRate = ((data.win / total) * 100).toFixed(1);

        // Aggregate Stats
        const avgTurns = average(data.stats.map(s => s.turnsPlayed));
        const avgVitality = average(data.stats.map(s => s.highestVitality)); // Note: This might be 'highest', not 'ending'. 
        // Logic check: PlayerStats usually tracks accumulated stats. 
        // We might want Ending Vitality, which is in GameState, but PlayerStats might not have it directly?
        // Let's check PlayerStats type definition if needed. Assuming standard stats for now.
        const avgCards = average(data.stats.map(s => s.cardsAcquired));
        const successChallenges = average(data.stats.map(s => s.successfulChallenges));

        console.log(chalk.yellow.bold(`\n${name}`));
        console.log(`  Win Rate: ${winRate}% (${data.win}/${total})`);
        console.log(`  Avg Turns: ${avgTurns.toFixed(1)}`);
        console.log(`  Avg Cards Acquired: ${avgCards.toFixed(1)}`);
        console.log(`  Avg Successful Challenges: ${successChallenges.toFixed(1)}`);

        // Evaluation
        let evaluation = "";
        if (name === 'Beginner') {
            if (parseFloat(winRate) < 20) evaluation = "Too Hard for Beginners";
            else if (parseFloat(winRate) > 80) evaluation = "Too Easy for Beginners";
            else evaluation = "Good Balance";
        } else if (name === 'Advanced') {
            if (parseFloat(winRate) < 50) evaluation = "Too Hard for Advanced";
            else if (parseFloat(winRate) > 95) evaluation = "Too Easy for Advanced";
            else evaluation = "Good Balance";
        }

        if (evaluation) console.log(chalk.magenta(`  Evaluation: ${evaluation}`));
    }
    console.log('='.repeat(60));
}

const average = (nums: number[]) => {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

runVerification().catch(console.error);
