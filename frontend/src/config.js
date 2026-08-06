/**
 * Structured API Error Class
 */
export class ApiError extends Error {
  constructor(code, message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Returns the configured API base URL.
 * Defaults to http://localhost:8000 in local dev and relative '' in production (for Firebase Hosting proxying).
 */
export const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }

  return '';
};

/**
 * Robust JSON fetch wrapper with AbortController timeout, Content-Type validation,
 * structured ApiError handling, and non-JSON / HTML response rejection.
 *
 * @param {string} endpoint - API route path or full URL
 * @param {RequestInit} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default 30000)
 * @returns {Promise<any>} Parsed JSON payload
 */
export const safeFetchJson = async (endpoint, options = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = getApiBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();

    if (!contentType.includes('application/json')) {
      throw new ApiError(
        'NON_JSON_RESPONSE',
        'API returned a non-JSON response (e.g. HTML proxy page or stale cache).',
        response.status
      );
    }

    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError(
        'INVALID_JSON_RESPONSE',
        'API response could not be parsed as valid JSON.',
        response.status
      );
    }

    if (!response.ok) {
      const message = typeof payload?.detail === 'string'
        ? payload.detail
        : (payload?.message || `HTTP ${response.status}`);

      throw new ApiError(
        payload?.code ?? `HTTP_${response.status}`,
        message,
        response.status,
        payload
      );
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('API_TIMEOUT', 'The API request timed out.', 0);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('NETWORK_ERROR', error?.message || 'Network fetch failure.', 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

/**
 * Frontend Backend Connection Handshake & State Machine.
 * Validates backend readiness (/api/health/ready) and release version (/api/version).
 *
 * @returns {Promise<'API_VERIFIED' | 'API_VERSION_MISMATCH' | 'BACKEND_UNAVAILABLE'>} Handshake status
 */
export const verifyBackendHandshake = async () => {
  try {
    const expectedVersion = import.meta.env.VITE_EXPECTED_API_VERSION?.trim() || '2.1.0';

    const [readyRes, versionRes] = await Promise.all([
      safeFetchJson('/api/health/ready', {}, 5000),
      safeFetchJson('/api/version', {}, 5000)
    ]);

    if (readyRes?.status !== 'ready') {
      return 'BACKEND_UNAVAILABLE';
    }

    if (versionRes?.version && versionRes.version !== expectedVersion) {
      console.warn(`[Handshake] Version mismatch: expected ${expectedVersion}, got ${versionRes.version}`);
      return 'API_VERSION_MISMATCH';
    }

    return 'API_VERIFIED';
  } catch (err) {
    console.warn('[Handshake] Backend health check failed:', err.message);
    return 'BACKEND_UNAVAILABLE';
  }
};
