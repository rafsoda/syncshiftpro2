import { AvailabilityEntry } from '../types';

// JSONBin.io configuration - Your private cloud storage
const BIN_ID = '6977ea1043b1c97be94cd0f5';
const API_KEY = '$2a$10$csJhXVi.lEoOfC6.yCYkNeRQf1P84oKX7sDHywfWRNpxOjEXCjf3y';

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

export const storageService = {
  getEntries: async (): Promise<AvailabilityEntry[]> => {
    try {
      const response = await fetch(JSONBIN_URL + '/latest', {
        method: 'GET',
        headers: {
          'X-Master-Key': API_KEY,
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // JSONBin wraps data in a 'record' property
      const record = data.record;
      
      // Handle different data formats
      let entries: AvailabilityEntry[] = [];
      
      if (Array.isArray(record)) {
        // Filter out empty objects or init placeholder
        entries = record.filter(item => 
          item && 
          Object.keys(item).length > 0 && 
          !item.init && 
          item.id && 
          item.workerName
        );
      } else if (record && record.data && Array.isArray(record.data)) {
        // Handle {"data": []} format
        entries = record.data;
      }
      
      return entries;
      
    } catch (error) {
      console.error("Cloud Fetch Error:", error);
      
      // Fallback to localStorage in browser
      if (typeof window !== 'undefined' && window.localStorage) {
        const localData = localStorage.getItem('shiftsync_fallback');
        return localData ? JSON.parse(localData) : [];
      }
      
      return [];
    }
  },

  saveEntries: async (entries: AvailabilityEntry[]): Promise<void> => {
    try {
      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
        body: JSON.stringify(entries)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      // Backup to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
      }
      
    } catch (error) {
      console.error("Cloud Save Error:", error);
      
      // Save to localStorage as fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
      }
      
      throw error; // Re-throw so UI shows error
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
