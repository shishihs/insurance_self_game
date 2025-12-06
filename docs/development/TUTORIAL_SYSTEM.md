# Tutorial System Implementation Guide

This document describes the design and implementation of the tutorial system in the Insurance Self Game. The system provides guidance in both the CUI (Command Line Interface) and the GUI (Web Interface).

## Overview

The tutorial system updates in v0.4.0 introduce distinct mechanisms for on-boarding players in both interfaces while sharing underlying game state concepts.

- **CUI**: Uses `TutorialModeRenderer` to interject explanations during standard game input loops.
- **GUI**: Uses a reactive `TutorialOverlay` component triggered by game phase changes.
- **State**: Managed via `gameStore` (for GUI) and internal tracking (for CUI).

## CUI Implementation

The CUI tutorial is implemented in `src/cui/modes/TutorialMode.ts`.

### Key Features
- **Inheritance**: Extends `InteractiveCUIRenderer` to seamless replace the standard CUI renderer.
- **Method Overrides**: Overrides interactive methods (e.g., `askCardSelection`, `askDreamSelection`) to inject tutorial messages *before* the actual prompt.
- **Concept Tracking**: Uses a `Set<string>` named `explainedConcepts` to ensure each concept is explained only once per session.
- **Rich Text**: Utilizes `boxen` and `chalk` to create distinct, visually appealing explanation boxes in the terminal.

### Usage
To run the tutorial mode in CUI, the game entry point instantiates `TutorialModeRenderer` instead of `InteractiveCUIRenderer` (typically via a CLI flag or menu selection, though commonly tied to the `tutorial` command).

```typescript
// Example instantiation
const renderer = new TutorialModeRenderer(config);
await renderer.initialize();
```

## GUI Implementation

The GUI tutorial is implemented in the Vue.js application using a dedicated overlay component.

### Components
- **`TutorialOverlay.vue`**: The main component that renders the tutorial card.
  - **Reactivity**: Watches `store.currentPhase` to detect when to show relevant hints.
  - **Content**: Contains a dictionary of explanations mapped to game phases (e.g., 'draw', 'challenge_phase').
  - **Animations**: Uses Vue Transitions for smooth entry/exit.

- **`GameBoard.vue`**: Integrates the overlay.
  - Contains the **Toggle Button** (grad hat icon 🎓) in the header.
  - Controls the visibility of the system via the store.

### State Management (`gameStore.ts`)
We added specific state to the Pinia store to manage the tutorial globally:

- **`isTutorialMode`** (ref): Boolean flag to enable/disable the tutorial system.
- **`toggleTutorialMode()`** (action): Toggles the state.

### Phase Mapping
The overlay maps internal game phases to user-friendly tutorial topics:
- `dream_selection` -> Dream Selection Tutorial
- `draw` -> Draw Phase Tutorial
- `challenge_choice` -> Challenge Selection Tutorial
- `challenge` -> Challenge Resolution Tutorial
- `insurance` -> Insurance Phase Tutorial

## Adding New Tutorials

### For CUI
1. Add a new explanation method in `TutorialMode.ts` (e.g., `explainNewFeature()`).
2. Override the relevant `ask...` method in `TutorialMode.ts`.
3. Check `!this.explainedConcepts.has('new_feature_key')` before calling the explanation.
4. Add the key to the set after explaining.

### For GUI
1. Open `src/components/game/TutorialOverlay.vue`.
2. Add a new entry to the `explanations` object with `title`, `content`, and `icon`.
3. Update the `watch` function to map the relevant `store.currentPhase` (or other reactive state) to your new topic key.
