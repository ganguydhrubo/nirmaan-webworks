import { z } from "zod";

/** Indian mobile: optional +91/91/0 prefix, then 10 digits starting 6-9. */
const INDIAN_MOBILE_RE = /^(?:\+91|91|0)?([6-9]\d{9})$/;

export function normalizeIndianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "");
  const match = INDIAN_MOBILE_RE.exec(cleaned);
  if (!match) return null;
  return `+91${match[1]}`;
}

/** Rejects bare URLs / obvious link-drop spam in free-text fields. */
const URL_RE = /(https?:\/\/|www\.)\S+/i;

const SPAM_PHRASES = [
  "seo services",
  "backlink",
  "crypto investment",
  "casino",
  "loan approved",
  "click here to claim",
  "forex trading",
];

const noUrl = (label: string) =>
  z.string().refine((v) => !URL_RE.test(v), { message: `${label} cannot contain a link` });

const NAME_SCHEMA = z
  .string()
  .trim()
  .min(2, "Please enter your name")
  .max(80, "Name is too long")
  .pipe(noUrl("Name"));

const PHONE_SCHEMA = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeIndianPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number" });
      return z.NEVER;
    }
    return normalized;
  });

const EMAIL_SCHEMA = z.email("Enter a valid email address").trim().toLowerCase().max(120);

export const buyerIntentValues = ["new-website", "redesign", "ecommerce", "landing-page", "not-sure"] as const;

export const enquirySchema = z
  .object({
    name: NAME_SCHEMA,
    phone: PHONE_SCHEMA,
    email: z.union([EMAIL_SCHEMA, z.literal("")]).optional(),
    businessName: z.string().trim().max(120).pipe(noUrl("Business name")).optional().or(z.literal("")),
    category: z.string().trim().min(1, "Please choose your business category").max(60),
    needs: z.enum(buyerIntentValues, { message: "Please choose what you need" }),
    message: z.string().trim().max(1000).pipe(noUrl("Message")).optional().or(z.literal("")),
    consent: z
      .union([z.boolean(), z.literal("on"), z.literal("true")])
      .transform((v) => v === true || v === "on" || v === "true")
      .refine((v) => v === true, { message: "Please accept to be contacted about your enquiry" }),

    // Anti-spam / provenance fields
    honeypot: z.string().max(0, "spam").optional().or(z.literal("")),
    formRenderedAt: z.coerce.number().optional(),
    turnstileToken: z.string().max(2048).optional().or(z.literal("")),
    pageSource: z.string().max(200).optional(),
    referrer: z.string().max(500).optional(),
    utmSource: z.string().max(100).optional(),
    utmMedium: z.string().max(100).optional(),
    utmCampaign: z.string().max(100).optional(),
    utmTerm: z.string().max(100).optional(),
    utmContent: z.string().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = !!data.email && data.email.length > 0;
    if (!data.phone && !hasEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Please provide a phone number or an email address",
      });
    }
    for (const phrase of SPAM_PHRASES) {
      if (data.message?.toLowerCase().includes(phrase) || data.name.toLowerCase().includes(phrase)) {
        ctx.addIssue({ code: "custom", path: ["message"], message: "spam" });
        break;
      }
    }
  });

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const MAX_ENQUIRY_PAYLOAD_BYTES = 8 * 1024;
