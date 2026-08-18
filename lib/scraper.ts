import { ScrapedMetadata } from '@/types';

// Polyfill global File / Blob if missing in older Node 18 runtimes
if (typeof globalThis.File === 'undefined') {
  class FilePolyfill {
    name: string;
    constructor(chunks: any[], filename: string) {
      this.name = filename;
    }
  }
  (globalThis as any).File = FilePolyfill;
}

// Fast and safe HTML attribute extractor without requiring heavy DOM bindings
function extractMetaContent(html: string, property: string): string | null {
  // Regex for property="..." content="..." or content="..." property="..."
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
  
  const match = html.match(regex1) || html.match(regex2);
  return match ? match[1] : null;
}

function extractTagContent(html: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : null;
}

function extractLinkHref(html: string, relPattern: string): string | null {
  const regex = new RegExp(`<link[^>]+rel=["'][^"']*${relPattern}[^"']*["'][^>]+href=["']([^"']+)["']`, 'i');
  const regex2 = new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${relPattern}[^"']*["']`, 'i');
  const match = html.match(regex) || html.match(regex2);
  return match ? match[1] : null;
}

export async function scrapeUrlMetadata(targetUrl: string): Promise<ScrapedMetadata> {
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(normalizedUrl);
  } catch (e) {
    return {
      title: targetUrl,
      description: '',
      iconUrl: '',
      imageUrl: '',
      siteName: '',
    };
  }

  const result: ScrapedMetadata = {
    title: '',
    description: '',
    iconUrl: `https://www.google.com/s2/favicons?domain=${parsedTarget.hostname}&sz=128`,
    imageUrl: '',
    siteName: parsedTarget.hostname,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      result.title = parsedTarget.hostname;
      return result;
    }

    const html = await response.text();

    // 1. Title
    const ogTitle = extractMetaContent(html, 'og:title');
    const twitterTitle = extractMetaContent(html, 'twitter:title');
    const pageTitle = extractTagContent(html, 'title');
    const h1 = extractTagContent(html, 'h1');

    result.title = (ogTitle || twitterTitle || pageTitle || h1 || parsedTarget.hostname).trim();

    // 2. Description
    const ogDesc = extractMetaContent(html, 'og:description');
    const metaDesc = extractMetaContent(html, 'description');
    const twitterDesc = extractMetaContent(html, 'twitter:description');

    result.description = (ogDesc || metaDesc || twitterDesc || '').trim();

    // 3. Site Name
    const ogSiteName = extractMetaContent(html, 'og:site_name');
    if (ogSiteName) {
      result.siteName = ogSiteName.trim();
    }

    // 4. Image
    const ogImage = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'og:image:secure_url');
    const twitterImage = extractMetaContent(html, 'twitter:image') || extractMetaContent(html, 'twitter:image:src');
    const rawImage = ogImage || twitterImage;

    if (rawImage) {
      try {
        result.imageUrl = new URL(rawImage, normalizedUrl).href;
      } catch (e) {
        result.imageUrl = rawImage;
      }
    }

    // 5. Favicon
    const appleIcon = extractLinkHref(html, 'apple-touch-icon');
    const standardIcon = extractLinkHref(html, 'icon') || extractLinkHref(html, 'shortcut icon');
    const candidateIcon = appleIcon || standardIcon;

    if (candidateIcon) {
      try {
        result.iconUrl = new URL(candidateIcon, normalizedUrl).href;
      } catch (e) {
        // fallback
      }
    }

    return result;
  } catch (error) {
    result.title = result.title || parsedTarget.hostname;
    return result;
  }
}
