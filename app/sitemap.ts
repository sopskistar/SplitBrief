import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/demo', '/verify', '/judges', '/privacy', '/how-it-works'].map((path) => ({
    url: `${siteUrl()}${path}`,
    lastModified: new Date('2026-11-08'),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }));
}
