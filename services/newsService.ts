
import { NewsArticle } from '../types';
import { CONFIG } from './config';
import { saveNewsToDb, getAllNewsFromDb } from './storage';

export const fetchLatestNews = async (query: string = 'science', forceRefresh = false): Promise<NewsArticle[]> => {
  // First, get everything from the permanent archive
  const archivedNews = await getAllNewsFromDb();
  
  // If not force refreshing and we have archive, check if we need new data
  const lastUpdate = archivedNews.length > 0 ? new Date(archivedNews[0].publishedAt).getTime() : 0;
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (!forceRefresh && (now - lastUpdate) < ONE_HOUR && archivedNews.length > 0) {
    return archivedNews.slice(0, 15);
  }

  // Fetch new data from external sources
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items) {
      const newArticles: NewsArticle[] = data.items.map((item: any) => ({
        title: item.title,
        description: item.description?.replace(/<[^>]*>?/gm, '') || '',
        url: item.link,
        image: item.enclosure?.link || `https://picsum.photos/seed/${Math.random()}/600/400`,
        source: item.author || 'Science News',
        publishedAt: item.pubDate
      }));

      // Save all new findings to permanent storage
      await saveNewsToDb(newArticles);
      
      // Return combined list (Archive + New)
      const combined = [...newArticles, ...archivedNews];
      const unique = Array.from(new Map(combined.map(item => [item.url, item])).values());
      return unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 20);
    }
  } catch (e) {
    console.warn("External fetch failed, returning archive");
  }
  
  return archivedNews;
};

export const checkAndNotifyNews = async () => {
  if ("Notification" in window && Notification.permission === "granted") {
    const articles = await fetchLatestNews('technology', false);
    if (articles.length > 0) {
       new Notification("Scientific Alert", { body: articles[0].title });
    }
  }
};
