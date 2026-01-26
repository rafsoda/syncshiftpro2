
import { AvailabilityEntry } from '../types';

// This uses a public KV store. Change the ID (11885544) to a unique number for your team.
const CLOUD_API_URL = 'https://keyvalue.xyz/11885544/shiftsync_data_v1';

export const storageService = {
  getEntries: async (): Promise<AvailabilityEntry[]> => {
    try {
      const response = await fetch(CLOUD_API_URL);
      if (!response.ok) return [];
      const data = await response.text();
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Cloud Fetch Error, falling back to local:", error);
      const localData = localStorage.getItem('shiftsync_fallback');
      return localData ? JSON.parse(localData) : [];
    }
  },

  saveEntries: async (entries: AvailabilityEntry[]): Promise<void> => {
    try {
      await fetch(CLOUD_API_URL, {
        method: 'POST',
        body: JSON.stringify(entries),
        headers: { 'Content-Type': 'application/json' }
      });
      localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
    } catch (error) {
      console.error("Cloud Save Error:", error);
      localStorage.setItem('shiftsync_fallback', JSON.stringify(entries));
    }
  },

  batchAddEntries: async (newEntries: AvailabilityEntry[]): Promise<void> => {
    const current = await storageService.getEntries();
    // Create a map of existing entries to easily filter out duplicates for this specific batch
    const workerNames = new Set(newEntries.map(e => e.workerName));
    const dates = new Set(newEntries.map(e => e.date));
    
    const filtered = current.filter(e => 
      !(workerNames.has(e.workerName) && dates.has(e.date))
    );
    
    await storageService.saveEntries([...filtered, ...newEntries]);
  },

  clearAll: async (): Promise<void> => {
    await storageService.saveEntries([]);
  }
};
