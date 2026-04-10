import type { AuditRecord, DiffRecord, RobotsDirective, SitemapAuditRecord } from './types.js';

export const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);

export const NON_HTML_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.zip',
  '.rar',
  '.mp4',
  '.mp3',
  '.mov',
  '.avi',
  '.woff',
  '.woff2',
  '.ttf',
  '.ico',
  '.xml',
  '.json',
];

export const ROBOTS_COLUMNS: Array<keyof RobotsDirective> = [
  'userAgent',
  'directive',
  'value',
];

export const DIFF_COLUMNS: Array<keyof DiffRecord> = [
  'resourceType',
  'url',
  'changeType',
  'field',
  'oldValue',
  'newValue',
];

export const SITEMAP_AUDIT_COLUMNS: Array<keyof SitemapAuditRecord> = [
  'url',
  'sitemapFile',
  'lastmod',
  'changefreq',
  'priority',
  'hreflangCount',
  'hreflangValues',
  'isDuplicate',
  'isUtf8',
  'isValidXml',
  'hasValidNamespace',
];

export const AUDIT_COLUMNS: Array<keyof AuditRecord> = [
  'url',
  'title',
  'description',
  'canonical',
  'isRedirect',
  'h1Count',
  'h1Text',
  'h2Count',
  'h2Text',
  'h3Count',
  'h3Text',
  'size',
  'ga4Count',
  'ga4Ids',
  'gtmCount',
  'gtmIds',
  'isBreadcrumb',
  'isBlogPosting',
  'isArticle',
  'isFaq',
  'isLogo',
  'isSsr',
  'countStructureData',
];
