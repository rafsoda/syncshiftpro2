import { AvailabilityEntry } from '../types';

// Using kvdb.io - Simple, reliable, free cloud storage
const BUCKET_NAME = 'rafsoda2025'; // Change this to something unique!
const KV_URL = `https://kvdb.io/${BUCKET_NAME}/shiftsync_data`;

export const storageService = {
  getEntries: async (): Promise<AvailabilityEntry[]> => {
    try {
      const response = await fetch(KV_URL, {
        method: 'GET',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '' || text === 'Not found') {
        return [];
      }
      
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return [];
      }
      
    } catch (error) {
      console.error("Cloud Fetch Error:", error);
      
      if (typeof window !== 'undefined' && window.localStorage) {
        const localData = localStorage.getItem('shiftsync_fallback');
        return localData ? JSON.parse(localData) : [];
      }
      
      return [];
    }
  },

  saveEntries: async (entries: AvailabilityEntry[]): Promise<void> => {
    try {
      const response = await fetch(KV_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entries)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
      }
      
    } catch (error) {
      console.error("Cloud Save Error:", error);
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
      }
      
      throw error;
    }
  },

  batchAddEntries: async (newEntries: AvailabilityEntry[]): Promise<void> => {
    const current = await storageService.getEntries();
    
    const workerDateMap = new Map(
      newEntries.map(e => [`${e.workerName}-${e.date}`, e])
    );
    
    const filtered = current.filter(e => 
      !workerDateMap.has(`${e.workerName}-${e.date}`)
    );
    
    const merged = [...filtered, ...newEntries];
    await storageService.saveEntries(merged);
  },

  clearAll: async (): Promise<void> => {
    await storageService.saveEntries([]);
  }
};
