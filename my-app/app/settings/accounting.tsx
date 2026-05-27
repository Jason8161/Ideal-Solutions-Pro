import { Link, Redirect, useLocalSearchParams, type Href } from "expo-router";

/**
 * Legacy route: home and older links used `/settings/accounting`.
 * Combined flow lives at `accounting-billing`.
 */
export default function AccountingRouteRedirect() {
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const suffix = pick === "1" ? "?pick=1" : "";
  return <Redirect href={`/settings/accounting-billing${suffix}` as Href} />;
}
