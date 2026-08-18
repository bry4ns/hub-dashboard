import * as cheerio from 'cheerio';
import { ScrapedMetadata } from '@/types';

export async function scrapeUrlMetadata(targetUrl: string): Promise<ScrapedMetadata> {
  // Ensure valid URL with protocol
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const parsedTarget = new URL(normalizedUrl);
  const origin = parsedTarget.origin;

  const result: ScrapedMetadata = {
    title: '',
    description: '',
    iconUrl: `https://www.google.com/s2/favicons?domain=${parsedTarget.hostname}&sz=128`,
    imageUrl: '',
    siteName: parsedTarget.hostname,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      // Return basic metadata based on URL if HTTP fails
      result.title = parsedTarget.hostname;
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Title extraction
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const pageTitle = $('title').text();
    const h1 = $('h1').first().text();

    result.title = (ogTitle || twitterTitle || pageTitle || h1 || parsedTarget.hostname).trim();

    // 2. Description extraction
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const metaDesc = $('meta[name="description"]').attr('content');
    const twitterDesc = $('meta[name="twitter:description"]').attr('content');

    result.description = (ogDesc || metaDesc || twitterDesc || '').trim();

    // 3. Site Name
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    if (ogSiteName) {
      result.siteName = ogSiteName.trim();
    }

    // 4. Image Extraction (OpenGraph / Twitter Card / Featured)
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:secure_url"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content') || $('meta[name="twitter:image:src"]').attr('content');
    const rawImage = ogImage || twitterImage;

    if (rawImage) {
      try {
        result.imageUrl = new URL(rawImage, normalizedUrl).href;
      } catch (e) {
        result.imageUrl = rawImage;
      }
    }

    // 5. Favicon / Icon extraction
    const iconCandidates = [
      $('link[rel="apple-touch-icon"]').attr('href'),
      $('link[rel="icon"][sizes="192x192"]').attr('href'),
      $('link[rel="icon"][sizes="32x32"]').attr('href'),
      $('link[rel="icon"]').attr('href'),
      $('link[rel="shortcut icon"]').attr('href'),
    ].filter(Boolean) as string[];

    if (iconCandidates.length > 0) {
      try {
        result.iconUrl = new URL(iconCandidates[0], normalizedUrl).href;
      } catch (e) {
        // keep fallback
      }
    }

    return result;
  } catch (error) {
    console.warn(`Scraping warning for ${normalizedUrl}:`, error);
    // Fallback gracefully
    result.title = result.title || parsedTarget.hostname;
    return result;
  }
}
