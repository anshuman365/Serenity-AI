
import { NewsArticle } from '../types';
import { CONFIG } from './config';

const CACHE_KEY = 'serenity_news_cache';
const CACHE_TIME_KEY = 'serenity_news_timestamp';

// Helper for relative time formatting
export const formatRelativeTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch (e) {
    return 'Recently';
  }
};

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
                image: item.enclosure?.link || `https://picsum.photos/seed/${encodeURIComponent(item.title)}/600/400`,
                source: item.author || 'Global News',
                publishedAt: item.pubDate
            }));
        }

        if (strategy.type === 'xml_proxy' && data?.contents) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data.contents, "text/xml");
            const items = Array.from(xml.querySelectorAll("item")).slice(0, 10);
            return items.map((item, index) => {
                const title = item.querySelector("title")?.textContent || "";
                const descriptionHtml = item.querySelector("description")?.textContent || "";
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = descriptionHtml;
                return {
                    title: title,
                    description: tempDiv.textContent || "",
                    url: item.querySelector("link")?.textContent || "#",
                    image: `https://picsum.photos/seed/${encodeURIComponent(title)}/600/400`,
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

const fetchGNewsData = async (query: string): Promise<NewsArticle[]> => {
    if (!CONFIG.GNEWS_API_KEY) return [];
    
    try {
      const cleanTopic = query.trim();
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(cleanTopic)}&lang=en&max=8&token=${CONFIG.GNEWS_API_KEY}`;
      
      const response = await fetch(gnewsUrl);
      if (response.ok) {
          const data = await response.json();
          if (data.articles) {
              return data.articles.map((article: any) => ({
                  title: article.title,
                  description: article.description,
                  url: article.url,
                  image: article.image || `https://picsum.photos/seed/${encodeURIComponent(article.title)}/600/400`,
                  source: article.source.name,
                  publishedAt: article.publishedAt
              }));
          }
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
  const REFRESH_RATE = 15 * 60 * 1000; // 15 mins cache

  if (!forceRefresh && cachedData && cachedTime) {
    if ((now - parseInt(cachedTime)) < REFRESH_RATE) {
      return JSON.parse(cachedData);
    }
  }

  const [gnewsResult, rssResult] = await Promise.allSettled([
      fetchGNewsData(query),
      fetchGoogleRSSData(query)
  ]);

  const gnewsArticles = gnewsResult.status === 'fulfilled' ? gnewsResult.value : [];
  const rssArticles = rssResult.status === 'fulfilled' ? rssResult.value : [];

  let combined = [...gnewsArticles, ...rssArticles];

  // Smarter Deduplication based on title similarity
  const seenTitles = new Set();
  combined = combined.filter(item => {
      const titleKey = item.title.toLowerCase().substring(0, 30);
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
  });

  combined = combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 12);

  if (combined.length === 0) {
      combined = [
          {
            title: "Exploring the Future of Neural Intelligence",
            description: "Researchers are breaking new ground in how localized AI agents process real-time news data.",
            url: "https://news.google.com",
            image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
            source: "Serenity Research",
            publishedAt: new Date().toISOString()
          }
      ];
  }

  localStorage.setItem(CACHE_KEY, JSON.stringify(combined));
  localStorage.setItem(CACHE_TIME_KEY, now.toString());

  return combined;
};

export const checkAndNotifyNews = async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    const articles = await fetchLatestNews('top headlines', false);
    if (articles.length > 0 && Math.random() > 0.8) {
       new Notification(articles[0].source, {
         body: articles[0].title,
         icon: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png'
       });
    }
  }
};
