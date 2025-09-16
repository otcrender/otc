# OTC Sports Center - Backend API

This is the backend API server for the OTC Sports Center website, designed to run on Render.com.

## Features

- **Excel Processing**: Downloads and processes schedule data from OneDrive
- **CORS Support**: Configured for cross-origin requests from static site
- **Caching**: 30-minute cache with automatic refresh
- **API Endpoints**: Provides processed schedule data to frontend

## API Endpoints

- `GET /schedule-processed` - Returns processed schedule data with days array
- `GET /schedule-data` - Alternative endpoint (legacy)

## Environment Variables

- `PORT` - Automatically set by Render (default: 3000)

## Dependencies

- Express.js - Web framework
- Puppeteer - Web scraping for Excel download
- ExcelJS - Excel file processing
- CORS - Cross-origin resource sharing
- Compression - Response compression

## Deployment on Render

1. Connect this repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Deploy from `backend` branch

## Local Development

```bash
npm install
npm start
```

Server will run on http://localhost:3000

## CORS Configuration

The server is configured to accept requests from:
- `https://tennisestateoneonta.com`
- `http://localhost:3000` (development)
- `http://localhost:8080` (development)

## Cache Management

- Schedule data is cached for 30 minutes
- Automatic refresh when cache expires
- Fallback to expired cache if API fails

## Static Site

The frontend static site is hosted separately at:
- **URL**: https://tennisestateoneonta.com/demo2/
- **Repository**: Not included in this backend repo
- **Features**: HTML, CSS, JS files with smart caching

## Architecture

```
Frontend (Static)          Backend (Render)
┌─────────────────────┐    ┌─────────────────────┐
│ tennisestateoneonta │───▶│ otc-schedule-api   │
│ .com/demo2/         │    │ .onrender.com       │
│                     │    │                     │
│ - HTML/CSS/JS       │    │ - Excel Processing  │
│ - Smart Caching     │    │ - API Endpoints     │
│ - User Interface    │    │ - CORS Support      │
└─────────────────────┘    └─────────────────────┘
```

## Support

For issues or questions, contact the development team.