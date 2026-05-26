const DEFAULT_WEBSITE_URL = 'https://example.com';

export function defaultWebsiteUrl(): string {
  return DEFAULT_WEBSITE_URL;
}

/** Allow http(s) URLs only; fall back to the demo default when invalid. */
export function sanitizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_WEBSITE_URL;
  }

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_WEBSITE_URL;
    }
    return parsed.toString();
  } catch {
    return DEFAULT_WEBSITE_URL;
  }
}
