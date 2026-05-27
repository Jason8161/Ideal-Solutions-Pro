export type PhotoEstimateConfidence = "low" | "medium" | "high";

export type PhotoEstimateLineItem = {
  description: string;
  amount: number;
};

export type PhotoEstimateAiResult = {
  jobName: string;
  customerName: string;
  scope: string;
  laborAmount: number;
  materialAmount: number;
  permitAmount: number;
  miscAmount: number;
  markupPercent: number;
  taxPercent: number;
  lineItems: PhotoEstimateLineItem[];
  notes: string;
  assumptions: string[];
  confidence: PhotoEstimateConfidence;
};

export type PhotoEstimateImagePayload = {
  base64: string;
  mimeType: string;
};

export type PhotoEstimateUserContext = {
  companyName?: string;
  trade?: string;
};

export type PhotoEstimateRequest = {
  images: PhotoEstimateImagePayload[];
  notes?: string;
  userContext?: PhotoEstimateUserContext;
};

export type PhotoEstimateResponse = {
  estimate: PhotoEstimateAiResult;
};
