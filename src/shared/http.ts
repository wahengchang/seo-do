import { chromium, Browser } from 'playwright';
import type { FetchPageResult } from '../types.js';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: false });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function fetchPage(url: string): Promise<FetchPageResult> {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let finalUrl = url;
  let statusCode = 200;
  let contentType = '';
  let headers: Record<string, string> = {};

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (response) {
      finalUrl = response.url();
      statusCode = response.status();
      headers = await response.allHeaders();
      contentType = headers['content-type'] ?? '';
    }

    const body = await page.content();
    return {
      url,
      finalUrl,
      statusCode,
      contentType,
      body,
      redirected: finalUrl !== url,
      headers,
    };
  } finally {
    await context.close();
  }
}
