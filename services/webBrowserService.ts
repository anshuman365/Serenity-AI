
import { CONFIG } from './config';

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
}

const PROXY_URL = "https://api.allorigins.win/get?url=";

/**
 * Extracts links from Google search results HTML
 */
const extractGoogleLinks = (html: string): string[] => {
  const urls: string[] = [];
  // Basic regex to find search result links in Google HTML
  // Google often formats links as /url?q=URL...
  const regex = /\/url\?q=(https?:\/\/[^&|>|"|']+)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = decodeURIComponent(match[1]);
    // Filter out internal google links
    if (!url.includes('google.com') && !url.includes('webcache') && urls.length < 8) {
      urls.push(url);
    }
  }
  return [...new Set(urls)]; // Deduplicate
};

/**
 * Cleans HTML to get readable text
 */
const cleanHtmlContent = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Remove non-content tags
  const toRemove = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe', 'ad', 'popup'];
  toRemove.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Get text content and clean whitespace
  return doc.body.innerText
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 2500); // Limit per page to stay within AI context limits
};

export const searchAndScrape = async (
  query: string, 
  onProgress: (status: string) => void
): Promise<ScrapedPage[]> => {
  try {
    onProgress(`Searching Google for "${query}"...`);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(searchUrl)}`);
    const data = await response.json();
    
    if (!data.contents) throw new Error("Could not reach Google search");
    
    const links = extractGoogleLinks(data.contents);
    if (links.length === 0) throw new Error("No links found in search results");

    const scrapedPages: ScrapedPage[] = [];
    
    // Scrape top 4 valid links to keep it fast and within context limits
    for (const url of links.slice(0, 4)) {
      try {
        const domain = new URL(url).hostname;
        onProgress(`Reading ${domain}...`);
        
        const pageResponse = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
        const pageData = await pageResponse.json();
        
        if (pageData.contents) {
          const content = cleanHtmlContent(pageData.contents);
          if (content.length > 200) {
            scrapedPages.push({
              url,
              title: domain,
              content
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to scrape ${url}`, err);
      }
    }

    return scrapedPages;
  } catch (error) {
    console.error("Manual search error:", error);
    throw error;
  }
};
