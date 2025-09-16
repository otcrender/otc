// Cache Manager for Schedule Data
// Handles local storage caching and background refresh

class CacheManager {
    constructor() {
        this.CACHE_KEY = 'otc_schedule_cache';
        this.CACHE_TIMESTAMP_KEY = 'otc_schedule_timestamp';
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.API_ENDPOINT = window.API_ENDPOINTS?.scheduleProcessed || '/schedule-processed';
    }

    // Check if cached data is still valid
    isCacheValid() {
        try {
            const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
            if (!timestamp) return false;
            
            const cacheTime = parseInt(timestamp);
            const now = Date.now();
            const age = now - cacheTime;
            
            return age < this.CACHE_DURATION;
        } catch (error) {
            console.error('Error checking cache validity:', error);
            return false;
        }
    }

    // Get cached data
    getCachedData() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;
            
            return JSON.parse(cached);
        } catch (error) {
            console.error('Error reading cached data:', error);
            return null;
        }
    }

    // Store data in cache
    setCachedData(data) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log('Data cached successfully');
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    // Clear expired cache
    clearExpiredCache() {
        try {
            if (!this.isCacheValid()) {
                localStorage.removeItem(this.CACHE_KEY);
                localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
                console.log('Expired cache cleared');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    // Get cache age in minutes
    getCacheAge() {
        try {
            const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
            if (!timestamp) return null;
            
            const cacheTime = parseInt(timestamp);
            const now = Date.now();
            const ageMinutes = Math.floor((now - cacheTime) / (1000 * 60));
            
            return ageMinutes;
        } catch (error) {
            console.error('Error getting cache age:', error);
            return null;
        }
    }

    // Fetch data from API
    async fetchFromAPI() {
        try {
            console.log('Fetching fresh data from API...');
            const response = await fetch(this.API_ENDPOINT);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Fresh data received from API');
            return data;
        } catch (error) {
            console.error('Error fetching from API:', error);
            throw error;
        }
    }

    // Main method: get data (cached first, then refresh in background)
    async getScheduleData() {
        console.log('CacheManager: Getting schedule data...');
        
        // Clear expired cache
        this.clearExpiredCache();
        
        // Try to get cached data first
        const cachedData = this.getCachedData();
        const cacheAge = this.getCacheAge();
        
        if (cachedData && this.isCacheValid()) {
            console.log(`Using cached data (${cacheAge} minutes old)`);
            
            // Refresh in background (don't await)
            this.refreshInBackground();
            
            return cachedData;
        } else {
            console.log('No valid cache, fetching fresh data...');
            
            try {
                const freshData = await this.fetchFromAPI();
                this.setCachedData(freshData);
                return freshData;
            } catch (error) {
                console.error('Failed to fetch fresh data:', error);
                
                // If we have any cached data (even expired), use it as fallback
                if (cachedData) {
                    console.log('Using expired cache as fallback');
                    return cachedData;
                }
                
                throw error;
            }
        }
    }

    // Refresh data in background
    async refreshInBackground() {
        try {
            console.log('Background refresh started...');
            const freshData = await this.fetchFromAPI();
            this.setCachedData(freshData);
            console.log('Background refresh completed');
            
            // Notify that data has been updated
            this.notifyDataUpdated(freshData);
        } catch (error) {
            console.error('Background refresh failed:', error);
        }
    }

    // Notify other parts of the app that data has been updated
    notifyDataUpdated(data) {
        // Dispatch custom event for data update
        const event = new CustomEvent('scheduleDataUpdated', {
            detail: { data }
        });
        window.dispatchEvent(event);
    }

    // Force refresh (for manual refresh button)
    async forceRefresh() {
        try {
            console.log('Force refresh requested...');
            const freshData = await this.fetchFromAPI();
            this.setCachedData(freshData);
            console.log('Force refresh completed');
            return freshData;
        } catch (error) {
            console.error('Force refresh failed:', error);
            throw error;
        }
    }

    // Get cache status for debugging
    getCacheStatus() {
        const cached = this.getCachedData();
        const valid = this.isCacheValid();
        const age = this.getCacheAge();
        
        return {
            hasData: !!cached,
            isValid: valid,
            ageMinutes: age,
            lastUpdated: cached ? new Date(parseInt(localStorage.getItem(this.CACHE_TIMESTAMP_KEY))) : null
        };
    }
}

// Create global instance
window.cacheManager = new CacheManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}
