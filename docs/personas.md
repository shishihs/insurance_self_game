# Player Personas for Level Design Verification

This document defines the player personas used to verify the game level design. These personas represent different skill levels and playstyles.

## 1. Beginner Player
**Description**: New to the game, still learning the mechanics. Makes suboptimal decisions and often plays overly safely or completely randomly.

**Behavior**:
- **Card Selection**: Often picks cards randomly or just enough to meet the immediate requirement without considering future turns.
- **Challenges**:
  - Risk-averse.
  - Skips challenges if the success probability isn't very high (e.g., < 90%).
  - Generally avoids taking damage.
- **Insurance**:
  - Tends to over-insure.
  - Prefers "Whole Life" (unlimited duration) even if it's expensive, because it feels safer.
  - Renews insurance even when it's not cost-effective.
- **Risk Management**:
  - Treats all damage as bad.
  - Doesn't understand "spending vitality" as a resource.

## 2. Intermediate Player
**Description**: Understands the rules and basic strategies. Plays solid but lacks deep optimization or combo foresight.

**Behavior**:
- **Card Selection**:
  - Selects cards to meet power requirements efficiently (e.g., sorts by power).
  - Tries to save strong cards for later but might over-save.
- **Challenges**:
  - Attempts challenges if they have a decent chance (e.g., > 60-70%).
  - Calculates basic "power vs requirement" math.
- **Insurance**:
  - Understands the difference between Term and Whole Life.
  - Chooses Term insurance for short-term protection to save money.
  - Renews insurance only if the cost isn't crippling.
- **Risk Management**:
  - Willing to take some damage if the reward is clear.
  - Balances Vitality and Money reasonably well.

## 3. Advanced Player
**Description**: EXPERT. Min-maxes every turn. Calculates probabilities and potential value 5 turns ahead.

**Behavior**:
- **Card Selection**:
  - Optimizes Cost-to-Power ratio.
  - Sets up combos.
  - Will strip their hand naked if it guarantees a massive advantage next turn.
- **Challenges**:
  - Aggressive. Attempts challenges even with lower odds if the payout (EV) is positive.
  - or Calculated: Knows exactly when to skip to save resources for a boss.
- **Insurance**:
  - Minimalist. Only buys insurance when absolutely necessary (e.g., impending high risk).
  - Switches types based on the exact game phase.
  - Ruthlessly drops insurance if it's ROI is negative.
- **Risk Management**:
  - Uses Vitality as a resource to be spent.
  - Comfortable hovering at low HP to maximize output.
