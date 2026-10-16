const SESSION_KEY = 'foliolive_correlation_session_id';

/**
 * Returns the stable session-level correlation ID for this browser tab,
 * creating one if not present in sessionStorage.
 */
export function getSessionCorrelationId(): string {
  if (typeof window === 'undefined') return 'ssr-session';
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess_${crypto.randomUUID()}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Generates a unique UUID v4 request correlation ID.
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Installs a transparent fetch interceptor that attaches X-Correlation-ID
 * to all outgoing HTTP requests across shell and mounted MFEs.
 */
export function initCorrelationInterceptor(): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Record<string, unknown>;
  if (win.__foliolive_correlation_initialized) return;
  win.__foliolive_correlation_initialized = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const headers = new Headers(init?.headers);
      if (!headers.has('X-Correlation-ID')) {
        headers.set('X-Correlation-ID', generateRequestId());
      }
      return await originalFetch(input, { ...init, headers });
    } catch (err) {
      return await originalFetch(input, init);
    }
  };
}
