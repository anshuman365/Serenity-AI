import { ImageHistoryItem } from '../types';

const DB_NAME = 'SerenityDB';
const STORE_NAME = 'images';
const DB_VERSION = 4; // Increased version for better blob handling

// Initialize Database with better error handling
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
    
    // Timeout fallback
    setTimeout(() => {
      if (request.readyState !== 'done') {
        reject(new Error('IndexedDB open timeout'));
      }
    }, 2000);
  });
};

// Save Image Blob to DB with proper error handling
export const saveImageToDb = async (item: ImageHistoryItem, blob: Blob): Promise<void> => {
  try {
    console.log('Saving image to DB:', item.id, 'Size:', blob.size);
    
    const db = await initDB();
    
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Convert Blob to ArrayBuffer for better storage
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const record = { 
            id: item.id,
            prompt: item.prompt,
            refinedPrompt: item.refinedPrompt || item.prompt,
            createdAt: item.createdAt,
            imageData: reader.result as ArrayBuffer,
            mimeType: blob.type,
            size: blob.size
          }; 

          const request = store.put(record);
          request.onsuccess = () => {
            console.log('Image saved successfully:', item.id);
            resolve();
          };
          request.onerror = (e) => {
            console.error('Error saving image:', (e.target as IDBRequest).error);
            reject((e.target as IDBRequest).error);
          };
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  } catch (err) {
    console.error("DB Save Error:", err);
    throw err;
  }
};

// Get image blob by ID with better error recovery
export const getImageBlobById = async (id: string): Promise<Blob | null> => {
  try {
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result;
        if (record && record.imageData) {
          try {
            // Convert ArrayBuffer back to Blob
            const blob = new Blob([record.imageData], { 
              type: record.mimeType || 'image/png' 
            });
            resolve(blob);
          } catch (error) {
            console.error('Error creating blob from ArrayBuffer:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (e) => {
        console.error('Error getting image:', (e.target as IDBRequest).error);
        reject((e.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("DB Get Error:", err);
    return null;
  }
};

// Load All Images from DB with proper error handling
export const getAllImagesFromDb = async (): Promise<ImageHistoryItem[]> => {
  try {
    console.log('Loading all images from DB...');
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        try {
          const records = request.result;
          console.log('Found records:', records?.length || 0);
          
          const items: ImageHistoryItem[] = [];
          
          for (const rec of records) {
            try {
              if (rec.imageData) {
                // Create Blob from ArrayBuffer
                const blob = new Blob([rec.imageData], { 
                  type: rec.mimeType || 'image/png' 
                });
                const url = URL.createObjectURL(blob);
                
                items.push({
                  id: rec.id,
                  prompt: rec.prompt,
                  refinedPrompt: rec.refinedPrompt || rec.prompt,
                  createdAt: rec.createdAt,
                  url: url
                });
              }
            } catch (itemError) {
              console.error('Error processing record:', rec.id, itemError);
            }
          }
          
          // Sort by newest first
          items.sort((a, b) => b.createdAt - a.createdAt);
          console.log('Successfully loaded', items.length, 'images');
          resolve(items);
        } catch (processingError) {
          console.error('Error processing records:', processingError);
          reject(processingError);
        }
      };
      
      request.onerror = (e) => {
        console.error('Error loading images:', (e.target as IDBRequest).error);
        reject((e.target as IDBRequest).error);
      };
    });
  } catch (err) {
    console.error("DB Load Error:", err);
    return [];
  }
};

// Clear and rebuild database (for debugging)
export const rebuildImageDatabase = async (): Promise<void> => {
  try {
    console.log('Rebuilding image database...');
    indexedDB.deleteDatabase(DB_NAME);
    console.log('Database deleted. Will be recreated on next save.');
  } catch (error) {
    console.error('Error rebuilding database:', error);
  }
};

// Check database health
export const checkDatabaseHealth = async (): Promise<{
  totalImages: number;
  totalSize: number;
  status: 'healthy' | 'corrupt' | 'empty';
}> => {
  try {
    const images = await getAllImagesFromDb();
    
    // Check for corrupt images
    let validImages = 0;
    let totalSize = 0;
    
    for (const img of images) {
      try {
        const blob = await getImageBlobById(img.id);
        if (blob && blob.size > 0) {
          validImages++;
          totalSize += blob.size;
        }
      } catch (e) {
        console.error('Corrupt image detected:', img.id);
      }
    }
    
    return {
      totalImages: images.length,
      totalSize,
      status: validImages === images.length ? 'healthy' : 
              images.length === 0 ? 'empty' : 'corrupt'
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      totalImages: 0,
      totalSize: 0,
      status: 'corrupt'
    };
  }
};

// Request Persistent Storage
export const requestStoragePermission = async () => {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const persisted = await navigator.storage.persist();
        console.log('Storage persistence:', persisted ? 'Granted' : 'Denied');
      }
    } catch (error) {
      console.error('Storage permission error:', error);
    }
  }
};