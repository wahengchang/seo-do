import { describe, expect, it } from 'vitest';
import { buildAuditRecord } from '../src/extractors/audit-record.js';
describe('buildAuditRecord', () => {
    it('extracts SEO and structured fields', () => {
        const record = buildAuditRecord({
            url: 'https://example.com/blog',
            finalUrl: 'https://example.com/blog',
            statusCode: 200,
            contentType: 'text/html',
            redirected: false,
            headers: {},
            body: `
          <html>
            <head>
              <title>Example Blog</title>
              <meta name="description" content="Example description" />
              <link rel="canonical" href="https://example.com/blog" />
              <script type="application/ld+json">
                {"@type":"BlogPosting","logo":"https://example.com/logo.png"}
              </script>
            </head>
            <body>
              <h1>Example H1</h1>
              <h2>Example H2</h2>
              <script>gtag('config', 'G-ABC1234');</script>
              <script>(function(){'GTM-XYZ123';})();</script>
            </body>
          </html>
        `,
        }, 'https://example.com');
        expect(record.title).toBe('Example Blog');
        expect(record.description).toBe('Example description');
        expect(record.canonical).toBe('https://example.com/blog');
        expect(record.h1Count).toBe(1);
        expect(record.ga4Count).toBe(1);
        expect(record.gtmCount).toBe(1);
        expect(record.isBlogPosting).toBe('TRUE');
        expect(record.isLogo).toBe('TRUE');
        expect(record.countStructureData).toBe(1);
    });
});
