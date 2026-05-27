export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Paid"
  | "Partial Payment"
  | "Overdue"
  | "Canceled";

export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "Draft",
  "Sent",
  "Paid",
  "Partial Payment",
  "Overdue",
  "Canceled",
] as const;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft: "Draft",
  Sent: "Sent",
  Paid: "Paid",
  "Partial Payment": "Partial payment",
  Overdue: "Overdue",
  Canceled: "Canceled",
};

export type InvoiceLineKind = "labor" | "material" | "other";

export type InvoiceLineItem = {
  id: string;
  kind: InvoiceLineKind;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type PaymentMethod =
  | "Cash"
  | "Check"
  | "Card"
  | "ACH"
  | "Venmo"
  | "Zelle"
  | "PayPal"
  | "Other";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "Cash",
  "Check",
  "Card",
  "ACH",
  "Venmo",
  "Zelle",
  "PayPal",
  "Other",
] as const;

export type InvoicePayment = {
  id: string;
  amountCents: number;
  receivedAt: string;
  method: PaymentMethod;
  note?: string;
};

/** Job Folder contractor invoice — stored locally until cloud sync ships. */
export type BossInvoice = {
  id: string;
  createdAt: string;
  updatedAt: string;
  jobId?: string;
  customerId?: string;
  /** Full Estimates workspace or Boss quick estimate. */
  sourceEstimateId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  jobName: string;
  jobAddress: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  /** Lump labor / materials (in addition to line items). */
  laborAmount: string;
  materialAmount: string;
  includeTax: boolean;
  taxPercent: string;
  discountAmount: string;
  discountPercent: string;
  depositPaid: string;
  notes: string;
  terms: string;
  payments: InvoicePayment[];
  sentAt?: string;
  /** Future: hosted pay link, Stripe/Square, etc. */
  paymentLinkUrl?: string;
  paymentProvider?: "stripe" | "square" | "manual";
  externalPaymentId?: string;
  /** Future: recurring billing template id. */
  recurringScheduleId?: string;
  /** Future: import lines from material list. */
  materialListId?: string;
  /** Future: AI-generated line suggestions. */
  aiAssistMeta?: string;
};

export type InvoiceCustomization = {
  companyName: string;
  logoUri: string | null;
  phone: string;
  email: string;
  address: string;
  licenseNumber: string;
  accentColor: string;
  fontFamily: "system" | "bebas";
  defaultPaymentTerms: string;
  defaultNotes: string;
  footerText: string;
  showLogo: boolean;
  showLicense: boolean;
  showTaxLine: boolean;
  defaultTaxPercent: string;
  numberingPrefix: string;
};

export const DEFAULT_INVOICE_PAYMENT_TERMS =
  "Payments are due on receipt, unless other conditions have been agreed upon.";

export function resolveInvoicePaymentTerms(terms: string | undefined): string {
  const trimmed = (terms ?? "").trim();
  return trimmed || DEFAULT_INVOICE_PAYMENT_TERMS;
}

export const DEFAULT_INVOICE_CUSTOMIZATION: InvoiceCustomization = {
  companyName: "",
  logoUri: null,
  phone: "",
  email: "",
  address: "",
  licenseNumber: "",
  accentColor: "#2563eb",
  fontFamily: "system",
  defaultPaymentTerms: DEFAULT_INVOICE_PAYMENT_TERMS,
  defaultNotes: "",
  footerText: "Thank you for your business.",
  showLogo: true,
  showLicense: true,
  showTaxLine: true,
  defaultTaxPercent: "",
  numberingPrefix: "IES-",
};
