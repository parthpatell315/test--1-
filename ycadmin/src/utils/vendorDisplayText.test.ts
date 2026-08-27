import { describe, expect, it } from "vitest";
import {
  extractBillReference,
  formatHotelPricingSummary,
  formatVendorService,
  looksLikeJsonBlob,
  sanitizeDisplayText,
  sanitizePlainLabel,
} from "./vendorDisplayText";

const HOTEL_PRICING = {
  __isHotelPricing: true,
  pricingMethod: "room-wise",
  rates: { doubleRate: 1850, tripleRate: 2400, quadRate: 0 },
  allocations: { doubleRoomsCount: 2, tripleRoomsCount: 9, quadRoomsCount: 0, extraPersonsCount: 0 },
};

describe("looksLikeJsonBlob", () => {
  it("detects hotel pricing objects and stringified JSON", () => {
    expect(looksLikeJsonBlob(HOTEL_PRICING)).toBe(true);
    expect(looksLikeJsonBlob(JSON.stringify(HOTEL_PRICING))).toBe(true);
    expect(looksLikeJsonBlob('{"__isHotelPricing":true,"pricingMethod":"room-wise"}')).toBe(true);
    expect(looksLikeJsonBlob('ethod":"room-wise","rates":{"doubleRate":1850')).toBe(true);
  });

  it("allows ordinary labels and calc strings", () => {
    expect(looksLikeJsonBlob("Hotel Ridge")).toBe(false);
    expect(looksLikeJsonBlob("2 × 1850 = 3700")).toBe(false);
    expect(looksLikeJsonBlob("BILL-AB12CD")).toBe(false);
  });
});

describe("formatHotelPricingSummary", () => {
  it("formats room-wise allocations as Room-wise · 2 D / 9 T", () => {
    expect(formatHotelPricingSummary(HOTEL_PRICING)).toBe("Room-wise · 2 D / 9 T");
    expect(formatHotelPricingSummary(JSON.stringify(HOTEL_PRICING))).toBe("Room-wise · 2 D / 9 T");
  });
});

describe("sanitizeDisplayText", () => {
  it("never returns raw JSON or curly-brace blobs", () => {
    expect(sanitizeDisplayText(JSON.stringify(HOTEL_PRICING))).toBe("Room-wise · 2 D / 9 T");
    expect(sanitizeDisplayText('{"foo":1}', "Hotel stay")).toBe("Hotel stay");
    expect(sanitizeDisplayText('ethod":"room-wise","rates":{', "Hotel stay")).toBe("Hotel stay");
    expect(sanitizeDisplayText("Deluxe rooms")).toBe("Deluxe rooms");
  });
});

describe("extractBillReference", () => {
  it("keeps BILL-xxx and does not dump JSON", () => {
    expect(extractBillReference("BILL-9F3A21")).toBe("BILL-9F3A21");
    expect(extractBillReference(JSON.stringify(HOTEL_PRICING), "vp_abcdef")).toBe("BILL-abcdef");
    expect(extractBillReference(`Stay ${JSON.stringify(HOTEL_PRICING)} BILL-HX99`, "x")).toBe("BILL-HX99");
  });
});

describe("formatVendorService", () => {
  it("shows a hotel summary plus BILL-xxx without duplicating Hotels", () => {
    const result = formatVendorService({
      id: "vp_hotel1",
      vendorName: "Camp Site",
      category: "Hotels",
      serviceDescription: JSON.stringify(HOTEL_PRICING),
      billReference: JSON.stringify(HOTEL_PRICING),
    });
    expect(result.primary).toBe("Room-wise · 2 D · 9 T");
    expect(result.secondary).toBe("BILL-hotel1");
    expect(result.primary).not.toContain("{");
    expect(result.secondary).not.toContain("{");
    expect(result.primary).not.toBe("Hotels");
  });

  it("keeps calc strings for a one-line tooltip instead of replacing them with JSON", () => {
    const result = formatVendorService({
      vendorName: "Camp Site",
      category: "Hotels",
      serviceDescription: "2 D × ₹1,850 = ₹3,700",
      billReference: "BILL-CALC01",
    });
    expect(result.primary).toBe("2 D × ₹1,850 = ₹3,700");
    expect(result.secondary).toBe("BILL-CALC01");
  });

  it("sanitizes vendor and category fallbacks so JSON cannot leak into those columns", () => {
    expect(sanitizePlainLabel(JSON.stringify(HOTEL_PRICING), "Vendor")).toBe("Vendor");
    expect(sanitizePlainLabel("Hotels")).toBe("Hotels");
    const result = formatVendorService({
      vendorName: JSON.stringify(HOTEL_PRICING),
      category: '{"x":1}',
      serviceDescription: "Hotels",
      billReference: "BILL-ZZ1",
      id: "abc123xyz",
    });
    expect(result.primary).not.toContain("{");
    expect(result.secondary).toBe("BILL-ZZ1");
  });
});
