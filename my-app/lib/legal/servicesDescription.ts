const DEFAULT_PRODUCT_NAME = "Ideal Solutions Pro";

export const SERVICES_DESCRIPTION_VERSION = "2026-05-24";

function productLabel(companyName?: string): string {
  const trimmed = companyName?.trim();
  return trimmed ? `${trimmed} (${DEFAULT_PRODUCT_NAME})` : DEFAULT_PRODUCT_NAME;
}

/**
 * Services Description disclosure — bump {@link SERVICES_DESCRIPTION_VERSION} when content changes.
 */
export function getServicesDescriptionText(companyName?: string): string {
  const proName = productLabel(companyName);

  return `Updated Services Description

${proName} provides contractor workforce management tools including:

• Employee management
• Dispatch and scheduling
• Workforce communication
• Job management
• Document storage
• AI operational tools
• Mobile workforce tracking

Features may change without notice. When we materially update what the app provides, you may be asked to review and acknowledge an updated Services Description before continuing.`.trim();
}
