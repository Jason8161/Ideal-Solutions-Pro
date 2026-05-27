import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { money } from "@/lib/accountingMoney";
import { buildEstimateCustomerAcceptUrl } from "@/lib/estimateAcceptLink";
import { computeEstimateTotals, type EstimateLineItem, type EstimateRecord } from "@/lib/estimateStorage";
import { buildPdfLogoHeaderHtml, resolvePdfLogoDataUri } from "@/lib/pdfCompanyLogo";
import { composeFullAddress, companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";

export type InvoiceDocumentKind = "invoice" | "estimate";

export type InvoicePayload = {
  kind: InvoiceDocumentKind;
  title: string;
  invoiceNumber: string;
  dateIso: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  logoUri: string | null;
  customerName: string;
  customerCompany: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;
  lineItems: EstimateLineItem[];
  includeTax: boolean;
  taxPercent: string;
  notes: string;
  jobScope: string;
  /** Shown on estimate PDFs only — deep link or hosted accept URL. */
  customerAcceptUrl?: string;
};

function kindLabel(kind: InvoiceDocumentKind): string {
  return kind === "invoice" ? "Invoice" : "Estimate";
}

function lineKindLabel(kind: EstimateLineItem["kind"]): string {
  if (kind === "labor") return "Labor";
  if (kind === "material") return "Material";
  return "Other";
}

function buildHtml(payload: InvoicePayload, logoDataUri: string | null): string {
  const totals = computeEstimateTotals({
    lineItems: payload.lineItems,
    includeTax: payload.includeTax,
    taxPercent: payload.taxPercent,
  });
  const date = new Date(payload.dateIso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const logoHeader = buildPdfLogoHeaderHtml({
    logoDataUri,
    companyName: payload.companyName,
  });
  const rows = payload.lineItems
    .map((row) => {
      const qty = row.quantity.trim() || "1";
      const rate = row.rate.trim() || "0";
      const amt = (Number(qty.replace(/,/g, "")) || 0) * (Number(rate.replace(/,/g, "")) || 0);
      return `<tr>
        <td>${escapeHtml(row.description || lineKindLabel(row.kind))}</td>
        <td style="text-align:center">${escapeHtml(lineKindLabel(row.kind))}</td>
        <td style="text-align:right">${escapeHtml(qty)}</td>
        <td style="text-align:right">${escapeHtml(money(Number(rate.replace(/,/g, "")) || 0))}</td>
        <td style="text-align:right">${escapeHtml(money(amt))}</td>
      </tr>`;
    })
    .join("");

  const taxRow =
    payload.includeTax && totals.tax > 0
      ? `<tr><td colspan="4" style="text-align:right;font-weight:600">Tax (${escapeHtml(payload.taxPercent)}%)</td><td style="text-align:right">${escapeHtml(money(totals.tax))}</td></tr>`
      : "";

  const acceptBlock =
    payload.kind === "estimate" && payload.customerAcceptUrl
      ? `<div style="margin-top:28px;padding:20px;border:1px solid #ddd;border-radius:12px;background:#f8fafc;text-align:center">
    <div style="font-size:14px;font-weight:700;margin-bottom:10px;color:#111">Accept this estimate</div>
    <div style="font-size:13px;color:#444;margin-bottom:16px;line-height:1.5">Use the button below to accept this estimate and move your job into scheduling.</div>
    <a href="${escapeHtml(payload.customerAcceptUrl)}" style="display:inline-block;padding:14px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">Accept estimate</a>
  </div>`
      : "";

  const scopeBlock =
    payload.jobScope.trim().length > 0
      ? `<div class="scope"><div class="label">Job scope</div><div class="scopeBody">${escapeHtml(payload.jobScope.trim())}</div></div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 32px; }
    h1 { margin: 0 0 4px; font-size: 28px; }
    .meta { color: #444; margin-bottom: 24px; }
    .cols { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
    .col { flex: 1; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; font-size: 14px; }
    th { text-align: left; background: #f5f7fb; font-size: 12px; text-transform: uppercase; color: #555; }
    .total { font-size: 18px; font-weight: 700; }
    .notes { margin-top: 24px; font-size: 14px; color: #333; white-space: pre-wrap; }
    .scope { margin-top: 20px; margin-bottom: 8px; padding: 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .scopeBody { font-size: 14px; color: #222; line-height: 1.5; white-space: pre-wrap; margin-top: 6px; }
  </style>
</head>
<body>
  ${logoHeader}
  <h1>${escapeHtml(kindLabel(payload.kind))}</h1>
  <div class="meta">${escapeHtml(payload.invoiceNumber)} · ${escapeHtml(date)}</div>
  <div class="cols">
    <div class="col">
      <div class="label">From</div>
      <strong>${escapeHtml(payload.companyName || "Your company")}</strong><br/>
      ${escapeHtml(payload.companyAddress)}<br/>
      ${payload.companyPhone ? `${escapeHtml(payload.companyPhone)}<br/>` : ""}
      ${payload.companyEmail ? escapeHtml(payload.companyEmail) : ""}
    </div>
    <div class="col">
      <div class="label">Bill to</div>
      <strong>${escapeHtml(payload.customerName || "Customer")}</strong><br/>
      ${payload.customerCompany ? `${escapeHtml(payload.customerCompany)}<br/>` : ""}
      ${escapeHtml(payload.customerAddress)}<br/>
      ${payload.customerEmail ? `${escapeHtml(payload.customerEmail)}<br/>` : ""}
      ${payload.customerPhone ? escapeHtml(payload.customerPhone) : ""}
    </div>
  </div>
  ${scopeBlock}
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Type</th>
        <th style="text-align:right">Qty / Hrs</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5">No line items</td></tr>`}
    </tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right">Subtotal</td><td style="text-align:right">${escapeHtml(money(totals.subtotal))}</td></tr>
      ${taxRow}
      <tr><td colspan="4" style="text-align:right" class="total">Total</td><td style="text-align:right" class="total">${escapeHtml(money(totals.total))}</td></tr>
    </tfoot>
  </table>
  ${payload.notes.trim() ? `<div class="notes"><div class="label">Notes</div>${escapeHtml(payload.notes.trim())}</div>` : ""}
  ${acceptBlock}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function invoicePayloadFromEstimate(
  record: EstimateRecord,
  kind: InvoiceDocumentKind = "invoice",
): Promise<InvoicePayload> {
  const stored = await loadCompanyProfile();
  const profile = companyProfileFromPartial(stored);
  const companyAddress =
    profile.companyAddress.trim() ||
    composeFullAddress(profile.companyStreet, profile.companyCity, profile.companyState, profile.companyZip);
  const customerAddress = composeFullAddress(
    record.customer.street,
    record.customer.city,
    record.customer.state,
    record.customer.zip,
  );
  const customerAcceptUrl =
    kind === "estimate" && record.id.trim()
      ? buildEstimateCustomerAcceptUrl(record.id, record.customerAcceptToken)
      : undefined;
  return {
    kind,
    title: kindLabel(kind),
    invoiceNumber: record.invoiceNumber,
    dateIso: record.updatedAt,
    companyName: profile.companyName,
    companyAddress,
    companyPhone: profile.phoneNumber,
    companyEmail: profile.supportEmail,
    logoUri: profile.logoUri,
    customerName: record.customer.customerName,
    customerCompany: record.customer.company,
    customerAddress,
    customerEmail: record.customer.email,
    customerPhone: record.customer.phone,
    lineItems: record.lineItems,
    includeTax: record.includeTax,
    taxPercent: record.taxPercent,
    notes: record.notes,
    jobScope: record.jobScope,
    customerAcceptUrl,
  };
}

export async function generatePdfUri(payload: InvoicePayload): Promise<string> {
  const logoDataUri = await resolvePdfLogoDataUri(payload.logoUri);
  const html = buildHtml(payload, logoDataUri);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePdf(uri: string, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle,
  });
}

export async function generateAndSharePdf(payload: InvoicePayload): Promise<void> {
  const uri = await generatePdfUri(payload);
  const label = kindLabel(payload.kind);
  await sharePdf(uri, `${label} ${payload.invoiceNumber}`);
}
