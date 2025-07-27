# Phase 3: Insurance Burden System Implementation

> **Last Updated**: 2025/01/27  
> **Document Type**: Implementation Summary  
> **Update Frequency**: Complete

## Overview

Phase 3 of the GAME_RULES_REALISTIC_FINAL implementation adds an insurance burden system that introduces a strategic cost to having too many insurance cards.

## Implementation Details

### 1. Insurance Burden Calculation
- **Location**: `Game.calculateInsuranceBurden()`
- **Formula**: Every 3 active insurance cards incur -1 power burden
- **Examples**:
  - 0-2 insurance cards: 0 burden
  - 3-5 insurance cards: -1 burden
  - 6-8 insurance cards: -2 burden
  - 9+ insurance cards: -3 burden

### 2. Power Calculation Enhancement
- **Location**: `Game.calculateTotalPower()`
- **Components**:
  - Base power: Sum of non-insurance cards
  - Insurance power: Sum of insurance cards (including age bonuses)
  - Burden: Negative value based on insurance count
  - Total: Max(0, base + insurance + burden)

### 3. Challenge Resolution Updates
- **Location**: `Game.resolveChallenge()`
- **Changes**:
  - Uses `calculateTotalPower()` for detailed power breakdown
  - Includes `powerBreakdown` in `ChallengeResult`
  - Power breakdown shows base, insurance, burden, and total values

### 4. Automatic Burden Updates
- **When insurance is added**: Via card selection after successful challenge
- **When insurance expires**: During turn transitions
- **Storage**: `insuranceBurden` property on Game entity

## Key Code Changes

### Game Entity Properties
```typescript
// Added to Game class
insuranceBurden: number  // Stores current burden value
```

### New Methods
```typescript
// Calculate insurance burden
calculateInsuranceBurden(): number

// Update burden (private)
updateInsuranceBurden(): void

// Calculate detailed power breakdown
calculateTotalPower(cards: Card[]): {
  base: number
  insurance: number
  burden: number
  total: number
}
```

### Updated Types
```typescript
// ChallengeResult interface
powerBreakdown?: {
  base: number
  insurance: number
  burden: number
  total: number
}

// IGameState interface
insuranceBurden?: number
```

## Testing

Comprehensive test suite in `Game.phase3.test.ts` covers:
- Burden calculation for various insurance counts
- Power calculation with burden applied
- Challenge resolution with power breakdown
- Automatic burden updates on insurance changes

## Strategic Impact

This system creates interesting strategic decisions:
- Players must balance insurance protection vs power reduction
- Having 3+ insurances provides protection but reduces offensive capability
- Expired insurances automatically reduce burden
- Forces players to think carefully about insurance portfolio management

## Integration Notes

- Burden is calculated dynamically whenever insurance cards change
- Power burden is applied during challenge resolution
- Total power never goes below 0
- All existing functionality remains unchanged