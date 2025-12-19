import { ImageHistoryItem } from '../types';

const DB_NAME = 'SerenityDB';
const STORE_NAME = 'images';
const DB_VERSION = 2; // Increased version for new field

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        // For existing stores, we don't need to do anything as IndexedDB handles adding new fields
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
};

export const saveImageToDb = async (item: ImageHistoryItem, blob: Blob) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const record = { 
        id: item.id,
        prompt: item.prompt,
        refinedPrompt: item.refinedPrompt || item.prompt,
        createdAt: item.createdAt,
        blob: blob 
      }; 

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("DB Save Error:", err);
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
        const items: ImageHistoryItem[] = records.map((rec: any) => ({
          id: rec.id,
          prompt: rec.prompt,
          refinedPrompt: rec.refinedPrompt || rec.prompt,
          createdAt: rec.createdAt,
          url: URL.createObjectURL(rec.blob)
        }));
        
        items.sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("DB Load Error:", err);
    return [];
  }
};

export const requestStoragePermission = async () => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
    }
  }
};