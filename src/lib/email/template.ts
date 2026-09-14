import type { LeadEmailPayload } from "./types";
import { siteConfig } from "@config/site";

const BUYER_INTENT_LABEL: Record<string, string> = {
  "new-website": "New website",
  redesign: "Redesign of existing website",
  ecommerce: "Online ordering / e-commerce",
  "landing-page": "Single landing page",
  "not-sure": "Not sure yet",
};

function toIst(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

function waLink(phoneE164: string, name: string, category: string): string {
  const number = phoneE164.replace(/^\+/, "");
  const text = encodeURIComponent(`Hi ${name}, thanks for your enquiry about a ${category} website — this is ${siteConfig.businessName}.`);
  return `https://wa.me/${number}?text=${text}`;
}

export function buildLeadEmailSubject(payload: LeadEmailPayload): string {
  return `New enquiry — ${payload.category} — ${payload.name}`;
}

export function buildLeadEmailText(payload: LeadEmailPayload): string {
  const lines = [
    `New enquiry received ${toIst(payload.createdAtIso)} IST`,
    payload.persisted ? "" : "*** WARNING: this lead could NOT be saved to the database. This email is the only record. ***",
    payload.quotaWarning ? "*** NOTE: email sending is near the daily quota. ***" : "",
    "",
    `Name: ${payload.name}`,
    `Phone: ${payload.phoneE164}`,
    payload.email ? `Email: ${payload.email}` : "",
    payload.businessName ? `Business: ${payload.businessName}` : "",
    `Category: ${payload.category}`,
    `Needs: ${BUYER_INTENT_LABEL[payload.needs] ?? payload.needs}`,
    payload.message ? `Message: ${payload.message}` : "",
    "",
    `Page: ${payload.sourcePage || "unknown"}`,
    `UTM: source=${payload.utmSource || "-"} medium=${payload.utmMedium || "-"} campaign=${payload.utmCampaign || "-"}`,
    "",
    `Reply on WhatsApp: ${waLink(payload.phoneE164, payload.name, payload.category)}`,
    `Lead ID: ${payload.leadId}`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function buildLeadEmailHtml(payload: LeadEmailPayload): string {
  const row = (label: string, value: string) =>
    value ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0">${esc(value)}</td></tr>` : "";

  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:16px">
    <h2 style="margin:0 0 4px">New enquiry — ${esc(payload.category)}</h2>
    <p style="color:#666;margin:0 0 16px">${esc(toIst(payload.createdAtIso))} IST</p>
    ${!payload.persisted ? `<p style="background:#fee2e2;color:#991b1b;padding:8px 12px;border-radius:6px"><strong>Warning:</strong> this lead could not be saved to the database. This email is the only record.</p>` : ""}
    ${payload.quotaWarning ? `<p style="background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px">Email sending is near the daily quota.</p>` : ""}
    <table role="presentation" style="border-collapse:collapse;width:100%">
      ${row("Name", payload.name)}
      ${row("Phone", payload.phoneE164)}
      ${row("Email", payload.email)}
      ${row("Business", payload.businessName)}
      ${row("Category", payload.category)}
      ${row("Needs", BUYER_INTENT_LABEL[payload.needs] ?? payload.needs)}
      ${row("Message", payload.message)}
      ${row("Page", payload.sourcePage)}
    </table>
    <p style="margin-top:20px">
      <a href="${waLink(payload.phoneE164, payload.name, payload.category)}" style="background:#25D366;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Reply on WhatsApp</a>
    </p>
    <p style="color:#999;font-size:12px;margin-top:24px">Lead ID: ${esc(payload.leadId)}</p>
  </body></html>`;
}
