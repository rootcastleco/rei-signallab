import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, getApiBaseUrl, safeFetchJson, verifyBackendHandshake } from './config';

const jsonResponse = (body, { status = 200, ok = status < 400 } = {}) => ({
  ok,
  status,
  headers: { get: () => 'application/json' },
  text: async () => JSON.stringify(body),
});

const rawResponse = (text, { status = 200, contentType = 'text/html' } = {}) => ({
  ok: status < 400,
  status,
  headers: { get: () => contentType },
  text: async () => text,
});

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('getApiBaseUrl', () => {
  it('prefers an explicitly configured base URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.signallab.site');
    expect(getApiBaseUrl()).toBe('https://api.signallab.site');
  });

  it('strips trailing slashes so paths do not double up', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.signallab.site///');
    expect(getApiBaseUrl()).toBe('https://api.signallab.site');
  });

  it('falls back to the local backend during development', () => {
    // jsdom serves the suite from localhost.
    expect(getApiBaseUrl()).toBe('http://localhost:8000');
  });
});

describe('safeFetchJson', () => {
  it('returns the parsed payload on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ready' })));

    await expect(safeFetchJson('/api/health/ready')).resolves.toEqual({ status: 'ready' });
  });

  it('rejects an HTML response instead of parsing it as data', async () => {
    // A stale CDN cache or a misrouted proxy serves index.html on /api/**;
    // silently treating that as data is what produced confusing UI states.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rawResponse('<!doctype html>')));

    await expect(safeFetchJson('/api/version')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NON_JSON_RESPONSE',
    });
  });

  it('surfaces the structured error envelope from a failed request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests.' },
          { status: 429 },
        ),
      ),
    );

    await expect(safeFetchJson('/api/process')).rejects.toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
    });
  });

  it('reports invalid JSON distinctly from a non-JSON content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => '{ truncated',
      }),
    );

    await expect(safeFetchJson('/api/nodes')).rejects.toMatchObject({
      code: 'INVALID_JSON_RESPONSE',
    });
  });

  it('maps an aborted request to a timeout error', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(safeFetchJson('/api/process')).rejects.toMatchObject({
      code: 'API_TIMEOUT',
    });
  });

  it('maps a transport failure to a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(safeFetchJson('/api/process')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('leaves absolute URLs untouched', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await safeFetchJson('https://signallab.site/api/version');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://signallab.site/api/version',
      expect.anything(),
    );
  });
});

describe('verifyBackendHandshake', () => {
  const readyBody = { status: 'ready' };
  const manifest = (overrides = {}) => ({
    service: 'rei-signallab-api',
    version: '2.1.0',
    apiVersion: 'v1',
    commitSha: '1a2b3c4',
    ...overrides,
  });

  const stubHandshake = (ready, version) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) =>
        Promise.resolve(jsonResponse(String(url).includes('/version') ? version : ready)),
      ),
    );
  };

  it('verifies a healthy, version-matched backend', async () => {
    stubHandshake(readyBody, manifest());
    await expect(verifyBackendHandshake()).resolves.toBe('API_VERIFIED');
  });

  it('reports an unavailable backend when readiness fails', async () => {
    stubHandshake({ status: 'not_ready' }, manifest());
    await expect(verifyBackendHandshake()).resolves.toBe('BACKEND_UNAVAILABLE');
  });

  it('detects a foreign service answering on the API path', async () => {
    stubHandshake(readyBody, manifest({ service: 'some-other-api' }));
    await expect(verifyBackendHandshake()).resolves.toBe('BACKEND_IDENTITY_MISMATCH');
  });

  it('detects an API version mismatch', async () => {
    stubHandshake(readyBody, manifest({ apiVersion: 'v2' }));
    await expect(verifyBackendHandshake()).resolves.toBe('API_VERSION_MISMATCH');
  });

  it('flags a build whose commit SHA was never injected', async () => {
    stubHandshake(readyBody, manifest({ commitSha: 'environment-derived' }));
    await expect(verifyBackendHandshake()).resolves.toBe('BACKEND_BUILD_UNVERIFIED');
  });

  it('treats a transport failure as an unavailable backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(verifyBackendHandshake()).resolves.toBe('BACKEND_UNAVAILABLE');
  });
});

describe('ApiError', () => {
  it('carries the structured fields the UI branches on', () => {
    const error = new ApiError('SANDBOX_DISABLED', 'Sandbox is off.', 403, { a: 1 });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('SANDBOX_DISABLED');
    expect(error.status).toBe(403);
    expect(error.details).toEqual({ a: 1 });
  });
});
