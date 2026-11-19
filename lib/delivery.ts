export type DeliveryCoverage =
  | "all_india"
  | "kerala_only"
  | "selected_states"
  | "custom_pincodes";

export type DeliveryScope = "all_orders" | "min_amount";

export type DeliverySettings = {
  // Free Delivery Control
  freeDeliveryEnabled: boolean;
  freeDeliveryScope: DeliveryScope;
  freeDeliveryMinAmount: number;

  // Delivery Coverage
  coverage: DeliveryCoverage;
  eligibleStates: string[];
  eligiblePincodes: string[];

  // Delivery Charges
  standardDeliveryCharge: number;
  enableRegionCharges: boolean;
  keralaDeliveryCharge: number;
  outsideKeralaDeliveryCharge: number;

  // Optional customized note for checkout
  customFreeDeliveryNote?: string;
};

export const ALL_INDIAN_STATES = [
  "Kerala",
  "Tamil Nadu",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Goa",
  "Punjab",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Haryana",
  "Bihar",
  "Odisha",
  "Madhya Pradesh",
  "Assam",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Uttarakhand",
  "Chhattisgarh",
  "Jharkhand",
  "Puducherry",
  "Chandigarh",
  "Tripura",
  "Meghalaya",
  "Manipur",
  "Nagaland",
  "Goa",
  "Arunachal Pradesh",
  "Mizoram",
  "Sikkim",
];

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  freeDeliveryEnabled: true,
  freeDeliveryScope: "min_amount",
  freeDeliveryMinAmount: 1499,
  coverage: "all_india",
  eligibleStates: [
    "Kerala",
    "Tamil Nadu",
    "Karnataka",
    "Andhra Pradesh",
    "Telangana",
    "Maharashtra",
    "Delhi",
  ],
  eligiblePincodes: [],
  standardDeliveryCharge: 79,
  enableRegionCharges: true,
  keralaDeliveryCharge: 0,
  outsideKeralaDeliveryCharge: 79,
  customFreeDeliveryNote: "",
};

export type DeliveryCalculationResult = {
  deliveryCharge: number;
  isFreeDelivery: boolean;
  isEligibleForFreeDelivery: boolean;
  qualifiesForFreeDelivery: boolean;
  amountNeededForFreeDelivery: number;
  freeDeliveryMessage: string;
  regionName: string;
};

/**
 * Calculates delivery charges strictly adhering to admin settings.
 * Supports:
 * - Free delivery disabled
 * - Free delivery on all orders
 * - Free delivery above custom threshold
 * - Kerala-only, Selected states, All-India, or Custom PIN code coverage
 * - Different charges for Kerala vs Other states / Standard charge
 */
export function calculateDeliveryCharge(
  settings: DeliverySettings | null | undefined,
  order: { subtotal: number; state?: string; pincode?: string }
): DeliveryCalculationResult {
  const cfg = settings || DEFAULT_DELIVERY_SETTINGS;
  const cleanState = (order.state || "").trim().toLowerCase();
  const cleanPin = (order.pincode || "").trim();
  const subtotal = Math.max(0, Number(order.subtotal) || 0);

  const isKerala =
    cleanState === "kerala" ||
    cleanState.includes("kerala") ||
    /^6[7-9]\d{4}$/.test(cleanPin);

  // 1. Determine standard base charge for this region
  let baseCharge = Math.max(0, Number(cfg.standardDeliveryCharge) || 0);
  if (cfg.enableRegionCharges) {
    if (isKerala) {
      baseCharge = Math.max(0, Number(cfg.keralaDeliveryCharge) || 0);
    } else {
      baseCharge = Math.max(0, Number(cfg.outsideKeralaDeliveryCharge) || 0);
    }
  }

  // 2. Determine if the destination is eligible for Free Delivery
  let isEligibleRegion = false;
  if (!cfg.freeDeliveryEnabled) {
    isEligibleRegion = false;
  } else if (cfg.coverage === "all_india") {
    isEligibleRegion = true;
  } else if (cfg.coverage === "kerala_only") {
    isEligibleRegion = isKerala;
  } else if (cfg.coverage === "selected_states") {
    const stateList = (cfg.eligibleStates || []).map((s) => s.trim().toLowerCase());
    isEligibleRegion =
      stateList.some((s) => cleanState === s || cleanState.includes(s)) ||
      (stateList.includes("kerala") && isKerala);
  } else if (cfg.coverage === "custom_pincodes") {
    const pinList = (cfg.eligiblePincodes || []).map((p) => p.trim());
    isEligibleRegion = pinList.some((p) => p && cleanPin.startsWith(p));
  }

  // 3. Determine if the order meets the free delivery threshold
  let qualifiesForFreeDelivery = false;
  let amountNeeded = 0;
  let freeDeliveryMessage = "";

  if (isEligibleRegion) {
    const minAmount =
      cfg.freeDeliveryScope === "all_orders"
        ? 0
        : Math.max(0, Number(cfg.freeDeliveryMinAmount) || 0);

    if (minAmount === 0 || subtotal >= minAmount) {
      qualifiesForFreeDelivery = true;
      freeDeliveryMessage = cfg.customFreeDeliveryNote || "Free Delivery Unlocked!";
    } else {
      amountNeeded = minAmount - subtotal;
      freeDeliveryMessage = `Add ₹${amountNeeded.toLocaleString("en-IN")} more to qualify for free delivery.`;
    }
  }

  const finalDeliveryCharge = qualifiesForFreeDelivery ? 0 : baseCharge;

  return {
    deliveryCharge: finalDeliveryCharge,
    isFreeDelivery: qualifiesForFreeDelivery,
    isEligibleForFreeDelivery: isEligibleRegion,
    qualifiesForFreeDelivery,
    amountNeededForFreeDelivery: amountNeeded,
    freeDeliveryMessage,
    regionName: isKerala ? "Kerala" : order.state || "Rest of India",
  };
}
