export type JobStatus =
  | "New"
  | "Scheduled"
  | "In Progress"
  | "Waiting on Material"
  | "Ready to Bill"
  | "Completed";

export const JOB_STATUSES: readonly JobStatus[] = [
  "New",
  "Scheduled",
  "In Progress",
  "Waiting on Material",
  "Ready to Bill",
  "Completed",
] as const;

export type JobNote = {
  id: string;
  text: string;
  createdAt: string;
};

/** Per personal-tab progress on a job (keys are normalized phase names, lowercase). */
export type PersonalTabStatus = "pending" | "scheduled" | "completed";

/** Stored state for one personal tab on a job. */
export type PersonalTabRecord = {
  status: PersonalTabStatus;
  /** Tab or phase still needs an invoice created and sent. */
  needsInvoice?: boolean;
  /** Share of total job cost to invoice for this tab (0–100). */
  invoicePercent?: number;
};

/** Keys are normalized phase names (lowercase). Legacy jobs may store status strings only. */
export type PersonalTabStatesMap = Record<string, PersonalTabRecord | PersonalTabStatus>;

export type PaymentDrawStatus = "pending" | "requested" | "paid";

/** Progress billing milestone on a job (rough-in, trim-out, final, or custom). */
export type PaymentDraw = {
  id: string;
  label: string;
  amount?: number;
  percent?: number;
  status: PaymentDrawStatus;
  /** YYYY-MM-DD */
  dueDate?: string;
  invoiceId?: string;
};

export type BossJob = {
  id: string;
  customerName: string;
  jobName: string;
  address: string;
  status: JobStatus;
  /** User-defined personal tab / job phase (e.g. Rough in, Trim out). */
  jobPhase?: string;
  /** Personal tab names used on this job (unlimited; may extend the global tab library). */
  personalTabNames?: string[];
  /** Status (and flags) per personal tab on this job. */
  personalTabStates?: PersonalTabStatesMap;
  estimateTotal: number;
  paid: boolean;
  notes: JobNote[];
  photoUris: string[];
  materialListId?: string;
  serviceCallIds: string[];
  estimateId?: string;
  createdAt: string;
  completedAt?: string;
  /** Progress payment schedule (multiple draws per job). */
  paymentDraws?: PaymentDraw[];
  /** Placeholder until invoice module ships. */
  finalInvoiceStub?: number;
  /** YYYY-MM-DD — used in Schedule / Dispatch. */
  estimatedStartDate?: string;
  /** Minimum crew headcount for scheduling warnings. */
  crewSizeNeeded?: number;
};

export type EstimateTemplateType =
  | "deck-build"
  | "bathroom-remodel"
  | "fence-install"
  | "service-call"
  | "panel-change"
  | "new-house-rough-in"
  | "generator-install"
  | "custom";

export const ESTIMATE_TEMPLATE_LABELS: Record<EstimateTemplateType, string> = {
  "deck-build": "Deck Build",
  "bathroom-remodel": "Bathroom Remodel",
  "fence-install": "Fence Install",
  "service-call": "Service Call",
  "panel-change": "Panel Change",
  "new-house-rough-in": "New House Rough-In",
  "generator-install": "Generator Install",
  custom: "Custom Estimate",
};

export type BossEstimateLineItem = {
  id: string;
  description: string;
  amount: string;
};

export type BossEstimate = {
  id: string;
  createdAt: string;
  updatedAt: string;
  templateType: EstimateTemplateType;
  customerName: string;
  jobName: string;
  address: string;
  laborAmount: string;
  materialAmount: string;
  permitAmount: string;
  miscAmount: string;
  taxPercent: string;
  markupPercent: string;
  notes: string;
  scope: string;
  terms: string;
  signatureApproved: boolean;
  lineItems: BossEstimateLineItem[];
};
