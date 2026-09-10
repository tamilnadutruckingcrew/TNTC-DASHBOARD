const ADMIN_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyZ0uzactYvGqMYrQDlIR1ULVWpqxtMSrYUI88pooSP4x8RAl0WyJfimru-7acQVn_c/exec"; 

// Data Sources (Live Feeds & Google Sheets CSV Links)
const ADMIN_NEWS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=1131291013&single=true&output=csv";
const ADMIN_GALLERY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=792315654&single=true&output=csv";
const ADMIN_ASSETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=1307238988&single=true&output=csv";
const ADMIN_CARGO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQVdXQTWd8m0ZP_hXtcN2RdYJcu6h2cdcpc9tZm9KMNOMvpQAYYL2FeM6caEF7iIhEfv2nbZqFnZ9U2/pub?gid=1346134523&single=true&output=csv";

// Shared Execution State
window.editEventMode = false;
window.editOriginalDate = "";
window.editOriginalName = "";
window.adminEventsList = [];

window.editTourMode = false;
window.editOriginalTourName = "";
window.adminToursList = [];

window.economyData = [];
window.currentSortCol = '';
window.currentSortAsc = true;

// =============================================================================
// INITIALIZATION & DOM BINDINGS
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
    const role = sessionStorage.getItem('tntc_role');
    if (role !== 'leader' && role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    const roleBadge = document.getElementById('roleBadge');
    if (roleBadge) roleBadge.innerText = role;

    if (role === 'leader') {
        const assetBtn = document.getElementById('adm-btn-assets');
        const econBtn = document.getElementById('adm-btn-economy');
        if (assetBtn) assetBtn.classList.remove('hidden');
        if (econBtn) econBtn.classList.remove('hidden');
        switchAdminTab('assets'); 
    } else {
        switchAdminTab('event'); 
    }

    addRouteRow();
    bindAdminEvents();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

function bindAdminEvents() {
    // Top Navigation Header
    const btnWebsite = document.getElementById('btnHeaderWebsite');
    if (btnWebsite) btnWebsite.addEventListener('click', () => window.location.href = 'index.html');

    const btnTerminal = document.getElementById('btnHeaderTerminal');
    if (btnTerminal) btnTerminal.addEventListener('click', () => window.location.href = 'dashboard.html');

    const btnLogout = document.getElementById('btnHeaderLogout');
    if (btnLogout) btnLogout.addEventListener('click', logoutStaff);

    // Tab Bar Navigation delegation
    const navTabs = document.getElementById('adminNavTabs');
    if (navTabs) {
        navTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-tab]');
            if (btn && btn.dataset.tab) {
                switchAdminTab(btn.dataset.tab);
            }
        });
    }

    // Tab: Assets
    const btnSyncAsset = document.getElementById('btnSyncAssetPreview');
    if (btnSyncAsset) btnSyncAsset.addEventListener('click', refreshAssetPreview);

    const assetKeySelect = document.getElementById('assetKey');
    if (assetKeySelect) assetKeySelect.addEventListener('change', updateAssetPreview);

    const assetUrlInput = document.getElementById('assetUrl');
    if (assetUrlInput) assetUrlInput.addEventListener('input', liveUpdatePreview);

    const btnSubmitAsset = document.getElementById('btnSubmitAsset');
    if (btnSubmitAsset) btnSubmitAsset.addEventListener('click', submitAssetUpdate);

    // Tab: Events
    const addEvDate = document.getElementById('addEvDate');
    if (addEvDate) addEvDate.addEventListener('change', () => updateDateDisplay(addEvDate, 'display-addEvDate'));

    const btnSyncRoster = document.getElementById('btnSyncAdminRoster');
    if (btnSyncRoster) btnSyncRoster.addEventListener('click', populateAdminDriverChecklist);

    const btnCancelEvent = document.getElementById('btnCancelEditEvent');
    if (btnCancelEvent) btnCancelEvent.addEventListener('click', cancelEventEdit);

    const btnSubmitEv = document.getElementById('btnSubmitEvent');
    if (btnSubmitEv) btnSubmitEv.addEventListener('click', submitNewEvent);

    const btnScanEvents = document.getElementById('btnScanEvents');
    if (btnScanEvents) btnScanEvents.addEventListener('click', fetchAdminEvents);

    // Tab: Tours (Architect)
    const addTourStart = document.getElementById('addTourStart');
    if (addTourStart) addTourStart.addEventListener('change', () => updateDateDisplay(addTourStart, 'display-addTourStart'));

    const addTourEnd = document.getElementById('addTourEnd');
    if (addTourEnd) addTourEnd.addEventListener('change', () => updateDateDisplay(addTourEnd, 'display-addTourEnd'));

    const btnAddRoute = document.getElementById('btnAddRoute');
    if (btnAddRoute) btnAddRoute.addEventListener('click', addRouteRow);

    const btnCancelTour = document.getElementById('btnCancelEditTour');
    if (btnCancelTour) btnCancelTour.addEventListener('click', cancelTourEdit);

    const btnSubmitTour = document.getElementById('btnSubmitTour');
    if (btnSubmitTour) btnSubmitTour.addEventListener('click', submitNewTour);

    const btnScanTours = document.getElementById('btnScanTours');
    if (btnScanTours) btnScanTours.addEventListener('click', fetchAdminTours);

    // Tab: Manage Tours
    const btnOverrideStatus = document.getElementById('btnTransmitTourOverride');
    if (btnOverrideStatus) btnOverrideStatus.addEventListener('click', submitTourStatusUpdate);

    // Tab: News
    const addNewsDate = document.getElementById('addNewsDate');
    if (addNewsDate) addNewsDate.addEventListener('change', () => updateDateDisplay(addNewsDate, 'display-addNewsDate'));

    const btnRefreshNews = document.getElementById('btnRefreshAdminNews');
    if (btnRefreshNews) btnRefreshNews.addEventListener('click', fetchAdminNews);

    const btnSubmitNews = document.getElementById('btnSubmitNews');
    if (btnSubmitNews) btnSubmitNews.addEventListener('click', submitNewNews);

    // Tab: Fleet Media
    const btnScanVault = document.getElementById('btnScanVault');
    if (btnScanVault) btnScanVault.addEventListener('click', fetchAdminGallery);

    const btnSubmitGallery = document.getElementById('btnSubmitGallery');
    if (btnSubmitGallery) btnSubmitGallery.addEventListener('click', submitNewGallery);

    // Tab: Crew Roster
    const btnSyncCrew = document.getElementById('btnSyncCrewData');
    if (btnSyncCrew) btnSyncCrew.addEventListener('click', fetchCrewData);

    // Tab: Economy
    const cargoInput = document.getElementById('cargoNameInput');
    if (cargoInput) cargoInput.addEventListener('input', filterCargoTable);

    const btnSubmitCargo = document.getElementById('btnSubmitCargoRate');
    if (btnSubmitCargo) btnSubmitCargo.addEventListener('click', submitCargoRate);

    const btnSyncCargo = document.getElementById('btnSyncCargoRates');
    if (btnSyncCargo) btnSyncCargo.addEventListener('click', fetchCargoRates);

    // Delegated Sorting on Economy Table Headers
    document.querySelectorAll('.cargo-sortable').forEach(header => {
        header.addEventListener('click', () => {
            const col = header.getAttribute('data-column');
            if (col) sortCargoTable(col);
        });
    });

    // Alert Default Dismiss
    const alertCloseBtn = document.getElementById('alertCloseBtn');
    if (alertCloseBtn) alertCloseBtn.addEventListener('click', closeCustomAlert);
}

// =============================================================================
// TAB NAVIGATION CONTROLLER
// =============================================================================
function switchAdminTab(tab) {
    const role = sessionStorage.getItem('tntc_role');
    
    ['assets', 'event', 'tour', 'manage', 'news', 'gallery', 'recruit', 'economy'].forEach(t => {
        const el = document.getElementById(`adm-tab-${t}`);
        if (el) el.classList.toggle('hidden', tab !== t);
    });
    
    const activeClass = "flex-1 py-4 px-6 text-[10px] font-black text-tntc-accent border-b-2 border-tntc-accent bg-white/5 transition-colors whitespace-nowrap tracking-widest uppercase shadow-[inset_0_-2px_10px_rgba(56,189,248,0.1)]";
    const inactiveClass = "flex-1 py-4 px-6 text-[10px] font-bold text-tntc-textSecondary border-b-2 border-transparent hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap tracking-widest uppercase";
    
    ['assets', 'event', 'tour', 'manage', 'news', 'gallery', 'recruit', 'economy'].forEach(t => {
        const btn = document.getElementById(`adm-btn-${t}`);
        if (btn) {
            if ((t === 'assets' || t === 'economy') && role !== 'leader') {
                btn.className = "hidden"; 
                return;
            }
            if (t === 'recruit' || t === 'economy') {
                 btn.className = tab === t 
                    ? activeClass.replace('text-tntc-accent border-tntc-accent', 'text-yellow-500 border-yellow-500').replace('rgba(56,189,248,0.1)','rgba(234,179,8,0.1)') 
                    : inactiveClass.replace('text-tntc-textSecondary hover:text-white', 'text-yellow-500/70 hover:text-yellow-500');
            } else {
                 btn.className = tab === t ? activeClass : inactiveClass;
            }
        }
    });

    if (tab === 'assets') refreshAssetPreview();
    if (tab === 'recruit') fetchCrewData();
    if (tab === 'manage') loadToursForAdmin();
    if (tab === 'news') fetchAdminNews();
    if (tab === 'gallery') fetchAdminGallery();
    if (tab === 'economy') fetchCargoRates();
    
    if (tab === 'event' && role === 'leader') {
        const ldrMgmt = document.getElementById('leaderEventManagement');
        if (ldrMgmt) ldrMgmt.classList.remove('hidden');
        fetchAdminEvents();
    }

    if (tab === 'tour' && role === 'leader') {
        const ldrTourMgmt = document.getElementById('leaderTourManagement');
        if (ldrTourMgmt) ldrTourMgmt.classList.remove('hidden');
        fetchAdminTours();
    }
}

// =============================================================================
// UI HELPERS & CUSTOM DIALOG BOX
// =============================================================================
function updateDateDisplay(inputEl, displayId) {
    const displayEl = document.getElementById(displayId);
    if (!displayEl) return;
    if (!inputEl.value) {
        displayEl.innerText = displayEl.getAttribute('data-default') || "Select Date";
        displayEl.classList.remove('text-white', 'font-bold');
        displayEl.classList.add('text-tntc-textSecondary');
        return;
    }
    
    const parts = inputEl.value.split('-');
    if (parts.length === 3) {
        const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
        displayEl.innerText = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        displayEl.classList.remove('text-tntc-textSecondary');
        displayEl.classList.add('text-white', 'font-bold');
    } else {
        displayEl.innerText = inputEl.value;
    }
}

function showCustomAlert(title, message, isError = false, confirmAction = null) {
    const box = document.getElementById('customAlertBox');
    const header = document.getElementById('alertHeader');
    const titleEl = document.getElementById('alertTitle');
    const msgEl = document.getElementById('alertMessage');
    const actionsEl = document.getElementById('alertActions');
    const alertIcon = document.getElementById('alertIcon');
    
    titleEl.innerText = title;
    msgEl.innerText = message;
    
    if (isError) {
        header.className = "px-5 py-3 bg-tntc-admin/10 border-b border-tntc-admin/20 flex items-center gap-2";
        titleEl.className = "text-[10px] font-black uppercase tracking-widest text-tntc-admin";
        alertIcon.className = "w-4 h-4 text-tntc-admin";
        alertIcon.setAttribute('data-lucide', 'alert-triangle');
    } else if (confirmAction) {
        header.className = "px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2";
        titleEl.className = "text-[10px] font-black uppercase tracking-widest text-amber-500";
        alertIcon.className = "w-4 h-4 text-amber-500";
        alertIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
        header.className = "px-5 py-3 bg-tntc-distance/10 border-b border-tntc-distance/20 flex items-center gap-2";
        titleEl.className = "text-[10px] font-black uppercase tracking-widest text-tntc-distance";
        alertIcon.className = "w-4 h-4 text-tntc-distance";
        alertIcon.setAttribute('data-lucide', 'check-circle');
    }

    if (confirmAction) {
        actionsEl.innerHTML = `
            <button id="alertCancelBtn" class="bg-transparent border border-white/20 text-tntc-textSecondary hover:text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">Cancel</button>
            <button id="alertProceedBtn" class="bg-tntc-admin hover:bg-tntc-admin/80 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)]">Proceed</button>
        `;
        document.getElementById('alertCancelBtn').addEventListener('click', closeCustomAlert);
        document.getElementById('alertProceedBtn').addEventListener('click', () => {
            closeCustomAlert();
            confirmAction();
        });
    } else {
        actionsEl.innerHTML = `<button id="alertAckBtn" class="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">Acknowledge</button>`;
        document.getElementById('alertAckBtn').addEventListener('click', closeCustomAlert);
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    box.classList.remove('hidden', 'msg-box-exit');
    box.classList.add('flex', 'msg-box-enter');
}

function closeCustomAlert() {
    const box = document.getElementById('customAlertBox');
    if (!box) return;
    box.classList.remove('msg-box-enter');
    box.classList.add('msg-box-exit');
    setTimeout(() => { 
        box.classList.remove('flex', 'msg-box-exit'); 
        box.classList.add('hidden'); 
    }, 300);
}

function logoutStaff() {
    sessionStorage.removeItem('tntc_role');
    window.location.href = 'index.html';
}

async function sendAdminRequest(payload, loadingMsg, successCallback = null) {
    const overlay = document.getElementById('adminLoadingOverlay');
    const txt = document.getElementById('adminLoadingText');
    if (overlay) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); }
    if (txt) txt.innerText = loadingMsg;

    try {
        await fetch(ADMIN_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        
        showCustomAlert("Database Updated", "Success! The data was published successfully.\n\nChanges may take 1-3 minutes to reflect on the live grid.", false);
        if (successCallback) successCallback();
        
    } catch (error) {
        showCustomAlert("Connection Error", "Failed to reach the database. Please check your internet connection and try again.", true);
        console.error("Fetch Error:", error);
    } finally {
        if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
    }
}

// =============================================================================
// CMS ASSET CONTROLLER
// =============================================================================
function getYouTubeIdPreview(url) {
    let videoId = "";
    if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1].split("?")[0];
    else if (url.includes("youtube.com/shorts/")) videoId = url.split("shorts/")[1].split("?")[0];
    else if (url.includes("watch?v=")) videoId = url.split("watch?v=")[1].split("&")[0];
    else if (url.includes("embed/")) videoId = url.split("embed/")[1].split("?")[0];
    return videoId;
}

function renderAssetPreview(url, isVideo, isUnsaved = false) {
    const container = document.getElementById('assetPreviewContainer');
    const badge = document.getElementById('previewStatusBadge');
    
    if (!container) return;

    if (isUnsaved) {
        badge.className = "bg-yellow-500/20 text-yellow-500 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]";
        badge.innerText = "Unsaved Changes";
    } else {
        badge.className = "bg-white/5 text-tntc-textSecondary px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-white/10";
        badge.innerText = "Current Database";
    }

    if (!url) {
        container.innerHTML = `<div class="text-center text-tntc-textSecondary"><i data-lucide="image-off" class="w-10 h-10 mx-auto mb-3 opacity-40"></i><p class="text-[10px] font-bold uppercase tracking-widest">No Asset Found</p></div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    if (isVideo) {
        const vId = getYouTubeIdPreview(url);
        if (vId) {
            container.innerHTML = `<iframe class="w-full max-w-lg aspect-video rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10" src="https://www.youtube-nocookie.com/embed/${vId}?autoplay=0&rel=0&modestbranding=1" frameborder="0" allowfullscreen></iframe>`;
        } else {
            container.innerHTML = `<div class="text-center text-tntc-admin"><i data-lucide="alert-triangle" class="w-10 h-10 mx-auto mb-3 opacity-80 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"></i><p class="text-[10px] font-bold uppercase tracking-widest">Invalid YouTube URL</p></div>`;
        }
    } else {
        container.innerHTML = `<img src="${url}" class="max-w-full max-h-[350px] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10" onerror="this.src='https://placehold.co/600x400/0a0e14/ef4444?text=Invalid+Image+Link'">`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateAssetPreview() {
    const key = document.getElementById('assetKey').value;
    const inputUrl = document.getElementById('assetUrl');
    inputUrl.value = ""; 
    const currentUrl = (window.globalSiteAssets && window.globalSiteAssets[key]) ? window.globalSiteAssets[key] : "";
    renderAssetPreview(currentUrl, key === 'PROMO_VIDEO', false);
}

function liveUpdatePreview() {
    const key = document.getElementById('assetKey').value;
    const inputUrl = document.getElementById('assetUrl').value.trim();
    if (!inputUrl) {
        updateAssetPreview(); 
        return;
    }
    renderAssetPreview(inputUrl, key === 'PROMO_VIDEO', true);
}

function refreshAssetPreview() {
    const container = document.getElementById('assetPreviewContainer');
    if (container) {
        container.innerHTML = `<div class="text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-tntc-accent mx-auto mb-3"></div><p class="text-[10px] font-bold uppercase tracking-widest">Connecting to Cloud...</p></div>`;
    }

    if (typeof Papa !== 'undefined' && typeof ADMIN_ASSETS_CSV_URL !== 'undefined') {
        Papa.parse(ADMIN_ASSETS_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: 'greedy',
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    if (!window.globalSiteAssets) window.globalSiteAssets = {};
                    results.data.forEach(row => {
                        const assetName = String(row[0]).trim().toUpperCase();
                        const assetUrl = String(row[1]).trim();
                        if (assetName && assetUrl) window.globalSiteAssets[assetName] = assetUrl;
                    });
                    updateAssetPreview(); 
                } else {
                    renderAssetPreview("", false, false);
                }
            },
            error: function() { renderAssetPreview("", false, false); }
        });
    }
}

async function submitAssetUpdate() {
    const payload = { 
        action: "UPDATE_ASSET", 
        data: { 
            assetKey: document.getElementById('assetKey').value, 
            newUrl: document.getElementById('assetUrl').value 
        } 
    };
    if (!payload.data.newUrl) { 
        showCustomAlert("Validation Failed", "Please enter a valid Image/Video URL.", true); 
        return; 
    }
    await sendAdminRequest(payload, "Deploying Asset...", () => { 
        document.getElementById('assetUrl').value = '';
        refreshAssetPreview(); 
    });
}

// =============================================================================
// CONVOY & EVENT MANAGEMENT
// =============================================================================
async function submitNewEvent() {
    const payload = {
        action: window.editEventMode ? "UPDATE_EVENT" : "ADD_EVENT",
        data: {
            eventName: document.getElementById('addEvName').value,
            date: document.getElementById('addEvDate').value,
            category: document.getElementById('addEvCat').value,
            link: document.getElementById('addEvLink').value,
            imageLink: document.getElementById('addEvImage').value,
            attendedDrivers: Array.from(document.querySelectorAll('.admin-drv-chk:checked')).map(cb => cb.value)
        }
    };
    if (window.editEventMode) { 
        payload.data.originalDate = window.editOriginalDate; 
        payload.data.originalName = window.editOriginalName; 
    }
    if (!payload.data.eventName || !payload.data.date) { 
        showCustomAlert("Validation Failed", "Event Name and Date are required!", true); 
        return; 
    }
    
    const loadMsg = window.editEventMode ? "Updating Record..." : "Committing Record...";
    await sendAdminRequest(payload, loadMsg, () => {
        cancelEventEdit(); 
        if (sessionStorage.getItem('tntc_role') === 'leader') setTimeout(fetchAdminEvents, 3000);
    });
}

function populateAdminDriverChecklist() {
    const container = document.getElementById('adminDriverChecklist');
    if (!container) return;
    
    container.innerHTML = '<div class="col-span-full py-6 text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-tntc-accent mx-auto mb-3"></div><p class="text-[10px] font-bold uppercase tracking-widest">Syncing Roster...</p></div>';

    if (typeof EVENT_SHEET_CSV_URL === 'undefined') {
        container.innerHTML = '<p class="text-tntc-admin text-xs col-span-full py-4 text-center font-bold">Error: Missing CSV Link</p>';
        return;
    }

    Papa.parse(EVENT_SHEET_CSV_URL, {
        download: true, header: false, skipEmptyLines: 'greedy',
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                let headerRow = [];
                for (let i = 0; i < Math.min(5, results.data.length); i++) {
                    if (String(results.data[i][1]).toUpperCase().includes('DATE') || String(results.data[i][2]).toUpperCase().includes('EVENT')) {
                        headerRow = results.data[i]; 
                        break;
                    }
                }

                if (headerRow.length > 6) {
                    let html = "";
                    for (let i = 6; i < headerRow.length; i++) {
                        const name = String(headerRow[i] || '').trim();
                        const norm = name.toUpperCase();
                        if (norm && norm !== 'UNKNOWN' && !norm.includes('ATTENDANCE')) {
                            html += `
                            <label class="flex items-center gap-3 cursor-pointer p-3 bg-black/40 hover:bg-white/5 rounded-xl border border-white/5 hover:border-tntc-accent/50 transition-all group">
                                <input type="checkbox" value="${norm}" class="admin-drv-chk accent-tntc-accent w-4 h-4 rounded border-gray-600 focus:ring-tntc-accent bg-[#05070a]">
                                <span class="text-xs font-black text-white truncate group-hover:text-tntc-accent transition-colors">${name}</span>
                            </label>`;
                        }
                    }
                    container.innerHTML = html;
                } else {
                    container.innerHTML = '<p class="text-tntc-admin text-xs col-span-full py-4 text-center font-bold">Error: Invalid Structure.</p>';
                }
            } else {
                container.innerHTML = '<p class="text-tntc-admin text-xs col-span-full py-4 text-center font-bold">Database empty.</p>';
            }
        }
    });
}

function fetchAdminEvents() {
    const grid = document.getElementById('adminEventGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div><p class="text-[10px] font-bold uppercase tracking-widest">Scanning Database...</p></div>';

    if (typeof EVENT_SHEET_CSV_URL === 'undefined') return;

    Papa.parse(EVENT_SHEET_CSV_URL, {
        download: true, header: false, skipEmptyLines: 'greedy',
        complete: function(results) {
            const rows = results.data;
            if (rows && rows.length > 0) {
                let headerIndex = 0;
                for (let i = 0; i < Math.min(5, rows.length); i++) {
                    if (String(rows[i][1]).toUpperCase().includes('DATE') || String(rows[i][2]).toUpperCase().includes('EVENT')) {
                        headerIndex = i; 
                        break;
                    }
                }
                const headers = rows[headerIndex];
                const eventRows = rows.slice(headerIndex + 1);
                window.adminEventsList = [];
                let html = "";
                const validEvents = [];

                eventRows.forEach(row => {
                    if (String(row[1]).trim() && String(row[2]).trim()) {
                        const attended = [];
                        for (let col = 6; col < headers.length; col++) {
                            const val = String(row[col]).trim().toUpperCase();
                            if (val === 'TRUE' || val === '1' || val === 'YES') {
                                attended.push(String(headers[col]).trim());
                            }
                        }
                        validEvents.push({ 
                            date: String(row[1]).trim(), 
                            name: String(row[2]).trim(), 
                            link: String(row[3]).trim(), 
                            category: String(row[4]).trim(), 
                            image: String(row[5]).trim(), 
                            drivers: attended 
                        });
                    }
                });

                validEvents.reverse(); 
                window.adminEventsList = validEvents;

                validEvents.forEach((ev, idx) => {
                    html += `
                    <div class="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col relative group hover:border-white/20 transition-all duration-300">
                        <div class="p-5 border-b border-white/5 bg-black/40 flex justify-between items-start relative z-10">
                            <div>
                                <span class="text-[8px] text-purple-400 font-black uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded shadow-sm border border-purple-500/20">${ev.category}</span>
                                <h3 class="text-base font-black text-white mt-3 leading-tight drop-shadow-md">${ev.name}</h3>
                                <p class="text-[10px] text-tntc-textSecondary mt-1 font-mono tracking-wider">${ev.date}</p>
                            </div>
                        </div>
                        <div class="p-5 flex-1 relative z-10">
                            <p class="text-[9px] text-tntc-textSecondary mb-3 uppercase tracking-widest font-bold">Attendance: <span class="text-white">${ev.drivers.length}</span></p>
                            <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar pr-1">
                                ${ev.drivers.map(d => `<span class="bg-white/5 border border-white/10 text-tntc-textSecondary px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider">${d}</span>`).join('')}
                            </div>
                        </div>
                        <div class="p-3 bg-black/60 border-t border-white/5 flex justify-between gap-2 relative z-10">
                            <button class="btn-edit-event flex-1 bg-tntc-accent/10 hover:bg-tntc-accent text-tntc-accent hover:text-[#05070a] border border-tntc-accent/30 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" data-index="${idx}"><i data-lucide="edit-2" class="w-3.5 h-3.5 inline-block mr-1"></i> Override</button>
                            <button class="btn-delete-event flex-1 bg-tntc-admin/10 hover:bg-tntc-admin text-tntc-admin hover:text-white border border-tntc-admin/30 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" data-date="${encodeURIComponent(ev.date)}" data-name="${encodeURIComponent(ev.name)}"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline-block mr-1"></i> Purge</button>
                        </div>
                    </div>`;
                });
                
                grid.innerHTML = html || '<div class="col-span-full py-16 text-center text-tntc-textSecondary bg-slate-900/40 rounded-2xl border border-white/5 font-bold tracking-widest uppercase text-xs">No records found.</div>';
                
                // Delegation for Event Action Buttons
                grid.querySelectorAll('.btn-edit-event').forEach(btn => {
                    btn.addEventListener('click', () => loadEventForEdit(parseInt(btn.dataset.index, 10)));
                });
                grid.querySelectorAll('.btn-delete-event').forEach(btn => {
                    btn.addEventListener('click', () => confirmDeleteEvent(decodeURIComponent(btn.dataset.date), decodeURIComponent(btn.dataset.name)));
                });

                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    });
}

function loadEventForEdit(index) {
    const ev = window.adminEventsList[index];
    if (!ev) return;

    if (document.querySelectorAll('.admin-drv-chk').length === 0) {
        showCustomAlert("Syncing Drivers", "Fetching roster from database. Please wait and click Override again.", false);
        populateAdminDriverChecklist(); 
        return;
    }

    document.getElementById('addEvName').value = ev.name;
    document.getElementById('addEvCat').value = ev.category || 'DIVISION EVENT';
    document.getElementById('addEvLink').value = ev.link;
    document.getElementById('addEvImage').value = ev.image;

    const d = new Date(ev.date);
    if (!isNaN(d)) { 
        document.getElementById('addEvDate').value = d.toISOString().split('T')[0]; 
    } else { 
        document.getElementById('addEvDate').value = ""; 
    }
    updateDateDisplay(document.getElementById('addEvDate'), 'display-addEvDate');

    document.querySelectorAll('.admin-drv-chk').forEach(cb => { 
        cb.checked = ev.drivers.map(d => d.toUpperCase()).includes(cb.value.toUpperCase()); 
    });

    window.editEventMode = true; 
    window.editOriginalDate = ev.date; 
    window.editOriginalName = ev.name;

    const btn = document.getElementById('btnSubmitEvent');
    btn.className = "flex-1 w-full bg-amber-500 hover:bg-amber-400 text-[#05070a] font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2";
    document.getElementById('submitEventText').innerText = "UPDATE RECORD";
    document.getElementById('submitEventIcon').setAttribute('data-lucide', 'save');
    document.getElementById('btnCancelEditEvent').classList.remove('hidden');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEventEdit() {
    window.editEventMode = false; 
    window.editOriginalDate = ""; 
    window.editOriginalName = "";
    document.getElementById('addEvName').value = ''; 
    document.getElementById('addEvDate').value = '';
    document.getElementById('addEvCat').value = 'DIVISION EVENT'; 
    document.getElementById('addEvLink').value = ''; 
    document.getElementById('addEvImage').value = '';
    updateDateDisplay(document.getElementById('addEvDate'), 'display-addEvDate');
    document.querySelectorAll('.admin-drv-chk').forEach(cb => cb.checked = false);

    const btn = document.getElementById('btnSubmitEvent');
    btn.className = "flex-1 w-full bg-tntc-accent hover:bg-tntc-accent/80 text-[#05070a] font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all flex items-center justify-center gap-2";
    document.getElementById('submitEventText').innerText = "Commit Record";
    document.getElementById('submitEventIcon').setAttribute('data-lucide', 'upload-cloud');
    document.getElementById('btnCancelEditEvent').classList.add('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function confirmDeleteEvent(date, name) {
    showCustomAlert("Confirm Purge", `Are you sure you want to permanently delete this event?\n\nTarget: "${name}"\nTimestamp: "${date}"\n\nThis action cannot be undone.`, true, async () => {
        const payload = { action: "DELETE_EVENT", data: { date: date, eventName: name } };
        await sendAdminRequest(payload, "Purging Record...", () => { setTimeout(fetchAdminEvents, 3000); });
    });
}

// =============================================================================
// TOUR & CAMPAIGN ARCHITECT
// =============================================================================
function addRouteRow() {
    const container = document.getElementById('route-container');
    if (!container) return;
    const div = document.createElement('div');
    
    div.className = "grid grid-cols-2 md:grid-cols-6 gap-3 route-row bg-slate-900/40 p-5 rounded-2xl border border-white/5 mb-3 relative group backdrop-blur-md";
    div.innerHTML = `
        <input type="text" placeholder="Source City" class="route-src bg-[#05070a]/80 border border-white/10 rounded-xl p-3 h-[46px] text-xs text-white outline-none focus:border-amber-500 shadow-inner">
        <input type="text" placeholder="Source Co." class="route-src-co bg-[#05070a]/80 border border-white/10 rounded-xl p-3 h-[46px] text-xs text-white outline-none focus:border-amber-500 shadow-inner">
        <input type="text" placeholder="Dest City" class="route-dst bg-[#05070a]/80 border border-white/10 rounded-xl p-3 h-[46px] text-xs text-white outline-none focus:border-amber-500 shadow-inner">
        <input type="text" placeholder="Dest Co." class="route-dst-co bg-[#05070a]/80 border border-white/10 rounded-xl p-3 h-[46px] text-xs text-white outline-none focus:border-amber-500 shadow-inner">
        <input type="number" placeholder="Dist (KM)" class="route-km bg-[#05070a]/80 border border-white/10 rounded-xl p-3 h-[46px] text-xs text-white outline-none focus:border-amber-500 shadow-inner">
        <input type="text" placeholder="Image URL" class="route-img bg-[#05070a]/80 border border-white/10 rounded-xl p-3 h-[46px] text-xs text-white outline-none focus:border-amber-500 shadow-inner">
        <button type="button" class="btn-remove-waypoint absolute -right-2 -top-2 bg-tntc-admin text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_15px_rgba(244,63,94,0.6)] transform scale-90 group-hover:scale-100" title="Remove Waypoint">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;

    div.querySelector('.btn-remove-waypoint').addEventListener('click', () => div.remove());
    container.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function submitNewTour() {
    const tName = document.getElementById('addTourName').value; 
    const sDate = document.getElementById('addTourStart').value;
    if (!tName || !sDate) { 
        showCustomAlert("Validation Failed", "Codename and Start Date are required!", true); 
        return; 
    }
    
    if (window.editTourMode) {
        const payload = { 
            action: "UPDATE_TOUR_MASTER", 
            data: { 
                originalName: window.editOriginalTourName, 
                tourName: tName, 
                startDate: sDate, 
                endDate: document.getElementById('addTourEnd').value, 
                bannerUrl: document.getElementById('addTourBanner').value 
            } 
        };
        await sendAdminRequest(payload, "Updating Campaign Params...", () => { 
            cancelTourEdit(); 
            if (sessionStorage.getItem('tntc_role') === 'leader') setTimeout(fetchAdminTours, 3000); 
        });
        return;
    }

    const routes = [];
    document.querySelectorAll('.route-row').forEach(row => {
        routes.push({ 
            source: row.querySelector('.route-src').value, 
            sourceCo: row.querySelector('.route-src-co').value, 
            dest: row.querySelector('.route-dst').value, 
            destCo: row.querySelector('.route-dst-co').value, 
            dist: row.querySelector('.route-km').value, 
            img: row.querySelector('.route-img').value 
        });
    });

    const sD = new Date(sDate);
    const payload = { 
        action: "CREATE_TOUR", 
        data: { 
            tourName: tName, 
            startDate: sDate, 
            endDate: document.getElementById('addTourEnd').value, 
            bannerUrl: document.getElementById('addTourBanner').value, 
            startYear: sD.getFullYear(), 
            startMonth: sD.getMonth() + 1, 
            startDay: sD.getDate(), 
            routes: routes 
        } 
    };
    
    await sendAdminRequest(payload, "Compiling Manifest...", () => {
        document.getElementById('addTourName').value = ''; 
        document.getElementById('addTourStart').value = ''; 
        document.getElementById('addTourEnd').value = ''; 
        document.getElementById('addTourBanner').value = '';
        updateDateDisplay(document.getElementById('addTourStart'), 'display-addTourStart'); 
        updateDateDisplay(document.getElementById('addTourEnd'), 'display-addTourEnd');
        
        const routeContainer = document.getElementById('route-container');
        if (routeContainer) { 
            routeContainer.innerHTML = '<label class="block text-xs font-black text-amber-500 uppercase tracking-widest mb-4 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]"><i data-lucide="milestone" class="w-4 h-4 inline-block mr-1"></i> Route Waypoints</label>'; 
            addRouteRow(); 
        }
        if (sessionStorage.getItem('tntc_role') === 'leader') setTimeout(fetchAdminTours, 3000);
    });
}

function fetchAdminTours() {
    const grid = document.getElementById('adminTourGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div><p class="text-[10px] font-bold uppercase tracking-widest">Scanning Grid...</p></div>';

    if (typeof TOUR_SHEET_CSV_URL === 'undefined') return;

    Papa.parse(TOUR_SHEET_CSV_URL, {
        download: true, header: false, skipEmptyLines: 'greedy',
        complete: function(results) {
            const rows = results.data;
            if (rows && rows.length > 1) {
                window.adminToursList = [];
                let html = "";
                for (let i = 1; i < rows.length; i++) {
                    if (!rows[i][0]) continue;
                    window.adminToursList.push({ 
                        name: rows[i][0], 
                        start: rows[i][1], 
                        end: rows[i][2], 
                        status: rows[i][3], 
                        banner: rows[i][5] 
                    });
                }

                window.adminToursList.reverse().forEach((t, idx) => {
                    const statusColor = t.status === 'LIVE' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 
                                      t.status === 'PAUSED' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                                      (t.status === 'COMING SOON' || t.status === 'COMING_SOON') ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                                      'text-tntc-admin bg-tntc-admin/10 border-tntc-admin/30';
                                      
                    html += `
                    <div class="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col relative group hover:border-white/20 transition-all duration-300">
                        <div class="h-28 bg-[#05070a] relative overflow-hidden">
                            <img src="${t.banner}" class="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <span class="absolute top-3 right-3 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-sm border ${statusColor} backdrop-blur-md">${t.status}</span>
                        </div>
                        <div class="p-5 flex-1 -mt-6 relative z-10">
                            <h3 class="text-base font-black text-white leading-tight drop-shadow-md mb-2">${t.name}</h3>
                            <p class="text-[9px] text-tntc-textSecondary font-mono uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-1 rounded inline-block">S: ${t.start} <span class="mx-1 opacity-50">|</span> E: ${t.end || 'TBD'}</p>
                        </div>
                        <div class="p-3 bg-black/60 border-t border-white/5 flex justify-between gap-2 relative z-10">
                            <button class="btn-edit-tour flex-1 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-[#05070a] border border-amber-500/30 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" data-index="${idx}"><i data-lucide="edit-2" class="w-3.5 h-3.5 inline-block mr-1"></i> Override Config</button>
                            <button class="btn-delete-tour flex-1 bg-tntc-admin/10 hover:bg-tntc-admin text-tntc-admin hover:text-white border border-tntc-admin/30 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" data-name="${encodeURIComponent(t.name)}"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline-block mr-1"></i> Purge Manifest</button>
                        </div>
                    </div>`;
                });
                grid.innerHTML = html; 

                // Event delegation for Tour Cards
                grid.querySelectorAll('.btn-edit-tour').forEach(btn => {
                    btn.addEventListener('click', () => loadTourForEdit(parseInt(btn.dataset.index, 10)));
                });
                grid.querySelectorAll('.btn-delete-tour').forEach(btn => {
                    btn.addEventListener('click', () => confirmDeleteTour(decodeURIComponent(btn.dataset.name)));
                });

                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary bg-slate-900/40 rounded-2xl border border-white/5 font-bold tracking-widest uppercase text-xs">No active campaigns.</div>';
            }
        }
    });
}

function loadTourForEdit(index) {
    const t = window.adminToursList[index];
    if (!t) return;

    document.getElementById('addTourName').value = t.name; 
    document.getElementById('addTourBanner').value = t.banner;
    
    const dS = new Date(t.start);
    if (!isNaN(dS)) { 
        document.getElementById('addTourStart').value = dS.toISOString().split('T')[0]; 
        updateDateDisplay(document.getElementById('addTourStart'), 'display-addTourStart'); 
    }
    if (t.end) { 
        const dE = new Date(t.end); 
        if (!isNaN(dE)) { 
            document.getElementById('addTourEnd').value = dE.toISOString().split('T')[0]; 
            updateDateDisplay(document.getElementById('addTourEnd'), 'display-addTourEnd'); 
        } 
    } else { 
        document.getElementById('addTourEnd').value = ''; 
        updateDateDisplay(document.getElementById('addTourEnd'), 'display-addTourEnd'); 
    }

    window.editTourMode = true; 
    window.editOriginalTourName = t.name;
    document.getElementById('route-container').classList.add('hidden'); 
    document.getElementById('btnAddRoute').classList.add('hidden');

    const btn = document.getElementById('btnSubmitTour');
    btn.className = "flex-1 w-full bg-purple-500 hover:bg-purple-400 text-[#05070a] font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2";
    document.getElementById('submitTourText').innerText = "OVERRIDE PARAMS"; 
    document.getElementById('submitTourIcon').setAttribute('data-lucide', 'save');
    document.getElementById('btnCancelEditTour').classList.remove('hidden');

    if (typeof lucide !== 'undefined') lucide.createIcons(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelTourEdit() {
    window.editTourMode = false; 
    window.editOriginalTourName = "";
    document.getElementById('addTourName').value = ''; 
    document.getElementById('addTourBanner').value = ''; 
    document.getElementById('addTourStart').value = ''; 
    document.getElementById('addTourEnd').value = '';
    updateDateDisplay(document.getElementById('addTourStart'), 'display-addTourStart'); 
    updateDateDisplay(document.getElementById('addTourEnd'), 'display-addTourEnd');
    document.getElementById('route-container').classList.remove('hidden'); 
    document.getElementById('btnAddRoute').classList.remove('hidden');

    const btn = document.getElementById('btnSubmitTour');
    btn.className = "flex-1 w-full bg-tntc-distance hover:bg-tntc-distance/80 text-[#05070a] font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] transition-all flex items-center justify-center gap-2";
    document.getElementById('submitTourText').innerText = "Compile Manifest"; 
    document.getElementById('submitTourIcon').setAttribute('data-lucide', 'folder-plus');
    document.getElementById('btnCancelEditTour').classList.add('hidden'); 
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function confirmDeleteTour(tourName) {
    showCustomAlert("Confirm Purge", `Are you sure you want to permanently delete this Campaign?\n\nTarget: "${tourName}"\n\nThis obliterates the master record AND the specific route sheet. Cannot be undone.`, true, async () => {
        const payload = { action: "DELETE_TOUR", data: { tourName: tourName } };
        await sendAdminRequest(payload, "Purging Manifest...", () => { setTimeout(fetchAdminTours, 3000); });
    });
}

function loadToursForAdmin() {
    const select = document.getElementById('manageTourSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Connecting to database...</option>';

    if (typeof TOUR_SHEET_CSV_URL === 'undefined') return;

    Papa.parse(TOUR_SHEET_CSV_URL, {
        download: true, header: false, skipEmptyLines: 'greedy',
        complete: function(results) {
            const rows = results.data;
            if (rows.length <= 1) { 
                select.innerHTML = '<option value="">No campaigns available</option>'; 
                return; 
            }
            
            let html = '<option value="">-- Select Target Campaign --</option>';
            for (let i = 1; i < rows.length; i++) {
                const tName = String(rows[i][0]).trim(); 
                const tStatus = String(rows[i][3]).trim().toUpperCase();
                if (!tName) continue;
                const emoji = tStatus === 'LIVE' ? '🟢' : tStatus === 'COMING SOON' || tStatus === 'COMING_SOON' ? '🔵' : tStatus === 'PAUSED' ? '🟡' : '🔴';
                html += `<option value="${tName}">${emoji} ${tName} (${tStatus})</option>`;
            }
            select.innerHTML = html;
        }
    });
}

async function submitTourStatusUpdate() {
    const payload = { 
        action: "UPDATE_TOUR_STATUS", 
        data: { 
            tourName: document.getElementById('manageTourSelect').value, 
            status: document.getElementById('manageTourStatus').value, 
            reason: document.getElementById('manageTourReason').value 
        } 
    };
    if (!payload.data.tourName) { 
        showCustomAlert("Validation Failed", "Please select a target campaign.", true); 
        return; 
    }
    if (payload.data.status === 'PAUSED' && !payload.data.reason) { 
        showCustomAlert("Validation Failed", "A broadcast reason is required when halting a tour.", true); 
        return; 
    }
    await sendAdminRequest(payload, "Transmitting Status...", () => { 
        document.getElementById('manageTourReason').value = ''; 
        loadToursForAdmin(); 
    });
}

// =============================================================================
// INTEL BROADCAST (NEWS)
// =============================================================================
async function submitNewNews() {
    const rawDate = document.getElementById('addNewsDate').value;
    let formattedDate = rawDate;
    if (rawDate) { 
        const parts = rawDate.split('-'); 
        const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]); 
        formattedDate = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); 
    }
    const payload = { 
        action: "ADD_NEWS", 
        data: { 
            title: document.getElementById('addNewsTitle').value, 
            date: formattedDate, 
            category: document.getElementById('addNewsCat').value, 
            image: document.getElementById('addNewsImg').value, 
            desc: document.getElementById('addNewsDesc').value, 
            link: document.getElementById('addNewsLink').value 
        } 
    };
    if (!payload.data.title || !rawDate) { 
        showCustomAlert("Validation Failed", "Headline and Date are required!", true); 
        return; 
    }
    
    await sendAdminRequest(payload, "Broadcasting Intel...", () => {
        document.getElementById('addNewsTitle').value = ''; 
        document.getElementById('addNewsDate').value = ''; 
        document.getElementById('addNewsCat').value = ''; 
        document.getElementById('addNewsImg').value = ''; 
        document.getElementById('addNewsDesc').value = ''; 
        document.getElementById('addNewsLink').value = '';
        updateDateDisplay(document.getElementById('addNewsDate'), 'display-addNewsDate'); 
        setTimeout(fetchAdminNews, 3000); 
    });
}

function fetchAdminNews() {
    const grid = document.getElementById('adminNewsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-tntc-accent mx-auto mb-4"></div><p class="text-[10px] font-bold uppercase tracking-widest">Tapping into stream...</p></div>';

    Papa.parse(ADMIN_NEWS_CSV_URL, { 
        download: true, header: true, skipEmptyLines: 'greedy',
        complete: function(results) {
            if (results.data && results.data.length > 0 && results.data[0].TITLE) {
                let html = ""; 
                const recentItems = results.data.slice(-6).reverse(); 
                recentItems.forEach(item => {
                    if (item.TITLE) {
                        html += `
                        <div class="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl relative group hover:border-white/20 transition-all duration-300">
                            <div class="h-36 bg-[#05070a] relative overflow-hidden">
                                <img src="${item.IMAGE_URL}" class="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" onerror="this.src='https://placehold.co/400x200/05070a/06b6d4?text=News'">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                <button class="btn-delete-news absolute top-3 right-3 bg-tntc-admin/90 hover:bg-tntc-admin text-white p-2 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_15px_rgba(244,63,94,0.5)] transform scale-90 group-hover:scale-100" data-title="${encodeURIComponent(item.TITLE)}" title="Purge Dispatch">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                            <div class="p-5 relative z-10 -mt-8">
                                <span class="text-[8px] text-tntc-accent font-black uppercase tracking-widest bg-tntc-accent/10 px-2 py-1 rounded shadow-sm border border-tntc-accent/30 backdrop-blur-md">${item.CATEGORY}</span>
                                <h3 class="text-base font-black text-white mt-3 leading-tight line-clamp-2 drop-shadow-md">${item.TITLE}</h3>
                                <p class="text-[9px] text-tntc-textSecondary mt-2 font-mono tracking-widest">${item.DATE}</p>
                            </div>
                        </div>`;
                    }
                });
                grid.innerHTML = html; 

                // Event delegation for News deletions
                grid.querySelectorAll('.btn-delete-news').forEach(btn => {
                    btn.addEventListener('click', () => confirmDeleteNews(decodeURIComponent(btn.dataset.title)));
                });

                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary bg-slate-900/40 rounded-2xl border border-white/5 font-bold tracking-widest uppercase text-xs">Stream is empty.</div>';
            }
        }
    });
}

function confirmDeleteNews(title) {
    showCustomAlert("Confirm Purge", `Are you sure you want to permanently delete this dispatch?\n\nTarget: "${title}"\n\nThis action cannot be undone.`, true, async () => {
        const payload = { action: "DELETE_NEWS", data: { title: title } };
        await sendAdminRequest(payload, "Purging Dispatch...", () => { setTimeout(fetchAdminNews, 3000); });
    });
}

// =============================================================================
// FLEET MEDIA VAULT (GALLERY)
// =============================================================================
async function submitNewGallery() {
    const payload = { action: "ADD_GALLERY", data: { image: document.getElementById('addGalleryImg').value } };
    if (!payload.data.image) { 
        showCustomAlert("Validation Failed", "Image URL is required!", true); 
        return; 
    }
    await sendAdminRequest(payload, "Injecting Media...", () => { 
        document.getElementById('addGalleryImg').value = ''; 
        setTimeout(fetchAdminGallery, 3000); 
    });
}

function fetchAdminGallery() {
    const grid = document.getElementById('adminGalleryGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-tntc-distance mx-auto mb-4"></div><p class="text-[10px] font-bold uppercase tracking-widest">Scanning Vault...</p></div>';

    Papa.parse(ADMIN_GALLERY_CSV_URL, { 
        download: true, header: true, skipEmptyLines: 'greedy',
        complete: function(results) {
            if (results.data && results.data.length > 0 && results.data[0].IMAGE_URL) {
                let html = ""; 
                const recentItems = results.data.slice(-10).reverse();
                recentItems.forEach(item => {
                    if (item.IMAGE_URL) {
                        html += `
                        <div class="aspect-square bg-[#05070a] border border-white/5 rounded-2xl overflow-hidden shadow-xl relative group">
                            <img src="${item.IMAGE_URL}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" onerror="this.src='https://placehold.co/400x400/05070a/4ade80?text=Media'">
                            <button class="btn-delete-gallery absolute top-2 right-2 bg-tntc-admin/90 hover:bg-tntc-admin text-white p-2.5 rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_20px_rgba(244,63,94,0.6)] transform scale-90 group-hover:scale-100" data-img="${encodeURIComponent(item.IMAGE_URL)}" title="Purge Asset">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>`;
                    }
                });
                grid.innerHTML = html; 

                // Event delegation for Media Deletion
                grid.querySelectorAll('.btn-delete-gallery').forEach(btn => {
                    btn.addEventListener('click', () => confirmDeleteGallery(decodeURIComponent(btn.dataset.img)));
                });

                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                grid.innerHTML = '<div class="col-span-full py-16 text-center text-tntc-textSecondary bg-slate-900/40 rounded-2xl border border-white/5 font-bold tracking-widest uppercase text-xs">Vault is empty.</div>';
            }
        }
    });
}

function confirmDeleteGallery(imageUrl) {
    showCustomAlert("Confirm Purge", `Are you sure you want to permanently remove this asset from the fleet vault?\n\nThis action cannot be undone.`, true, async () => {
        const payload = { action: "DELETE_GALLERY", data: { image: imageUrl } };
        await sendAdminRequest(payload, "Purging Asset...", () => { setTimeout(fetchAdminGallery, 3000); });
    });
}

// =============================================================================
// PERSONNEL ROSTER (RECRUITMENT & CLEARANCE)
// =============================================================================
async function fetchCrewData() {
    const pendingBody = document.getElementById('pendingTableBody');
    const activeBody = document.getElementById('activeTableBody');
    if (pendingBody) pendingBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-yellow-500 font-bold tracking-widest uppercase text-[10px]"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 inline-block align-middle mr-2"></div> Extracting clearances...</td></tr>';
    if (activeBody) activeBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-tntc-distance font-bold tracking-widest uppercase text-[10px]"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-tntc-distance inline-block align-middle mr-2"></div> Syncing roster...</td></tr>';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const response = await fetch(ADMIN_WEBAPP_URL + "?action=GET_USERS", { method: 'GET' });
        const result = await response.json();
        
        if (result.status === "success" && result.data) {
            let pendingHtml = ''; 
            let activeHtml = ''; 
            const role = sessionStorage.getItem('tntc_role');
            
            result.data.forEach(user => {
                if (user.status === 'PENDING') {
                    pendingHtml += `
                    <tr class="hover:bg-white/5 transition-colors group">
                        <td class="p-5 font-mono text-tntc-textSecondary text-[10px]">${user.joinDate || 'New'}</td>
                        <td class="p-5 font-black text-white text-base tracking-wide">${user.username} <span class="block text-[9px] text-tntc-accent font-mono mt-1 tracking-widest uppercase">ID: ${user.trackerName}</span></td>
                        <td class="p-5 font-bold text-yellow-500 text-xs">${user.discord} <span class="text-tntc-textSecondary font-mono block text-[9px] mt-1 tracking-widest uppercase">TMP: ${user.tmp}</span></td>
                        <td class="p-5 text-right flex justify-end gap-3 h-full items-center">
                            <button class="btn-approve-user px-4 py-2.5 bg-tntc-distance/10 border border-tntc-distance/30 hover:bg-tntc-distance hover:text-[#05070a] rounded-xl text-[10px] font-black uppercase tracking-widest text-tntc-distance inline-flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(74,222,128,0.15)] group-hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]" data-user="${user.username}" data-tracker="${user.trackerName}">
                                <i data-lucide="check" class="w-4 h-4"></i> Approve
                            </button>
                            <button class="btn-view-user px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-tntc-accent/50 rounded-xl text-[10px] font-black text-tntc-accent inline-flex items-center gap-2 transition-all" data-user="${user.username}" data-tracker="${user.trackerName}" data-discord="${user.discord}" data-tmp="${user.tmp}" data-reason="${encodeURIComponent(user.reason || '')}">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                        </td>
                    </tr>`;
                } else if (user.status === 'ACTIVE') {
                    const roleColor = user.role.toUpperCase() === 'LEADER' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 
                                    user.role.toUpperCase() === 'ADMIN' ? 'text-tntc-admin bg-tntc-admin/10 border-tntc-admin/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 
                                    'text-tntc-accent bg-tntc-accent/10 border-tntc-accent/30 shadow-[0_0_10px_rgba(56,189,248,0.2)]';
                                    
                    let manageControls = "";
                    if (role === 'leader' && user.username !== 'MASTER') {
                        manageControls = `
                            <select class="select-change-role bg-[#05070a]/80 border border-white/10 text-white rounded-lg text-[9px] px-3 py-1.5 outline-none focus:border-yellow-500 shadow-inner tracking-widest font-bold uppercase" data-user="${user.username}">
                                <option value="" disabled selected>Modify Rank</option>
                                <option value="RIDER">Make Rider</option>
                                <option value="ADMIN">Make Admin</option>
                            </select>
                            <button class="btn-revoke-user px-3 py-1.5 bg-tntc-admin/10 border border-tntc-admin/30 hover:bg-tntc-admin hover:text-white rounded-lg text-[9px] font-black tracking-widest uppercase text-tntc-admin transition-all shadow-sm ml-2" data-user="${user.username}">Revoke</button>
                        `;
                    } else if (role === 'admin' && user.role.toUpperCase() === 'RIDER') {
                        manageControls = `
                            <button class="btn-revoke-user px-3 py-1.5 bg-tntc-admin/10 border border-tntc-admin/30 hover:bg-tntc-admin hover:text-white rounded-lg text-[9px] font-black tracking-widest uppercase text-tntc-admin transition-all shadow-sm" data-user="${user.username}">Revoke</button>
                        `;
                    }

                    activeHtml += `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="p-5 font-mono text-tntc-textSecondary text-[10px]">${user.joinDate}</td>
                        <td class="p-5 font-black text-white text-base tracking-wide">${user.username} <span class="block text-[9px] text-tntc-textSecondary font-mono mt-1 tracking-widest uppercase">ID: ${user.trackerName}</span></td>
                        <td class="p-5"><span class="px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${roleColor} backdrop-blur-md">${user.role}</span></td>
                        <td class="p-5 text-right flex justify-end gap-2 items-center h-full">${manageControls}</td>
                    </tr>`;
                }
            });

            if (pendingBody) {
                pendingBody.innerHTML = pendingHtml || '<tr><td colspan="4" class="p-10 text-center text-tntc-textSecondary font-bold tracking-widest uppercase text-[10px]">No pending clearances.</td></tr>';
                pendingBody.querySelectorAll('.btn-approve-user').forEach(btn => {
                    btn.addEventListener('click', () => approveUserAccount(btn.dataset.user, btn.dataset.tracker));
                });
                pendingBody.querySelectorAll('.btn-view-user').forEach(btn => {
                    btn.addEventListener('click', () => viewApplicationDetails(btn.dataset.user, btn.dataset.tracker, btn.dataset.discord, btn.dataset.tmp, decodeURIComponent(btn.dataset.reason)));
                });
            }
            
            if (activeBody) {
                activeBody.innerHTML = activeHtml || '<tr><td colspan="4" class="p-10 text-center text-tntc-textSecondary font-bold tracking-widest uppercase text-[10px]">Roster is empty.</td></tr>';
                activeBody.querySelectorAll('.select-change-role').forEach(sel => {
                    sel.addEventListener('change', (e) => manageUserRole(sel.dataset.user, e.target.value));
                });
                activeBody.querySelectorAll('.btn-revoke-user').forEach(btn => {
                    btn.addEventListener('click', () => suspendUser(btn.dataset.user));
                });
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } catch (err) {
        if (pendingBody) pendingBody.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-tntc-admin font-black tracking-widest uppercase text-xs"><i data-lucide="alert-triangle" class="w-5 h-5 inline mr-2"></i> Connection Severed</td></tr>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

async function approveUserAccount(username, tracker) {
    showCustomAlert("Authorize Clearance", `Grant full access to ${username}?\nThis adds their ID (${tracker}) to the active telemetry grid.`, false, async () => {
        const payload = { action: "APPROVE_USER", data: { username: username } };
        await sendAdminRequest(payload, "Authorizing Access...", () => { setTimeout(fetchCrewData, 2000); });
    });
}

async function manageUserRole(username, newRole) {
    showCustomAlert("Modify Rank", `Confirm promotion/demotion of ${username} to ${newRole}?`, false, async () => {
        const payload = { action: "MANAGE_USER", data: { username: username, actionType: "CHANGE_ROLE", newRole: newRole } };
        await sendAdminRequest(payload, "Updating Clearances...", () => { setTimeout(fetchCrewData, 2000); });
    });
}

async function suspendUser(username) {
    showCustomAlert("Revoke Clearance", `Terminate access for ${username}?\nThey will be locked out of the terminal and removed from active telemetry tracking.`, true, async () => {
        const payload = { action: "MANAGE_USER", data: { username: username, actionType: "SUSPEND" } };
        await sendAdminRequest(payload, "Revoking Access...", () => { setTimeout(fetchCrewData, 2000); });
    });
}

function viewApplicationDetails(name, tracker, discord, tmpId, reason) {
    const title = `Intel: ${name}`;
    const message = `Callsign: ${tracker}\nComms (Discord): ${discord}\nTMP ID: ${tmpId}\n\nMotivation Report:\n${reason}`;
    showCustomAlert(title, message, false);
}

// =============================================================================
// ECONOMY ARCHITECTURE & FREIGHT CALCULATION
// =============================================================================
async function submitCargoRate() {
    const cName = document.getElementById('cargoNameInput').value.trim();
    const cPrice = parseFloat(document.getElementById('cargoPriceInput').value);
    
    if (!cName || isNaN(cPrice)) {
        showCustomAlert("Validation Failed", "Please enter a valid Cargo Name and a numeric Base Price.", true);
        return;
    }
    
    const payload = {
        action: "UPDATE_CARGO_RATE",
        data: { cargoName: cName, basePrice: cPrice }
    };
    
    await sendAdminRequest(payload, "Updating Economy Matrix...", () => {
        document.getElementById('cargoNameInput').value = '';
        document.getElementById('cargoPriceInput').value = '';
        setTimeout(fetchCargoRates, 3000); 
    });
}

function fetchCargoRates() {
    const grid = document.getElementById('cargoRatesGrid');
    if (!grid) return;
    
    grid.innerHTML = '<tr><td colspan="4" class="p-10 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div><p class="text-[10px] font-bold text-tntc-textSecondary uppercase tracking-widest">Scanning Matrix...</p></td></tr>';

    if (typeof Papa === 'undefined' || typeof ADMIN_CARGO_CSV_URL === 'undefined') return;

    Papa.parse(ADMIN_CARGO_CSV_URL, {
        download: true, 
        header: false, 
        skipEmptyLines: 'greedy',
        complete: function(results) {
            const rows = results.data;
            window.economyData = []; 
            
            if (rows && rows.length > 1) {
                // Header Auto-Detection
                const header = rows[0].map(h => String(h).trim().toUpperCase());
                
                let colName = header.findIndex(h => h.includes("CARGO"));
                let colWeight = header.findIndex(h => h.includes("WEIGHT"));
                let colPrice = header.findIndex(h => h.includes("PRICE") || h.includes("BASE"));

                // Fallbacks
                if (colName === -1) colName = 0;
                if (colWeight === -1) colWeight = 2;
                if (colPrice === -1) colPrice = 4;

                for (let i = 1; i < rows.length; i++) {
                    const name = String(rows[i][colName] || '').trim();
                    const weightStr = String(rows[i][colWeight] || '').trim();
                    const price = parseFloat(rows[i][colPrice]) || 0;
                    
                    // Filter out raw incremental IDs
                    if (!name || /^\d+$/.test(name)) continue;
                    
                    let parsedWeight = 1; 
                    const weightMatch = weightStr.match(/\d+(\.\d+)?/);
                    if (weightMatch) {
                        parsedWeight = parseFloat(weightMatch[0]);
                    }
                    
                    const estimate = parsedWeight * price * 1000;

                    window.economyData.push({
                        name: name,
                        weightStr: weightStr,
                        parsedWeight: parsedWeight,
                        price: price,
                        estimate: estimate
                    });
                }
                
                filterCargoTable();
            } else {
                grid.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-tntc-textSecondary font-bold text-[10px] uppercase tracking-widest">Database is empty.</td></tr>';
            }
        },
        error: function() {
            grid.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-tntc-admin font-bold text-[10px] uppercase tracking-widest"><i data-lucide="alert-triangle" class="w-4 h-4 inline-block mb-1"></i> Connection Severed.</td></tr>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });
}

function filterCargoTable() {
    const query = document.getElementById('cargoNameInput').value.trim().toLowerCase();
    let filtered = window.economyData;
    
    if (query !== "") {
        filtered = window.economyData.filter(item => item.name.toLowerCase().includes(query));
    }
    
    if (window.currentSortCol) {
        filtered.sort((a, b) => {
            const valA = a[window.currentSortCol];
            const valB = b[window.currentSortCol];
            
            if (typeof valA === 'string') {
                return window.currentSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return window.currentSortAsc ? valA - valB : valB - valA;
            }
        });
    }
    
    renderCargoTable(filtered);
}

function sortCargoTable(column) {
    if (window.currentSortCol === column) {
        window.currentSortAsc = !window.currentSortAsc; 
    } else {
        window.currentSortCol = column; 
        window.currentSortAsc = true; 
    }
    filterCargoTable();
}

function renderCargoTable(dataToRender) {
    const grid = document.getElementById('cargoRatesGrid');
    if (!grid) return;
    
    if (dataToRender.length === 0) {
        grid.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-tntc-textSecondary font-bold text-[10px] uppercase tracking-widest">No matching cargo found.</td></tr>';
        updateSortIcons();
        return;
    }
    
    let html = "";
    dataToRender.forEach(item => {
        html += `
        <tr class="cargo-row hover:bg-white/5 transition-colors group cursor-pointer" data-name="${encodeURIComponent(item.name)}" data-price="${item.price}">
            <td class="p-4 font-black text-white group-hover:text-tntc-accent drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] transition-colors">${item.name}</td>
            <td class="p-4 text-center text-tntc-textSecondary font-bold">${item.weightStr || '-'}</td>
            <td class="p-4 text-center font-mono font-black text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">€${item.price.toFixed(2)}</td>
            <td class="p-4 text-right font-mono font-black text-tntc-distance drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">€${Math.round(item.estimate).toLocaleString()}</td>
        </tr>`;
    });
    
    grid.innerHTML = html;

    // Attach click to prefill editor form
    grid.querySelectorAll('.cargo-row').forEach(row => {
        row.addEventListener('click', () => {
            document.getElementById('cargoNameInput').value = decodeURIComponent(row.dataset.name);
            document.getElementById('cargoPriceInput').value = row.dataset.price;
            filterCargoTable();
        });
    });

    updateSortIcons();
}

function updateSortIcons() {
    const columns = ['name', 'parsedWeight', 'price', 'estimate'];
    columns.forEach(col => {
        const th = document.getElementById(`th-${col}`);
        if (!th) return;
        
        const iconColor = window.currentSortCol === col ? "text-tntc-accent opacity-100" : "opacity-30 group-hover:opacity-100 text-tntc-textSecondary";
        const iconType = (window.currentSortCol === col && !window.currentSortAsc) ? "chevron-up" : "chevron-down";
        
        let text = ""; 
        let justifyClass = "";
        if (col === 'name') { text = "Cargo Name"; justifyClass = "justify-start"; }
        else if (col === 'parsedWeight') { text = "Weight (Tons)"; justifyClass = "justify-center"; }
        else if (col === 'price') { text = "Base Price (€)"; justifyClass = "justify-center"; }
        else if (col === 'estimate') { text = "Est. 1000km Revenue (€)"; justifyClass = "justify-end"; }

        th.innerHTML = `<div class="flex items-center ${justifyClass} gap-1">${text} <i data-lucide="${iconType}" class="w-3 h-3 transition-opacity ${iconColor}"></i></div>`;
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}