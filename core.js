const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=1370844484&single=true&output=csv";
const EVENT_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSpKjd1H0M9L_J1CE7rWSgtWdlVjV13DS-GiZn2a_VIdoqULP9WH3djO-_BYUvQiaa0KNRXEoxyYN8/pub?gid=790817178&single=true&output=csv";
const TOUR_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQMKH5W5c8pIFmDlxskzumr0wKVSm326Q_xZkM7D9hhPIdXY4q1HOPKkojW3b1kxqX020_KpQvElWek/pub?gid=1843886913&single=true&output=csv"; 
const LIVE_RIDERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=398596081&single=true&output=csv";
const EVENT_COVERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSpKjd1H0M9L_J1CE7rWSgtWdlVjV13DS-GiZn2a_VIdoqULP9WH3djO-_BYUvQiaa0KNRXEoxyYN8/pub?gid=1086258292&single=true&output=csv";

let kmChartInstance = null;
let eventChartInstance = null;
let globalJobData = []; 
let globalEventData = { headers: [], rows: [] }; 
let globalEventCovers = {}; // Stores { "JUNE 2026": "https://..." }

let globalTourData = { headers: [], rows: [] }; 
let currentProcessedRoutes = []; 
let dynamicTotalTargetDist = 0; 
let validCampaignDrivers = new Map(); 
let isTourDataFetched = false;

// NEW: Global Pagination States
let currentJobPage = 1;
let globalFilteredJobs = [];
let currentEventPage = 1;

let domCache = {};
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