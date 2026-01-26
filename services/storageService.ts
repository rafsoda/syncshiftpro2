import { AvailabilityEntry } from '../types';

// Using keyvalue.xyz - Change 11885544 to your unique team ID
const CLOUD_API_URL = 'https://api.jsonbin.io/v3/b/YOUR_BIN_ID';
const API_KEY = '$2a$10$YOUR_JSONBIN_API_KEY'; // Get from jsonbin.io

// Alternative: Using keyvalue.xyz (simpler, no API key needed)
const KV_STORE_ID = '11885544'; // Change this to a unique random number
const KV_API_URL = `https://api.keyvalue.xyz/${KV_STORE_ID}/shiftsync_data`;

export const storageService = {
  getEntries: async (): Promise<AvailabilityEntry[]> => {
    try {
      const response = await fetch(KV_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // No data exists yet, return empty array
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.text();
      
      // Handle empty response
      if (!data || data.trim() === '') {
        return [];
      }
      
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Cloud Fetch Error:", error);
      
      // Fallback to localStorage only in browser
      if (typeof window !== 'undefined' && window.localStorage) {
        const localData = localStorage.getItem('shiftsync_fallback');
        return localData ? JSON.parse(localData) : [];
      }
      
      return [];
    }
  },

  saveEntries: async (entries: AvailabilityEntry[]): Promise<void> => {
    try {
      const response = await fetch(KV_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entries)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      // Save to localStorage as backup (only in browser)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
      }
    } catch (error) {
      console.error("Cloud Save Error:", error);
      
      // Fallback to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
      }
      
      throw error; // Re-throw so UI can show error
    }
  },

  batchAddEntries: async (newEntries: AvailabilityEntry[]): Promise<void> => {
    const current = await storageService.getEntries();
    
    // Remove duplicates: same worker + same date
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