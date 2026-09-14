import { describe, expect, it } from "vitest";
import { evaluateWebsiteWithGroq } from "@/lib/ai/groq-evaluator";

describe("Groq AI Website Evaluator & Heuristic Engine", () => {
  it("evaluates generic corporate template with a low conversion score", async () => {
    const result = await evaluateWebsiteWithGroq({
      businessName: "Generic Health Solutions",
      category: "Dental & Healthcare Clinic",
      city: "Kolkata",
      copyText: "Welcome to our clinic. We provide best services with high quality and dedicated team. Submit inquiry.",
    });

    expect(result.totalScore).toBeLessThanOrEqual(65);
    expect(result.pillars).toBeDefined();
    expect(result.pillars.valueProposition.score).toBeLessThanOrEqual(14);
    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.missingTrustSignals.length).toBeGreaterThan(0);
    expect(result.headlineRewrite.proposed).toBeTruthy();
    expect(result.ctaRewrite.proposed).toBeTruthy();
    expect(result.detailedCopyReport).toContain("### Brand Alignment & CRO Audit: Generic Health Solutions");
  });

  it("evaluates authentic trade copy with high craft score", async () => {
    const result = await evaluateWebsiteWithGroq({
      businessName: "The Manor Residences",
      category: "Luxury Residential Real Estate",
      city: "Ballygunge, Kolkata",
      copyText:
        "The Manor: 3 & 4 BHK bespoke apartments in Ballygunge. WBRERA/P/KOL/2024/000842. Starting ₹3.85 Cr onwards. Direct developer desk on WhatsApp for instant floorplan & private viewing.",
    });

    expect(result.totalScore).toBeGreaterThanOrEqual(75);
    expect(result.keyStrengths.length).toBeGreaterThan(0);
    expect(result.pillars.pricingTransparency.score).toBeGreaterThanOrEqual(14);
    expect(result.pillars.trustSignals.score).toBeGreaterThanOrEqual(14);
  });

  it("produces a complete markdown report with all 5 pillars", async () => {
    const result = await evaluateWebsiteWithGroq({
      businessName: "Apex Law Academy",
      category: "UPSC & Competitive Exam Coaching",
      city: "Delhi",
      copyText: "Premier UPSC judiciary foundation batch starting July 15. WhatsApp admissions desk.",
    });

    expect(result.detailedCopyReport).toContain("1. **Value Proposition & Clarity:**");
    expect(result.detailedCopyReport).toContain("2. **Industry Alignment & Authenticity:**");
    expect(result.detailedCopyReport).toContain("3. **Trust Signals & Contact Friction:**");
    expect(result.detailedCopyReport).toContain("4. **Pricing Transparency & Intent:**");
    expect(result.detailedCopyReport).toContain("5. **Mobile Readiness & Actionability:**");
    expect(result.detailedCopyReport).toContain("#### Copy Rewrites");
  });
});
