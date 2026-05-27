import { parseNumericInput } from "@/lib/myCrewSettings";

export function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function lineAmount(quantity: string, rate: string): number {
  return parseNumericInput(quantity) * parseNumericInput(rate);
}

export function sumAmounts(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
