import { NON_HTML_EXTENSIONS, TRACKING_PARAMS } from '../constants.js';
import type { SkipReason } from '../types.js';

const UNSUPPORTED_PROTOCOLS = ['mailto:', 'tel:', 'javascript:'];

export function normalizeUrl(rawUrl: string, baseUrl: string, origin: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (UNSUPPORTED_PROTOCOLS.some((protocol) => trimmed.toLowerCase().startsWith(protocol))) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, baseUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== origin) return null;

  parsed.hash = '';

  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key)) {
      parsed.searchParams.delete(key);
    }
  }

  if ((parsed.pathname !== '/' && parsed.pathname.endsWith('/')) || parsed.pathname === '') {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  }

  parsed.hostname = parsed.hostname.toLowerCase();

  return parsed.toString();
}

export function getSkipReason(rawUrl: string, baseUrl: string, origin: string): SkipReason | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'invalid';

  if (UNSUPPORTED_PROTOCOLS.some((protocol) => trimmed.toLowerCase().startsWith(protocol))) {
    return 'unsupported_protocol';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, baseUrl);
  } catch {
    return 'invalid';
  }

  if (parsed.origin !== origin) return 'external';
  if (isNonHtmlResource(parsed.pathname)) return 'non_html_resource';

  return null;
}

export function isNonHtmlResource(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return NON_HTML_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
