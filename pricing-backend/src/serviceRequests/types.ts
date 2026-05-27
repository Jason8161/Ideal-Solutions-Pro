export type ServiceRequestPriority = "normal" | "urgent" | "emergency";

export type ServiceRequestWorkflowStatus =
  | "new"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "canceled";

export type ServiceRequestPhoto = {
  id: string;
  mimeType: string;
  /** data URL or raw base64 payload */
  data: string;
  createdAt: string;
};

export type ServiceRequestRecord = {
  id: string;
  contractorToken: string;
  companyName: string;
  customerName: string;
  phone: string;
  email: string;
  serviceAddress: string;
  bestTimeToContact: string;
  description: string;
  priority: ServiceRequestPriority;
  photos: ServiceRequestPhoto[];
  workflowStatus: ServiceRequestWorkflowStatus;
  submittedAt: string;
  updatedAt: string;
  /** Reserved for future: booking, auto-reply, estimates, payments */
  future?: Record<string, unknown>;
};

export type PublicServiceRequestSubmitBody = {
  contractorToken: string;
  companyName?: string;
  customerName: string;
  phone: string;
  email: string;
  serviceAddress: string;
  bestTimeToContact?: string;
  description: string;
  priority: ServiceRequestPriority;
  photos?: { mimeType: string; data: string }[];
};
