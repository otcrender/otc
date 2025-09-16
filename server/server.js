// File: server.js
// OPTION B: Refreshes on-demand when the URL is called. Always the freshest data.

console.log('SERVER.JS LOADING - DEBUG MODE ACTIVE');

const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const compression = require('compression');
const cors = require('cors');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes to allow static site to access API
app.use(cors({
    origin: ['https://tennisestateoneonta.com', 'http://localhost:3000', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    credentials: true
}));

const DOWNLOAD_DIR = path.join(__dirname);
const CACHE_FILE_PATH = path.join(__dirname, 'schedule-cache.json');
const FINAL_EXCEL_PATH = path.join(__dirname, 'schedule.xlsx');
const oneDriveUrl = 'https://onedrive.live.com/:x:/g/personal/1B6B1B5379E6C66A/EWrG5nlTG2sggBssAwAAAAABERzkNcKT07ITcs1gY_M2RQ?resid=1B6B1B5379E6C66A!812&ithint=file%2Cxlsx&e=qbCH3Q&migratedtospo=true&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8xYjZiMWI1Mzc5ZTZjNjZhL0VXckc1bmxURzJzZ2dCc3NBd0FBQUFBQkVSemtOY0tUMDdJVGNzMWdZX00yUlE_ZT1xYkNIM1E';

// Cache management
let scheduleCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Load cache from file
function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
            const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
            const parsed = JSON.parse(cacheData);
            
            // Check if cache has the new structure
            if (parsed.metadata && parsed.days) {
                scheduleCache = parsed;
                lastCacheUpdate = new Date(parsed.lastUpdated);
                console.log('Cache loaded from file, last updated:', lastCacheUpdate);
                return true;
            } else {
                console.log('Cache has old structure, clearing...');
                // Clear invalid cache
                try {
                    fs.unlinkSync(CACHE_FILE_PATH);
                    console.log('Old cache file removed');
                } catch (unlinkError) {
                    console.error('Error removing old cache:', unlinkError);
                }
                scheduleCache = null;
                lastCacheUpdate = null;
                return false;
            }
        }
    } catch (error) {
        console.error('Error loading cache:', error);
        // Clear corrupted cache
        try {
            if (fs.existsSync(CACHE_FILE_PATH)) {
                fs.unlinkSync(CACHE_FILE_PATH);
                console.log('Corrupted cache file removed');
            }
        } catch (unlinkError) {
            console.error('Error removing corrupted cache:', unlinkError);
        }
    }
    return false;
}

// Save cache to file
function saveCache(data, metadata) {
    try {
        const cacheData = {
            data: data,
            metadata: metadata,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2));
        scheduleCache = cacheData; // Store the full cache object, not just data
        lastCacheUpdate = new Date();
        console.log('Cache saved to file');
    } catch (error) {
        console.error('Error saving cache:', error);
    }
}

// Check if cache is valid
function isCacheValid() {
    if (!scheduleCache || !lastCacheUpdate) return false;
    
    // Check if cache has the new structure with metadata
    if (!scheduleCache.metadata) {
        console.log('Cache has old structure, invalidating...');
        return false;
    }
    
    const now = new Date();
    const timeDiff = now.getTime() - lastCacheUpdate.getTime();
    return timeDiff < CACHE_DURATION;
}

        // Parse day information from Excel headers - OPTIMIZED VERSION
        function parseDaysFromExcel(worksheet) {
            const days = [];
            const dayRow = 1; // Day headers are in row 1
            
            console.log('Parsing days from Excel, looking in row 1...');
            console.log(`Worksheet has ${worksheet.columnCount} columns`);
            
            // DYNAMIC COLUMN CALCULATION: August days have 8 columns (7 courts + time), September days have 6 columns (5 courts + time)
            const maxDays = 7; // We know there are 6 days in the schedule
            console.log(`Looking for up to ${maxDays} days with dynamic column counts`);
            
            for (let dayIndex = 0; dayIndex < maxDays; dayIndex++) {
                // Calculate start column based on dynamic layout:
                // Fri(Aug) = 1, Sat(Aug) = 9, Sun(Aug) = 17, Mon(Sep) = 25, Tue(Sep) = 31, Wed(Sep) = 37
                let startCol;
                if (dayIndex === 0) startCol = 1;   // Friday Aug 29
                else if (dayIndex === 1) startCol = 9;   // Saturday Aug 30  
                else if (dayIndex === 2) startCol = 17;  // Sunday Aug 31
                else if (dayIndex === 3) startCol = 25;  // Monday Sep 1
                else if (dayIndex === 4) startCol = 31;  // Tuesday Sep 2
                else if (dayIndex === 5) startCol = 37;  // Wednesday Sep 3
                else startCol = (dayIndex * 8) + 1; // fallback
                
                try {
                    const cell = worksheet.getCell(dayRow, startCol);
                    console.log(`Checking day ${dayIndex + 1} at column ${startCol}:`, cell.value);
                    if (cell.value && typeof cell.value === 'string') {
                        const cellValue = cell.value.trim();
                        console.log(`Day ${dayIndex + 1} at column ${startCol}: "${cellValue}"`);
                        
                        // Check if this looks like a day header
                        if (cellValue.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) {
                            console.log(`✅ Found valid day header: "${cellValue}"`);
                            days.push({
                                column: startCol,
                                value: cellValue,
                                parsed: { fullString: cellValue },
                                dayIndex: dayIndex
                            });
                        } else {
                            console.log(`❌ Not a valid day header: "${cellValue}"`);
                        }
                    } else {
                        console.log(`❌ No value at column ${startCol}`);
                    }
                } catch (error) {
                    console.log(`Error processing day ${dayIndex + 1} at column ${startCol}:`, error.message);
                    break;
                }
            }
            
            console.log(`Found ${days.length} days:`, days.map(d => d.value));
            return days;
        }

// Check if a cell value looks like a day header
function isDayHeader(value) {
    const dayPatterns = [
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+/i,
        /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/i
    ];
    
    return dayPatterns.some(pattern => pattern.test(value));
}

// Parse day string to extract day name and date
function parseDayFromString(dayString) {
    // Common patterns for day headers
    const patterns = [
        // "Tuesday August 26" format
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i,
        // "Tue Aug 26" format
        /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i,
        // "8/26" format with day name
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\/(\d{1,2})/i
    ];
    
    for (const pattern of patterns) {
        const match = dayString.match(pattern);
        if (match) {
            const dayName = match[1];
            let month, day;
            
            if (match[2] && match[3]) {
                if (isNaN(match[2])) {
                    // Month name format
                    month = getMonthNumber(match[2]);
                    day = parseInt(match[3]);
                } else {
                    // Date format
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                }
                
                if (month && day) {
                    const currentYear = new Date().getFullYear();
                    const date = new Date(currentYear, month - 1, day);
                    
                    return {
                        dayName: dayName,
                        month: month,
                        day: day,
                        date: date,
                        fullString: dayString
                    };
                }
            }
        }
    }
    
    // Fallback: return the original string
    return {
        dayName: dayString,
        month: null,
        day: null,
        date: new Date(),
        fullString: dayString
    };
}

// Get month number from month name
function getMonthNumber(monthName) {
    const months = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    };
    
    return months[monthName.toLowerCase()] || null;
}

// Pre-process schedule data for faster frontend rendering - OPTIMIZED VERSION
function preprocessScheduleData(data, days) {
    const processedData = {};
    
    // OPTIMIZATION: Pre-calculate time slots to avoid repeated calculations
    const timeSlots = [];
    for (let i = 0; i < data.length; i++) {
        const timeSlot = getTimeFromRow(i);
        if (timeSlot) {
            timeSlots.push({ index: i, time: timeSlot });
        }
        
        // DEBUG: Check if this row contains our missing entry
        if (data[i] && data[i].some(cell => cell && cell.value && typeof cell.value === 'string' && cell.value.includes('Ro/Je/Lo/Ha'))) {
            console.log(`Row ${i} contains Ro/Je/Lo/Ha, timeSlot: ${timeSlot}`);
        }
    }
    
    days.forEach((day, dayIndex) => {
        const dayStartCol = day.column;
        
        // DYNAMIC COURT COUNT: Early days have 7 courts (with clay), later days have 5 courts (no clay)
        // Check if this is Monday (Sept 1) or later by looking at the day name
        const isLaterDay = day.value && (day.value.includes('SEPTEMBER') || day.value.includes('OCTOBER'));
        const courtColumns = isLaterDay ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
        const numCourts = isLaterDay ? 5 : 7;
        
        processedData[dayIndex] = {
            dayName: day.value,
            timeSlots: []
        };
        
        // OPTIMIZATION: Process only time slot rows
        timeSlots.forEach(({ index: rowIndex, time }) => {
            const row = data[rowIndex];
            if (!row) return;
            
            const timeSlotData = {
                time: time,
                courts: []
            };
            
            // OPTIMIZATION: Process court columns more efficiently
            for (let i = 0; i < numCourts; i++) {
                const col = dayStartCol + courtColumns[i];
                
                // DEBUG: Log column access for Monday and Tuesday
                if (dayIndex === 3 || dayIndex === 4) { // Monday = 3, Tuesday = 4
                    const dayName = dayIndex === 3 ? 'Monday' : 'Tuesday';
                    console.log(`${dayName} (dayIndex ${dayIndex}): Court ${i}, accessing col ${col} (dayStartCol=${dayStartCol} + courtColumns[${i}]=${courtColumns[i]})`);
                }
                if (col >= row.length) {
                    timeSlotData.courts.push({
                        value: '',
                        sportType: 'available',
                        backgroundColor: '',
                        hasContent: false
                    });
                    continue;
                }
                
                // DEBUG: Log Wednesday entries
                if (dayIndex === 1 && row[col] && row[col].value && typeof row[col].value === 'string' && row[col].value.includes('Ro/Je/Lo/Ha')) {
                    console.log(`Wednesday preprocessing: Found Ro/Je/Lo/Ha at col ${col}, row ${rowIndex}:`, row[col]);
                    console.log(`Wednesday preprocessing: dayStartCol=${dayStartCol}, courtColumns[${i}]=${courtColumns[i]}, calculated col=${col}`);
                }
                
                const cellData = row[col] || {};
                const value = cellData.value || '';
                
                // OPTIMIZATION: Simplified content check - FIXED to not filter out valid entries
                const hasContent = value && 
                    typeof value === 'string' && 
                    value.trim() &&
                    value.length < 50 &&
                    !value.includes('1899-12-30T') && // More specific - only filter out date-time strings
                    !value.includes('Time') &&
                    !value.includes('SEASON') &&
                    !value.includes('SUMMER') &&
                    !value.includes('FALL');
                
                // DEBUG: Log if we find the missing entry
                if (value && typeof value === 'string' && value.includes('Ro/Je/Lo/Ha')) {
                    console.log(`Preprocessing found Ro/Je/Lo/Ha:`, {
                        value: value,
                        hasContent: hasContent,
                        dayIndex: dayIndex,
                        rowIndex: rowIndex,
                        col: col
                    });
                }
                
                timeSlotData.courts.push({
                    value: value,
                    sportType: cellData.sportType || 'available',
                    backgroundColor: cellData.backgroundColor || '',
                    hasContent: hasContent
                });
            }
            
            processedData[dayIndex].timeSlots.push(timeSlotData);
        });
    });
    
    return processedData;
}

// Helper function to get time from row index - FIXED for correct time mapping
function getTimeFromRow(rowIndex) {
    const timeSlotIndex = rowIndex - 1; // Go back to get 6:30 AM for row 5
    if (timeSlotIndex < 0) return null;
    
    const startHour = 6.5; // 6:30 AM
    const timeInHours = startHour + (timeSlotIndex * 0.5);
    
    if (timeInHours > 21.5) return null;
    
    const isHalfHour = timeInHours % 1 !== 0;
    const displayHour = Math.floor(timeInHours);
    const period = displayHour >= 12 ? 'PM' : 'AM';
    const adjustedHour = displayHour > 12 ? displayHour - 12 : displayHour;
    
    // DEBUG: Log time calculation for row 5
    if (rowIndex === 5) {
        console.log(`Row 5: timeSlotIndex=${timeSlotIndex}, timeInHours=${timeInHours}, isHalfHour=${isHalfHour}, displayHour=${displayHour}, adjustedHour=${adjustedHour}`);
    }
    
    if (isHalfHour) {
        const result = `${adjustedHour}:30 ${period}`;
        // DEBUG: Log the result for row 5
        if (rowIndex === 5) {
            console.log(`Row 5 returning: "${result}"`);
        }
        return result;
    } else {
        const result = `${adjustedHour}:00 ${period}`;
        // DEBUG: Log the result for row 5
        if (rowIndex === 5) {
            console.log(`Row 5 returning: "${result}"`);
        }
        return result;
    }
}

// Process Excel file and extract data with styling - OPTIMIZED VERSION
async function processExcelFile(filePath) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1); // Get first worksheet
        if (!worksheet) {
            throw new Error('No worksheet found');
        }
        
        // Parse day information from headers
        const days = parseDaysFromExcel(worksheet);
        
        const data = [];
        
        // OPTIMIZATION: Only process rows that contain time slots (skip empty rows)
        // Time slots start from row 4 and go up to around row 30-35 (6:30 AM to 9:30 PM)
        // BUT: Let's be more conservative and process more rows to catch all entries
        const startRow = 4;
        const endRow = Math.min(50, worksheet.rowCount); // Increased from 35 to 50 to catch more entries
        
        // OPTIMIZATION: Pre-calculate sport type mapping for faster lookups
        const sportTypeMap = new Map([
            ['FF00B0F0', 'pickleball'], ['FF87CEEB', 'pickleball'], ['FF0000FF', 'pickleball'],
            ['FF4169E1', 'pickleball'], ['FF1E90FF', 'pickleball'], ['FF00BFFF', 'pickleball'],
            ['FF87CEFA', 'pickleball'], ['FFADD8E6', 'pickleball'], ['FFB0E0E6', 'pickleball'],
            ['FF92D050', 'tennis'], ['FF90EE90', 'tennis'], ['FF00FF00', 'tennis'],
            ['FF008000', 'tennis'], ['FF32CD32', 'tennis'], ['FF228B22', 'tennis'],
            ['FF006400', 'tennis'], ['FF98FB98', 'tennis'], ['FFADFF2F', 'tennis'],
            ['FFFFFF00', 'tentative'], ['FFFFD700', 'tentative'], ['FFFFEB3B', 'tentative'],
            ['FFFFC107', 'tentative'], ['FFFF9800', 'tentative'], ['FFFFA500', 'tentative']
        ]);
        
        // Process only relevant rows (time slots)
        for (let row = startRow; row <= endRow; row++) {
            const rowData = [];
            
            // OPTIMIZATION: Only process columns that contain court data (skip empty columns)
            // Each day has 8 columns, so we process all days' columns
            const maxCols = Math.min(worksheet.columnCount, days.length * 8);
            
            for (let col = 1; col <= maxCols; col++) {
                const cell = worksheet.getCell(row, col);
                
                // OPTIMIZATION: Skip cells with season entries early
                if (cell.value && typeof cell.value === 'string' && 
                    (cell.value.includes('2025 SUMMER SEASON') || 
                     cell.value.includes('SUMMER SEASON') ||
                     cell.value.includes('2025 FALL SEASON') ||
                     cell.value.includes('FALL SEASON'))) {
                    rowData.push({ value: '', sportType: 'available', backgroundColor: '' });
                    continue;
                }
                
                // DEBUG: Log entries that might be getting filtered
                if (cell.value && typeof cell.value === 'string' && 
                    cell.value.includes('Ro/Je/Lo/Ha')) {
                    console.log(`Found Ro/Je/Lo/Ha at row ${row}, col ${col}:`, cell.value);
                }
                
                // OPTIMIZATION: Create minimal cell data structure
                const cellData = {
                    value: cell.value || '',
                    sportType: 'available',
                    backgroundColor: ''
                };
                
                // OPTIMIZATION: Only check styling if cell has a value
                if (cell.value && cell.style && cell.style.fill) {
                    const fill = cell.style.fill;
                    let rgb = null;
                    
                    // Check for background color
                    if (fill.fgColor && fill.fgColor.argb) {
                        rgb = fill.fgColor.argb;
                    } else if (fill.bgColor && fill.bgColor.argb) {
                        rgb = fill.bgColor.argb;
                    }
                    
                    if (rgb) {
                        cellData.backgroundColor = rgb;
                        // Use pre-calculated map for faster sport type lookup
                        cellData.sportType = sportTypeMap.get(rgb) || 'available';
                    }
                }
                
                rowData.push(cellData);
            }
            
            data.push(rowData);
        }
        
        console.log(`Processed ${data.length} data rows (optimized)`);
        
        // Return data with day information
        return {
            data: data,
            days: days
        };
        
    } catch (error) {
        console.error('Error processing Excel file:', error);
        return null;
    }
}

async function downloadAndPlaceFile() {
    console.log(`[${new Date().toLocaleTimeString()}] Launching headless browser to download file...`);
    let browser = null;
    let originalFileName = null;

    try {
        // Create download directory if it doesn't exist
        if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

        // Use Rendertron-style Chrome configuration
        console.log('Launching Puppeteer with Rendertron-style configuration...');
        
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection'
            ]
        });
        
        console.log('Successfully launched Puppeteer with Rendertron-style configuration');
        const page = await browser.newPage();
        
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: DOWNLOAD_DIR
        });

        page.on('response', async (response) => {
            const disposition = response.headers()['content-disposition'];
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) originalFileName = matches[1].replace(/['"]/g, '');
            }
        });

        await page.goto(oneDriveUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        
        console.log('Page loaded, waiting for iframe...');
        
        // Wait for the container first, then the iframe
        await page.waitForSelector('#WopiDocWACContainer', { timeout: 90000 });
        console.log('Container found, waiting for iframe...');
        
        // Wait for the iframe to be available inside the container
        await page.waitForSelector('#WopiDocWACContainer #WacFrame_Excel_0', { timeout: 90000 });
        console.log('Iframe found, getting content frame...');
        
        const iframeElement = await page.$('#WacFrame_Excel_0');
        if (!iframeElement) {
            throw new Error('Iframe element is null after waiting for it');
        
        }
        
        const frame = await iframeElement.contentFrame();
        if (!frame) {
            throw new Error('Could not get content frame from iframe');
        }
        
        console.log('Content frame obtained successfully');
        
        // First click the File menu
        await frame.waitForSelector('#FileMenuFlyoutLauncher', { timeout: 90000 });
        console.log('File menu launcher found');
        await frame.click('#FileMenuFlyoutLauncher');
        console.log('File menu clicked');
        
        // Wait for the copy menu to appear and click "Create a Copy"
        await frame.waitForSelector('text=Create a Copy', { timeout: 10000 });
        console.log('Create a Copy found'); 
        await frame.click('text=Create a Copy');
        console.log('Create a Copy clicked');
        
        // Wait for the download menu to appear and click "Download a Copy"
        await frame.waitForSelector('text=Download a Copy', { timeout: 10000 });
        console.log('Download a Copy found');
        await frame.click('text=Download a Copy');
        console.log('Download a Copy clicked');
        
        let downloadComplete = false;
        const startTime = Date.now();
        while (Date.now() - startTime < 30000) {
            if (originalFileName && fs.existsSync(path.join(DOWNLOAD_DIR, originalFileName))) {
                downloadComplete = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!downloadComplete) throw new Error('Download did not complete in time.');
        
        await browser.close();

        // Remove old file if it exists
        if (fs.existsSync(FINAL_EXCEL_PATH)) fs.unlinkSync(FINAL_EXCEL_PATH);
        
        // Rename downloaded file
        fs.renameSync(path.join(DOWNLOAD_DIR, originalFileName), FINAL_EXCEL_PATH);
        console.log(`[${new Date().toLocaleTimeString()}] Success! Excel file updated and saved to ${FINAL_EXCEL_PATH}.`);
        return true;

    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error:`, error.message);
        return false;
    } finally {
        if (browser && browser.process() != null) await browser.close();
    }
}



// Helper function to get time from row index - FIXED for correct time mapping
function getTimeFromRow(rowIndex) {
    const timeSlotIndex = rowIndex - 1; // Go back to get 6:30 AM for row 5
    if (timeSlotIndex < 0) return null;
    
    const startHour = 6.5; // 6:30 AM
    const timeInHours = startHour + (timeSlotIndex * 0.5);
    
    if (timeInHours > 21.5) return null;
    
    const isHalfHour = timeInHours % 1 !== 0;
    const displayHour = Math.floor(timeInHours);
    const period = displayHour >= 12 ? 'PM' : 'AM';
    const adjustedHour = displayHour > 12 ? displayHour - 12 : displayHour;
    
    // DEBUG: Log time calculation for row 5
    if (rowIndex === 5) {
        console.log(`Row 5: timeSlotIndex=${timeSlotIndex}, timeInHours=${timeInHours}, isHalfHour=${isHalfHour}, displayHour=${displayHour}, adjustedHour=${adjustedHour}`);
    }
    
    if (isHalfHour) {
        const result = `${adjustedHour}:30 ${period}`;
        // DEBUG: Log the result for row 5
        if (rowIndex === 5) {
            console.log(`Row 5 returning: "${result}"`);
        }
        return result;
    } else {
        const result = `${adjustedHour}:00 ${period}`;
        // DEBUG: Log the result for row 5
        if (rowIndex === 5) {
            console.log(`Row 5 returning: "${result}"`);
        }
        return result;
    }
}

// Enable compression for faster responses
app.use(compression());

// API-only server - no static file serving
// Static files are hosted separately on tennisestateoneonta.com/demo2

// Pre-processed schedule data endpoint
app.get('/schedule-processed', async (req, res) => {
    try {
        // Check if cache is valid and has processed data
        if (isCacheValid() && scheduleCache && scheduleCache.processedData) {
            console.log('Serving pre-processed data from cache');
            return res.json({
                success: true,
                data: scheduleCache.processedData,
                days: scheduleCache.days,
                metadata: scheduleCache.metadata
            });
        }

        // First, try to download the Excel file
        try {
            console.log('Attempting to download Excel file...');
            await downloadAndPlaceFile();
            console.log('Excel file download completed');
        } catch (downloadError) {
            console.log('Excel file download failed:', downloadError.message);
            // Continue with processing even if download fails
        }

        // Process Excel file and create pre-processed data
        const result = await processExcelFile(FINAL_EXCEL_PATH);
        if (!result) {
            // Return fallback data when Excel file can't be processed
            const fallbackData = {
                data: {
                    '0': {
                        timeSlots: [
                            { time: '6:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '7:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '8:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '9:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '10:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '11:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '12:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '1:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '2:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '3:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '4:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '5:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '6:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '7:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '8:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '9:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) }
                        ]
                    }
                },
                days: [
                    { value: 'Friday August 29', isLaterDay: false },
                    { value: 'Saturday August 30', isLaterDay: false },
                    { value: 'Sunday August 31', isLaterDay: false },
                    { value: 'Monday September 1', isLaterDay: true },
                    { value: 'Tuesday September 2', isLaterDay: true },
                    { value: 'Wednesday September 3', isLaterDay: true }
                ],
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    source: 'fallback',
                    message: 'Excel file processing failed - showing fallback schedule'
                }
            };
            
            return res.json(fallbackData);
        }

        // Pre-process the data for faster frontend rendering
        const processedData = preprocessScheduleData(result.data, result.days);
        
        // Create metadata
        const metadata = {
            lastUpdated: new Date().toISOString(),
            totalRows: result.data.length,
            totalColumns: result.data[0] ? result.data[0].length : 0,
            totalDays: result.days.length
        };
        
        // Update cache with processed data
        scheduleCache = {
            data: result.data,
            processedData: processedData,
            days: result.days,
            metadata: metadata
        };
        lastCacheUpdate = new Date();
        saveCache(result, metadata);

        res.json({
            success: true,
            data: processedData,
            days: result.days,
            metadata: metadata
        });

    } catch (error) {
        console.error('Error serving processed schedule data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API-only server - no static file serving
// Serve a simple API info page at root
app.get('/', (req, res) => {
    res.json({
        message: 'OTC Sports Center API',
        version: '1.0.0',
        endpoints: {
            '/schedule-processed': 'Get processed schedule data',
            '/schedule-data': 'Get raw schedule data (legacy)'
        },
        documentation: 'https://github.com/otcrender/otc'
    });
});

// Endpoint to get schedule data
app.get('/schedule-data', async (req, res) => {
    console.log('Schedule data request received');
    
    try {
        // Check cache first
        if (isCacheValid() && scheduleCache && scheduleCache.metadata) {
            console.log('Serving data from cache');
            return res.json({
                data: scheduleCache.data,
                days: scheduleCache.days || [],
                metadata: {
                    lastUpdated: scheduleCache.metadata.lastUpdated,
                    totalRows: scheduleCache.data.length,
                    totalColumns: scheduleCache.data[0] ? scheduleCache.data[0].length : 0,
                    source: 'cache'
                }
            });
        }
        
        // Load cache from file if not in memory
        if (!scheduleCache) {
            console.log('Loading cache from file...');
            loadCache();
            if (isCacheValid() && scheduleCache && scheduleCache.metadata) {
                console.log('Serving data from file cache');
                return res.json({
                    data: scheduleCache.data,
                    days: scheduleCache.days || [],
                    metadata: {
                        lastUpdated: scheduleCache.metadata.lastUpdated,
                        totalRows: scheduleCache.data.length,
                        totalColumns: scheduleCache.data[0] ? scheduleCache.data[0].length : 0,
                        source: 'file cache'
                    }
                });
            }
        }
        
        console.log('No valid cache found, processing Excel file...');
        
        // Check if Excel file exists
        if (!fs.existsSync(FINAL_EXCEL_PATH)) {
            console.log('Excel file not found, attempting to download...');
            // Download the file first
            const success = await downloadAndPlaceFile();
            if (!success) {
                console.log('Download failed, checking for existing Excel file...');
                // Check if there's an existing Excel file with a different name
                const existingFiles = fs.readdirSync('.').filter(file => file.endsWith('.xlsx'));
                if (existingFiles.length > 0) {
                    console.log('Found existing Excel file:', existingFiles[0]);
                    // Use the first Excel file found
                    const existingPath = path.join('.', existingFiles[0]);
                    console.log('Processing existing file:', existingPath);
                    const result = await processExcelFile(existingPath);
                    if (result) {
                        // Save to cache
                        const metadata = {
                            lastUpdated: new Date().toISOString(),
                            totalRows: result.data.length,
                            totalColumns: result.data[0] ? result.data[0].length : 0,
                            source: 'existing file: ' + existingFiles[0]
                        };
                        saveCache(result, metadata);
                        
                        return res.json({
                            data: result.data,
                            days: result.days,
                            metadata: metadata
                        });
                    }
                }
                // Return fallback data when Excel file can't be downloaded
                const fallbackData = {
                    data: {
                        '0': {
                            timeSlots: [
                                { time: '6:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '7:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '8:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '9:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '10:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '11:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '12:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '1:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '2:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '3:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '4:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '5:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '6:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '7:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '8:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                                { time: '9:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) }
                            ]
                        }
                    },
                    days: [
                        { value: 'Friday August 29', isLaterDay: false },
                        { value: 'Saturday August 30', isLaterDay: false },
                        { value: 'Sunday August 31', isLaterDay: false },
                        { value: 'Monday September 1', isLaterDay: true },
                        { value: 'Tuesday September 2', isLaterDay: true },
                        { value: 'Wednesday September 3', isLaterDay: true }
                    ],
                    metadata: {
                        lastUpdated: new Date().toISOString(),
                        source: 'fallback',
                        message: 'Excel file download failed - showing fallback schedule'
                    }
                };
                
                return res.json(fallbackData);
            }
        }
        
        console.log('Processing Excel file:', FINAL_EXCEL_PATH);
        // Process the Excel file with timeout
        const result = await Promise.race([
            processExcelFile(FINAL_EXCEL_PATH),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Excel processing timeout after 30 seconds')), 30000)
            )
        ]);
        
        if (!result) {
            // Return fallback data when Excel file can't be processed
            const fallbackData = {
                data: {
                    '0': {
                        timeSlots: [
                            { time: '6:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '7:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '8:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '9:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '10:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '11:00 AM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '12:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '1:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '2:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '3:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '4:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '5:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '6:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '7:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '8:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) },
                            { time: '9:00 PM', courts: Array(7).fill({ sportType: 'available', name: 'Available' }) }
                        ]
                    }
                },
                days: [
                    { value: 'Friday August 29', isLaterDay: false },
                    { value: 'Saturday August 30', isLaterDay: false },
                    { value: 'Sunday August 31', isLaterDay: false },
                    { value: 'Monday September 1', isLaterDay: true },
                    { value: 'Tuesday September 2', isLaterDay: true },
                    { value: 'Wednesday September 3', isLaterDay: true }
                ],
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    source: 'fallback',
                    message: 'Excel file processing failed - showing fallback schedule'
                }
            };
            
            return res.json(fallbackData);
        }
        
        // Save to cache
        const metadata = {
            lastUpdated: new Date().toISOString(),
            totalRows: result.data.length,
            totalColumns: result.data[0] ? result.data[0].length : 0,
            source: 'fresh download'
        };
        saveCache(result, metadata);
        
        console.log('Successfully processed Excel file and returning data');
        // Return JSON with data and metadata
        res.json({
            data: result.data,
            days: result.days,
            metadata: metadata
        });
        
    } catch (error) {
        console.error('Error serving schedule data:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Keep the CSV endpoint for backward compatibility
app.get('/schedule.csv', async (req, res) => {
    console.log(`On-demand request received for /schedule.csv.`);
    const success = await downloadAndPlaceFile();

    if (success) {
        res.sendFile(FINAL_EXCEL_PATH, (err) => {
            if (err) res.status(500).send('Error serving the file after download.');
        });
    } else {
        res.status(500).send('Failed to generate the Excel file.');
    }
});

// Background task to refresh cache every 30 minutes
async function refreshCacheTask() {
    try {
        console.log('Background cache refresh task started');
        const success = await downloadAndPlaceFile();
        if (success) {
            const result = await processExcelFile(FINAL_EXCEL_PATH);
            if (result) {
                const metadata = {
                    lastUpdated: new Date().toISOString(),
                    totalRows: result.data.length,
                    totalColumns: result.data[0] ? result.data[0].length : 0,
                    source: 'background refresh'
                };
                saveCache(result, metadata);
                console.log('Background cache refresh completed');
            }
        }
    } catch (error) {
        console.error('Background cache refresh failed:', error);
    }
}

// Start background refresh task
setInterval(refreshCacheTask, CACHE_DURATION);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`JSON endpoint: http://localhost:3000/schedule-data`);
    console.log(`Excel download: http://localhost:3000/schedule.csv`);
    console.log(`Cache refresh interval: ${CACHE_DURATION / 60000} minutes`);
    
    // Initialize cache on startup
    loadCache();
});