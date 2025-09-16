// API Configuration
// Update this URL when deploying to production
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://your-render-app.onrender.com';

// API endpoints
const API_ENDPOINTS = {
    scheduleProcessed: `${API_BASE_URL}/schedule-processed`,
    scheduleData: `${API_BASE_URL}/schedule-data`
};

// Make endpoints available globally
window.API_ENDPOINTS = API_ENDPOINTS;
