// ==========================================
// CORE.JS - Global State & Authentication
// ==========================================

// Add all your Job Log CSV URLs here inside the array for the Dashboard
const DASHBOARD_JOB_URLS = [
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=1370844484&single=true&output=csv", 
];

const EVENT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSpKjd1H0M9L_J1CE7rWSgtWdlVjV13DS-GiZn2a_VIdoqULP9WH3djO-_BYUvQiaa0KNRXEoxyYN8/pub?gid=790817178&single=true&output=csv";
const TOUR_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQMKH5W5c8pIFmDlxskzumr0wKVSm326Q_xZkM7D9hhPIdXY4q1HOPKkojW3b1kxqX020_KpQvElWek/pub?gid=1843886913&single=true&output=csv"; 
const LIVE_RIDERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=398596081&single=true&output=csv";
const EVENT_COVERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSpKjd1H0M9L_J1CE7rWSgtWdlVjV13DS-GiZn2a_VIdoqULP9WH3djO-_BYUvQiaa0KNRXEoxyYN8/pub?gid=1086258292&single=true&output=csv";

// NEW: Site Assets CMS Link
const ASSETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=1307238988&single=true&output=csv";

// Global Dashboard Data Arrays & Variables
let globalSiteAssets = {}; // Stores dynamic images { "TNTC_LOGO": "https://...", "HOME_BG": "..." }
let kmChartInstance = null;
let eventChartInstance = null;
let globalJobData = []; 
let globalEventData = { headers: [], rows: [] }; 
let globalEventCovers = {}; 

let globalTourData = { headers: [], rows: [] }; 
let currentProcessedRoutes = []; 
let dynamicTotalTargetDist = 0; 
let validCampaignDrivers = new Map(); 
let isTourDataFetched = false;

// Global Pagination States
let currentJobPage = 1;
let globalFilteredJobs = [];
let currentEventPage = 1;
let domCache = {};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Authentication Check (Optional based on your page flow)
    const role = sessionStorage.getItem('tntc_role');
    
    // Disable forced kick to index if on admin page
    if (!role && !window.location.pathname.includes('admin.html') && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html'; 
        return; 
    }

    // 2. Initialize Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 3. Setup Tab Navigation
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab') || 'overview';
    if(typeof switchTab === 'function') switchTab(activeTab);

    // 4. Update UI based on Role
    setupRoleUI(role);

    // 5. Fetch Dynamic Assets for the entire site!
    if(typeof fetchSiteAssets === 'function') {
        fetchSiteAssets();
    }

    // 6. Start fetching Dashboard Data
    if(typeof fetchVTCData === 'function') {
        fetchVTCData();
    }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function updateDOMIfChanged(elementId, newHTML) {
    if (domCache[elementId] !== newHTML) {
        domCache[elementId] = newHTML;
        let el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = newHTML;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: el }); 
        }
    }
}

function normalizeKey(str) {
    if (!str) return '';
    return String(str).toUpperCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

function animateValue(id, start, end, duration) {
    let obj = document.getElementById(id);
    if (!obj) return;
    let current = parseInt(obj.innerText.replace(/,/g, '')) || 0;
    if (current === end) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let value = Math.floor(progress * (end - current) + current);
        obj.innerHTML = value.toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function cleanNumber(str) {
    if (!str) return 0;
    let sanitized = String(str).replace(/[^0-9.-]/g, '');
    return parseFloat(sanitized) || 0;
}

function checkDateFilter(timeStr, filterType, customDateStr) {
    if (filterType === 'ALL') return true;
    if (!timeStr) return false;
    let now = new Date();
    let cleanStr = String(timeStr).replace(/-/g, ' ');
    let rowDate = new Date(cleanStr);
    if (isNaN(rowDate)) return filterType === 'ALL';

    if (filterType === 'TODAY') {
        return rowDate.toDateString() === now.toDateString();
    } else if (filterType === 'WEEK') {
        let startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        let endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        return rowDate >= startOfWeek && rowDate <= endOfWeek;
    } else if (filterType === 'MONTH') {
        return rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();
    } else if (filterType === 'CUSTOM') {
        if (!customDateStr) return true; 
        let selectedDate = new Date(customDateStr);
        return rowDate.toDateString() === selectedDate.toDateString();
    }
    return true;
}

function handleTimeChange(selectId, datePickerId, applyFuncName) {
    let val = document.getElementById(selectId).value;
    let dp = document.getElementById(datePickerId);
    if (val === 'CUSTOM') dp.classList.remove('hidden');
    else dp.classList.add('hidden');
    if (typeof window[applyFuncName] === "function") window[applyFuncName](); 
}

function closeModal(modalId) {
    let modal = document.getElementById(modalId);
    if(modal){
        modal.classList.remove('modal-open');
        modal.classList.add('modal-closed');
    }
}

// ==========================================
// UI / NAVIGATION FUNCTIONS
// ==========================================

function setupRoleUI(role) {
    if (role === 'admin' || role === 'leader') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.remove());
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('bg-tntc-accent/10', 'text-tntc-accent', 'border-r-2', 'border-tntc-accent');
        el.classList.add('text-tntc-textSecondary');
    });

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.remove('hidden');

    const activeBtn = document.querySelector(`.nav-btn[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-tntc-textSecondary');
        activeBtn.classList.add('bg-tntc-accent/10', 'text-tntc-accent', 'border-r-2', 'border-tntc-accent');
    }

    if (window.innerWidth < 1024) toggleSidebar(); 
    
    if (tabId === 'overview' && typeof updateOverviewTab === 'function') updateOverviewTab();
    if (tabId === 'joblogs' && typeof updateJobLogsTab === 'function') updateJobLogsTab();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(!sidebar || !overlay) return;
    
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function logout() {
    sessionStorage.removeItem('tntc_role');
    window.location.href = 'index.html';
}