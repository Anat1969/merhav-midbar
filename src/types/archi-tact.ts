// ARCHI-TACT — Shared TypeScript types
// Derived from the Supabase schema; import these in all ARCHI-TACT components.

import type { Tables } from '@/integrations/supabase/types';

// ── Row types (read from DB) ──────────────────────────────────────────────────
export type ArchiUser        = Tables<'archi_users'>;
export type ArchiProject     = Tables<'archi_projects'>;
export type ArchiStage       = Tables<'archi_stages'>;
export type ArchiPayment     = Tables<'archi_payments'>;
export type ArchiClient      = Tables<'archi_clients'>;
export type ArchiContractor  = Tables<'archi_contractors'>;
export type ArchiDocument    = Tables<'archi_documents'>;
export type ArchiActivityLog = Tables<'archi_activity_log'>;

// ── Enum types ────────────────────────────────────────────────────────────────
export type ArchiUserRole      = ArchiUser['role'];
export type ArchiUserPlan      = ArchiUser['plan'];
export type ArchiProjectStatus = ArchiProject['status'];
export type ArchiStageStatus   = ArchiStage['status'];
export type ArchiPaymentStatus = ArchiPayment['status'];
export type ArchiActorType     = ArchiActivityLog['actor_type'];

// ── Enriched / joined types (used in UI) ─────────────────────────────────────
export interface ArchiProjectWithStages extends ArchiProject {
  stages: ArchiStage[];
  client: ArchiClient | null;
}

export interface ArchiStageWithPayment extends ArchiStage {
  payment: ArchiPayment | null;
}

export interface ArchiProjectSummary extends ArchiProject {
  stages: ArchiStage[];
  pending_payments: ArchiPayment[];
  active_stage: ArchiStage | null;
}

// ── Client Portal payload (returned by archi_client_portal RPC) ───────────────
export interface ArchiClientPortalData {
  client: ArchiClient;
  project: ArchiProject;
  stages: ArchiStage[];
  payments: ArchiPayment[];
}

// ── Contractor Portal payload ─────────────────────────────────────────────────
export interface ArchiContractorPortalData {
  contractor: ArchiContractor;
  project: ArchiProject;
  stages: ArchiStage[];
  documents: ArchiDocument[];
}

// ── Default stage names (in order) ───────────────────────────────────────────
export const ARCHI_DEFAULT_STAGES = [
  'תכנון מקדמי',
  'היתר בנייה',
  'תכניות ביצוע',
  'מכרז קבלנים',
  'ליווי ביצוע',
  'גמר ואכלוס',
] as const;

export type ArchiDefaultStageName = typeof ARCHI_DEFAULT_STAGES[number];

// ── Payment status labels (Hebrew) ───────────────────────────────────────────
export const PAYMENT_STATUS_LABELS: Record<ArchiPaymentStatus, string> = {
  pending:            'ממתין',
  awaiting_approval:  'ממתין לאישור לקוח',
  approved:           'אושר',
  paid:               'שולם',
  overdue:            'באיחור',
};

// ── Stage status labels (Hebrew) ─────────────────────────────────────────────
export const STAGE_STATUS_LABELS: Record<ArchiStageStatus, string> = {
  pending:     'ממתין',
  in_progress: 'בביצוע',
  completed:   'הושלם',
};

// ── Project status labels (Hebrew) ───────────────────────────────────────────
export const PROJECT_STATUS_LABELS: Record<ArchiProjectStatus, string> = {
  active:    'פעיל',
  completed: 'הושלם',
  archived:  'בארכיון',
};
