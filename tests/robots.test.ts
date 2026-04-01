import { describe, expect, it } from 'vitest';
import { parseRobotsTxt } from '../src/shared/robots.js';

describe('parseRobotsTxt', () => {
  it('parses Disallow and Allow rules for a user-agent', () => {
    const content = `User-agent: *
Disallow: /admin
Allow: /admin/public`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ userAgent: '*', directive: 'Disallow', value: '/admin' });
    expect(result[1]).toEqual({ userAgent: '*', directive: 'Allow', value: '/admin/public' });
  });

  it('parses multiple user-agent blocks separately', () => {
    const content = `User-agent: Googlebot
Disallow: /private

User-agent: *
Disallow: /secret`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ userAgent: 'Googlebot', directive: 'Disallow', value: '/private' });
    expect(result[1]).toEqual({ userAgent: '*', directive: 'Disallow', value: '/secret' });
  });

  it('extracts Sitemap lines as global rows with empty userAgent', () => {
    const content = `User-agent: *
Disallow: /tmp

Sitemap: https://example.com/sitemap.xml`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      userAgent: '',
      directive: 'Sitemap',
      value: 'https://example.com/sitemap.xml',
    });
  });

  it('extracts Crawl-delay with the current user-agent', () => {
    const content = `User-agent: Bingbot
Crawl-delay: 10`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ userAgent: 'Bingbot', directive: 'Crawl-delay', value: '10' });
  });

  it('ignores comment lines and blank lines', () => {
    const content = `# This is a comment
User-agent: *

# Another comment
Disallow: /admin`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ userAgent: '*', directive: 'Disallow', value: '/admin' });
  });

  it('handles case-insensitive directive names', () => {
    const content = `user-agent: *
disallow: /foo
ALLOW: /bar`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(2);
    expect(result[0].directive).toBe('Disallow');
    expect(result[1].directive).toBe('Allow');
  });

  it('returns empty array for empty input', () => {
    expect(parseRobotsTxt('')).toEqual([]);
  });

  it('handles Disallow with empty value', () => {
    const content = `User-agent: *
Disallow:`;
    const result = parseRobotsTxt(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ userAgent: '*', directive: 'Disallow', value: '' });
  });
});
