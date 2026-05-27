import { Linking } from "react-native";

import { buildEstimateCustomerAcceptUrl } from "@/lib/estimateAcceptLink";
import type { EstimateRecord } from "@/lib/estimateStorage";
import { computeEstimateTotals, estimateTitle } from "@/lib/estimateStorage";
import { money } from "@/lib/accountingMoney";

/** Opens mailto: with a text summary; attach the PDF separately if needed. The in-app “Email … PDF to customer” actions share the PDF that already includes Job scope. */
export async function composeEstimateCustomerEmail(record: EstimateRecord): Promise<boolean> {
  const to = record.customer.email.trim();
  if (!to) {
    return false;
  }
  const title = estimateTitle(record);
  const totals = computeEstimateTotals(record);
  const acceptUrl = buildEstimateCustomerAcceptUrl(record.id, record.customerAcceptToken);
  const scopeLines =
    record.jobScope.trim().length > 0
      ? ["────────", "JOB SCOPE", "────────", record.jobScope.trim(), ""]
      : ["Job scope: (not entered in the app — see the PDF you attach for the full scope and line items.)", ""];
  const bodyLines = [
    `Hi ${record.customer.customerName.trim() || "there"},`,
    "",
    `Please review your estimate (${record.invoiceNumber}) — total ${money(totals.total)}.`,
    "",
    ...scopeLines,
    "Attach the estimate PDF from Ideal Solutions Pro so you can see job scope, line items, and totals in one document.",
    "",
    "To accept this estimate and move your job into scheduling, use the button in that PDF, or open this link:",
    acceptUrl,
    "",
    "If the link does not open, reply to this email and we will confirm manually.",
    "",
    "Thank you,",
  ];
  const subject = encodeURIComponent(`Estimate ${record.invoiceNumber} — ${title}`);
  const body = encodeURIComponent(bodyLines.join("\n"));
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  try {
    await Linking.openURL(mailto);
    return true;
  } catch {
    return false;
  }
}
