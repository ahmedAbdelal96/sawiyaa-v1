import { sanitizeSafeMetadata } from './safe-metadata.util';

describe('sanitizeSafeMetadata', () => {
  it('returns an empty object for null / undefined / non-object input', () => {
    expect(sanitizeSafeMetadata(null)).toEqual({});
    expect(sanitizeSafeMetadata(undefined)).toEqual({});
    expect(sanitizeSafeMetadata('hello')).toEqual({});
    expect(sanitizeSafeMetadata(123)).toEqual({});
    expect(sanitizeSafeMetadata([])).toEqual({});
  });

  it('keeps safe primitive fields as-is', () => {
    const input = {
      blockedReason: 'TIME_WINDOW_CLOSED',
      provider: 'DAILY',
      providerEventType: 'participant.joined',
      count: 3,
      isDuplicate: true,
    };
    expect(sanitizeSafeMetadata(input)).toEqual(input);
  });

  it('coerces non-primitive leaf values to safe strings / null', () => {
    const input = {
      date: new Date('2026-04-08T10:00:00.000Z'),
      nullish: null,
      undef: undefined,
      obj: { nested: 'should-not-appear' },
      arr: ['a', 'b'],
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.date).toBe('2026-04-08T10:00:00.000Z');
    expect(out.nullish).toBeNull();
    expect(out.undef).toBeNull();
    expect(out.obj).toBe('[object]');
    expect(out.arr).toBe('a, b');
  });

  it('redacts sensitive keys (case-insensitive) at the top level', () => {
    const input = {
      token: 'daily-room-token-shhh',
      accessToken: 'bearer-xxx',
      Authorization: 'Bearer abc',
      auth: 'some-auth',
      joinToken: 'tok',
      refreshToken: 'rt',
      secret: 's',
      apiKey: 'ak',
      api_key: 'ak2',
      bearer: 'b',
      webhookSecret: 'whsec',
      signature: 'sig',
      hmac: 'h',
      privateKey: 'pk',
      rawBody: 'rb',
      rawHeaders: 'rh',
      payload: 'p',
      body: 'b',
      password: 'pw',
      passwordHash: 'ph',
      clientSecret: 'cs',
      providerSecret: 'ps',
      checkoutUrl: 'cu',
      safeField: 'kept',
    };
    const out = sanitizeSafeMetadata(input);
    // Every sensitive key is replaced with [REDACTED].
    for (const key of [
      'token',
      'accessToken',
      'Authorization',
      'auth',
      'joinToken',
      'refreshToken',
      'secret',
      'apiKey',
      'api_key',
      'bearer',
      'webhookSecret',
      'signature',
      'hmac',
      'privateKey',
      'rawBody',
      'rawHeaders',
      'payload',
      'body',
      'password',
      'passwordHash',
      'clientSecret',
      'providerSecret',
      'checkoutUrl',
    ]) {
      expect(out[key]).toBe('[REDACTED]');
    }
    expect(out.safeField).toBe('kept');
  });

  // ---- Phase 3 Final Guard: additional patterns ----

  it('redacts plural tokens (sessionToken, roomToken, meetingToken, providerToken, dailyToken, idToken)', () => {
    const input = {
      sessionToken: 'sess_LEAKED',
      roomToken: 'room_LEAKED',
      meetingToken: 'meet_LEAKED',
      providerToken: 'prov_LEAKED',
      dailyToken: 'daily_LEAKED',
      idToken: 'id_LEAKED',
      apiToken: 'api_LEAKED',
      safeField: 'kept',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.sessionToken).toBe('[REDACTED]');
    expect(out.roomToken).toBe('[REDACTED]');
    expect(out.meetingToken).toBe('[REDACTED]');
    expect(out.providerToken).toBe('[REDACTED]');
    expect(out.dailyToken).toBe('[REDACTED]');
    expect(out.idToken).toBe('[REDACTED]');
    expect(out.apiToken).toBe('[REDACTED]');
    expect(out.safeField).toBe('kept');
  });

  it('redacts header / headers / authorizationHeader / authHeader', () => {
    const input = {
      header: 'x-auth-value',
      headers: { authorization: 'Bearer LEAKED' },
      authorizationHeader: 'Bearer LEAKED2',
      authHeader: 'Basic LEAKED3',
      safeField: 'kept',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.header).toBe('[REDACTED]');
    expect(out.headers).toBe('[REDACTED]');
    expect(out.authorizationHeader).toBe('[REDACTED]');
    expect(out.authHeader).toBe('[REDACTED]');
    expect(out.safeField).toBe('kept');
  });

  it('redacts cookie / cookies / setCookie / set-cookie', () => {
    const input = {
      cookie: 'session=abc123',
      cookies: 'token=xyz',
      setCookie: 'auth=secret',
      'set-cookie': 'bearer=leaked',
      safeField: 'kept',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.cookie).toBe('[REDACTED]');
    expect(out.cookies).toBe('[REDACTED]');
    expect(out.setCookie).toBe('[REDACTED]');
    expect(out['set-cookie']).toBe('[REDACTED]');
    expect(out.safeField).toBe('kept');
  });

  it('redacts signature variants (xDailySignature, x-daily-signature, dailySignature, dailySignatureHeader, webhookSignature, sig)', () => {
    const input = {
      xDailySignature: 'sig_LEAKED',
      'x-daily-signature': 'sig_LEAKED2',
      dailySignature: 'sig_LEAKED3',
      dailySignatureHeader: 'sig_LEAKED4',
      webhookSignature: 'wh_LEAKED',
      'webhook-signature': 'wh_LEAKED2',
      signatureHeader: 'sh_LEAKED',
      sig: 's_LEAKED',
      safeField: 'kept',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.xDailySignature).toBe('[REDACTED]');
    expect(out['x-daily-signature']).toBe('[REDACTED]');
    expect(out.dailySignature).toBe('[REDACTED]');
    expect(out.dailySignatureHeader).toBe('[REDACTED]');
    expect(out.webhookSignature).toBe('[REDACTED]');
    expect(out['webhook-signature']).toBe('[REDACTED]');
    expect(out.signatureHeader).toBe('[REDACTED]');
    expect(out.sig).toBe('[REDACTED]');
    expect(out.safeField).toBe('kept');
  });

  it('redacts jwt, apiSecret, dailyApiKey, DAILY_API_KEY', () => {
    const input = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.LEAKED',
      apiSecret: 'apis_LEAKED',
      dailyApiKey: 'daily_LEAKED',
      DAILY_API_KEY: 'DAILY_LEAKED',
      safeField: 'kept',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.jwt).toBe('[REDACTED]');
    expect(out.apiSecret).toBe('[REDACTED]');
    expect(out.dailyApiKey).toBe('[REDACTED]');
    expect(out.DAILY_API_KEY).toBe('[REDACTED]');
    expect(out.safeField).toBe('kept');
  });

  it('redacts sensitive values inside nested objects', () => {
    const input = {
      nested: {
        token: 'nested-token-LEAKED',
        authorization: 'Bearer nested-LEAKED',
        safeField: 'kept',
      },
      safeTop: 'visible',
    };
    const out = sanitizeSafeMetadata(input);
    // Top-level nested object becomes "[object]" — token inside is NOT exposed.
    expect(out.nested).toBe('[object]');
    expect(out.safeTop).toBe('visible');
    // The nested token value must not appear in the serialized JSON.
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('nested-token-LEAKED');
    expect(serialized).not.toContain('Bearer nested-LEAKED');
  });

  it('redacts sensitive values inside arrays', () => {
    const input = {
      tokens: ['tok1_LEAKED', 'tok2_LEAKED'],
      cookies: ['cookie1_LEAKED', 'cookie2_LEAKED'],
      safeArr: ['visible1', 'visible2'],
    };
    const out = sanitizeSafeMetadata(input);
    // 'tokens' matches /^tokens$/i → redacted; 'cookies' matches /^cookies$/i → redacted.
    // 'safeArr' is non-sensitive → coerced to comma-joined string.
    expect(out.tokens).toBe('[REDACTED]');
    expect(out.cookies).toBe('[REDACTED]');
    expect(out.safeArr).toBe('visible1, visible2');
    // No secret values must appear in the serialized JSON output.
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('tok1_LEAKED');
    expect(serialized).not.toContain('tok2_LEAKED');
    expect(serialized).not.toContain('cookie1_LEAKED');
    expect(serialized).not.toContain('cookie2_LEAKED');
    expect(serialized).toContain('visible1');
  });

  // ---- Phase 3 Final Guard: plural token redaction (tokens, accessTokens, etc.) ----

  it('redacts exact plural token keys (tokens, accessTokens, refreshTokens, idTokens, joinTokens)', () => {
    const input = {
      tokens: 'tok_LEAKED',
      accessTokens: 'acc_LEAKED',
      refreshTokens: 'ref_LEAKED',
      idTokens: 'id_LEAKED',
      joinTokens: 'join_LEAKED',
      sessionTokens: 'sess_LEAKED',
      roomTokens: 'room_LEAKED',
      meetingTokens: 'meet_LEAKED',
      providerTokens: 'prov_LEAKED',
      dailyTokens: 'daily_LEAKED',
      safeField: 'visible',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.tokens).toBe('[REDACTED]');
    expect(out.accessTokens).toBe('[REDACTED]');
    expect(out.refreshTokens).toBe('[REDACTED]');
    expect(out.idTokens).toBe('[REDACTED]');
    expect(out.joinTokens).toBe('[REDACTED]');
    expect(out.sessionTokens).toBe('[REDACTED]');
    expect(out.roomTokens).toBe('[REDACTED]');
    expect(out.meetingTokens).toBe('[REDACTED]');
    expect(out.providerTokens).toBe('[REDACTED]');
    expect(out.dailyTokens).toBe('[REDACTED]');
    expect(out.safeField).toBe('visible');
  });

  it('redacts any key ending with Token or Tokens (defensive — userToken, practitionerTokens, etc.)', () => {
    const input = {
      userToken: 'userTok_LEAKED',
      userTokens: 'userToks_LEAKED',
      practitionerToken: 'practTok_LEAKED',
      practitionerTokens: 'practToks_LEAKED',
      providerAccessToken: 'provAcc_LEAKED',
      providerAccessTokens: 'provAccToks_LEAKED',
      dailyRoomToken: 'dailyRoomTok_LEAKED',
      dailyRoomTokens: 'dailyRoomToks_LEAKED',
      safeField: 'visible',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.userToken).toBe('[REDACTED]');
    expect(out.userTokens).toBe('[REDACTED]');
    expect(out.practitionerToken).toBe('[REDACTED]');
    expect(out.practitionerTokens).toBe('[REDACTED]');
    expect(out.providerAccessToken).toBe('[REDACTED]');
    expect(out.providerAccessTokens).toBe('[REDACTED]');
    expect(out.dailyRoomToken).toBe('[REDACTED]');
    expect(out.dailyRoomTokens).toBe('[REDACTED]');
    expect(out.safeField).toBe('visible');
    // Confirm no leaked values in serialized output.
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('userTok_LEAKED');
    expect(serialized).not.toContain('practTok_LEAKED');
    expect(serialized).not.toContain('provAcc_LEAKED');
    expect(serialized).not.toContain('dailyRoomTok_LEAKED');
  });

  it('JSON.stringify of sanitized output does not contain any secret values', () => {
    const input = {
      token: 'super-secret-token',
      accessToken: 'access-secret',
      authorization: 'Bearer auth-secret',
      headers: { authorization: 'Bearer header-secret' },
      cookie: 'session=secret',
      xDailySignature: 'sig-secret',
      jwt: 'jwt-secret',
      dailyApiKey: 'daily-key-secret',
      safeField: 'visible',
    };
    const out = sanitizeSafeMetadata(input);
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('super-secret-token');
    expect(serialized).not.toContain('access-secret');
    expect(serialized).not.toContain('auth-secret');
    expect(serialized).not.toContain('header-secret');
    expect(serialized).not.toContain('session=secret');
    expect(serialized).not.toContain('sig-secret');
    expect(serialized).not.toContain('jwt-secret');
    expect(serialized).not.toContain('daily-key-secret');
    expect(serialized).toContain('visible');
    expect(serialized).toContain('[REDACTED]');
  });

  it('safe fields are NOT redacted (provider, occurredAt, errorCode, status, reasonCode, blockedReason)', () => {
    const input = {
      provider: 'DAILY',
      occurredAt: '2026-04-08T10:00:00.000Z',
      errorCode: 'SESSION_NOT_JOINABLE_STATUS',
      status: 'IN_PROGRESS',
      reasonCode: 'TIME_WINDOW_CLOSED',
      blockedReason: 'SESSION_NOT_JOINABLE_STATUS',
      roomName: 'visible-room-name',
      source: 'daily-webhook',
      providerEventType: 'meeting.started',
    };
    const out = sanitizeSafeMetadata(input);
    expect(out.provider).toBe('DAILY');
    expect(out.occurredAt).toBe('2026-04-08T10:00:00.000Z');
    expect(out.errorCode).toBe('SESSION_NOT_JOINABLE_STATUS');
    expect(out.status).toBe('IN_PROGRESS');
    expect(out.reasonCode).toBe('TIME_WINDOW_CLOSED');
    expect(out.blockedReason).toBe('SESSION_NOT_JOINABLE_STATUS');
    expect(out.roomName).toBe('visible-room-name');
    expect(out.source).toBe('daily-webhook');
    expect(out.providerEventType).toBe('meeting.started');
  });
});
