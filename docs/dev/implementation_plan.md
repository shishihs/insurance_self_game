# Level Design Verification System Implementation Plan

## Goal
Create a CLI-based system to verify game level design by simulating games with distinct player personas (Beginner, Intermediate, Advanced).

## Steps

### 1. Define Persona Strategies (TDD)
- **Task**: Implement `AIStrategy` classes for each persona.
- **File**: `src/ai/Personas.ts`
- **Tests**: `src/ai/__tests__/Personas.spec.ts`
- **Details**:
    - `BeginnerPersona`: Wraps/Modified Random behavior + High Insurance bias.
    - `IntermediatePersona`: Wraps/Modified Conservative behavior.
    - `AdvancedPersona`: Wraps/Modified Greedy/MCTS behavior with aggressive tuning.

### 2. Create Evaluation Runner
- **Task**: Create a script to run multiple games for each persona and collect stats.
- **File**: `src/cli/verify-balance.ts`
- **Details**:
    - Run N games per persona.
    - Collect metrics:
        - Win Rate
        - Average Vitality Remaining
        - Average Money
        - Challenge Success Rate
        - Insurance Spend
    - Output report to JSON/Console.

### 3. CLI Integration
- **Task**: Add a command to `package.json` to run the verification.
- **Command**: `npm run verify:balance`

### 4. Evaluation & Report
- **Task**: Run the verification and append the results to `docs/balance_report.md`.
