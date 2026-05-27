import type { PurchasesError } from "react-native-purchases";
import { PURCHASES_ERROR_CODE } from "react-native-purchases";

export function isPurchaseCancelledError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as PurchasesError;
  if (err.userCancelled === true) return true;
  return err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function purchasesErrorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (isPurchaseCancelledError(error)) {
    return "Purchase cancelled.";
  }
  if (error && typeof error === "object") {
    const err = error as PurchasesError;
    if (err.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
      return "Network error — check your connection and try again.";
    }
    if (err.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
      return "This plan is not available in the store yet. Try again later.";
    }
    if (err.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
      return "Purchases are not allowed on this device or account.";
    }
    if (err.code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
      return "The App Store or Google Play is having trouble. Try again shortly.";
    }
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
