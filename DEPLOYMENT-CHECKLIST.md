# Deployment Checklist

## Pre-Deployment
- [x] Created lessons page with instructor information
- [x] Removed instructor content from homepage and contact page
- [x] Updated all navigation menus to include lessons link
- [x] Separated static files from server
- [x] Added CORS support to server
- [x] Created API configuration system
- [x] Updated package.json with cors dependency

## Static Site Deployment (tennisestateoneonta.com/demo2)
- [ ] Upload all files from `/static-site/` to web hosting
- [ ] Update `js/config.js` with actual Render server URL
- [ ] Test all pages load correctly
- [ ] Test navigation links work
- [ ] Test lessons page displays properly

## API Server Deployment (Render.com)
- [ ] Create new Web Service on Render
- [ ] Set build command: `npm install`
- [ ] Set start command: `npm start`
- [ ] Deploy from `/server/` directory
- [ ] Wait for deployment to complete
- [ ] Test API endpoint: `https://your-app.onrender.com/schedule-processed`
- [ ] Copy actual Render URL

## Post-Deployment Configuration
- [ ] Update static site's `js/config.js` with actual Render URL:
  ```javascript
  const API_BASE_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000'
      : 'https://YOUR-ACTUAL-RENDER-APP.onrender.com';
  ```
- [ ] Re-upload config.js to static hosting
- [ ] Clear browser cache and test schedule page
- [ ] Verify schedule data loads from API
- [ ] Test lessons page contact integration

## Final Testing
- [ ] Test all pages on mobile and desktop
- [ ] Verify schedule loads data correctly
- [ ] Test lessons page contact form links
- [ ] Check all navigation links
- [ ] Verify instructor information displays properly
- [ ] Test API CORS from static site domain

## URLs to Update
Replace `your-render-app` with your actual Render app name:
- API Base URL in config.js
- README documentation
- Any hardcoded references

## Notes
- Static site files go to: `https://tennisestateoneonta.com/demo2/`
- API server goes to: `https://your-app.onrender.com`
- Make sure to test the schedule page specifically as it depends on the API connection
