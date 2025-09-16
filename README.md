# OTC Sports Center - Deployment Setup

This project has been separated into two parts for deployment:

## 1. Static Site (`/static-site/`)
- **Hosting**: https://tennisestateoneonta.com/demo2/
- **Contains**: All HTML, CSS, JS files for the frontend
- **Features**: 
  - Homepage with facility information
  - Schedule page (connects to API for data)
  - Passes page
  - **NEW: Lessons page** with instructor information
  - Contact page
  - Reservations page

### Key Changes:
- **Instructor/Lesson Content**: Moved from homepage and contact page to dedicated lessons page
- **Navigation**: Added "Lessons" link to all page navigation menus
- **API Integration**: Uses `js/config.js` for API endpoint configuration

## 2. API Server (`/server/`)
- **Hosting**: Render.com (https://your-render-app.onrender.com)
- **Contains**: Node.js server for Excel processing and schedule data
- **Features**:
  - Downloads Excel file from OneDrive
  - Processes schedule data
  - Provides `/schedule-processed` API endpoint
  - CORS enabled for cross-origin requests

### Key Changes:
- **CORS Support**: Added for cross-origin requests from static site
- **No Static Files**: Server only provides API endpoints
- **Environment Variables**: Uses `PORT` from Render

## Deployment Steps

### Static Site (tennisestateoneonta.com/demo2)
1. Upload all files from `/static-site/` to your web hosting
2. Update `js/config.js` with your actual Render server URL:
   ```javascript
   const API_BASE_URL = window.location.hostname === 'localhost' 
       ? 'http://localhost:3000'
       : 'https://your-actual-render-app.onrender.com';
   ```

### API Server (Render.com)
1. Create new Web Service on Render
2. Connect to your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy from `/server/` directory
6. Update the static site's config.js with your Render URL

## File Structure
```
otc-deploy/
├── static-site/           # Frontend files for tennisestateoneonta.com/demo2
│   ├── index.html        # Homepage (instructors removed)
│   ├── lessons.html      # NEW: Dedicated lessons page
│   ├── schedule.html     # Schedule (uses API)
│   ├── passes.html       # Passes page
│   ├── contact.html      # Contact (instructors moved to lessons)
│   ├── reservations.html # Reservations
│   ├── css/             # Stylesheets
│   └── js/
│       ├── config.js    # NEW: API configuration
│       └── main.js      # Main JavaScript
└── server/              # API server for Render
    ├── server.js        # Modified for CORS and API-only
    ├── package.json     # Added cors dependency
    └── package-lock.json
```

## Configuration Notes

### API Endpoints
- `/schedule-processed` - Returns processed schedule data with days array

### CORS Configuration
The server is configured to accept requests from:
- `https://tennisestateoneonta.com`
- `http://localhost:3000` (development)
- `http://localhost:8080` (development)

### Environment Variables (Render)
- `PORT` - Automatically set by Render
- No additional environment variables required

## Testing Locally
1. **API Server**: 
   ```bash
   cd server
   npm install
   npm start
   ```
   Server runs on http://localhost:3000

2. **Static Site**: 
   - Use any local server (Live Server, Python http.server, etc.)
   - The config.js will automatically use localhost API

## Lessons Page Features
- Professional instructor profiles (Paul van der Sommen, Gary Segal)
- Lesson types (Private, Semi-Private, Group)
- Pricing information ($90 passholders, $120 non-passholders)
- Contact integration for lesson scheduling
- Responsive design matching site theme

## Navigation Updates
All pages now include "Lessons" in the navigation menu between "Passes" and "Contact".
