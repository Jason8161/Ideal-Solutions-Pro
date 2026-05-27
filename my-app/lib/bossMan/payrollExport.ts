import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { PAY_TYPE_LABELS } from "@/lib/employees/types";
import type { PayrollSummary } from "@/lib/bossMan/timeTrackingTypes";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function payrollToCsv(summary: PayrollSummary): string {
  const lines = [
    ["Employee", "Pay type", "Rate", "Hours", "Regular", "OT", "Gross pay", "Entries"].map(escapeCsv).join(","),
  ];

  for (const row of summary.rows) {
    lines.push(
      [
        row.employeeName,
        PAY_TYPE_LABELS[row.payType],
        row.payRate > 0 ? String(row.payRate) : "",
        row.totalHours.toFixed(2),
        row.regularHours.toFixed(2),
        row.overtimeHours.toFixed(2),
        row.grossPay != null ? row.grossPay.toFixed(2) : row.grossPayNote ?? "",
        String(row.entryCount),
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  lines.push("");
  lines.push(["Period", summary.label].map(escapeCsv).join(","));
  lines.push(["Total hours", summary.totalHours.toFixed(2)].map(escapeCsv).join(","));
  if (summary.totalGross != null) {
    lines.push(["Total gross", summary.totalGross.toFixed(2)].map(escapeCsv).join(","));
  }

  return lines.join("\n");
}

export async function sharePayrollCsv(summary: PayrollSummary): Promise<void> {
  const base = cacheDirectory;
  if (!base) {
    Alert.alert("Export failed", "File storage is not available.");
    return;
  }
  const path = `${base}boss-payroll-${Date.now()}.csv`;
  await writeAsStringAsync(path, payrollToCsv(summary));
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("CSV ready", `Saved to ${path}`);
    return;
  }
  await Sharing.shareAsync(path, {
    mimeType: "text/csv",
    dialogTitle: "Export payroll CSV",
  });
}
