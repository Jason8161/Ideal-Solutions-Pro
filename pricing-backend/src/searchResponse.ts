import type { ProductWithPricing } from "./pricing/contracts";
import type { SupplierSearchError } from "./pricing/searchHelpers";

/** Standard JSON body for GET /search and /api/pricing/v1/search */
export type SearchApiResponse = {
  query: string;
  /** Requested pack length when `length` query param was sent. */
  length?: number;
  lengthUnit?: "ft" | "m";
  qty?: number;
  results: ProductWithPricing[];
  errors: SupplierSearchError[];
  /** Non-fatal hints (missing optional CSV, live API not available, etc.) — not supplier fetch failures. */
  warnings?: SupplierSearchError[];
};

export function sendSearchResponse(
  res: { status: (code: number) => { json: (body: SearchApiResponse) => void } },
  payload: SearchApiResponse,
): void {
  res.status(200).json(payload);
}
