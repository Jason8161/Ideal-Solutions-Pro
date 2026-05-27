import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { buildPdfLogoHeaderHtml, resolvePdfLogoDataUri } from "@/lib/pdfCompanyLogo";

import { computeInvoiceTotals } from "./invoiceCalculations";
import { formatCents } from "./invoiceMoney";
import { loadInvoiceCustomization } from "./invoiceCustomizationStorage";
import type { BossInvoice } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function lineKindLabel(kind: string): string {
  if (kind === "labor") return "Labor";
  if (kind === "material") return "Material";
  return "Other";
}

export async function buildBossInvoiceHtml(invoice: BossInvoice): Promise<string> {
  const custom = await loadInvoiceCustomization();
  const totals = computeInvoiceTotals(invoice);
  const accent = custom.accentColor || "#2563eb";
  const font =
    custom.fontFamily === "bebas"
      ? "'Bebas Neue', Impact, sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const logoDataUri =
    custom.showLogo && custom.logoUri ? await resolvePdfLogoDataUri(custom.logoUri) : null;
  const logoHeader = buildPdfLogoHeaderHtml({
    logoDataUri,
    companyName: custom.companyName,
    showWhenNoLogo: custom.showLogo,
  });

  const rows = invoice.lineItems
    .map((row) => {
      const qty = row.quantity.trim() || "1";
      const rate = row.unitPrice.trim() || "0";
      const amt =
        (Number(qty.replace(/,/g, "")) || 0) * (Number(rate.replace(/,/g, "")) || 0);
      return `<tr>
        <td>${escapeHtml(row.description || lineKindLabel(row.kind))}</td>
        <td style="text-align:center">${escapeHtml(lineKindLabel(row.kind))}</td>
        <td style="text-align:right">${escapeHtml(qty)}</td>
        <td style="text-align:right">${escapeHtml(rate)}</td>
        <td style="text-align:right">${escapeHtml(formatCents(Math.round(amt * 100)))}</td>
      </tr>`;
    })
    .join("");

  const taxRow =
    custom.showTaxLine && invoice.includeTax && totals.taxCents > 0
      ? `<tr><td colspan="4" style="text-align:right;font-weight:600">Tax (${escapeHtml(invoice.taxPercent)}%)</td><td style="text-align:right">${escapeHtml(formatCents(totals.taxCents))}</td></tr>`
      : "";

  const discountRow =
    totals.discountCents > 0
      ? `<tr><td colspan="4" style="text-align:right">Discount</td><td style="text-align:right">-${escapeHtml(formatCents(totals.discountCents))}</td></tr>`
      : "";

  const depositRow =
    totals.depositCents > 0
      ? `<tr><td colspan="4" style="text-align:right">Deposit paid</td><td style="text-align:right">-${escapeHtml(formatCents(totals.depositCents))}</td></tr>`
      : "";

  const paymentsRows = invoice.payments
    .map(
      (p) =>
        `<tr><td colspan="4" style="text-align:right">Payment ${escapeHtml(formatDate(p.receivedAt))} (${escapeHtml(p.method)})</td><td style="text-align:right">-${escapeHtml(formatCents(p.amountCents))}</td></tr>`,
    )
    .join("");

  const licenseBlock =
    custom.showLicense && custom.licenseNumber.trim()
      ? `<div style="font-size:12px;color:#555;margin-top:8px">License: ${escapeHtml(custom.licenseNumber.trim())}</div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: ${font}; color: #111; padding: 32px; }
    h1 { margin: 0 0 4px; font-size: 28px; color: ${accent}; }
    .meta { color: #444; margin-bottom: 24px; }
    .cols { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
    .col { flex: 1; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; font-size: 14px; }
    th { text-align: left; background: #f5f7fb; font-size: 12px; text-transform: uppercase; color: #555; }
    .total { font-size: 18px; font-weight: 700; color: ${accent}; }
    .notes, .terms { margin-top: 16px; font-size: 14px; color: #333; white-space: pre-wrap; }
    .footer { margin-top: 28px; font-size: 13px; color: #555; text-align: center; }
    .balance { font-size: 20px; font-weight: 800; color: ${accent}; }
  </style>
</head>
<body>
  ${logoHeader}
  <h1>Invoice</h1>
  <div class="meta">${escapeHtml(invoice.invoiceNumber)} · Invoice date ${escapeHtml(formatDate(invoice.invoiceDate))} · Due ${escapeHtml(formatDate(invoice.dueDate))}</div>
  <div class="cols">
    <div class="col">
      <div class="label">From</div>
      <strong>${escapeHtml(custom.companyName || "Your company")}</strong><br/>
      ${escapeHtml(custom.address)}<br/>
      ${custom.phone ? `${escapeHtml(custom.phone)}<br/>` : ""}
      ${custom.email ? escapeHtml(custom.email) : ""}
      ${licenseBlock}
    </div>
    <div class="col">
      <div class="label">Bill to</div>
      <strong>${escapeHtml(invoice.customerName || "Customer")}</strong><br/>
      ${invoice.jobName ? `${escapeHtml(invoice.jobName)}<br/>` : ""}
      ${escapeHtml(invoice.jobAddress)}<br/>
      ${invoice.customerEmail ? `${escapeHtml(invoice.customerEmail)}<br/>` : ""}
      ${invoice.customerPhone ? escapeHtml(invoice.customerPhone) : ""}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Type</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5">No line items</td></tr>`}
    </tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right">Subtotal</td><td style="text-align:right">${escapeHtml(formatCents(totals.subtotalCents))}</td></tr>
      ${discountRow}
      ${taxRow}
      <tr><td colspan="4" style="text-align:right" class="total">Total</td><td style="text-align:right" class="total">${escapeHtml(formatCents(totals.totalCents))}</td></tr>
      ${depositRow}
      ${paymentsRows}
      <tr><td colspan="4" style="text-align:right" class="balance">Balance due</td><td style="text-align:right" class="balance">${escapeHtml(formatCents(totals.balanceCents))}</td></tr>
    </tfoot>
  </table>
  ${invoice.terms.trim() ? `<div class="terms"><div class="label">Terms</div>${escapeHtml(invoice.terms.trim())}</div>` : ""}
  ${invoice.notes.trim() ? `<div class="notes"><div class="label">Charge details</div>${escapeHtml(invoice.notes.trim())}</div>` : ""}
  ${custom.footerText.trim() ? `<div class="footer">${escapeHtml(custom.footerText.trim())}</div>` : ""}
</body>
</html>`;
}

export async function generateBossInvoicePdfUri(invoice: BossInvoice): Promise<string> {
  const html = await buildBossInvoiceHtml(invoice);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function shareBossInvoicePdf(invoice: BossInvoice): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  const uri = await generateBossInvoicePdfUri(invoice);
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: `Invoice ${invoice.invoiceNumber}`,
  });
}

export function buildBossInvoiceShareText(invoice: BossInvoice): string {
  const totals = computeInvoiceTotals(invoice);
  const lines = [
    `Invoice ${invoice.invoiceNumber}`,
    invoice.customerName ? `Customer: ${invoice.customerName}` : "",
    invoice.jobName ? `Job: ${invoice.jobName}` : "",
    `Total: ${formatCents(totals.totalCents)}`,
    `Balance due: ${formatCents(totals.balanceCents)}`,
    invoice.dueDate ? `Due: ${invoice.dueDate}` : "",
    invoice.notes.trim() ? `Details: ${invoice.notes.trim()}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
