
import { ImageHistoryItem, NewsArticle } from '../types';

const DB_NAME = 'SerenityDB_v10';
const IMAGE_STORE = 'images';
const NEWS_STORE = 'news_archive';
const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NEWS_STORE)) {
        db.createObjectStore(NEWS_STORE, { keyPath: 'url' }); 
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
};

export const saveImageToDb = async (item: ImageHistoryItem, blob: Blob) => {
  try {
    const db = await initDB();
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_STORE);
    await store.put({ ...item, blob });
  } catch (err) {
    console.error("Image DB Save Error:", err);
  }
};

export const getAllImagesFromDb = async (): Promise<ImageHistoryItem[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(IMAGE_STORE, 'readonly');
    const store = tx.objectStore(IMAGE_STORE);
    const records = await new Promise<any[]>((res) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
    });
    return records.map(rec => ({
      ...rec,
      url: URL.createObjectURL(rec.blob)
    })).sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    return [];
  }
};

export const saveNewsToDb = async (articles: NewsArticle[]) => {
  try {
    const db = await initDB();
    const tx = db.transaction(NEWS_STORE, 'readwrite');
    const store = tx.objectStore(NEWS_STORE);
    articles.forEach(article => {
      store.put(article);
    });
  } catch (err) {
    console.error("News Archive Save Error:", err);
  }
};

export const getAllNewsFromDb = async (): Promise<NewsArticle[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(NEWS_STORE, 'readonly');
    const store = tx.objectStore(NEWS_STORE);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as NewsArticle[];
        resolve(results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
      };
    });
  } catch (err) {
    return [];
  }
};

export const requestStoragePermission = async () => {
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }
};
