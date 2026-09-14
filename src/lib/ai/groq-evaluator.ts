export interface EvaluationPillar {
  name: string;
  score: number; // 0 to 20
  maxScore: number; // 20
  assessment: string;
  recommendation: string;
}

export interface EvaluationResult {
  businessName: string;
  category: string;
  totalScore: number; // 0 to 100
  tier: "Craft Masterpiece" | "Solid & Functional" | "Generic / Moderate Risk" | "High Conversion Risk";
  tierColor: string; // hex or tailwind class
  summary: string;
  pillars: {
    valueProposition: EvaluationPillar;
    industryAlignment: EvaluationPillar;
    trustSignals: EvaluationPillar;
    pricingTransparency: EvaluationPillar;
    mobileActionability: EvaluationPillar;
  };
  keyStrengths: string[];
  redFlags: string[];
  headlineRewrite: {
    current: string;
    proposed: string;
    rationale: string;
  };
  ctaRewrite: {
    current: string;
    proposed: string;
    rationale: string;
  };
  missingTrustSignals: string[];
  detailedCopyReport: string;
  evaluatedVia: "groq-gpt-oss-120b" | "deterministic-heuristic";
}

export interface EvaluationInput {
  businessName: string;
  category: string;
  city?: string;
  websiteUrl?: string;
  copyText: string;
  groqApiKey?: string;
}

export async function evaluateWebsiteWithGroq(input: EvaluationInput): Promise<EvaluationResult> {
  const apiKey = input.groqApiKey || process.env.GROQ_API_KEY;

  if (!apiKey) {
    return evaluateWithHeuristics(input);
  }

  try {
    const prompt = `You are a world-class conversion rate optimization (CRO) engineer, design auditor, and copywriter specializing in Indian MSME and local service businesses.
You evaluate whether a business website accurately reflects the craft, identity, and trustworthiness of the business, or if it looks like generic AI slop / low-trust templates.

Business Context:
- Name: "${input.businessName}"
- Industry / Category: "${input.category}"
- City / Region: "${input.city || 'India'}"
- Provided Website Copy / URL:
"""
${input.copyText || input.websiteUrl}
"""

Evaluate this business across 5 strict pillars (each 0 to 20 points, sum = 100):
1. Value Proposition & Clarity (0-20): Can a first-time visitor understand exactly what is offered and who it is for within 3 seconds? Is it specific or vague?
2. Industry Alignment & Authenticity (0-20): Does the terminology, tone, and imagery reflect genuine craft in this trade (e.g. dental, coaching, real estate, fine dining), or does it read like a copy-pasted corporate template?
3. Trust Signals & Friction (0-20): Are there local trust signals? (WhatsApp click-to-chat, explicit local phone, exact physical address/NAP, owner credentials, licensing/RERA, real verified testimonials)?
4. Pricing Transparency & Buying Intent (0-20): Does the site publish clear starting prices/INR bands or honest scoping, or does it hide everything behind high-friction "Request a consultation" forms?
5. Mobile Readiness & Actionability (0-20): Is there a single, prominent, low-friction primary CTA (e.g. WhatsApp, direct booking)? Is copy crisp and punchy without rambling fluff?

Return ONLY valid JSON matching this exact structure:
{
  "totalScore": 72,
  "tier": "Solid & Functional",
  "summary": "Concise 2-sentence executive summary of the site's brand alignment.",
  "pillars": {
    "valueProposition": {
      "name": "Value Proposition & Clarity",
      "score": 14,
      "maxScore": 20,
      "assessment": "Detailed assessment of value proposition.",
      "recommendation": "Concrete fix."
    },
    "industryAlignment": {
      "name": "Industry Alignment & Authenticity",
      "score": 15,
      "maxScore": 20,
      "assessment": "Detailed assessment of authentic trade representation.",
      "recommendation": "Concrete fix."
    },
    "trustSignals": {
      "name": "Trust Signals & Contact Friction",
      "score": 13,
      "maxScore": 20,
      "assessment": "Assessment of local trust anchors and response commitments.",
      "recommendation": "Concrete fix."
    },
    "pricingTransparency": {
      "name": "Pricing Transparency & Intent",
      "score": 12,
      "maxScore": 20,
      "assessment": "Assessment of price visibility and scope packaging.",
      "recommendation": "Concrete fix."
    },
    "mobileActionability": {
      "name": "Mobile Readiness & Actionability",
      "score": 18,
      "maxScore": 20,
      "assessment": "Assessment of conversion paths and CTA clarity.",
      "recommendation": "Concrete fix."
    }
  },
  "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "redFlags": ["Red flag 1", "Red flag 2"],
  "headlineRewrite": {
    "current": "Extracted or observed headline",
    "proposed": "High-converting, specific rewrite with trade proof",
    "rationale": "Why this converts better."
  },
  "ctaRewrite": {
    "current": "Current CTA (e.g. Submit, Learn More)",
    "proposed": "Actionable CTA (e.g. Message Dr. Rathi on WhatsApp)",
    "rationale": "Why this reduces friction."
  },
  "missingTrustSignals": ["Specific missing trust element 1", "Specific missing trust element 2"]
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // openai/gpt-oss-120b: as of Aug 2026 the old llama-3.3-70b-versatile
        // model was moved to Groq's enterprise-only tier and 403s on a free
        // key. gpt-oss-120b is the largest model still on Groq's free tier
        // (30 RPM / 1,000 RPD / 200K TPD — verified against Groq's own docs),
        // with a 131K context window and native JSON response_format support.
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: "You are an expert web engineering and CRO auditor. You output strict, valid JSON with no markdown wrapping.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        // gpt-oss-120b is a reasoning model that spends tokens on a hidden
        // "reasoning" field before the actual answer; "low" keeps that
        // overhead small so this stays fast for a synchronous UI request and
        // comfortably inside the free tier's 30K-tokens/minute budget.
        reasoning_effort: "low",
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.warn("Groq API call returned non-200:", response.status, await response.text());
      return evaluateWithHeuristics(input);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      return evaluateWithHeuristics(input);
    }
    const parsed = JSON.parse(rawContent);

    return assembleResult(parsed, input, "groq-gpt-oss-120b");
  } catch (err) {
    console.warn("Groq evaluation failed, falling back to heuristics:", err);
    return evaluateWithHeuristics(input);
  }
}

function assembleResult(
  data: Partial<EvaluationResult>,
  input: EvaluationInput,
  evaluatedVia: "groq-gpt-oss-120b" | "deterministic-heuristic",
): EvaluationResult {
  const totalScore = Math.min(100, Math.max(0, Math.round(data.totalScore ?? 68)));
  let tier: EvaluationResult["tier"] = "Solid & Functional";
  let tierColor = "#d97706"; // Amber

  if (totalScore >= 90) {
    tier = "Craft Masterpiece";
    tierColor = "#059669"; // Emerald
  } else if (totalScore >= 75) {
    tier = "Solid & Functional";
    tierColor = "#0d9488"; // Teal
  } else if (totalScore >= 50) {
    tier = "Generic / Moderate Risk";
    tierColor = "#d97706"; // Amber
  } else {
    tier = "High Conversion Risk";
    tierColor = "#e11d48"; // Rose
  }

  const pillars = data.pillars ?? {
    valueProposition: {
      name: "Value Proposition & Clarity",
      score: Math.round(totalScore * 0.2),
      maxScore: 20,
      assessment: "Reasonable clarity but lacks punchy Indian market specificity.",
      recommendation: "State exact customer outcome and timeline in the first hero sentence.",
    },
    industryAlignment: {
      name: "Industry Alignment & Authenticity",
      score: Math.round(totalScore * 0.2),
      maxScore: 20,
      assessment: "Uses standard vocabulary rather than domain-specific terminology.",
      recommendation: "Showcase genuine trade details, tools, and local credentials.",
    },
    trustSignals: {
      name: "Trust Signals & Contact Friction",
      score: Math.round(totalScore * 0.2),
      maxScore: 20,
      assessment: "Lacks prominent WhatsApp click-to-chat and verifiable physical address.",
      recommendation: "Add prominent WhatsApp floating CTA and state SLA response guarantee.",
    },
    pricingTransparency: {
      name: "Pricing Transparency & Intent",
      score: Math.round(totalScore * 0.2),
      maxScore: 20,
      assessment: "Prices are hidden behind inquiry forms creating buyer hesitation.",
      recommendation: "Publish transparent INR starting bands or package benchmarks.",
    },
    mobileActionability: {
      name: "Mobile Readiness & Actionability",
      score: Math.round(totalScore * 0.2),
      maxScore: 20,
      assessment: "CTAs are generic and form is too lengthy for mobile devices.",
      recommendation: "Shorten form to Name + WhatsApp and make primary action one-tap.",
    },
  };

  const keyStrengths = data.keyStrengths?.length
    ? data.keyStrengths
    : ["Clean visual structure", "Basic contact channel present", "Identifiable business sector"];

  const redFlags = data.redFlags?.length
    ? data.redFlags
    : [
        "Generic hero copy that could belong to any competitor",
        "No stated response time SLA or WhatsApp-first booking commitment",
        "Black-box pricing forcing prospects to endure sales calls",
      ];

  const headlineRewrite = data.headlineRewrite ?? {
    current: "Welcome to Our Quality Services",
    proposed: `${input.businessName} — Precision ${input.category} in ${input.city || 'India'} with Transparent Pricing`,
    rationale: "Replaces vague generic greeting with clear identity, trade specialization, and local trust.",
  };

  const ctaRewrite = data.ctaRewrite ?? {
    current: "Contact Us / Submit",
    proposed: `Chat with ${input.businessName} on WhatsApp`,
    rationale: "Lowers friction for mobile users who prefer instant messaging over rigid email forms.",
  };

  const missingTrustSignals = data.missingTrustSignals?.length
    ? data.missingTrustSignals
    : [
        "Direct WhatsApp click-to-chat link with pre-filled enquiry text",
        "Clear response commitment SLA (e.g. 'Reply within 1 business day')",
        "Published INR price starting bands or indicative packages",
        "Prominent physical location with local landmark",
      ];

  const detailedCopyReport = `### Brand Alignment & CRO Audit: ${input.businessName}
**Score:** ${totalScore}/100 (${tier})
**Industry:** ${input.category} | **Region:** ${input.city || "India"}

#### Executive Summary
${data.summary || `${input.businessName} displays functional elements but suffers from generic messaging that fails to capture the unique craft of its business, reducing visitor trust and conversion rates.`}

#### Category Breakdown
1. **Value Proposition & Clarity:** ${pillars.valueProposition.score}/20
   - *Assessment:* ${pillars.valueProposition.assessment}
   - *Fix:* ${pillars.valueProposition.recommendation}

2. **Industry Alignment & Authenticity:** ${pillars.industryAlignment.score}/20
   - *Assessment:* ${pillars.industryAlignment.assessment}
   - *Fix:* ${pillars.industryAlignment.recommendation}

3. **Trust Signals & Contact Friction:** ${pillars.trustSignals.score}/20
   - *Assessment:* ${pillars.trustSignals.assessment}
   - *Fix:* ${pillars.trustSignals.recommendation}

4. **Pricing Transparency & Intent:** ${pillars.pricingTransparency.score}/20
   - *Assessment:* ${pillars.pricingTransparency.assessment}
   - *Fix:* ${pillars.pricingTransparency.recommendation}

5. **Mobile Readiness & Actionability:** ${pillars.mobileActionability.score}/20
   - *Assessment:* ${pillars.mobileActionability.assessment}
   - *Fix:* ${pillars.mobileActionability.recommendation}

#### Copy Rewrites
- **Headline:**
  - *Current:* "${headlineRewrite.current}"
  - *Proposed:* "${headlineRewrite.proposed}"
  - *Why:* ${headlineRewrite.rationale}
- **Primary CTA:**
  - *Current:* "${ctaRewrite.current}"
  - *Proposed:* "${ctaRewrite.proposed}"
  - *Why:* ${ctaRewrite.rationale}

#### Missing Trust Anchors
${missingTrustSignals.map((s) => `- [ ] ${s}`).join("\n")}
`;

  return {
    businessName: input.businessName,
    category: input.category,
    totalScore,
    tier,
    tierColor,
    summary:
      data.summary ||
      `${input.businessName} has core fundamentals in place, but requires sharper positioning and trust signals to convert modern Indian consumers.`,
    pillars,
    keyStrengths,
    redFlags,
    headlineRewrite,
    ctaRewrite,
    missingTrustSignals,
    detailedCopyReport,
    evaluatedVia,
  };
}

export function evaluateWithHeuristics(input: EvaluationInput): EvaluationResult {
  const text = (input.copyText || "").toLowerCase();

  let vpScore = 12;
  let alignScore = 13;
  let trustScore = 11;
  let priceScore = 9;
  let mobileScore = 14;

  const redFlags: string[] = [];
  const keyStrengths: string[] = [];
  const missingTrust: string[] = [];

  // 1. Value prop checks
  if (text.length > 80) vpScore += 3;
  if (/best|world[- ]class|leading|excellence|innovative/.test(text)) {
    vpScore -= 4;
    redFlags.push("Overuse of generic superlative buzzwords ('best', 'leading', 'innovative') that trigger skepticism.");
  } else {
    vpScore += 2;
    keyStrengths.push("Restrained, credible tone without excessive marketing hyperbole.");
  }

  // 2. Industry alignment
  const categoryTerms: Record<string, string[]> = {
    Dental: ["bds", "mds", "smile", "teeth", "clinic", "implant", "root canal", "aligner", "dentist"],
    Coaching: ["batch", "iit", "jee", "neet", "faculty", "syllabus", "result", "scholarship", "exam"],
    Healthcare: ["dr", "mbbs", "md", "opd", "consultation", "clinic", "appointment", "specialist"],
    "Real Estate": ["rera", "sq. ft", "bhk", "possession", "amenities", "floor plan", "carpet area"],
    Restaurant: ["menu", "awadhi", "chef", "table", "reservation", "ingredients", "cuisine", "tasting"],
    Resort: ["cottage", "room", "stay", "backwaters", "breakfast", "night", "resort", "retreat"],
  };

  const matchedCategory = Object.keys(categoryTerms).find((k) => input.category.toLowerCase().includes(k.toLowerCase())) as keyof typeof categoryTerms | undefined;
  const keywords: string[] = (matchedCategory ? categoryTerms[matchedCategory] : undefined) ?? ["service", "process", "quality", "team"];
  const matchedKeywords = keywords.filter((k) => text.includes(k));

  if (matchedKeywords.length >= 3) {
    alignScore += 5;
    keyStrengths.push(`Authentic industry vocabulary detected (${matchedKeywords.slice(0, 3).join(", ")}).`);
  } else {
    alignScore -= 3;
    redFlags.push("Copy lacks trade-specific depth and reads like a generic template.");
  }

  // 3. Trust signals
  if (/whatsapp|chat/.test(text)) {
    trustScore += 5;
    keyStrengths.push("WhatsApp channel integrated for fast low-friction customer contact.");
  } else {
    trustScore -= 3;
    missingTrust.push("Direct WhatsApp click-to-chat button with pre-filled message");
    redFlags.push("No WhatsApp-first response option — high contact friction for Indian users.");
  }

  if (/\b\d{10}\b|\+91|pin\b|\d{6}\b/.test(text)) {
    trustScore += 3;
    keyStrengths.push("Explicit local phone and physical address signals present.");
  } else {
    missingTrust.push("Prominent phone number and physical address with landmark");
  }

  // 4. Pricing transparency
  if (/₹|rs\.|inr|starting at|package|fee|price/.test(text)) {
    priceScore += 7;
    keyStrengths.push("Transparent pricing references reduce sticker shock and qualification friction.");
  } else {
    priceScore -= 4;
    missingTrust.push("Published starting INR price bands or indicative fee schedule");
    redFlags.push("Zero transparent pricing shown — forces prospects into high-friction inquiry loops.");
  }

  // 5. Mobile actionability
  if (/book|reserve|call now|message|get quote/.test(text)) {
    mobileScore += 4;
    keyStrengths.push("Clear action-oriented call to action.");
  } else {
    missingTrust.push("Sticky tap-to-call or tap-to-message bar for mobile screens");
  }

  const totalScore = Math.min(98, Math.max(35, vpScore + alignScore + trustScore + priceScore + mobileScore));

  return assembleResult(
    {
      totalScore,
      summary: `${input.businessName} demonstrates good foundational intent, but lacks the specific local trust signals and pricing clarity required to dominate conversions against competitor websites in India.`,
      pillars: {
        valueProposition: {
          name: "Value Proposition & Clarity",
          score: vpScore,
          maxScore: 20,
          assessment: vpScore >= 14 ? "Clearly identifies what is offered and who benefits." : "Value proposition is obscured by generic phrasing.",
          recommendation: "Lead with the single tangible outcome the client achieves and the turnaround time.",
        },
        industryAlignment: {
          name: "Industry Alignment & Authenticity",
          score: alignScore,
          maxScore: 20,
          assessment: alignScore >= 15 ? "Uses authentic domain terminology that builds authority." : "Missing the authentic vocabulary and specifics of your trade.",
          recommendation: "Incorporate authentic trade details, qualifications, and actual photos rather than stock renders.",
        },
        trustSignals: {
          name: "Trust Signals & Contact Friction",
          score: trustScore,
          maxScore: 20,
          assessment: trustScore >= 15 ? "Strong local trust anchors and contact channels." : "High contact friction without instant messaging options.",
          recommendation: "Add an explicit response SLA ('Reply within 1 business day') and direct WhatsApp booking.",
        },
        pricingTransparency: {
          name: "Pricing Transparency & Intent",
          score: priceScore,
          maxScore: 20,
          assessment: priceScore >= 14 ? "Provides helpful price anchoring." : "Black-box pricing creates skepticism among price-conscious MSME buyers.",
          recommendation: "Publish honest 'starting from ₹X' bands for standard service tiers.",
        },
        mobileActionability: {
          name: "Mobile Readiness & Actionability",
          score: mobileScore,
          maxScore: 20,
          assessment: "Mobile layout flow is usable with clear touch goals.",
          recommendation: "Ensure key CTA is thumb-accessible within the first screen without scrolling.",
        },
      },
      keyStrengths: keyStrengths.slice(0, 4),
      redFlags: redFlags.slice(0, 3),
      missingTrustSignals: missingTrust.length ? missingTrust : ["Verified Google Business Profile link with review count"],
      headlineRewrite: {
        current: "Comprehensive Solutions for Your Needs",
        proposed: `${input.businessName} — Expert ${input.category} in ${input.city || 'India'}. Honest Scopes, Zero Fluff.`,
        rationale: "Anchors geographic authority, explicit trade, and an anti-agency trust promise.",
      },
      ctaRewrite: {
        current: "Submit Your Query",
        proposed: "Check Availability on WhatsApp →",
        rationale: "Converts passive visitors into active conversations via the communication channel they already trust.",
      },
    },
    input,
    "deterministic-heuristic",
  );
}
