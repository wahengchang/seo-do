export type SkipReason =
  | 'external'
  | 'duplicate'
  | 'invalid'
  | 'non_html_resource'
  | 'unsupported_protocol';

export interface StatePaths {
  stateDir: string;
  queueFile: string;
  doneFile: string;
  skippedFile: string;
  errorFile: string;
  auditFile: string;
}

export interface CrawlOptions {
  stateDir: string;
  maxPages: number;
}

export interface AuditOptions {
  output: string;
  origin?: string;
  stateDir?: string;
}

export interface SkippedRecord {
  url: string;
  reason: SkipReason;
}

export interface ErrorRecord {
  url: string;
  stage: 'crawl' | 'audit';
  message: string;
}

export interface FetchPageResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  body: string;
  redirected: boolean;
  headers: Record<string, string>;
}

export interface Project {
  name: string;
  url: string;
  createdAt: string; // ISO 8601
}

export interface AuditRecord {
  url: string;
  title: string;
  description: string;
  canonical: string;
  isRedirect: 'TRUE' | 'FALSE';
  h1Count: number;
  h1Text: string;
  h2Count: number;
  h2Text: string;
  h3Count: number;
  h3Text: string;
  size: number;
  ga4Count: number;
  ga4Ids: string;
  gtmCount: number;
  gtmIds: string;
  isBreadcrumb: 'TRUE' | 'FALSE';
  isBlogPosting: 'TRUE' | 'FALSE';
  isArticle: 'TRUE' | 'FALSE';
  isFaq: 'TRUE' | 'FALSE';
  isLogo: 'TRUE' | 'FALSE';
  isSsr: 'TRUE' | 'FALSE';
  countStructureData: number;
}

