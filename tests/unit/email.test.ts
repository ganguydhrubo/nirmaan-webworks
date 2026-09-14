import { afterEach, expect, it, vi } from 'vitest';
import { createEmailProvider, sendWithRetry } from '@/lib/email';
import { ResendEmailProvider } from '@/lib/email/resend';
import { verifyTurnstile } from '@/lib/turnstile';
import type { LeadEmailPayload } from '@/lib/email/types';
const payload = {leadId:'test-123', name:'Test', phoneE164:'+919876543210',email:'test@example.com',businessName:'',category:'Clinics',needs:'new-website',message:'',sourcePage:'/',utmSource:'',utmMedium:'',utmCampaign:'',createdAtIso:new Date().toISOString(),persisted:true,quotaWarning:false} satisfies LeadEmailPayload;
afterEach(() => {vi.unstubAllGlobals(); vi.restoreAllMocks();});
it('requires a provider key', () => {expect(() => createEmailProvider('resend',undefined)).toThrow('RESEND_API_KEY');});
it('disabled email never pretends delivery', async () => {expect(await createEmailProvider('none',undefined).sendLeadEmail(payload,'to','from')).toMatchObject({ok:false});});
it('uses the same provider idempotency key on retries', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}',{status:200})); vi.stubGlobal('fetch',fetcher);
  const provider = new ResendEmailProvider('test'); await provider.sendLeadEmail(payload,'to@example.com','from@example.com'); await provider.sendLeadEmail(payload,'to@example.com','from@example.com');
  expect(fetcher.mock.calls.map(call => call[1].headers['Idempotency-Key'])).toEqual(['lead/test-123','lead/test-123']);
});
it('does not retry permanent provider errors', async () => { const provider={sendLeadEmail:vi.fn().mockResolvedValue({ok:false,error:'resend_http_422'})}; await sendWithRetry(provider,payload,'to','from'); expect(provider.sendLeadEmail).toHaveBeenCalledTimes(1); });
it('CAPTCHA outage degrades; invalid CAPTCHA is rejected', async () => {vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:503}))); expect(await verifyTurnstile('token','secret','ip')).toMatchObject({outcome:'failed'}); vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"success":false}'))); expect(await verifyTurnstile('token','secret','ip')).toMatchObject({outcome:'unverified'});});
