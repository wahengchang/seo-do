import { fetch } from 'undici';
import type { FetchPageResult } from '../types.js';

export async function fetchPage(url: string): Promise<FetchPageResult> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'user-agent': 'seo-cli-audit/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  const body = await response.text();
  const headers = Object.fromEntries(response.headers.entries());

  return {
    url,
    finalUrl: response.url,
    statusCode: response.status,
    contentType: response.headers.get('content-type') ?? '',
    body,
    redirected: response.url !== url,
    headers,
  };
}
