import { z } from "zod";

// 1. ENUMS & CONSTANTS
// ====================

export enum LotStage {
  PROCUREMENT = 'PROCUREMENT',
  PERFORMING = 'PERFORMING',
  GAS_BURN = 'GAS_BURN',
  CUT_POLISH = 'CUT_POLISH',
  ELECTRIC_BURN = 'ELECTRIC_BURN',
  CERTIFICATION = 'CERTIFICATION',
  SELL_READY = 'SELL_READY',
  SOLD = 'Sold' // Confirmed Title Case in DB
}

export const STAGE_SEQUENCE: Record<LotStage, number> = {
  [LotStage.PROCUREMENT]: 1,
  [LotStage.PERFORMING]: 2,
  [LotStage.GAS_BURN]: 3,
  [LotStage.CUT_POLISH]: 4,
  [LotStage.ELECTRIC_BURN]: 5,
  [LotStage.CERTIFICATION]: 6,
  [LotStage.SELL_READY]: 7,
  [LotStage.SOLD]: 8
};

export const STAGE_DISPLAY_NAMES: Record<LotStage, string> = {
  [LotStage.PROCUREMENT]: 'Procurement',
  [LotStage.PERFORMING]: 'Preforming',
  [LotStage.GAS_BURN]: 'Gas Burn',
  [LotStage.CUT_POLISH]: 'Cut & Polish',
  [LotStage.ELECTRIC_BURN]: 'Electric Burn',
  [LotStage.CERTIFICATION]: 'Lab Certification',
  [LotStage.SELL_READY]: 'Sell Ready',
  [LotStage.SOLD]: 'Sold'
};

export const ALLOWED_TRANSITIONS: Record<LotStage, LotStage[]> = {
  [LotStage.PROCUREMENT]: [LotStage.PERFORMING],
  [LotStage.PERFORMING]: [LotStage.GAS_BURN],
  [LotStage.GAS_BURN]: [LotStage.CUT_POLISH, LotStage.ELECTRIC_BURN],
  [LotStage.CUT_POLISH]: [LotStage.ELECTRIC_BURN, LotStage.CERTIFICATION],
  [LotStage.ELECTRIC_BURN]: [LotStage.CERTIFICATION, LotStage.SELL_READY],
  [LotStage.CERTIFICATION]: [LotStage.SELL_READY],
  [LotStage.SELL_READY]: [LotStage.SOLD],
  [LotStage.SOLD]: [] // Terminal state
};

// 2. VALIDATION SCHEMAS
// =====================

// Helper: Ensure percentages sum to 100 (+- 0.1 tolerance)
const percentageSumSchema = (obj: Record<string, number>) => {
  const sum = Object.values(obj).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) <= 0.1;
};

// Procurement Data Schema (Rough Classification)
export const ProcurementDataSchema = z.object({
  rough_composition: z.record(
    z.string(),
    z.object({
      pieces: z.coerce.number().min(0, "Must be positive"),
      carats: z.coerce.number().min(0, "Must be positive"),
    })
  ).optional(),
  notes: z.string().optional()
})

// GAS BURN Data Schema (Mirrors Electric Burn)
export const GasBurnDataSchema = z.object({
  breakdown: z.array(z.object({
    color: z.string().min(1, "Color is required"),
    clarity: z.string().optional().default('-'),
    source_type: z.string().optional(),
    pieces: z.coerce.number().min(0).optional(),
    carats: z.coerce.number().min(0, "Weight cannot be negative"),
  })).min(1, "At least one result must be recorded"),
  notes: z.string().optional(),
  new_weight: z.number().optional()
})

// ELECTRIC BURN Data Schema
// Updated to track specific Color/Clarity/Weight breakdown for resulting stones
export const ElectricBurnDataSchema = z.object({
  breakdown: z.array(z.object({
    color: z.string().min(1, "Color is required"),
    clarity: z.string().optional().default('-'), // Default to '-' if unselected
    source_type: z.string().optional(), // New: Track which rough type this came from
    pieces: z.coerce.number().min(0).optional(),
    carats: z.coerce.number().min(0, "Weight cannot be negative"),
  })).min(1, "At least one result must be recorded"),
  notes: z.string().optional(),
  new_weight: z.number().optional()
})

// CERTIFICATION Data Schema
export const CertificationDataSchema = z.object({
  lab_name: z.string().min(1, "Lab name is required"), // GIA, GRS, IGI, Lotus Gemology, SSEF, CGL, AIGS, EGL
  report_number: z.string().min(1, "Report number is required"),
  certificate_date: z.string().optional(),
  verified_carat: z.coerce.number().positive("Carat weight must be positive").optional(),
  color_grade: z.string().optional(),
  clarity_grade: z.string().optional(),
  cut_shape: z.string().optional(),
  treatment_status: z.string().optional(),
  report_url: z.string().optional(),
  notes: z.string().optional()
});

// SELL READY Data Schema
export const SellReadyDataSchema = z.object({
  // Valuation Data (Entered when moving to Sell Ready)
  valuations: z.array(z.object({
    type: z.string(),
    price_per_carat: z.coerce.number().min(0),
    total_val: z.coerce.number().min(0),
    margin_percent: z.coerce.number().optional(),
    description: z.string().optional()
  })).optional(),

  new_weight: z.number().optional()
});

// SOLD Data Schema (Actual Sale)
export const SoldDataSchema = z.object({
  sold_price: z.coerce.number().positive("Sale price must be positive"),
  buyer: z.string().min(1, "Buyer name is required"),
  sale_date: z.string().min(1, "Sale date is required"), // ISO string
  payment_mode: z.string().optional(),
  notes: z.string().optional()
});


// 3. UTILITY FUNCTIONS
// ====================

/**
 * Validates if a transition is allowed strictly by the State Machine.
 */
export function validateTransition(currentStage: LotStage, nextStage: LotStage): { valid: boolean; error?: string } {
  const allowed = ALLOWED_TRANSITIONS[currentStage];

  if (!allowed.includes(nextStage)) {
    return {
      valid: false,
      error: `Invalid transition: Cannot move from ${currentStage} to ${nextStage}. Allowed: ${allowed.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validates stage-specific data blobs (JSONB content).
 */
export function validateStageData(stage: LotStage, data: any): { valid: boolean; error?: string } {
  try {
    if (stage === LotStage.GAS_BURN) {
      GasBurnDataSchema.parse(data);
    }
    if (stage === LotStage.ELECTRIC_BURN) {
      ElectricBurnDataSchema.parse(data);
    }
    if (stage === LotStage.CERTIFICATION) {
      CertificationDataSchema.parse(data);
    }
    if (stage === LotStage.SELL_READY) {
      SellReadyDataSchema.parse(data);
    }
    if (stage === LotStage.SOLD) {
      SoldDataSchema.parse(data);
    }
    return { valid: true };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      // Zod v4 exposes validation problems as `issues` (`errors` was removed).
      return {
        valid: false,
        error: e.issues
          .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
          .join(', ')
      };
    }
    return { valid: false, error: e.message };
  }
}

/**
 * Returns the sequence number for ordering.
 */
export function getStageSequence(stage: LotStage): number {
  return STAGE_SEQUENCE[stage];
}

/**
 * Normalizes a raw stage string (which might be legacy uppercase/underscore)
 * to the current LotStage Enum value.
 */
export function normalizeStage(rawStage: string | null | undefined): LotStage | null {
  if (!rawStage) return null

  // 1. Direct Match
  if (Object.values(LotStage).includes(rawStage as LotStage)) {
    return rawStage as LotStage
  }

  // 2. Legacy/Input Mapping (Title Case / Uppercase handling)
  const upper = rawStage.toUpperCase()

  // Direct matches for Uppercase
  if (upper === 'PROCUREMENT') return LotStage.PROCUREMENT
  if (upper === 'PERFORMING' || upper === 'PREFORMING') return LotStage.PERFORMING
  if (upper === 'GAS_BURN' || upper === 'GAS BURN') return LotStage.GAS_BURN
  if (upper === 'CUT_POLISH' || upper === 'CUT & POLISH') return LotStage.CUT_POLISH
  if (upper === 'ELECTRIC_BURN' || upper === 'ELECTRIC BURN') return LotStage.ELECTRIC_BURN
  if (upper === 'CERTIFICATION' || upper === 'LAB CERTIFICATION') return LotStage.CERTIFICATION
  if (upper === 'SELL_READY' || upper === 'SELL READY') return LotStage.SELL_READY
  if (upper === 'SOLD') return LotStage.SOLD // Enum is 'Sold', but comparisons often check SOLD

  // 3. Fallback (Case insensitive check against Enum Values directly)
  const found = Object.values(LotStage).find(s => s.toLowerCase() === rawStage.toLowerCase())
  return found || null
}
