import { NewsArticle } from '../types';
import { CONFIG } from './config';

const CACHE_KEY = 'serenity_news_cache';
const CACHE_TIME_KEY = 'serenity_news_timestamp';

// Helper: Fetch from Google RSS (Scraping/Proxy)
const fetchGoogleRSSData = async (query: string): Promise<NewsArticle[]> => {
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-IN&gl=IN&ceid=IN:en`;
  
  const proxyStrategies = [
    {
        url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
        type: 'json'
    },
    {
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`,
        type: 'xml_proxy'
    }
  ];

  for (const strategy of proxyStrategies) {
    try {
        const response = await fetch(strategy.url);
        if (!response.ok) continue;
        const data = await response.json().catch(() => null);

        if (strategy.type === 'json' && data?.status === 'ok' && data?.items) {
             return data.items.map((item: any, index: number) => ({
                title: item.title,
                description: item.description?.replace(/<[^>]*>?/gm, '') || '',
                url: item.link,
                image: item.enclosure?.link || `https://picsum.photos/seed/${index + Date.now()}/600/400`,
                source: 'Google News',
                publishedAt: item.pubDate
            }));
        }

        if (strategy.type === 'xml_proxy' && data?.contents) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data.contents, "text/xml");
            const items = Array.from(xml.querySelectorAll("item")).slice(0, 10);
            return items.map((item, index) => {
                const descriptionHtml = item.querySelector("description")?.textContent || "";
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = descriptionHtml;
                return {
                    title: item.querySelector("title")?.textContent || "News Update",
                    description: tempDiv.textContent || "",
                    url: item.querySelector("link")?.textContent || "#",
                    image: `https://picsum.photos/seed/${index + Date.now()}/600/400`,
                    source: item.querySelector("source")?.textContent || "Google News",
                    publishedAt: item.querySelector("pubDate")?.textContent || new Date().toISOString()
                };
            });
        }
    } catch (e) {
        console.warn(`RSS Strategy ${strategy.type} failed`, e);
    }
  }
  return [];
};

// Helper: Fetch from GNews API
const fetchGNewsData = async (query: string): Promise<NewsArticle[]> => {
    if (!CONFIG.GNEWS_API_KEY) return [];
    
    try {
      const cleanTopic = query.trim();
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(cleanTopic)}&lang=en&max=8&token=${CONFIG.GNEWS_API_KEY}`;
      const proxyUrls = [
        `https://corsproxy.io/?${encodeURIComponent(gnewsUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(gnewsUrl)}`
      ];

      for (const url of proxyUrls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.articles) {
                    return data.articles.map((article: any) => ({
                        title: article.title,
                        description: article.description,
                        url: article.url,
                        image: article.image || "https://picsum.photos/400/300",
                        source: article.source.name,
                        publishedAt: article.publishedAt
                    }));
                }
            }
          } catch(e) { console.log("GNews Proxy attempt failed"); }
      }
    } catch (error) {
      console.warn("GNews API failed");
    }
    return [];
};

export const fetchLatestNews = async (query: string = 'technology', forceRefresh = false): Promise<NewsArticle[]> => {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  const now = Date.now();
  const REFRESH_RATE = 20 * 60 * 1000;

  if (!forceRefresh && cachedData && cachedTime) {
    if ((now - parseInt(cachedTime)) < REFRESH_RATE) {
      return JSON.parse(cachedData);
    }
  }

  // PARALLEL FETCHING: Run both GNews and Google RSS at the same time
  console.log(`Fetching news for: ${query} from all sources...`);
  const [gnewsResult, rssResult] = await Promise.allSettled([
      fetchGNewsData(query),
      fetchGoogleRSSData(query)
  ]);

  const gnewsArticles = gnewsResult.status === 'fulfilled' ? gnewsResult.value : [];
  const rssArticles = rssResult.status === 'fulfilled' ? rssResult.value : [];

  // Combine results
  let combined = [...gnewsArticles, ...rssArticles];

  // Deduplicate based on URL or similar titles
  const seenUrls = new Set();
  combined = combined.filter(item => {
      const duplicate = seenUrls.has(item.url);
      seenUrls.add(item.url);
      return !duplicate;
  });

  // Limit total
  combined = combined.slice(0, 10);

  // Fallback if completely empty
  if (combined.length === 0) {
      combined = [
          {
            title: "Global Technology & Science Update",
            description: "No specific live news found right now, but technology continues to evolve.",
            url: "https://news.google.com",
            image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=60",
            source: "System Backup",
            publishedAt: new Date().toISOString()
          }
      ];
  }

  // Update Cache
  if (combined.length > 0) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(combined));
    localStorage.setItem(CACHE_TIME_KEY, now.toString());
  }

  return combined;
};

export const checkAndNotifyNews = async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    const articles = await fetchLatestNews('trending', false);
    if (articles.length > 0 && Math.random() > 0.7 && articles[0].source !== "System Backup") {
       new Notification("Serenity Updates", {
         body: articles[0].title,
         icon: '/favicon.ico'
       });
    }
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
};