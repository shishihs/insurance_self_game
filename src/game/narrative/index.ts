/**
 * 物語システム - エクスポートインデックス
 */

export { EndingSystem } from './EndingSystem'
export type { 
  EndingType, 
  EndingInfo, 
  EndingScene, 
  EndingStatistics 
} from './EndingSystem'

export { NarrativeSystem } from './NarrativeSystem'
export type { 
  NarrativeEvent, 
  NarrativeChoice, 
  NarrativeConsequence, 
  EmotionalImpact, 
  LifeAspects, 
  StoryFlags 
} from './NarrativeSystem'

export { NarrativeIntegration } from './NarrativeIntegration'
export type { 
  IntegratedEvent, 
  PlayerImpact, 
  LifeSimulationState, 
  KeyDecision 
} from './NarrativeIntegration'

export { SecretSystem } from './SecretSystem'
export type { 
  Secret, 
  SecretCategory, 
  SecretImportance, 
  UnlockCondition, 
  TruthLayer 
} from './SecretSystem'