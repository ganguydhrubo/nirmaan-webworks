import { describe, expect, it } from "vitest";
import { enquirySchema, normalizeIndianPhone } from "@/lib/validation";

describe("normalizeIndianPhone", () => {
  it("accepts a bare 10-digit mobile number", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
  });
  it("accepts +91 prefix", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
  });
  it("accepts 91 prefix without plus", () => {
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
  });
  it("accepts leading 0 (STD-style dialing habit)", () => {
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
  });
  it("rejects numbers not starting with 6-9", () => {
    expect(normalizeIndianPhone("5876543210")).toBeNull();
  });
  it("rejects too few digits", () => {
    expect(normalizeIndianPhone("98765")).toBeNull();
  });
  it("rejects landline-style numbers", () => {
    expect(normalizeIndianPhone("01412345678")).toBeNull();
  });
});

const baseValid = {
  name: "Rakesh Sharma",
  phone: "9876543210",
  email: "",
  businessName: "Sharma Sweets",
  category: "restaurant",
  needs: "new-website",
  message: "Need a menu page and WhatsApp ordering",
  consent: "on",
  honeypot: "",
  formRenderedAt: String(Date.now() - 5000),
  turnstileToken: "dummy-token",
};

describe("enquirySchema", () => {
  it("accepts a valid submission", () => {
    const result = enquirySchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("rejects when consent is not checked", () => {
    const result = enquirySchema.safeParse({ ...baseValid, consent: "false" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const result = enquirySchema.safeParse({ ...baseValid, phone: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects a URL in the message field", () => {
    const result = enquirySchema.safeParse({ ...baseValid, message: "check http://spam.example" });
    expect(result.success).toBe(false);
  });

  it("rejects a URL in the name field", () => {
    const result = enquirySchema.safeParse({ ...baseValid, name: "www.spam.example" });
    expect(result.success).toBe(false);
  });

  it("rejects a spam phrase in the message", () => {
    const result = enquirySchema.safeParse({ ...baseValid, message: "we offer backlink packages" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown 'needs' value", () => {
    const result = enquirySchema.safeParse({ ...baseValid, needs: "world-domination" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email when supplied", () => {
    const result = enquirySchema.safeParse({ ...baseValid, email: "rakesh@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = enquirySchema.safeParse({ ...baseValid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("trims and normalizes the phone number in the parsed output", () => {
    const result = enquirySchema.safeParse({ ...baseValid, phone: "+91 98765 43210" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("+919876543210");
  });
});
