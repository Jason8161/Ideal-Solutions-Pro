import { defaultUserProfile } from "@/lib/auth/userProfileStorage";

/** Stable App Store review credentials ΓÇö also seeded on pricing-backend (`npm run seed:app-review-demo`). */
export const APP_REVIEW_DEMO_EMAIL = "appstore.review@idealsolutions.demo";
export const APP_REVIEW_DEMO_PASSWORD = "ReviewDemo1";

const APP_REVIEW_DEMO_USER_ID = "app_review_demo_local_v1";

/** Offline demo profile when cloud auth is unavailable (production builds without API URL). */
export function buildAppReviewDemoProfile() {
  return defaultUserProfile({
    userId: APP_REVIEW_DEMO_USER_ID,
    email: APP_REVIEW_DEMO_EMAIL,
    fullName: "App Store Reviewer",
    companyName: "Ideal Solutions Demo Co",
    companyId: "app_review_demo_company",
    roleId: "owner",
    selectedTrialPlan: "boss_man",
    subscriptionTier: "boss_man",
    trialStartDate: new Date().toISOString(),
    aiRequestsUsed: 0,
    storageUsed: 0,
  });
}

export function isAppReviewDemoLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === APP_REVIEW_DEMO_EMAIL.toLowerCase() &&
    password.trim() === APP_REVIEW_DEMO_PASSWORD
  );
}
