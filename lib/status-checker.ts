import { StatusCheckResult } from '@/types';

export async function checkUrlStatus(targetUrl: string, timeoutMs: number = 6000): Promise<StatusCheckResult> {
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    // Try HEAD request first for efficiency
    try {
      response = await fetch(normalizedUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HubStatusChecker/1.0',
        },
      });

      // If HEAD is not allowed, fall back to GET
      if (response.status === 405 || response.status === 403 || response.status === 501) {
        throw new Error('HEAD not supported, fallback to GET');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw e;
      }
      // Retry with GET
      response = await fetch(normalizedUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HubStatusChecker/1.0',
        },
      });
    }

    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;

    // 2xx and 3xx are considered online, 4xx is reachable but client error, 5xx is server error
    const isOnline = response.status >= 200 && response.status < 400;

    return {
      isOnline,
      statusCode: response.status,
      statusText: `${response.status} ${response.statusText || (isOnline ? 'OK' : 'Error')}`,
      latencyMs,
      lastChecked: timestamp,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    let errorMessage = error.message || 'Error de conexión';

    if (error.name === 'AbortError') {
      errorMessage = `Timeout (> ${timeoutMs / 1000}s)`;
    } else if (error.code === 'ENOTFOUND' || errorMessage.includes('getaddrinfo')) {
      errorMessage = 'DNS no encontrado';
    } else if (error.code === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = 'Conexión rechazada (Servicio apagado)';
    }

    return {
      isOnline: false,
      statusCode: null,
      statusText: errorMessage,
      latencyMs: latencyMs < timeoutMs ? latencyMs : null,
      lastChecked: timestamp,
      error: errorMessage,
    };
  }
}
