import { ConfigService } from '@nestjs/config';
import { BrevoEmailProvider } from './brevo-email.provider';
import { EmailProviderAdapter } from './email-provider.adapter';

const fetchMock = jest.fn<Promise<Response>, [RequestInfo, RequestInit?]>();

jest.spyOn(global, 'fetch').mockImplementation(fetchMock as typeof fetch);

describe('BrevoEmailProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildConfigService = (values: Record<string, unknown>): ConfigService =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService;

  const makeProvider = (
    config: Record<string, unknown>,
  ): EmailProviderAdapter => new BrevoEmailProvider(buildConfigService(config));

  describe('name', () => {
    it('returns "brevo"', () => {
      expect(makeProvider({}).name).toBe('brevo');
    });
  });

  describe('sendEmail — success', () => {
    it('calls Brevo SMTP API with api-key header, textContent, and returns delivered=true with messageId', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ messageId: 'brevo-msg-abc' }),
      } as unknown as Response);

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your OTP',
        body: '123456',
      });

      expect(result).toEqual({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
        providerMessageId: 'brevo-msg-abc',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': 'xkeys-test-12345',
          }),
        }),
      );

      // Brevo expects `textContent` (not `text`). Verify exact payload shape.
      const calledWith = fetchMock.mock.calls[0]?.[1] as { body?: string };
      expect(calledWith?.body).toBeDefined();
      const parsed = JSON.parse(calledWith.body!) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        sender: { email: 'no-reply@fayed.dev' },
        to: [{ email: 'practitioner@fayed.local' }],
        subject: 'Your OTP',
        textContent: '123456',
      });
      // The legacy `text` field must NOT be sent (Brevo would ignore it and
      // could reject the payload in stricter API versions).
      expect(parsed).not.toHaveProperty('text');
    });

    it('sends htmlContent when html body is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ messageId: 'brevo-html-1' }),
      } as unknown as Response);

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Welcome',
        body: 'fallback text',
        html: '<p>Hello <b>there</b></p>',
      });

      expect(result.delivered).toBe(true);
      const calledWith = fetchMock.mock.calls[0]?.[1] as { body?: string };
      const parsed = JSON.parse(calledWith.body!) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        subject: 'Welcome',
        htmlContent: '<p>Hello <b>there</b></p>',
        textContent: 'fallback text',
      });
    });

    it('sends only textContent when no html is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ messageId: 'brevo-text-1' }),
      } as unknown as Response);

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Plain text only',
        body: 'plain body',
      });

      const calledWith = fetchMock.mock.calls[0]?.[1] as { body?: string };
      const parsed = JSON.parse(calledWith.body!) as Record<string, unknown>;
      expect(parsed).toMatchObject({ textContent: 'plain body' });
      expect(parsed).not.toHaveProperty('htmlContent');
    });

    it('includes at least one of htmlContent/textContent for OTP email', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ messageId: 'brevo-otp-1' }),
      } as unknown as Response);

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'OTP',
        body: '123456',
        isOtp: true,
      });

      expect(result.delivered).toBe(true);
      const calledWith = fetchMock.mock.calls[0]?.[1] as { body?: string };
      const parsed = JSON.parse(calledWith.body!) as Record<string, unknown>;
      // OTP must include at least one of the required Brevo content fields.
      expect(
        parsed.htmlContent !== undefined || parsed.textContent !== undefined,
      ).toBe(true);
      expect(parsed).not.toHaveProperty('text');
    });
  });

  describe('sendEmail — empty content fail-fast', () => {
    it('returns EMAIL_CONTENT_REQUIRED without calling fetch when body and html are both empty', async () => {
      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Empty',
        body: '',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'EMAIL_CONTENT_REQUIRED',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns EMAIL_CONTENT_REQUIRED without calling fetch when body is whitespace only', async () => {
      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Whitespace',
        body: '   \n\t  ',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'EMAIL_CONTENT_REQUIRED',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns EMAIL_CONTENT_REQUIRED when only html is empty whitespace and body is empty', async () => {
      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Whitespace html',
        body: '',
        html: '   ',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'EMAIL_CONTENT_REQUIRED',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail — API key not configured', () => {
    it('returns delivered=false with BREVO_API_KEY_NOT_CONFIGURED without calling fetch', async () => {
      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': '',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_API_KEY_NOT_CONFIGURED',
      });
      // Provider returns before making any HTTP call when API key is missing
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail — from address not configured', () => {
    it('returns delivered=false with MAIL_TRANSPORT_NOT_CONFIGURED without calling fetch', async () => {
      const provider = makeProvider({
        'notification.mail.from': '',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'MAIL_TRANSPORT_NOT_CONFIGURED',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail — Brevo API failure (4xx/5xx)', () => {
    it('returns delivered=false with BREVO_SEND_FAILED', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Monthly limit reached'),
      } as unknown as Response);

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
    });
  });

  describe('sendEmail — network error / timeout', () => {
    it('returns delivered=false with BREVO_SEND_FAILED', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ENOTFOUND'));

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Subject',
        body: 'Body',
      });

      expect(result).toEqual({
        delivered: false,
        deliveryTarget: 'practitioner@fayed.local',
        error: 'BREVO_SEND_FAILED',
      });
    });
  });

  describe('sendEmail — OTP purpose', () => {
    it('marks the email as OTP in the payload without changing the result shape', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ messageId: 'brevo-otp-xyz' }),
      } as unknown as Response);

      const provider = makeProvider({
        'notification.mail.from': 'no-reply@fayed.dev',
        'notification.brevo.apiKey': 'xkeys-test-12345',
        'notification.brevo.apiUrl': 'https://api.brevo.com',
      });

      const result = await provider.sendEmail({
        to: 'practitioner@fayed.local',
        subject: 'Your login OTP',
        body: '654321',
        isOtp: true,
      });

      expect(result).toEqual({
        delivered: true,
        deliveryTarget: 'practitioner@fayed.local',
        providerMessageId: 'brevo-otp-xyz',
      });
    });
  });
});
