import { normalizeMaterialsSearchInput } from "../dist/pricing/materialsSearchQuery.js";
import {
  computeLengthPricingAdjustment,
  shouldApplyLengthPricing,
} from "../dist/pricing/lengthBasedPricing.js";

const romex250 = {
  name: "14/2 NM-B copper wire 250 ft",
  description: "Non-metallic sheathed cable with ground",
  sku: "100456",
  unit: "250 ft",
  category: "wire",
  price: "138.98",
  supplier: "lowes",
};

const nailsBox = {
  name: "Framing nails 3 in 1 lb box",
  description: "Coated nails",
  sku: "NAIL-1LB",
  unit: "box",
  category: "fasteners",
  price: "12.99",
  supplier: "lowes",
};

const q = "1000' spool 14/2 romex";
const norm = normalizeMaterialsSearchInput(q, { qty: 1 });
const req = { length: norm.length, lengthUnit: norm.lengthUnit };

console.log("query", q, "-> length", norm.length);

console.log("romex shouldApplyLength", shouldApplyLengthPricing(romex250));
const romexAdj = computeLengthPricingAdjustment(romex250, req);
console.log("romex adjustment", romexAdj);

console.log("nails shouldApplyLength", shouldApplyLengthPricing(nailsBox));
const nailAdj = computeLengthPricingAdjustment(nailsBox, req);
console.log("nails adjustment", nailAdj);

if (!shouldApplyLengthPricing(romex250)) process.exitCode = 1;
if (shouldApplyLengthPricing(nailsBox)) process.exitCode = 1;
if (!romexAdj.lengthApplied || !romexAdj.lengthScaled) process.exitCode = 1;
if (nailAdj.lengthApplied) process.exitCode = 1;
if (Math.abs((romexAdj.adjustedUnitPrice ?? 0) - 138.98 * 4) > 0.02) process.exitCode = 1;
