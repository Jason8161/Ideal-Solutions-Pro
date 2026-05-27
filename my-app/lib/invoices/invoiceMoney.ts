import { parseNumericInput } from "@/lib/myCrewSettings";

/** Parse user money input to integer cents (rounded). */
export function parseMoneyToCents(value: string): number {
  const n = parseNumericInput(value);
  return Math.round(n * 100);
}

export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return centsToNumber(cents).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function lineTotalCents(quantity: string, unitPrice: string): number {
  const qty = parseNumericInput(quantity) || 1;
  const rate = parseNumericInput(unitPrice);
  return Math.round(qty * rate * 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
