import { selectRoute as runtimeSelectRoute, REDACTION_TOKEN as RUNTIME_REDACTION_TOKEN } from './model-router.js';

export type ReasoningPreference = 'minimal' | 'standard' | 'deep';
export type SpeedPreference = 'fast' | 'balanced' | 'deliberate';
export type BudgetTier = 'economy' | 'standard' | 'premium';
export type SafetyLevel = 'low' | 'normal' | 'elevated' | 'critical';

export interface TaskProfile {
  reasoning?: ReasoningPreference;
  speed?: SpeedPreference;
  vision?: boolean;
  tools?: string[];
}

export interface SafetyContext {
  level?: SafetyLevel;
  allowVision?: boolean;
  allowTools?: boolean;
  complianceFlags?: string[];
}

export interface CostBudget {
  tier?: BudgetTier;
  maxCredits?: number;
}

export interface RouteDecision {
  routeId: string;
  label: string;
  persona: string;
  computeClass: 'economy' | 'standard' | 'premium' | string;
  reasoning: {
    requested: ReasoningPreference;
    allocated: ReasoningPreference;
  };
  speed: {
    requested: SpeedPreference;
    allocated: SpeedPreference;
  };
  modalities: {
    vision: {
      requested: boolean;
      allowedByPolicy: boolean;
      granted: boolean;
    };
    tools: {
      requested: string[];
      allowedByPolicy: boolean;
      granted: string[];
      limit: number | null;
    };
  };
  cost: {
    tier: BudgetTier;
    estimatedCredits: number;
    budgetTier: BudgetTier;
    maxCredits: number | null;
  };
  safety: {
    level: SafetyLevel;
    escalate: boolean;
    allowVision: boolean;
    allowTools: boolean;
    notes: string[];
  };
  adjustments: string[];
  trace: string[];
}

export const selectRoute: (
  profile?: TaskProfile,
  safety?: SafetyContext,
  budget?: CostBudget,
) => RouteDecision = runtimeSelectRoute as unknown as (
  profile?: TaskProfile,
  safety?: SafetyContext,
  budget?: CostBudget,
) => RouteDecision;

export const REDACTION_TOKEN: string = RUNTIME_REDACTION_TOKEN;
