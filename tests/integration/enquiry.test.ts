import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  env: { DB: {}, IP_HASH_SALT: 'test-only-salt', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-only', RESEND_DAILY_CAP: '100' },
  verify: vi.fn(), rate: vi.fn(), insert: vi.fn(), spam: vi.fn(), count: vi.fn(), reserve: vi.fn(), update: vi.fn(), send: vi.fn(), provider: vi.fn(), findDuplicate: vi.fn(),
}));
vi.mock('cloudflare:workers', () => ({ env: mocks.env }));
vi.mock('@/lib/turnstile', () => ({ verifyTurnstile: mocks.verify }));
vi.mock('@/lib/rate-limit', () => ({ checkIpRateLimit: mocks.rate, checkPhoneRateLimit: mocks.rate, checkGlobalRateLimit: mocks.rate }));
vi.mock('@/lib/leads', async importOriginal => ({ ...await importOriginal<object>(), insertLead: mocks.insert, logSpam: mocks.spam, getDailyEmailCount: mocks.count, reserveEmailQuota: mocks.reserve, updateLeadEmailStatus: mocks.update, findRecentDuplicateLead: mocks.findDuplicate }));
vi.mock('@/lib/email', () => ({ createEmailProvider: mocks.provider, sendWithRetry: mocks.send }));
import { GET, POST } from '@/pages/api/enquiry';
const valid = { name: 'Test Person', phone: '9876543210', email: 'test@example.com', category: 'Clinics', needs: 'new-website', consent: true, formRenderedAt: Date.now() - 10000 };
async function submit(body: unknown = valid, headers: Record<string,string> = {}) {
  const request = new Request('https://atittle.com/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://atittle.com', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return await POST({ request, redirect: (url: string, status = 302) => new Response(null, { status, headers: { location: url } }) } as never) as Response;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verify.mockResolvedValue({ outcome: 'verified' });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.findDuplicate.mockResolvedValue(null);
  mocks.insert.mockResolvedValue(undefined); mocks.spam.mockResolvedValue(undefined);
  mocks.count.mockResolvedValue(0); mocks.reserve.mockResolvedValue(true); mocks.update.mockResolvedValue(undefined);
  mocks.provider.mockReturnValue({}); mocks.send.mockResolvedValue({ ok: true });
  vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
});
describe('enquiry request contract and failures', () => {
  it('persists before email and never returns an internal lead ID', async () => {
    const response = await submit(); expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true });
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.send.mock.invocationCallOrder[0]!);
  });
  it.each([{...valid,name:''},{...valid,phone:'123'},{...valid,consent:false},{...valid,needs:'hacked'}])('rejects invalid input', async body => { expect((await submit(body)).status).toBe(400); expect(mocks.insert).not.toHaveBeenCalled(); });
  it('rejects an oversized body without Content-Length', async () => { expect((await submit({...valid,message:'a'.repeat(9000)})).status).toBe(413); });
  it('rejects an unsupported content type', async () => { expect((await submit('hello',{'content-type':'text/plain'})).status).toBe(415); });
  it.each(['null','[]','"hello"','{'])('rejects malformed body %s', async body => { expect((await submit(body)).status).toBe(400); });
  it('rejects a foreign origin', async () => { expect((await submit(valid,{origin:'https://attacker.example'})).status).toBe(403); });
  it('honeypot returns generic success even when spam logging fails', async () => { mocks.spam.mockRejectedValue(new Error('D1 down')); expect((await submit({...valid,honeypot:'bot'})).status).toBe(200); expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.insert).not.toHaveBeenCalled(); });
  it('rejects too-fast submissions', async () => { expect((await submit({...valid,formRenderedAt:Date.now()})).status).toBe(400); });
  it('rejects explicitly invalid CAPTCHA', async () => { mocks.verify.mockResolvedValue({outcome:'unverified'}); expect((await submit()).status).toBe(400); });
  it.each(['failed','skipped'])('tightens limits for CAPTCHA %s', async outcome => { mocks.verify.mockResolvedValue({outcome}); expect((await submit()).status).toBe(200); expect(mocks.rate.mock.calls[0]?.[2]).toBe(2); });
  it('returns 429 when throttled', async () => { mocks.rate.mockResolvedValue({allowed:false}); expect((await submit()).status).toBe(429); expect(mocks.insert).not.toHaveBeenCalled(); });
  it('emails when D1 counters and insertion both fail', async () => { mocks.rate.mockRejectedValue(new Error('D1 unavailable')); mocks.insert.mockRejectedValue(new Error('D1 unavailable')); expect((await submit()).status).toBe(200); expect(mocks.send.mock.calls[0]?.[1].persisted).toBe(false); });
  it('retains leads when email is down', async () => { mocks.send.mockResolvedValue({ok:false,error:'resend_http_503'}); expect((await submit()).status).toBe(200); expect(mocks.update).toHaveBeenCalledWith(expect.anything(),expect.any(String),'failed','resend_http_503'); });
  it('queues without a send when quota is full', async () => { mocks.count.mockResolvedValue(100); mocks.reserve.mockResolvedValue(false); expect((await submit()).status).toBe(200); expect(mocks.insert).toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled(); });
  it('fails honestly when both channels fail', async () => { mocks.insert.mockRejectedValue(new Error('D1 down')); mocks.send.mockResolvedValue({ok:false}); expect((await submit()).status).toBe(502); });
  it('standard form POST redirects without putting PII into the URL', async () => { const data = new URLSearchParams({...valid,consent:'on',formRenderedAt:String(valid.formRenderedAt)} as never); const response = await submit(data.toString(),{'content-type':'application/x-www-form-urlencoded'}); expect(response.status).toBe(303); expect(response.headers.get('location')).toBe('/enquiry-received'); });
  it('duplicate submission returns success without re-inserting or sending email', async () => { mocks.findDuplicate.mockResolvedValue({ id: 'existing-id', createdAt: new Date().toISOString() }); const res = await submit(); expect(res.status).toBe(200); expect(await res.json()).toEqual({ ok: true }); expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled(); });
  it('duplicate native form POST redirects to /enquiry-received without re-inserting', async () => { mocks.findDuplicate.mockResolvedValue({ id: 'existing-id', createdAt: new Date().toISOString() }); const data = new URLSearchParams({...valid,consent:'on',formRenderedAt:String(valid.formRenderedAt)} as never); const res = await submit(data.toString(),{'content-type':'application/x-www-form-urlencoded'}); expect(res.status).toBe(303); expect(res.headers.get('location')).toBe('/enquiry-received'); expect(mocks.insert).not.toHaveBeenCalled(); });
  it('GET is rejected', async () => { expect((await GET({} as never) as Response).status).toBe(405); });
});
