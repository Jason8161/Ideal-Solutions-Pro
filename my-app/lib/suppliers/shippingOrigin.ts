import * as Location from "expo-location";

import { lookupZipCentroid } from "@/lib/suppliers/zipCentroid";
import type { Coords } from "@/lib/suppliers/types";
import { composeFullAddress, type CompanyProfile } from "@/lib/profileStorage";

export type ShippingAddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
  label: string;
  complete: boolean;
};

export function getShippingAddressParts(profile: CompanyProfile): ShippingAddressParts {
  const useCompany = profile.shippingSame;
  const street = (useCompany ? profile.companyStreet : profile.shippingStreet).trim();
  const city = (useCompany ? profile.companyCity : profile.shippingCity).trim();
  const state = (useCompany ? profile.companyState : profile.shippingState).trim();
  const zip = (useCompany ? profile.companyZip : profile.shippingZip).trim();
  const fullAddress = composeFullAddress(street, city, state, zip);
  const complete = street.length > 0 && city.length > 0 && state.length > 0 && zip.length > 0;
  const label = fullAddress || (useCompany ? "Company address" : "Shipping address");
  return { street, city, state, zip, fullAddress, label, complete };
}

export type ShippingOriginResult =
  | {
      status: "ok";
      coords: Coords;
      label: string;
      approximate: boolean;
    }
  | {
      status: "missing";
      message: string;
    };

function storedCoords(profile: CompanyProfile): Coords | null {
  const lat = profile.shippingLatitude;
  const lng = profile.shippingLongitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

/** Resolve search origin from profile (stored coords → geocode → zip centroid). */
export async function resolveShippingOrigin(profile: CompanyProfile): Promise<ShippingOriginResult> {
  const parts = getShippingAddressParts(profile);
  if (!parts.complete) {
    return {
      status: "missing",
      message:
        "Add your shipping address under Settings → User info (street, city, state, and ZIP). If it matches your company address, turn on “same as company address” and complete the company fields.",
    };
  }

  const saved = storedCoords(profile);
  if (saved) {
    return { status: "ok", coords: saved, label: parts.label, approximate: false };
  }

  try {
    const results = await Location.geocodeAsync(parts.fullAddress);
    const first = results[0];
    if (first && Number.isFinite(first.latitude) && Number.isFinite(first.longitude)) {
      return {
        status: "ok",
        coords: { latitude: first.latitude, longitude: first.longitude },
        label: parts.label,
        approximate: false,
      };
    }
  } catch {
    // fall through to zip centroid
  }

  const centroid = lookupZipCentroid(parts.zip, parts.state);
  if (centroid) {
    return { status: "ok", coords: centroid, label: parts.label, approximate: true };
  }

  return {
    status: "missing",
    message: "Could not locate your shipping address. Open User info, save your address again, or check city/state/ZIP.",
  };
}
