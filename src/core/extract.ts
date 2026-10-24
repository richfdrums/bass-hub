// Product-page scraper for Smart Extract, shared by both shells.
//
// Uses global `fetch` (Node's in Electron main, CapacitorHttp's native bridge
// on iPad) rather than axios, because `fetch` is the one HTTP seam that works
// identically on both. Selectors are Tackle Warehouse first, then
// itemprop/OpenGraph fallbacks — brittle by nature, retest on a real URL.

import * as cheerio from 'cheerio';
import type { ExtractResult } from '../shared/api';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

const BRANDS = [
  'Shimano', 'Daiwa', 'St. Croix', 'Abu Garcia', "Lew's", 'Gary Yamamoto',
  'Strike King', 'Megabass', 'Berkley', 'Rapala', 'Zoom', 'G.Loomis',
  'Dobyns', 'Fenwick', 'Pflueger', 'Okuma', '13 Fishing', 'Jackall',
  'Keitech', 'Z-Man', 'Missile Baits', 'Lunker City', 'Reaction Innovations',
  'NetBait', 'Roboworm', 'V&M', 'Zoom Bait', 'Owner',
];

/**
 * Best-effort `<title>` for a URL, used to prefill quick-link titles.
 * Returns '' on any failure — callers treat it as "leave the field blank".
 * Accept-Encoding is deliberately omitted: fetch and URLSession each handle
 * compression themselves, and forwarding it breaks decoding through
 * CapacitorHttp.
 */
export async function fetchPageTitle(url: string): Promise<string> {
  try {
    // Basic validation / adding protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return '';
    const $ = cheerio.load(await response.text());
    const title = $('title').text();
    return title ? title.trim() : '';
  } catch (err) {
    console.error('Fetch title failed:', err instanceof Error ? err.message : err);
    return '';
  }
}

export async function extractGearDetails(url: string): Promise<ExtractResult> {
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.error('Extraction failed:', response.status, url);
      return { success: false, error: `Could not fetch page details (HTTP ${response.status}).` };
    }

    const $ = cheerio.load(await response.text());

    const title = $('title').text() || $('h1').first().text();

    // Target the specific description div for TW, otherwise fallback to meta tags
    let description = '';
    const descElement = $('[itemprop="description"]');
    if (descElement.length) {
      // Get text from paragraphs to preserve structure, excluding h2/headings
      description = descElement.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
      if (!description) description = descElement.text().trim();
    }

    if (!description) {
      description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';
    }

    // Clean up excessive whitespace but preserve newlines
    description = description.replace(/[^\S\r\n]+/g, ' ').trim();

    // Brand Extraction
    let brand =
      $('#main_content meta[itemprop="brand"]').attr('content') || // Tackle Warehouse underscored meta
      $('#main-content meta[itemprop="brand"]').attr('content') || // Hyphenated meta
      $('.brand-name').text().trim() ||
      $('.desc_top-head-brand').text().replace('Shop All', '').trim() || // TW description link
      $('[itemprop="brand"]').attr('content') || // General meta itemprop
      $('[itemprop="brand"]').text().trim() ||
      $('[itemprop="brand"] [itemprop="name"]').text().trim() ||
      $('meta[property="og:brand"]').attr('content') ||
      '';

    if (!brand) {
      brand = BRANDS.find((b) => title.toLowerCase().includes(b.toLowerCase())) || '';
    }

    // Model - extract from title (remove brand)
    let model = title.split('|')[0].split('-')[0].trim();
    if (brand) {
      model = model.replace(new RegExp(brand, 'gi'), '').trim();
    }

    // Image Extraction
    let imageUrl =
      $('img.main_image').attr('src') || // Tackle Warehouse specific
      $('[itemprop="image"]').attr('src') ||
      $('[itemprop="image"]').attr('content') ||
      $('meta[property="og:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      '';

    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url).origin;
      imageUrl = new URL(imageUrl, baseUrl).href;
    }

    // Enhanced Category Detection
    let category = 'Lures'; // Default
    const breadcrumbs =
      $('.breadcrumb').text().toLowerCase() || // Common class
      $('.desc_top-head-breadcrumb').text().toLowerCase() || // TW specific
      $('#breadcrumb').text().toLowerCase() ||
      '';

    const modelLower = model.toLowerCase();
    const titleLower = title.toLowerCase();

    // Combine for broad search, but we will prioritize specific areas
    const searchableContent = (title + ' ' + description + ' ' + breadcrumbs).toLowerCase();

    // LURE KEYWORDS (Check Model/Title first as high signal)
    const lureKeywords = ['bait', 'lure', 'jerkbait', 'crankbait', 'swimbait', 'frog', 'worm', 'stickbait', 'creature', 'minnow', 'topwater', 'popper'];
    const isLureModel = lureKeywords.some((k) => modelLower.includes(k)) || lureKeywords.some((k) => titleLower.includes(k));

    // TERMINAL KEYWORDS
    const terminalKeywords = ['hook', 'weight', 'jighead', 'sinker', 'terminal tackle', 'split shot'];
    const isTerminalModel = terminalKeywords.some((k) => modelLower.includes(k)) || (terminalKeywords.some((k) => titleLower.includes(k)) && !isLureModel);

    // 1. Check Rods (Highly specific)
    if (modelLower.includes('rod') || titleLower.includes('rod') || breadcrumbs.includes('rod')) {
      category = 'Rods';
    }
    // 2. Check Reels (Highly specific)
    else if (modelLower.includes('reel') || titleLower.includes('reel') || breadcrumbs.includes('reel')) {
      category = 'Reels';
    }
    // 3. Priority Signal: Is the Model/Title explicitly a Lure? (Overrides description-based Terminal matches)
    else if (isLureModel) {
      category = 'Lures';
    }
    // 4. Priority Signal: Is the Model/Title explicitly Terminal?
    else if (isTerminalModel) {
      category = 'Terminal Tackle';
    }
    // 5. Fallback: Check Description for Line keywords
    else if (
      searchableContent.includes('braid') ||
      searchableContent.includes('flouro') ||
      searchableContent.includes('fluorocarbon') ||
      searchableContent.includes('monofilament') ||
      searchableContent.includes('leader') ||
      searchableContent.includes('copolymer') ||
      (searchableContent.includes('line') && !isLureModel)
    ) {
      category = 'Fishing Line';
    }
    // 6. Deep Fallback: Check full content for Terminal (hooks in description)
    else if (terminalKeywords.some((k) => searchableContent.includes(k))) {
      category = 'Terminal Tackle';
    }
    // 7. Final Default
    else {
      category = 'Lures';
    }

    return {
      success: true,
      data: {
        category,
        brand,
        model,
        description: description.substring(0, 2000) + (description.length > 2000 ? '...' : ''),
        url,
        extracted_image_url: imageUrl,
      },
    };
  } catch (error) {
    console.error('Extraction failed:', error);
    return { success: false, error: 'Could not fetch page details.' };
  }
}
