import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { escapeCsvCell, lineAmount, money } from "@/lib/accountingMoney";
import { displayAccountingAppSelection, loadAccountingAppSelection } from "@/lib/accountingAppStorage";
import {
  computeEstimateTotals,
  type EstimateLineItem,
  type EstimateRecord,
  estimateTitle,
} from "@/lib/estimateStorage";
import { serviceCallTitle, type ServiceCallRecord } from "@/lib/serviceCallStorage";

export type ExportRow = {
  date: string;
  customer: string;
  item: string;
  qty: string;
  rate: string;
  amount: string;
  memo: string;
};

const CSV_HEADER = ["Date", "Customer", "Item", "Qty", "Rate", "Amount", "Memo"];

function formatExportDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function lineKindItemLabel(kind: EstimateLineItem["kind"]): string {
  if (kind === "labor") return "Labor";
  if (kind === "material") return "Materials";
  return "Other";
}

export function estimateToExportRows(record: EstimateRecord): ExportRow[] {
  const date = formatExportDate(record.updatedAt);
  const customer = estimateTitle(record);
  const memoBase = record.invoiceNumber ? `Invoice ${record.invoiceNumber}` : "Estimate";
  const rows: ExportRow[] = record.lineItems.map((line) => {
    const qty = line.quantity.trim() || "1";
    const rate = line.rate.trim() || "0";
    const amt = lineAmount(line.quantity, line.rate);
    return {
      date,
      customer,
      item: line.description.trim() || lineKindItemLabel(line.kind),
      qty,
      rate,
      amount: amt.toFixed(2),
      memo: memoBase,
    };
  });
  const totals = computeEstimateTotals(record);
  if (record.includeTax && totals.tax > 0) {
    rows.push({
      date,
      customer,
      item: `Sales tax (${record.taxPercent}%)`,
      qty: "1",
      rate: totals.tax.toFixed(2),
      amount: totals.tax.toFixed(2),
      memo: memoBase,
    });
  }
  return rows;
}

export function serviceCallJobCostToExportRows(record: ServiceCallRecord): ExportRow[] {
  const date = formatExportDate(record.completion?.completedAt ?? record.createdAt);
  const customer = serviceCallTitle(record);
  const memo = `Service call ${record.id.slice(0, 8)}`;
  const rows: ExportRow[] = [];
  const jobCost = record.jobCost;
  if (!jobCost) return rows;

  if (jobCost.useManualMaterialTotal) {
    const amt = jobCost.manualMaterialTotal.trim() || "0";
    rows.push({
      date,
      customer,
      item: "Materials (total)",
      qty: "1",
      rate: amt,
      amount: amt,
      memo,
    });
  } else {
    for (const line of jobCost.materialLines) {
      const amt = line.amount.trim() || "0";
      rows.push({
        date,
        customer,
        item: line.description.trim() || "Material",
        qty: "1",
        rate: amt,
        amount: amt,
        memo,
      });
    }
  }

  for (const line of jobCost.laborLines) {
    const hours = line.hours.trim() || "0";
    const rate = line.ratePerHour.trim() || "0";
    const amt = lineAmount(line.hours, line.ratePerHour);
    rows.push({
      date,
      customer,
      item: `Labor (${line.role})`,
      qty: hours,
      rate,
      amount: amt.toFixed(2),
      memo,
    });
  }

  return rows;
}

export function rowsToCsv(rows: ExportRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.customer,
        row.item,
        row.qty,
        row.rate,
        row.amount,
        row.memo,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function exportFilename(prefix: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}.csv`;
}

export async function accountingExportSubtitle(): Promise<string> {
  const selection = await loadAccountingAppSelection();
  const label = displayAccountingAppSelection(selection);
  if (!selection || selection.selectedAccountingAppId === "none") {
    return "CSV export for QuickBooks, Xero, and other apps";
  }
  return `CSV formatted for ${label} — OAuth connect coming soon`;
}

export async function shareCsvExport(csv: string, filename: string, dialogTitle: string): Promise<void> {
  const dir = cacheDirectory;
  if (!dir) throw new Error("File storage is not available.");
  const uri = `${dir}${filename}`;
  await writeAsStringAsync(uri, csv);
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle,
  });
}

export function exportSummaryLabel(rowCount: number, totalAmount: number): string {
  return `${rowCount} line${rowCount === 1 ? "" : "s"} · ${money(totalAmount)}`;
}

export function totalFromExportRows(rows: ExportRow[]): number {
  return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
}
