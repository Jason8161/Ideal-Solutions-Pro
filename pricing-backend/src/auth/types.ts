export type AppAccountRecord = {
  userId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  companyName: string;
  selectedTrialPlan: string | null;
  subscriptionTier: string;
  trialStartDate: string | null;
  aiRequestsUsed: number;
  storageUsed: number;
  createdAt: string;
  updatedAt: string;
};

export type AppAuthTokenRecord = {
  token: string;
  userId: string;
  expiresAt: string;
  persistSession: boolean;
  createdAt: string;
};

export type AppAuthJsonSnapshot = {
  accounts: AppAccountRecord[];
  tokens: AppAuthTokenRecord[];
  resetRequests: { email: string; requestedAt: string }[];
};
