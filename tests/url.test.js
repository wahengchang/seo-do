import { describe, expect, it } from 'vitest';
import { getSkipReason, normalizeUrl } from '../src/shared/url.js';
describe('normalizeUrl', () => {
    it('removes tracking params and fragments', () => {
        const url = normalizeUrl('/about?utm_source=x&utm_campaign=y&id=1#section', 'https://example.com/', 'https://example.com');
        expect(url).toBe('https://example.com/about?id=1');
    });
    it('returns null for external URLs', () => {
        const url = normalizeUrl('https://other.com/page', 'https://example.com/', 'https://example.com');
        expect(url).toBeNull();
    });
});
describe('getSkipReason', () => {
    it('flags non-html resources', () => {
        expect(getSkipReason('/brochure.pdf', 'https://example.com/', 'https://example.com')).toBe('non_html_resource');
    });
    it('flags unsupported protocols', () => {
        expect(getSkipReason('mailto:test@example.com', 'https://example.com/', 'https://example.com')).toBe('unsupported_protocol');
    });
});
