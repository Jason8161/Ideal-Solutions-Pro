import type { PurchasesPackage, PurchasesStoreProduct } from "react-native-purchases";

export type PackageDisclosureInfo = {
  lengthLabel: string;
  priceLabel: string;
  freeTrialLabel: string | null;
};

function periodUnitLabel(unit: string | undefined, count: number): string {
  const normalized = (unit ?? "month").toLowerCase();
  const singular =
    normalized === "day"
      ? "day"
      : normalized === "week"
        ? "week"
        : normalized === "year"
          ? "year"
          : "month";
  const plural = count === 1 ? singular : `${singular}s`;
  return `${count} ${plural}`;
}

function subscriptionLengthLabel(product: PurchasesStoreProduct): string {
  const period = product.subscriptionPeriod as
    | { unit?: string; numberOfUnits?: number }
    | string
    | null
    | undefined;
  if (period && typeof period === "object" && period.unit && period.numberOfUnits) {
    const unit = periodUnitLabel(period.unit, period.numberOfUnits);
    if (period.unit.toLowerCase() === "month" && period.numberOfUnits === 1) return "1 month (monthly)";
    if (period.unit.toLowerCase() === "year" && period.numberOfUnits === 1) return "1 year (annual)";
    return unit;
  }
  if (typeof period === "string" && period.trim()) {
    return period.trim();
  }
  return "1 month (monthly)";
}

function formatIntroTrialLabel(product: PurchasesStoreProduct): string | null {
  const intro = product.introPrice;
  if (!intro) return null;

  const cycles = intro.cycles ?? intro.periodNumberOfUnits ?? 1;
  const unit = intro.periodUnit ?? "MONTH";
  const duration = periodUnitLabel(unit, cycles);

  const priceString = intro.priceString?.trim() ?? "";
  const isFree =
    intro.price === 0 ||
    priceString === "$0.00" ||
    priceString === "0" ||
    priceString.toLowerCase() === "free";

  if (isFree) {
    return `${duration} free trial`;
  }
  if (priceString) {
    return `${priceString} introductory offer for ${duration}`;
  }
  return `Introductory offer for ${duration}`;
}

export function packageDisclosureFromPackage(pkg: PurchasesPackage): PackageDisclosureInfo {
  const product = pkg.product;
  return {
    lengthLabel: subscriptionLengthLabel(product),
    priceLabel: product.priceString?.trim() || "",
    freeTrialLabel: formatIntroTrialLabel(product),
  };
}
