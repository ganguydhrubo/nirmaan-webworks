export interface LeadEmailPayload {
  leadId: string;
  name: string;
  phoneE164: string;
  email: string;
  businessName: string;
  category: string;
  needs: string;
  message: string;
  sourcePage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  createdAtIso: string;
  persisted: boolean; // false => D1 insert failed; email is now the only record
  quotaWarning: boolean; // true when >=80% of daily provider cap used
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export interface EmailProvider {
  sendLeadEmail(payload: LeadEmailPayload, to: string, from: string): Promise<SendResult>;
}
