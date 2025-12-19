
import { ImageHistoryItem } from '../types';

const DB_NAME = 'SerenityDB';
const STORE_NAME = 'images';
const DB_VERSION = 4; // Incremented version for new structure

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
};

/**
 * Requests the browser to keep the storage persisted (won't be deleted automatically)
 */
export const requestStoragePersistence = async () => {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Storage persistence ${isPersisted ? 'granted' : 'denied'}`);
      
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quota = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
        console.log(`Storage Usage: ${usage}MB / ${quota}MB`);
      }
      return isPersisted;
    } catch (err) {
      console.error("Persistence request error:", err);
      return false;
    }
  }
  return false;
};

export const saveImageToDb = async (item: ImageHistoryItem, blob: Blob) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // We store the actual Blob object which IndexedDB handles natively
      const record = { 
        id: item.id,
        prompt: item.prompt,
        refinedPrompt: item.refinedPrompt || item.prompt,
        createdAt: item.createdAt,
        blob: blob,
        source: (item as any).source || 'unknown'
      }; 

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Internal Storage Save Error:", err);
    // Fallback: If DB fails, we can't store large blobs in LocalStorage,
    // but we can notify the user that persistence is limited.
    throw err;
  }
};

export const getImageBlobById = async (id: string): Promise<Blob | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result;
        if (record && record.blob) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Internal Storage Get Error:", err);
    return null;
  }
};

export const getAllImagesFromDb = async (): Promise<ImageHistoryItem[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result;
        const items: ImageHistoryItem[] = records.map((rec: any) => {
          // We don't create URLs here to avoid memory leaks
          // URLs are created on-demand by the ImageDisplay component
          return {
            id: rec.id,
            prompt: rec.prompt,
            refinedPrompt: rec.refinedPrompt || rec.prompt,
            createdAt: rec.createdAt,
            url: '' // Will be populated by Component
          };
        });
        
        // Sort by newest first
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Internal Storage Load Error:", err);
    return [];
  }
};

export const deleteImageFromDb = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
