// Main JavaScript - OTC Sports Center

// Global variables
let scheduleData = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing modules...');
    
    // Initialize page-specific functionality
    initPageSpecific();
    
    // Initialize pass purchase functionality
    initPassPurchase();
    
    // Initialize contact form
    initContactForm();
    
    // Initialize reservation form
    initReservationForm();
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Initialize animations
    initAnimations();
    
    // Initialize page-specific functionality
    initPageSpecific();
    
    console.log('All modules initialized');
});

// Initialize page-specific functionality
function initPageSpecific() {
    const currentPage = window.location.pathname;
    console.log('initPageSpecific called, current page:', currentPage);
    
    // Only initialize schedule if we're on the schedule page OR if scheduleTableContainer exists
    if (currentPage.includes('schedule') || document.getElementById('scheduleTableContainer')) {
        console.log('Schedule page detected, initializing...');
        initializeSchedule();
        loadScheduleData();
    }
    
    if (currentPage.includes('passes') || currentPage === '/' || currentPage.includes('index')) {
        initPassPurchase();
    }
    
    if (currentPage.includes('reservations') || currentPage === '/' || currentPage.includes('index')) {
        initReservationForm();
    }
    
    if (currentPage.includes('contact') || currentPage === '/' || currentPage.includes('index')) {
        initContactForm();
    }
    
    // Initialize navigation for all pages
    initializeNavigation();
}

// Initialize mobile menu
function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.navbar-toggler');
    const mobileMenu = document.querySelector('.navbar-collapse');
    
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('show');
            }
        });
    }
}

// Navigation Functions
function initializeNavigation() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Handle navbar scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Handle active nav links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Update active nav link on scroll
    window.addEventListener('scroll', updateActiveNavLink);
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Schedule Functions
function initializeSchedule() {
    // Initialize refresh button if it exists
    const refreshButton = document.getElementById('refreshSchedule');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            loadScheduleData(true);
        });
    }
}

function loadScheduleData(forceRefresh = false) {
    console.log('loadScheduleData called, current page:', window.location.pathname);
    
    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
        const scheduleContainer = document.getElementById('scheduleTableContainer');
        console.log('scheduleContainer found:', !!scheduleContainer);
        if (!scheduleContainer) {
            console.error('scheduleTableContainer not found!');
            return;
        }
        
        console.log('About to call loadScheduleDataInternal');
        // Continue with the rest of the function
        loadScheduleDataInternal(scheduleContainer, forceRefresh);
    }, 100);
}

function loadScheduleDataInternal(scheduleContainer, forceRefresh = false) {
    console.log('loadScheduleDataInternal called');
    
    // Show loading state
    showScheduleLoading();
    
    console.log('Making fetch request to /schedule-data');
    // Fetch data from API endpoint
    fetch(window.API_ENDPOINTS?.scheduleProcessed || '/schedule-processed')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Raw API data:', data);
            // Days will be determined from the actual data
            
            // Transform Excel data to expected format
            scheduleData = transformExcelData(data);
            
            // Day filter buttons removed - using day navigation tabs instead
            
            displaySchedule();
            updateLastUpdated();
        })
        .catch(error => {
            console.error('Error loading schedule:', error);
            console.log('Falling back to mock data');
            // Fallback to mock data
            scheduleData = generateMockScheduleData();
            displaySchedule();
            updateLastUpdated();
        });
}

function transformExcelData(apiData) {
    console.log('Starting transformExcelData with data:', apiData);
    
    if (!apiData || !apiData.data) {
        console.warn('Invalid data structure:', apiData);
        return generateMockScheduleData();
    }
    
    const transformedData = [];
    
    // Check if this is processed data (object with day indices) or raw data (array)
    if (typeof apiData.data === 'object' && !Array.isArray(apiData.data)) {
        // This is processed data format
        console.log('Processing processed data format');
        const processedData = apiData.data;
        
        // Process each day
        Object.keys(processedData).forEach(dayIndex => {
            const dayData = processedData[dayIndex];
            if (!dayData || !dayData.dayName || !Array.isArray(dayData.timeSlots)) {
                console.warn(`Invalid day data for day ${dayIndex}:`, dayData);
                return;
            }
            
            const dayName = dayData.dayName;
            console.log(`Processing day ${dayIndex}: ${dayName}`);
            
            // Process each time slot
            dayData.timeSlots.forEach(timeSlot => {
                if (!timeSlot || !timeSlot.time || !Array.isArray(timeSlot.courts)) {
                    return;
                }
                
                const time = timeSlot.time;
                
                // Process each court
                timeSlot.courts.forEach((court, courtIndex) => {
                    if (!court) return;
                    
                    const value = court.value || '';
                    const sportType = court.sportType || 'available';
                    const hasContent = court.hasContent || false;
                    
                    // Skip divider at index 3
                    if (courtIndex === 3) return;
                    
                    // Determine if this slot is available or has an instructor
                    const isAvailable = !hasContent || value === '' || sportType === 'available';
                    
                    // Determine sport display name
                    let sport = 'Available';
                    if (!isAvailable) {
                        if (sportType === 'tennis') {
                            sport = 'Tennis';
                        } else if (sportType === 'pickleball') {
                            sport = 'Pickleball';
                        } else if (sportType !== 'available') {
                            sport = sportType.charAt(0).toUpperCase() + sportType.slice(1);
                        } else {
                            sport = 'Lesson';
                        }
                    }
                    
                    // Map court index to proper court name (excluding divider)
                    const courtNames = ['Clay 1', 'PB Ct 1', 'PB Ct 2', 'PB Ct 3', 'PB Ct 4', 'Clay 2'];
                    const actualCourtIndex = courtIndex > 3 ? courtIndex - 1 : courtIndex;
                    const courtName = courtNames[actualCourtIndex];
                    if (!courtName) return;
                    
                    transformedData.push({
                        time: time,
                        day: dayName,
                        court: courtName,
                        instructor: isAvailable ? 'Available' : value,
                        sport: sport,
                        level: isAvailable ? '' : 'Intermediate',
                        available: isAvailable
                    });
                });
            });
        });
    } else if (Array.isArray(apiData.data) && apiData.days) {
        // This is raw data format
        console.log('Processing raw data format');
        const rawData = apiData.data;
        const days = apiData.days;
        
        console.log('Processing', days.length, 'days from raw Excel data');
        
        // Process each day
        days.forEach((dayInfo, dayIndex) => {
            if (!dayInfo || !dayInfo.value) return;
            
            const dayName = dayInfo.value;
            console.log(`Processing day ${dayIndex}: ${dayName}`);
            
            // Process each row of data (skip header row)
            for (let row = 1; row < rawData.length; row++) {
                const rowData = rawData[row];
                if (!rowData || !Array.isArray(rowData)) continue;
                
                // Get time value from first column of each day (dayIndex * 8)
                const timeColumnIndex = dayIndex * 8;
                const timeCell = rowData[timeColumnIndex];
                if (!timeCell || !timeCell.value || timeCell.value === '') continue;
                
                const timeValue = timeCell.value;
                if (typeof timeValue !== 'string' || !timeValue.includes(':')) continue;
                
                // Process each court for this time slot
                const courtNames = ['Clay 1', 'PB Ct 1', 'PB Ct 2', 'PB Ct 3', 'PB Ct 4', 'Clay 2'];
                
                for (let courtIndex = 0; courtIndex < 7; courtIndex++) { // 7 courts including divider
                    if (courtIndex === 3) continue; // Skip divider at index 3
                    
                    const cellIndex = timeColumnIndex + courtIndex;
                    const cell = rowData[cellIndex];
                    
                    const value = cell ? (cell.value || '') : '';
                    const sportType = cell ? (cell.sportType || 'available') : 'available';
                    const hasContent = cell ? (cell.hasContent || false) : false;
                    
                    // Determine if this slot is available or has an instructor
                    const isAvailable = !hasContent || value === '' || sportType === 'available';
                    
                    // Determine sport display name
                    let sport = 'Available';
                    if (!isAvailable) {
                        if (sportType === 'tennis') {
                            sport = 'Tennis';
                        } else if (sportType === 'pickleball') {
                            sport = 'Pickleball';
                        } else if (sportType !== 'available') {
                            sport = sportType.charAt(0).toUpperCase() + sportType.slice(1);
                        } else {
                            sport = 'Lesson';
                        }
                    }
                    
                    // Map court index to court name (excluding divider)
                    const actualCourtIndex = courtIndex > 3 ? courtIndex - 1 : courtIndex;
                    const courtName = courtNames[actualCourtIndex];
                    if (!courtName) continue;
                    
                    transformedData.push({
                        time: timeValue,
                        day: dayName,
                        court: courtName,
                        instructor: isAvailable ? 'Available' : value,
                        sport: sport,
                        level: isAvailable ? '' : 'Intermediate',
                        available: isAvailable
                    });
                }
            }
        });
    } else {
        console.error('Unknown data format:', apiData);
        return generateMockScheduleData();
    }
    
    console.log(`Processed ${transformedData.length} schedule entries from data`);
    
    // If no data was processed, generate mock data
    if (transformedData.length === 0) {
        console.warn('No schedule data processed, generating mock data');
        return generateMockScheduleData();
    }
    
    console.log('SUCCESS: Schedule data processed successfully!');
    console.log('Sample entries:', transformedData.slice(0, 3));
    
    return transformedData;
}

function getDayName(dayIndex) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayIndex] || 'Unknown';
}

function generateMockScheduleData() {
    const courts = ['Clay 1', 'PB Ct 1', 'PB Ct 2', 'Divider', 'PB Ct 3', 'PB Ct 4', 'Clay 2'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const times = [
        '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
    ];
    const sports = ['Tennis', 'Pickleball', 'Available', 'Tentative'];
    
    const data = [];
    
    courts.forEach(court => {
        if (court === 'Divider') return; // Skip divider in mock data
        
        days.forEach(day => {
            times.forEach(time => {
                const sport = sports[Math.floor(Math.random() * sports.length)];
                data.push({
                    court,
                    day,
                    time,
                    sport,
                    available: sport === 'Available',
                    tentative: sport === 'Tentative'
                });
            });
        });
    });
    
    return data;
}

// filterSchedule function removed since filters were removed

function displaySchedule() {
    const container = document.getElementById('scheduleTableContainer');
    if (!container) {
        console.error('scheduleTableContainer not found in displaySchedule!');
        return;
    }
    if (!scheduleData) return;
    
    if (scheduleData.length === 0) {
        showScheduleEmpty();
        return;
    }
    
    // Group data by day and time
    const groupedData = groupScheduleData(scheduleData);
    
    // Generate table HTML
    const tableHTML = generateScheduleTable(groupedData);
    
    container.innerHTML = tableHTML;
    
    // Add click handlers to cells
    addScheduleCellHandlers();
}

function groupScheduleData(data) {
    const grouped = {};
    
    data.forEach(item => {
        if (!grouped[item.day]) {
            grouped[item.day] = {};
        }
        if (!grouped[item.day][item.time]) {
            grouped[item.day][item.time] = {};
        }
        grouped[item.day][item.time][item.court] = item;
    });
    
    return grouped;
}

// Simple schedule table approach (matching working version)
function displayScheduleFromProcessedData(processedData, days) {
    const container = document.getElementById('scheduleTableContainer');
    if (!container) {
        console.error('scheduleTableContainer not found in displayScheduleFromProcessedData!');
        return;
    }
    
    if (!processedData || !days || days.length === 0) {
        showScheduleEmpty();
        return;
    }
    
    // Use the working version's approach: simple table with day dropdown
    const tableHTML = generateSimpleScheduleTable(processedData, days);
    container.innerHTML = tableHTML;
    
    // Initialize the day dropdown and render first day
    updateDayDropdown(days);
    updateTableHeaders(days, 0);
    renderScheduleTable(processedData, 0);
    
    // Add event handlers
    addScheduleCellHandlers();
}

function generateSimpleScheduleTable(processedData, days) {
    return `
        <div class="schedule-container">
            <div class="row mb-3">
                <div class="col-md-4">
                    <label for="daySelect" class="form-label">Select Day:</label>
                    <select class="form-select" id="daySelect" onchange="onDayChange()">
                        <option value="0">Loading days...</option>
                    </select>
                </div>
                <div class="col-md-8 text-end">
                    <button class="btn btn-outline-primary" onclick="loadScheduleData()">
                        <i class="fas fa-sync-alt me-2"></i>Refresh
                    </button>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-bordered schedule-table" id="scheduleTable">
                    <thead>
                        <tr>
                            <th class="time-column">Time</th>
                            <th colspan="7" class="court-header">Loading...</th>
                        </tr>
                        <tr>
                            <th class="time-column">Time</th>
                            <th colspan="3" class="day-header">Tennis Court 1</th>
                            <th class="day-header">Divider</th>
                            <th colspan="3" class="day-header">Tennis Court 2</th>
                        </tr>
                        <tr>
                            <th class="time-column">Time</th>
                            <th class="day-header">Clay 1</th>
                            <th class="day-header">PB Ct 1</th>
                            <th class="day-header">PB Ct 2</th>
                            <th class="day-header">Divider</th>
                            <th class="day-header">PB Ct 3</th>
                            <th class="day-header">PB Ct 4</th>
                            <th class="day-header">Clay 2</th>
                        </tr>
                    </thead>
                    <tbody id="scheduleBody">
                        <tr>
                            <td colspan="8" class="loading">
                                <i class="fas fa-spinner fa-spin me-2"></i>
                                Loading schedule data...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Update day dropdown with parsed days
function updateDayDropdown(days) {
    const daySelect = document.getElementById('daySelect');
    if (!daySelect || days.length === 0) {
        return;
    }
    
    daySelect.innerHTML = '';
    days.forEach((day, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = day.value;
        daySelect.appendChild(option);
    });
    
    // Set first day as default
    daySelect.value = '0';
}

// Update table headers based on selected day
function updateTableHeaders(days, selectedDayIndex) {
    const thead = document.querySelector('#scheduleTable thead');
    if (!thead || days.length === 0) {
        return;
    }
    
    const selectedDayData = days[parseInt(selectedDayIndex)];
    const dayName = selectedDayData ? selectedDayData.value : 'Unknown Day';
    
    thead.innerHTML = `
        <tr>
            <th class="time-column">Time</th>
            <th colspan="7" class="court-header">${dayName}</th>
        </tr>
        <tr>
            <th class="time-column">Time</th>
            <th colspan="3" class="day-header">Tennis Court 1</th>
            <th class="day-header">Divider</th>
            <th colspan="3" class="day-header">Tennis Court 2</th>
        </tr>
        <tr>
            <th class="time-column">Time</th>
            <th class="day-header">Clay 1</th>
            <th class="day-header">PB Ct 1</th>
            <th class="day-header">PB Ct 2</th>
            <th class="day-header">Divider</th>
            <th class="day-header">PB Ct 3</th>
            <th class="day-header">PB Ct 4</th>
            <th class="day-header">Clay 2</th>
        </tr>
    `;
}

// Render the schedule table using pre-processed data
function renderScheduleTable(processedData, selectedDayIndex) {
    const tbody = document.getElementById('scheduleBody');
    if (!tbody) return;
    
    const dayData = processedData[selectedDayIndex];
    
    if (!dayData || !dayData.timeSlots) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading"><i class="fas fa-spinner fa-spin me-2"></i>Loading schedule data...</td></tr>';
        return;
    }
    
    // Use innerHTML for faster rendering
    let html = '';
    
    dayData.timeSlots.forEach(timeSlot => {
        html += '<tr>';
        
        // Time column
        html += `<td class="time-column">${timeSlot.time}</td>`;
        
        // Court columns
        timeSlot.courts.forEach(court => {
            const cellClass = getCellClass(court);
            const cellStyle = getCellStyle(court);
            
            html += `<td class="${cellClass}" style="${cellStyle}">`;
            
            if (court.hasContent) {
                html += `<div>${court.value}</div>`;
                html += getStatusBadge(court.sportType);
            }
            
            html += '</td>';
        });
        
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
}

// Handle day change
function onDayChange() {
    const selectedDay = document.getElementById('daySelect').value;
    const selectedDayIndex = parseInt(selectedDay);
    
    updateTableHeaders(window.scheduleDays, selectedDayIndex);
    renderScheduleTable(window.scheduleData, selectedDayIndex);
}

// Get cell class for styling
function getCellClass(court) {
    if (!court) return 'cell-available';
    
    if (!court.sportType || court.sportType === 'available') {
        return 'cell-available';
    }
    
    switch (court.sportType) {
        case 'tennis': return 'cell-tennis';
        case 'pickleball': return 'cell-pickleball';
        case 'tentative': return 'cell-tentative';
        default: return 'cell-available';
    }
}

// Get cell style for background color
function getCellStyle(court) {
    // Only apply background color if court has BOTH a background color AND actual text content
    // Filter out date-time strings, time values, and only show reservation names
    if (court.backgroundColor && court.backgroundColor !== '' && 
        court.value && typeof court.value === 'string' && court.value.trim() &&
        !court.value.includes('1899-12-30T') && // More specific - only filter out date-time strings
        !court.value.includes('Time') &&
        !court.value.includes('SUMMER SEASON') &&
        !court.value.includes('2025 SUMMER SEASON') &&
        !court.value.includes('FALL SEASON') &&
        !court.value.includes('2025 FALL SEASON') &&
        court.value.length < 50) { // Filter out very long strings
        return `background-color: #${court.backgroundColor.substring(2)}; color: #000; font-weight: 600;`;
    }
    return '';
}

// Get status badge for sport type
function getStatusBadge(sportType) {
    if (!sportType || sportType === 'available') return '';
    
    const badges = {
        'tennis': '<span class="status-badge bg-success text-white">Tennis</span>',
        'pickleball': '<span class="status-badge bg-primary text-white">Pickleball</span>',
        'tentative': '<span class="status-badge bg-warning text-dark">Tentative</span>'
    };
    
    return badges[sportType] || '';
}

function generateScheduleTable(groupedData) {
    // Use only the days that actually have data and sort them by date
    const availableDays = Object.keys(groupedData);
    
    // Sort days by date (extract date from day name like "THURSDAY AUGUST 28")
    const days = availableDays.sort((a, b) => {
        // Extract date parts from day names
        const aParts = a.split(' ');
        const bParts = b.split(' ');
        
        // Get month and day from the day name
        const aMonth = aParts[1]; // AUGUST
        const aDay = parseInt(aParts[2]); // 28
        const bMonth = bParts[1]; // SEPTEMBER  
        const bDay = parseInt(bParts[2]); // 1
        
        // Define month order
        const monthOrder = {
            'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
            'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
            'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12
        };
        
        const aMonthNum = monthOrder[aMonth] || 0;
        const bMonthNum = monthOrder[bMonth] || 0;
        
        // First compare by month, then by day
        if (aMonthNum !== bMonthNum) {
            return aMonthNum - bMonthNum;
        }
        
        return aDay - bDay;
    });
    
    // Only show 6 courts per day (excluding the divider)
    const courts = ['Clay 1', 'PB Ct 1', 'PB Ct 2', 'PB Ct 3', 'PB Ct 4', 'Clay 2'];
    const times = [
        '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
        '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
        '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
        '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM'
    ];
    
    let html = '<div class="modern-schedule">';
    
    // Day Navigation Tabs
    html += '<div class="schedule-nav mb-4">';
    html += '<div class="nav nav-pills nav-fill" id="day-tabs" role="tablist">';
    
    // Find current day index
    const today = new Date();
    const currentDayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    let currentDayIndex = 0; // Default to first day
    
    // Try to find current day in the available days
    days.forEach((day, index) => {
        const dayShort = day.split(' ')[0].toUpperCase();
        if (dayShort === currentDayName) {
            currentDayIndex = index;
        }
    });
    
    days.forEach((day, index) => {
        const isActive = index === currentDayIndex ? 'active' : '';
        const tabId = `day-${index}`;
        
        // Extract date parts from day name like "THURSDAY AUGUST 28"
        const dayParts = day.split(' ');
        const dayName = dayParts[0]; // THURSDAY
        const month = dayParts[1]; // AUGUST
        const dayNumber = dayParts[2]; // 28
        
        // Create a more readable date format
        const shortMonth = month.substring(0, 3); // AUG
        const displayDate = `${shortMonth} ${dayNumber}`; // AUG 28
        
        html += `<button class="nav-link ${isActive}" 
                         id="${tabId}-tab" 
                         data-bs-toggle="pill" 
                         data-bs-target="#${tabId}" 
                         type="button" 
                         role="tab"
                         aria-controls="${tabId}"
                         aria-selected="${index === currentDayIndex ? 'true' : 'false'}"
                         title="${day}">
                    <div class="day-nav-content">
                        <div class="day-date">${displayDate}</div>
                        <div class="day-name">${dayName.substring(0, 3)}</div>
                    </div>
                 </button>`;
    });
    
    html += '</div>';
    html += '</div>';
    
    // Day Content Tabs
    html += '<div class="tab-content" id="day-tabContent">';
    
    days.forEach((day, dayIndex) => {
        const tabId = `day-${dayIndex}`;
        const isActive = dayIndex === currentDayIndex ? 'show active' : '';
        
        html += `<div class="tab-pane fade ${isActive}" 
                        id="${tabId}" 
                        role="tabpanel"
                        aria-labelledby="${tabId}-tab">
                    <div class="day-schedule">`;
        
        // Court Grid for this day - only show 6 courts
        courts.forEach(court => {
            html += `<div class="court-section">`;
            html += `<div class="court-header">`;
            html += `<h3 class="court-name">${court}</h3>`;
            html += `<div class="court-status">`;
            
            // Count available vs occupied slots
            let availableCount = 0;
            let occupiedCount = 0;
            
            times.forEach(time => {
                const cellData = groupedData[day]?.[time]?.[court];
                if (cellData) {
                    if (cellData.available) {
                        availableCount++;
                    } else {
                        occupiedCount++;
                    }
                }
            });
            
            html += `<span class="status-badge available">${availableCount} Available</span>`;
            html += `<span class="status-badge occupied">${occupiedCount} Booked</span>`;
            html += `</div></div>`;
            
            // Time slots grid
            html += `<div class="time-grid">`;
            
            times.forEach(time => {
                const cellData = groupedData[day]?.[time]?.[court];
                const slotClass = getModernSlotClass(cellData);
                const slotContent = getModernSlotContent(cellData, time);
                
                html += `<div class="time-slot ${slotClass}" 
                                data-court="${court}" 
                                data-day="${day}" 
                                data-time="${time}">
                            ${slotContent}
                         </div>`;
            });
            
            html += `</div></div>`;
        });
        
        html += `</div></div>`;
    });
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

function getModernSlotClass(cellData) {
    if (!cellData) return 'slot-unavailable';
    
    if (cellData.available) {
        return 'slot-available';
    }
    
    switch (cellData.sport.toLowerCase()) {
        case 'tennis':
            return 'slot-tennis';
        case 'pickleball':
            return 'slot-pickleball';
        case 'lesson':
            return 'slot-lesson';
        case 'tentative':
            return 'slot-tentative';
        default:
            return 'slot-booked';
    }
}

function getModernSlotContent(cellData, time) {
    if (!cellData) {
        return `<div class="slot-content">
                    <div class="slot-time">${time}</div>
                    <div class="slot-status">Unavailable</div>
                </div>`;
    }
    
    if (cellData.available) {
        return `<div class="slot-content">
                    <div class="slot-time">${time}</div>
                    <div class="slot-status available">
                        <i class="fas fa-check-circle"></i>
                        Available
                    </div>
                </div>`;
    }
    
    const sportIcon = getSportIcon(cellData.sport);
    const instructorName = cellData.instructor && cellData.instructor !== 'Available' 
        ? cellData.instructor 
        : 'Booked';
    
    return `<div class="slot-content">
                <div class="slot-time">${time}</div>
                <div class="slot-status booked">
                    <i class="${sportIcon}"></i>
                    <div class="slot-details">
                        <div class="sport-type">${cellData.sport}</div>
                        <div class="instructor-name">${instructorName}</div>
                    </div>
                </div>
            </div>`;
}

function getSportIcon(sport) {
    switch (sport.toLowerCase()) {
        case 'tennis':
            return 'fas fa-tennis-ball';
        case 'pickleball':
            return 'fas fa-table-tennis';
        case 'lesson':
            return 'fas fa-chalkboard-teacher';
        default:
            return 'fas fa-calendar-check';
    }
}



function getCellContent(cellData) {
    if (!cellData) return '<div class="cell-content">-</div>';
    
    let content = `<div class="cell-content">`;
    
    if (cellData.available) {
        content += `<div class="cell-sport text-success fw-bold">Available</div>`;
    } else {
        content += `<div class="cell-sport fw-bold">${cellData.sport}</div>`;
        if (cellData.instructor && cellData.instructor !== 'Available') {
            content += `<div class="cell-instructor text-muted small">${cellData.instructor}</div>`;
        }
    }
    
    content += `</div>`;
    return content;
}

function addScheduleCellHandlers() {
    // Handle modern time slots
    const slots = document.querySelectorAll('.time-slot');
    slots.forEach(slot => {
        slot.addEventListener('click', function() {
            const court = this.dataset.court;
            const day = this.dataset.day;
            const time = this.dataset.time;
            
            handleModernSlotClick(this, court, day, time);
        });
    });
    
    // Handle day tab switching
    const dayTabs = document.querySelectorAll('#day-tabs .nav-link');
    dayTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            dayTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            // Hide all tab panes
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabPanes.forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            // Show the selected tab pane
            const targetId = this.getAttribute('data-bs-target');
            const targetPane = document.querySelector(targetId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
            }
        });
    });
}

function handleModernSlotClick(element, court, day, time) {
    // Add visual feedback
    element.classList.add('slot-clicked');
    setTimeout(() => {
        element.classList.remove('slot-clicked');
    }, 200);
    
    // Check if slot is available
    const isAvailable = element.classList.contains('slot-available');
    
    if (isAvailable) {
        // Show reservation modal or redirect
        showReservationModal(court, day, time);
    } else {
        // Show slot details
        showSlotDetails(element, court, day, time);
    }
}

function showReservationModal(court, day, time) {
    // Create URL parameters for autofill
    const params = new URLSearchParams({
        court: court,
        day: day,
        time: time,
        source: 'schedule'
    });
    
    // Create a simple modal for reservation
    const modalHtml = `
        <div class="modal fade" id="reservationModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-calendar-plus me-2"></i>
                            Reserve Court
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="reservation-details mb-3">
                            <h6 class="text-primary">
                                <i class="fas fa-info-circle me-2"></i>
                                Selected Time Slot
                            </h6>
                            <div class="row">
                                <div class="col-4">
                                    <div class="detail-item">
                                        <small class="text-muted">Court</small>
                                        <div class="fw-bold">${court}</div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="detail-item">
                                        <small class="text-muted">Day</small>
                                        <div class="fw-bold">${day.split(' ')[0]}</div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="detail-item">
                                        <small class="text-muted">Time</small>
                                        <div class="fw-bold">${time}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle me-2"></i>
                            This information will be automatically filled in the reservation form.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancel
                        </button>
                        <a href="reservations.html?${params.toString()}" class="btn btn-primary">
                            <i class="fas fa-arrow-right me-2"></i>Continue to Reservation
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('reservationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
    modal.show();
}

function showSlotDetails(element, court, day, time) {
    // Create a tooltip or popover with slot details
    const slotContent = element.querySelector('.slot-details');
    if (slotContent) {
        const sportType = slotContent.querySelector('.sport-type')?.textContent || 'Booked';
        const instructorName = slotContent.querySelector('.instructor-name')?.textContent || 'Unknown';
        
        // Create a simple alert for now
        const alertHtml = `
            <div class="alert alert-info alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <h6><i class="fas fa-info-circle"></i> Slot Details</h6>
                <p><strong>Court:</strong> ${court}</p>
                <p><strong>Day:</strong> ${day}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Activity:</strong> ${sportType}</p>
                <p><strong>Instructor:</strong> ${instructorName}</p>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert:last-of-type');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}

function handleCellClick(court, day, time) {
    // Show reservation modal or navigate to reservation form
    const reservationSection = document.getElementById('reservations');
    if (reservationSection) {
        // Pre-fill reservation form
        const courtSelect = document.getElementById('reservationCourt');
        const daySelect = document.getElementById('reservationDay');
        const timeSelect = document.getElementById('reservationTime');
        
        if (courtSelect) courtSelect.value = court;
        if (daySelect) daySelect.value = day;
        if (timeSelect) timeSelect.value = time;
        
        // Scroll to reservation form
        reservationSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function showScheduleLoading() {
    const container = document.getElementById('scheduleTableContainer');
    if (!container) {
        console.error('scheduleTableContainer not found in showScheduleLoading!');
        return;
    }
    container.innerHTML = `
            <div class="schedule-loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span>Loading schedule...</span>
            </div>
        `;
}

function showScheduleError(message) {
    const container = document.getElementById('scheduleTableContainer');
    if (!container) {
        console.error('scheduleTableContainer not found in showScheduleError!');
        return;
    }
    container.innerHTML = `
            <div class="schedule-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Error Loading Schedule</h5>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadScheduleData(true)">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
}

function showScheduleEmpty() {
    const container = document.getElementById('scheduleTableContainer');
    if (!container) {
        console.error('scheduleTableContainer not found in showScheduleEmpty!');
        return;
    }
    container.innerHTML = `
            <div class="schedule-empty">
                <i class="fas fa-calendar-times"></i>
                <h5>No Schedule Data</h5>
                <p>No schedule entries match your current filters.</p>
                <button class="btn btn-outline-primary" onclick="clearFilters()">
                    <i class="fas fa-filter"></i> Clear Filters
                </button>
            </div>
        `;
}

// Filter functions removed since top filters were removed

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

// updateDayFilterButtons function removed since day filter buttons were removed

// Form Functions - Legacy support
function initializeForms() {
    // This function is kept for backward compatibility
    initPassPurchase();
    initReservationForm();
    initContactForm();
}

// Initialize reservation form
function initReservationForm() {
    const form = document.getElementById('reservationForm');
    if (!form) return;
    
    handleReservationForm();
}

// Reservation form handling
function handleReservationForm() {
    const form = document.getElementById('reservationForm');
    if (!form) return;
    
    // Set minimum date to today
    const dateInput = document.getElementById('preferredDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
    
    // Handle pass type selection
    const passTypeSelect = document.getElementById('passType');
    const needPassAlert = document.getElementById('needPassAlert');
    
    if (passTypeSelect && needPassAlert) {
        passTypeSelect.addEventListener('change', function() {
            if (this.value === 'none') {
                needPassAlert.style.display = 'block';
            } else {
                needPassAlert.style.display = 'none';
            }
        });
    }
    
    // Handle court type and pass type compatibility
    const courtTypeSelect = document.getElementById('courtType');
    if (courtTypeSelect && passTypeSelect) {
        courtTypeSelect.addEventListener('change', function() {
            const courtType = this.value;
            const passOptions = passTypeSelect.querySelectorAll('option');
            
            passOptions.forEach(option => {
                if (option.value === '' || option.value === 'none') {
                    return; // Keep default options
                }
                
                if (courtType === 'pickleball') {
                    // Pickleball courts can use both pickleball and tennis passes
                    option.style.display = 'block';
                } else if (courtType.startsWith('tennis')) {
                    // Tennis courts require tennis passes
                    if (option.value.startsWith('tennis')) {
                        option.style.display = 'block';
                    } else {
                        option.style.display = 'none';
                    }
                }
            });
            
            // Reset pass type selection when court type changes
            passTypeSelect.value = '';
            needPassAlert.style.display = 'none';
        });
    }
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Custom validation
        let isValid = true;
        const errors = [];
        
        // Check if pass type is compatible with court type
        const courtType = document.getElementById('courtType').value;
        const passType = document.getElementById('passType').value;
        
        if (passType === 'none') {
            errors.push('You must purchase a pass before making a reservation.');
            isValid = false;
        } else if (courtType.startsWith('tennis') && passType.startsWith('pickleball')) {
            errors.push('Tennis courts require a tennis pass. Pickleball passes are not valid for tennis courts.');
            isValid = false;
        }
        
        // Check date is not in the past
        const selectedDate = new Date(document.getElementById('preferredDate').value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            errors.push('Please select a future date for your reservation.');
            isValid = false;
        }
        
        // Basic form validation
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            isValid = false;
        }
        
        // Show custom errors
        if (errors.length > 0) {
            showNotification(errors.join(' '), 'error');
            return;
        }
        
        if (!isValid) {
            return;
        }
        
        // Collect form data
        const formData = new FormData(form);
        const reservationData = Object.fromEntries(formData.entries());
        
        // Add calculated end time
        const startTime = reservationData.startTime;
        const duration = parseInt(reservationData.duration);
        const endTime = calculateEndTime(startTime, duration);
        reservationData.endTime = endTime;
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
        submitBtn.disabled = true;
        
        // Submit reservation to API
         fetch('/api/reservation', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(reservationData)
         })
         .then(response => response.json())
         .then(data => {
             if (data.success) {
                 // Show success message
                 const statusDiv = document.getElementById('reservationStatus');
                 if (statusDiv) {
                     statusDiv.style.display = 'block';
                     statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }
                 
                 showNotification('Reservation request submitted successfully! We\'ll contact you within 24 hours.', 'success');
                 
                 // Reset form
                 form.reset();
                 form.classList.remove('was-validated');
                 needPassAlert.style.display = 'none';
                 
                 // Hide status after 10 seconds
                 setTimeout(() => {
                     if (statusDiv) {
                         statusDiv.style.display = 'none';
                     }
                 }, 10000);
             } else {
                 throw new Error(data.error || 'Failed to submit reservation');
             }
         })
         .catch(error => {
             console.error('Error submitting reservation:', error);
             showNotification(error.message || 'Failed to submit reservation. Please try again.', 'error');
         })
         .finally(() => {
             // Reset button
             submitBtn.innerHTML = originalText;
             submitBtn.disabled = false;
         });
    });
}

// Helper function to calculate end time
function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + duration * 60000);
    
    return endDate.toTimeString().slice(0, 5);
}

function handlePassPurchase(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const passType = formData.get('passType');
    const quantity = formData.get('quantity');
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitButton.disabled = true;
    
    // Simulate processing
    setTimeout(() => {
        // Reset button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        
        // Show success message
        showNotification('Pass purchase initiated! You will be redirected to PayPal.', 'success');
        
        // Here you would integrate with PayPal
        console.log('Pass purchase:', { passType, quantity });
    }, 2000);
}



// Initialize contact form
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
}

function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitButton.disabled = true;
    
    // Submit contact form to API
    fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Message sent! We will get back to you soon.', 'success');
            
            // Reset form
            e.target.reset();
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    })
    .catch(error => {
        console.error('Error sending contact form:', error);
        showNotification(error.message || 'Failed to send message. Please try again.', 'error');
    })
    .finally(() => {
        // Reset button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    });
}

// Pass Purchase Functions
let selectedPass = null;

function initPassPurchase() {
    console.log('Initializing pass purchase...');
    
    // Initialize sport selection
    initSportSelection();
    
    // Initialize pass type selection
    initPassTypeSelection();
    
    // Initialize sport type switching
    const sportTypeRadios = document.querySelectorAll('input[name="sportType"]');
    sportTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleSportTypeChange);
    });
    
    // Initialize player option selection
    initPlayerOptions();
    
    // Load PayPal SDK
    loadPayPalSDK().catch(error => {
        console.warn('PayPal SDK not available:', error.message);
        // Disable PayPal buttons if they exist
        document.querySelectorAll('.paypal-button-container').forEach(container => {
            container.style.display = 'none';
        });
    });
}

// Initialize sport selection
function initSportSelection() {
    const sportRadios = document.querySelectorAll('input[name="sport"]');
    sportRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updatePassOptions(this.value);
        });
    });
    
    // Initialize with default sport if available
    const defaultSport = document.querySelector('input[name="sport"]:checked');
    if (defaultSport) {
        updatePassOptions(defaultSport.value);
    }
}

// Initialize pass type selection
function initPassTypeSelection() {
    const passOptions = document.querySelectorAll('.player-option');
    passOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            passOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Update purchase summary
            updatePurchaseSummary(this);
        });
    });
}

// Update pass options based on sport selection
function updatePassOptions(sport) {
    const passOptionsContainer = document.getElementById('passOptions');
    if (!passOptionsContainer) return;
    
    // Add fade out effect
    passOptionsContainer.classList.add('fade-out');
    
    setTimeout(() => {
        // Update pricing based on sport
        const prices = {
            pickleball: {
                day: { '1-2': 25, '3-4': 45 },
                week: { '1-2': 150, '3-4': 270 },
                month: { '1-2': 500, '3-4': 900 },
                season: { '1-2': 1800, '3-4': 3240 }
            },
            tennis: {
                day: { '1-2': 30, '3-4': 55 },
                week: { '1-2': 180, '3-4': 330 },
                month: { '1-2': 600, '3-4': 1100 },
                season: { '1-2': 2200, '3-4': 4000 }
            }
        };
        
        const sportPrices = prices[sport] || prices.pickleball;
        
        // Update all price displays
        document.querySelectorAll('.player-option').forEach(option => {
            const passType = option.closest('.pricing-card').dataset.passType;
            const players = option.dataset.players;
            const price = sportPrices[passType] && sportPrices[passType][players];
            
            if (price) {
                const priceElement = option.querySelector('.price');
                if (priceElement) {
                    priceElement.textContent = `$${price}`;
                }
            }
        });
        
        // Remove fade out and add fade in
        passOptionsContainer.classList.remove('fade-out');
        passOptionsContainer.classList.add('fade-in');
        
        setTimeout(() => {
            passOptionsContainer.classList.remove('fade-in');
        }, 300);
    }, 150);
}

// Update purchase summary
function updatePurchaseSummary(selectedOption) {
    const summaryContainer = document.getElementById('purchaseSummary');
    if (!summaryContainer) return;
    
    const passCard = selectedOption.closest('.pricing-card');
    const passType = passCard.querySelector('h4').textContent;
    const players = selectedOption.querySelector('.players').textContent;
    const price = selectedOption.querySelector('.price').textContent;
    const sport = document.querySelector('input[name="sport"]:checked')?.value || 'pickleball';
    
    summaryContainer.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Purchase Summary</h5>
                <div class="summary-item d-flex justify-content-between">
                    <span>Sport:</span>
                    <span class="text-capitalize">${sport}</span>
                </div>
                <div class="summary-item d-flex justify-content-between">
                    <span>Pass Type:</span>
                    <span>${passType}</span>
                </div>
                <div class="summary-item d-flex justify-content-between">
                    <span>Players:</span>
                    <span>${players}</span>
                </div>
                <hr>
                <div class="summary-total d-flex justify-content-between">
                    <strong>Total:</strong>
                    <strong class="text-primary">${price}</strong>
                </div>
            </div>
        </div>
    `;
    
    summaryContainer.style.display = 'block';
    
    // Store selection data for PayPal
    window.selectedPass = {
        sport: sport,
        type: passType,
        players: players,
        price: parseFloat(price.replace('$', ''))
    };
    
    // Show PayPal buttons
    const paypalContainer = document.getElementById('paypal-button-container');
    if (paypalContainer) {
        paypalContainer.style.display = 'block';
        setupPayPalButtons();
    }
}

function setupPayPalButtons() {
    const paypalContainer = document.getElementById('paypal-button-container');
    if (!paypalContainer) {
        console.log('PayPal container not found');
        return;
    }
    
    // Clear existing buttons
    paypalContainer.innerHTML = '';
    
    // Get selected pass data from global variable or form
    let passData = window.selectedPass;
    
    if (!passData) {
        // Fallback to form data for backward compatibility
        const selectedSport = document.querySelector('input[name="sportType"]:checked')?.value || 
                             document.querySelector('input[name="sport"]:checked')?.value || 'pickleball';
        const selectedPass = document.querySelector('input[name="passType"]:checked')?.value || 'day';
        const selectedPlayers = document.querySelector('input[name="players"]:checked')?.value || '1-2';
        const price = calculatePassPrice(selectedSport, selectedPass, selectedPlayers);
        
        passData = {
            sport: selectedSport,
            type: selectedPass,
            players: selectedPlayers,
            price: price
        };
    }
    
    if (!passData.price) {
        console.error('Could not determine price for selected options');
        return;
    }
    
    console.log('Setting up PayPal buttons for:', passData);
    
    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: passData.price.toString()
                    },
                    description: `${passData.sport.charAt(0).toUpperCase() + passData.sport.slice(1)} ${passData.type} pass for ${passData.players} players`
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                console.log('Payment completed:', details);
                
                // Send purchase data to server
                fetch('/api/purchase-complete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        orderID: data.orderID,
                        paymentDetails: details,
                        passDetails: passData
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification('Purchase completed successfully! Check your email for confirmation.', 'success');
                        // Reset form
                        resetPassForm();
                    } else {
                        showNotification('Purchase completed but there was an issue with confirmation. Please contact us.', 'warning');
                    }
                })
                .catch(error => {
                    console.error('Error processing purchase:', error);
                    showNotification('Purchase completed but there was an issue with confirmation. Please contact us.', 'warning');
                });
            });
        },
        onError: function(err) {
            console.error('PayPal error:', err);
            showNotification('Payment failed. Please try again or contact us for assistance.', 'error');
        }
    }).render('#paypal-button-container');
}

// Reset pass form after successful purchase
function resetPassForm() {
    // Clear selected options
    document.querySelectorAll('.player-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Hide purchase summary
    const summaryContainer = document.getElementById('purchaseSummary');
    if (summaryContainer) {
        summaryContainer.style.display = 'none';
    }
    
    // Hide PayPal buttons
    const paypalContainer = document.getElementById('paypal-button-container');
    if (paypalContainer) {
        paypalContainer.style.display = 'none';
    }
    
    // Clear global selection
    window.selectedPass = null;
}

function handleSportTypeChange(event) {
    const selectedSport = event.target.value;
    const pickleballOptions = document.getElementById('pickleballOptions');
    const tennisOptions = document.getElementById('tennisOptions');
    
    // Add fade effect
    const currentVisible = selectedSport === 'pickleball' ? tennisOptions : pickleballOptions;
    const toShow = selectedSport === 'pickleball' ? pickleballOptions : tennisOptions;
    
    currentVisible.style.display = 'none';
    toShow.style.display = 'block';
    
    // Reset selection
    clearSelection();
    initPlayerOptions();
}

function initPlayerOptions() {
    const playerOptions = document.querySelectorAll('.player-option');
    playerOptions.forEach(option => {
        option.addEventListener('click', handlePlayerOptionSelect);
    });
}

function handlePlayerOptionSelect(event) {
    const option = event.currentTarget;
    const players = option.dataset.players;
    const price = parseFloat(option.dataset.price);
    const sportType = document.querySelector('input[name="sportType"]:checked').value;
    
    // Get pass type from parent card
    const card = option.closest('.pricing-card');
    const passTypeElement = card.querySelector('h5');
    const passType = passTypeElement.textContent.trim();
    
    // Clear previous selections
    document.querySelectorAll('.player-option.selected').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Select current option
    option.classList.add('selected');
    
    // Store selection
    selectedPass = {
        sportType,
        passType,
        players: parseInt(players),
        price
    };
    
    // Show purchase summary
    showPurchaseSummary();
}

function clearSelection() {
    document.querySelectorAll('.player-option.selected').forEach(opt => {
        opt.classList.remove('selected');
    });
    selectedPass = null;
    hidePurchaseSummary();
}

function showPurchaseSummary() {
    if (!selectedPass) return;
    
    const summaryContainer = document.getElementById('purchaseSummary');
    const summaryDetails = document.getElementById('summaryDetails');
    
    const sportIcon = selectedPass.sportType === 'tennis' ? 'fas fa-tennis-ball' : 'fas fa-table-tennis';
    const sportColor = selectedPass.sportType === 'tennis' ? 'text-success' : 'text-primary';
    
    summaryDetails.innerHTML = `
        <h6><i class="${sportIcon} ${sportColor} me-2"></i>${selectedPass.sportType.charAt(0).toUpperCase() + selectedPass.sportType.slice(1)} ${selectedPass.passType}</h6>
        <div class="summary-item">
            <span>Number of Players:</span>
            <span>${selectedPass.players}</span>
        </div>
        <div class="summary-item">
            <span>Pass Type:</span>
            <span>${selectedPass.passType}</span>
        </div>
        <div class="summary-item">
            <span>Total Amount:</span>
            <span>$${selectedPass.price.toFixed(2)}</span>
        </div>
    `;
    
    summaryContainer.style.display = 'block';
    
    // Initialize PayPal button
    initPayPalButton();
}

function hidePurchaseSummary() {
    const summaryContainer = document.getElementById('purchaseSummary');
    summaryContainer.style.display = 'none';
}

function loadPayPalSDK() {
    return new Promise((resolve, reject) => {
        if (window.paypal) {
            resolve();
            return;
        }

        // Check if PayPal client ID is configured
        const clientId = 'YOUR_PAYPAL_CLIENT_ID';
        if (clientId === 'YOUR_PAYPAL_CLIENT_ID') {
            console.warn('PayPal client ID not configured. PayPal functionality disabled.');
            // Show message to user
            const passSection = document.getElementById('passes');
            if (passSection) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-warning mt-3';
                alertDiv.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i><strong>PayPal Configuration Required:</strong> Please configure your PayPal client ID to enable pass purchases.';
                passSection.querySelector('.container').insertBefore(alertDiv, passSection.querySelector('.row'));
            }
            reject(new Error('PayPal client ID not configured'));
            return;
        }

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.onload = () => resolve();
        script.onerror = () => {
            console.error('Failed to load PayPal SDK');
            reject(new Error('PayPal SDK failed to load'));
        };
        document.head.appendChild(script);
    });
}

function initPayPalButton() {
    if (!window.paypal || !selectedPass) {
        return;
    }
    
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = ''; // Clear existing buttons
    
    window.paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: selectedPass.price.toFixed(2)
                    },
                    description: `${selectedPass.sportType.charAt(0).toUpperCase() + selectedPass.sportType.slice(1)} ${selectedPass.passType} - ${selectedPass.players} Player(s)`,
                    custom_id: JSON.stringify({
                        passType: selectedPass.passType,
                        sportType: selectedPass.sportType,
                        playerCount: selectedPass.players
                    })
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                showNotification('Payment completed successfully! You will receive a confirmation email shortly.', 'success');
                
                // Send confirmation email (this would typically be handled by your backend)
                sendPurchaseConfirmation(details, selectedPass);
                
                // Reset form
                clearSelection();
            });
        },
        onError: function(err) {
            console.error('PayPal error:', err);
            showNotification('Payment failed. Please try again.', 'error');
        },
        onCancel: function(data) {
            showNotification('Payment was cancelled.', 'info');
        }
    }).render('#paypal-button-container');
}

function sendPurchaseConfirmation(paymentDetails, passDetails) {
    // This would typically send data to your backend
    // For now, we'll just log the details
    console.log('Purchase confirmation:', {
        paymentDetails,
        passDetails,
        timestamp: new Date().toISOString()
    });
    
    // In a real implementation, you would send this to your backend:
    // fetch('/api/purchase-confirmation', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ paymentDetails, passDetails })
    // });
}

// Utility Functions
function initSmoothScrolling() {
    // Smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initAnimations() {
    // Initialize scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.card, .pricing-card, .feature-item').forEach(el => {
        observer.observe(el);
    });
}

function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements
    const animatedElements = document.querySelectorAll('.card, .instructor-card, .pricing-card, .contact-item');
    animatedElements.forEach(el => observer.observe(el));
}

function showNotification(message, type = 'info') {
    // Create and show notification
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Legacy support functions
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Utility function to format date
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// Schedule functions
function initializeSchedule() {
    console.log('Initializing schedule...');
    // Schedule initialization is handled by the existing functions
}

async function loadScheduleData(forceRefresh = false) {
    console.log('Loading schedule data...', forceRefresh ? '(force refresh)' : '');
    
    // Check if we're on the schedule page
    const scheduleContainer = document.getElementById('scheduleTableContainer');
    if (!scheduleContainer) {
        console.log('No schedule container found, skipping schedule load');
        return;
    }
    
    // Show loading state
    scheduleContainer.innerHTML = `
        <div class="schedule-loading">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span>Loading schedule data...</span>
        </div>
    `;
    
    try {
        let data;
        
        if (forceRefresh) {
            // Force refresh from API
            console.log('Force refresh requested...');
            data = await window.cacheManager.forceRefresh();
        } else {
            // Use cache manager (cached first, then background refresh)
            data = await window.cacheManager.getScheduleData();
        }
        
        console.log('Schedule data loaded:', data);
        
        // Use the pre-processed data directly from the server
        window.scheduleData = data.data; // This is already processed by the server
        window.scheduleDays = data.days || [];
        
        // Display the schedule using the pre-processed data
        displayScheduleFromProcessedData(window.scheduleData, window.scheduleDays);
        
        // Show cache status
        const cacheStatus = window.cacheManager.getCacheStatus();
        if (cacheStatus.hasData) {
            console.log(`Cache status: ${cacheStatus.ageMinutes} minutes old, valid: ${cacheStatus.isValid}`);
        }
        
        console.log('Schedule loaded successfully');
        
    } catch (error) {
        console.error('Error loading schedule data:', error);
        scheduleContainer.innerHTML = `
            <div class="schedule-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Error Loading Schedule</h5>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadScheduleData()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Minimal clearFilters to prevent runtime error
function clearFilters() {
    // No-op for now; reserved for future filter UI
}

// Export functions for global access
window.OTCSports = {
    loadScheduleData,
    clearFilters,
    showNotification,
    formatCurrency,
    formatDate,
    clearSelection,
    initPassPurchase
};

// Make schedule functions globally accessible
window.onDayChange = onDayChange;