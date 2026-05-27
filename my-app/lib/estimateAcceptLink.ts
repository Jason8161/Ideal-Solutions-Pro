import * as Linking from "expo-linking";

/**
 * Public URL for customers to accept an estimate (opens your hosted page or deep link).
 * Optional: set EXPO_PUBLIC_ESTIMATE_ACCEPT_URL to e.g. https://your-site.com/estimate-accept
 * (page should forward to the app or record acceptance server-side).
 * If unset, uses an Expo deep link (works when the customer opens it on a device with this app build).
 */
export function buildEstimateCustomerAcceptUrl(estimateId: string, token: string): string {
  const base = process.env.EXPO_PUBLIC_ESTIMATE_ACCEPT_URL?.trim();
  if (base) {
    const u = new URL(base.replace(/\/+$/, ""));
    u.searchParams.set("estimateId", estimateId);
    u.searchParams.set("token", token);
    return u.toString();
  }
  return Linking.createURL("/estimates/customer-accept", {
    queryParams: { id: estimateId, t: token },
  });
}
