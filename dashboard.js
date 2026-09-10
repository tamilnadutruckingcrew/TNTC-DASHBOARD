const TELEMETRY_API_URL = "http://localhost:25555/api/ets2/telemetry"; 
let telemetryPollInterval = null;
let lastRenderedDispatchHTML = ""; 

// Global State for UI Filters
window.vtcFilterStates = { 
    overview: { mode: 'ALL', value: '' }, 
    logs: { mode: 'ALL', value: '' }, 
    events: { mode: 'ALL', value: '' } 
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
    initIdentity();
    initFilterComponents();
    bindActionEvents();

    if (typeof fetchSiteAssets === 'function') fetchSiteAssets();
    
    // Delay hub calculation slightly to allow api.js to parse globalJobData
    setTimeout(calculatePersonalTerminal, 2000);
    
    startTelemetryPolling();
    setTimeout(() => window.switchTab('hub'), 100);
});

// =============================================================================
// UI SETUP & EVENT DELEGATION
// =============================================================================

function initIdentity() {
    const role = sessionStorage.getItem('tntc_role');
    const username = sessionStorage.getItem('tntc_username');
    const trackerName = sessionStorage.getItem('tntc_tracker');

    // Unhide Admin/Leader tools
    if (role === 'leader' || role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    if (username) {
        const headerUser = document.getElementById('headerUsername');
        const hubDriver = document.getElementById('hubDriverName');
        if (headerUser) headerUser.innerText = username;
        if (hubDriver) hubDriver.innerText = username;
    }
    
    const roleBadge = document.getElementById('hubRoleBadge');
    if (role && roleBadge) roleBadge.innerText = role;
    
    const trackerBadge = document.getElementById('hubTrackerName');
    if (trackerName && trackerBadge) trackerBadge.innerText = trackerName;
}

function initFilterComponents() {
    document.querySelectorAll('.tntc-vtc-filter').forEach(container => {
        const tabs = container.querySelectorAll('.filter-tab');
        const pickerContainer = container.querySelector('.picker-container');
        const pickerLabel = container.querySelector('.picker-label');
        const pickerDisplay = container.querySelector('.picker-display');
        const monthInput = container.querySelector('.month-input');
        const dateInput = container.querySelector('.date-input');
        const targetFunc = container.dataset.target; 

        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const curDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (monthInput) monthInput.value = curMonth; 
        if (dateInput) dateInput.value = curDate;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Reset tab styles
                tabs.forEach(t => {
                    t.classList.remove('text-tntc-revenue', 'bg-white/10');
                    t.classList.add('text-tntc-textSecondary', 'bg-transparent');
                });
                // Activate clicked tab
                tab.classList.remove('text-tntc-textSecondary', 'bg-transparent');
                tab.classList.add('text-tntc-revenue', 'bg-white/10');

                const mode = tab.dataset.mode;
                const freshNow = new Date();
                const freshMonth = `${freshNow.getFullYear()}-${String(freshNow.getMonth() + 1).padStart(2, '0')}`;
                const freshDate = `${freshNow.getFullYear()}-${String(freshNow.getMonth() + 1).padStart(2, '0')}-${String(freshNow.getDate()).padStart(2, '0')}`;

                if (mode === 'ALL') {
                    if (pickerContainer) pickerContainer.classList.add('hidden');
                    triggerFilter(targetFunc, mode, '');
                } else if (mode === 'MONTHLY') {
                    if (pickerContainer) pickerContainer.classList.remove('hidden');
                    if (pickerLabel) pickerLabel.innerText = 'MONTH';
                    if (monthInput) {
                        monthInput.classList.remove('hidden'); 
                        monthInput.value = freshMonth;
                        updateDisplay(monthInput.value, 'month', pickerDisplay);
                        triggerFilter(targetFunc, mode, monthInput.value);
                    }
                    if (dateInput) dateInput.classList.add('hidden');
                } else if (mode === 'DAILY') {
                    if (pickerContainer) pickerContainer.classList.remove('hidden');
                    if (pickerLabel) pickerLabel.innerText = 'DATE';
                    if (monthInput) monthInput.classList.add('hidden'); 
                    if (dateInput) {
                        dateInput.classList.remove('hidden');
                        dateInput.value = freshDate;
                        updateDisplay(dateInput.value, 'date', pickerDisplay);
                        triggerFilter(targetFunc, mode, dateInput.value);
                    }
                }
            });
        });

        // Listen for picker changes
        if (monthInput) {
            monthInput.addEventListener('change', (e) => { 
                updateDisplay(e.target.value, 'month', pickerDisplay); 
                triggerFilter(targetFunc, 'MONTHLY', e.target.value); 
            });
        }
        
        if (dateInput) {
            dateInput.addEventListener('change', (e) => { 
                updateDisplay(e.target.value, 'date', pickerDisplay); 
                triggerFilter(targetFunc, 'DAILY', e.target.value); 
            });
        }

        // Internal formatting helper
        function updateDisplay(val, type, displayEl) {
            if (!displayEl) return;
            if (!val) { displayEl.innerText = "Select..."; return; }
            const parts = val.split('-');
            let d;
            if (type === 'month') {
                d = new Date(parts[0], parseInt(parts[1], 10) - 1, 1);
                displayEl.innerText = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            } else {
                d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
                displayEl.innerText = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
    });
}

function bindActionEvents() {
    // Header Links
    const navWeb = document.getElementById('navWebsiteBtn');
    if (navWeb) navWeb.addEventListener('click', () => window.location.href = 'index.html');

    const adminBtn = document.getElementById('adminToolsBtn');
    if (adminBtn) adminBtn.addEventListener('click', () => window.location.href = 'admin.html');

    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => typeof logout === 'function' ? logout() : null);

    // Tab Navigation
    const navTabsContainer = document.getElementById('dashboardNavTabs');
    if (navTabsContainer) {
        navTabsContainer.querySelectorAll('button[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => window.switchTab(btn.dataset.tab));
        });
    }

    // Refresh Buttons
    const ovRefresh = document.getElementById('overviewRefreshBtn');
    if (ovRefresh) ovRefresh.addEventListener('click', () => fetchVTCData(false));

    const logRefresh = document.getElementById('logsRefreshBtn');
    if (logRefresh) logRefresh.addEventListener('click', () => fetchVTCData(false));

    const evRefresh = document.getElementById('eventsRefreshBtn');
    if (evRefresh) evRefresh.addEventListener('click', () => fetchVTCData(false));

    // Job Logs Elements
    const filterDriver = document.getElementById('filterDriver');
    if (filterDriver) filterDriver.addEventListener('change', () => typeof applyLogFilters === 'function' ? applyLogFilters() : null);

    const jobPageLimit = document.getElementById('jobPageLimit');
    if (jobPageLimit) jobPageLimit.addEventListener('change', () => typeof applyLogFilters === 'function' ? applyLogFilters() : null);

    const btnPrevPage = document.getElementById('btnPrevPage');
    if (btnPrevPage) btnPrevPage.addEventListener('click', () => typeof prevJobPage === 'function' ? prevJobPage() : null);

    const btnNextPage = document.getElementById('btnNextPage');
    if (btnNextPage) btnNextPage.addEventListener('click', () => typeof nextJobPage === 'function' ? nextJobPage() : null);

    // Event Records Elements
    const filterEvCat = document.getElementById('filterEventCategory');
    if (filterEvCat) filterEvCat.addEventListener('change', () => typeof applyEventFilters === 'function' ? applyEventFilters() : null);

    const filterEvDrv = document.getElementById('filterEventDriver');
    if (filterEvDrv) filterEvDrv.addEventListener('change', () => typeof applyEventFilters === 'function' ? applyEventFilters() : null);

    const evPageLimit = document.getElementById('eventPageLimit');
    if (evPageLimit) evPageLimit.addEventListener('change', () => typeof applyEventFilters === 'function' ? applyEventFilters() : null);

    const btnPrevEv = document.getElementById('btnPrevEventPage');
    if (btnPrevEv) btnPrevEv.addEventListener('click', () => typeof prevEventPage === 'function' ? prevEventPage() : null);

    const btnNextEv = document.getElementById('btnNextEventPage');
    if (btnNextEv) btnNextEv.addEventListener('click', () => typeof nextEventPage === 'function' ? nextEventPage() : null);

    // Modal Close Triggers
    document.querySelectorAll('.modal-backdrop, .modal-close-btn').forEach(el => {
        el.addEventListener('click', (e) => {
            const modal = e.target.closest('.custom-modal');
            if (modal) {
                if (modal.id === 'jobDetailsModal') {
                    window.closeJobModal();
                } else if (typeof closeModal === 'function') {
                    closeModal(modal.id);
                }
            }
        });
    });
}

// =============================================================================
// TAB ROUTING & FILTER DISPATCHER
// =============================================================================

window.switchTab = function(tab) {
    const allTabs = ['hub', 'overview', 'logs', 'events', 'campaign', 'liveriders'];
    
    allTabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        const btn = document.querySelector(`button[data-tab="${t}"]`);
        
        if (el) {
            if (tab === t) {
                el.style.display = 'block'; 
                el.classList.remove('hidden');
            } else {
                el.style.display = 'none'; 
                el.classList.add('hidden');
            }
        }
        
        if (btn) {
            if (tab === t) {
                btn.className = "tab-active py-4 px-4 text-[10px] font-black tracking-widest uppercase transition-colors whitespace-nowrap flex items-center gap-2";
            } else {
                btn.className = "tab-inactive py-4 px-4 text-[10px] font-black tracking-widest uppercase transition-colors whitespace-nowrap flex items-center gap-2";
            }
        }
    });

    // Lazy load or refresh data
    if (tab === 'campaign' && typeof fetchTourData === 'function') fetchTourData(); 
    if (tab === 'liveriders') {
        if (typeof fetchLiveRiders === 'function') fetchLiveRiders(); 
        if (typeof initLiveRiders === 'function') initLiveRiders();
    }

    // Auto-apply personal filters if shifting to tables
    const trackerName = sessionStorage.getItem('tntc_tracker');
    if (trackerName) {
        if (tab === 'logs') {
            const jobSelect = document.getElementById('filterDriver');
            if (jobSelect) {
                const targetOpt = Array.from(jobSelect.options).find(opt => opt.value.toUpperCase() === trackerName.toUpperCase());
                if(targetOpt) {
                    jobSelect.value = targetOpt.value; 
                    if(typeof applyLogFilters === 'function') applyLogFilters();
                }
            }
        }
        if (tab === 'events') {
            const evSelect = document.getElementById('filterEventDriver');
            if (evSelect) {
                const targetOpt = Array.from(evSelect.options).find(opt => opt.value.toUpperCase() === trackerName.toUpperCase());
                if(targetOpt) {
                    evSelect.value = targetOpt.value; 
                    if(typeof applyEventFilters === 'function') applyEventFilters();
                }
            }
        }
    }
};

function triggerFilter(target, mode, value) {
    window.vtcFilterStates[target] = { mode: mode, value: value };
    if (target === 'overview' && typeof applyOverviewFilter === 'function') applyOverviewFilter();
    if (target === 'logs' && typeof applyLogFilters === 'function') applyLogFilters();
    if (target === 'events' && typeof applyEventFilters === 'function') applyEventFilters();
}

// =============================================================================
// PERSONAL HUB / TERMINAL ENGINE
// =============================================================================

function calculatePersonalTerminal() {
    const trackerName = sessionStorage.getItem('tntc_tracker');
    if (!trackerName) return;
    
    // Ensure data arrays are populated from api.js
    if (typeof globalJobData === 'undefined' || globalJobData.length === 0 || typeof globalEventData === 'undefined' || !globalEventData.rows) {
        setTimeout(calculatePersonalTerminal, 500); // Retry loop
        return;
    }
    
    let myDist = 0;
    let myJobs = 0;
    let myRev = 0;
    let myFuel = 0;
    let myEvents = 0;
    
    // Accumulate Personal Jobs
    globalJobData.forEach(rawRow => {
        const row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
        if (row.length < 5) return;
        
        const driverName = String(row[2] || '').trim().toUpperCase();
        if(driverName === trackerName.toUpperCase()) {
            const distStr = String(row[12] || '0').replace(/[^0-9.-]/g, '');
            const revStr = String(row[15] || '0').replace(/[^0-9.-]/g, '');
            const fuelStr = String(row[17] || '0').replace(/[^0-9.-]/g, '');
            
            myDist += parseFloat(distStr) || 0;
            myRev += parseFloat(revStr) || 0;
            myFuel += parseFloat(fuelStr) || 0;
            myJobs++;
        }
    });
    
    // Accumulate Personal Events
    const headers = globalEventData.headers || [];
    globalEventData.rows.forEach(rawRow => {
        const row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
        for (let i = 6; i < headers.length; i++) {
            if (String(headers[i]).trim().toUpperCase() === trackerName.toUpperCase()) {
                const val = String(row[i] || '').replace(/["']/g, '').trim().toUpperCase();
                if(['TRUE', '1', 'YES', '✓', '✔', '☑'].some(v => val.includes(v))) {
                    myEvents++;
                }
            }
        }
    });
    
    // Update Hub UI Counters
    const hubKm = document.getElementById('hubTotalKm');
    const hubJobs = document.getElementById('hubTotalJobs');
    const hubRev = document.getElementById('hubTotalRevenue');
    const hubEv = document.getElementById('hubTotalEvents');

    if (hubKm) hubKm.innerText = Math.floor(myDist).toLocaleString();
    if (hubJobs) hubJobs.innerText = myJobs.toLocaleString();
    if (hubRev) hubRev.innerText = Math.floor(myRev).toLocaleString();
    if (hubEv) hubEv.innerText = myEvents.toLocaleString();
    
    const avgDist = myJobs > 0 ? Math.floor(myDist / myJobs) : 0;
    const avgEl = document.getElementById('hubAvgDist');
    if (avgEl) avgEl.innerText = avgDist.toLocaleString() + " km";
    
    const fuelEl = document.getElementById('hubTotalFuel');
    if (fuelEl) fuelEl.innerText = Math.floor(myFuel).toLocaleString() + " L";
    
    // Rank Calculation & Progression Bar
    let title = "ROOKIE";
    let colorClass = "text-tntc-textSecondary drop-shadow-none";
    let progress = 0;
    let nextTier = "PRO (5,000 KM)";
    
    if (myDist < 5000) {
        title = "ROOKIE"; colorClass = "text-tntc-textSecondary drop-shadow-none"; progress = (myDist / 5000) * 100; nextTier = "PRO (5,000 KM)";
    } else if (myDist >= 5000 && myDist < 20000) {
        title = "PRO TRUCKER"; colorClass = "text-tntc-distance drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]"; progress = ((myDist - 5000) / 15000) * 100; nextTier = "VETERAN (20,000 KM)";
    } else if (myDist >= 20000 && myDist < 50000) {
        title = "VETERAN"; colorClass = "text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]"; progress = ((myDist - 20000) / 30000) * 100; nextTier = "ELITE (50,000 KM)";
    } else {
        title = "ELITE DRIVER"; colorClass = "text-tntc-accent drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]"; progress = 100; nextTier = "MAX RANK REACHED";
    }
    
    const titleEl = document.getElementById('hubRankTitle');
    if (titleEl) {
        titleEl.className = `text-4xl md:text-5xl font-black tracking-tighter flex items-center gap-3 ${colorClass}`;
        titleEl.innerHTML = `${title} <i data-lucide="award" class="w-8 h-8"></i>`;
    }
    
    const rankProg = document.getElementById('hubRankProgress');
    const curTier = document.getElementById('hubCurrentTier');
    const nextTarget = document.getElementById('hubNextTierTarget');

    if (rankProg) rankProg.style.width = `${progress}%`;
    if (curTier) curTier.innerText = title;
    if (nextTarget) nextTarget.innerText = nextTier;
    
    if(typeof lucide !== 'undefined') lucide.createIcons();

    applyPersonalFilters(trackerName);
}

function applyPersonalFilters(trackerName) {
    const jobSelect = document.getElementById('filterDriver');
    if (jobSelect && jobSelect.options.length > 0) {
        const targetOpt = Array.from(jobSelect.options).find(opt => opt.value.toUpperCase() === trackerName.toUpperCase());
        if (targetOpt) {
            if (jobSelect.value !== targetOpt.value) {
                jobSelect.value = targetOpt.value; 
                if(typeof applyLogFilters === 'function') applyLogFilters();
            }
        } else {
            jobSelect.value = 'ALL';
            if(typeof applyLogFilters === 'function') applyLogFilters();
        }
    }

    const eventSelect = document.getElementById('filterEventDriver');
    if (eventSelect && eventSelect.options.length > 0) {
        const targetOpt = Array.from(eventSelect.options).find(opt => opt.value.toUpperCase() === trackerName.toUpperCase());
        if (targetOpt) {
            if (eventSelect.value !== targetOpt.value) {
                eventSelect.value = targetOpt.value; 
                if(typeof applyEventFilters === 'function') applyEventFilters();
            }
        } else {
            eventSelect.value = 'ALL';
            if(typeof applyEventFilters === 'function') applyEventFilters();
        }
    }
}

// =============================================================================
// MODALS (JOB DETAILS)
// =============================================================================

window.openJobModal = function(index) {
    try {
        if (typeof globalFilteredJobs === 'undefined') return;
        const row = globalFilteredJobs[index];
        if (!row) return;
        
        document.getElementById('modalJobId').innerText = 'JOB #' + (row[1] || 'UNKNOWN');
        document.getElementById('modalRoute').innerHTML = `${row[5] || '-'} <span class="text-tntc-accent mx-2 font-light opacity-50">→</span> ${row[7] || '-'}`;
        document.getElementById('modalCargoSub').innerText = `${row[3] || 'Cargo'} • ${row[12] || '0 km'} driven`;
        
        document.getElementById('modalDriver').innerText = row[2] || 'DRIVER';
        document.getElementById('modalTime').innerText = row[18] || '0h 0m';
        document.getElementById('modalRevenueTop').innerText = row[15] || '€0';
        
        document.getElementById('modalStartTime').innerText = row[0] || 'Unknown';
        document.getElementById('modalDepCity').innerText = row[5] || '-';
        document.getElementById('modalDepCo').innerText = row[6] || '-';
        document.getElementById('modalDestCity').innerText = row[7] || '-';
        document.getElementById('modalDestCo').innerText = row[8] || '-';
        
        document.getElementById('modalTruck').innerText = row[9] || 'Unknown';
        document.getElementById('modalDamage').innerText = row[14] || '0%';
        document.getElementById('modalTrailer').innerText = row[10] || 'Unknown';
        document.getElementById('modalWeight').innerText = row[4] || '0 t';
        
        document.getElementById('statCargo').innerText = row[3] || '-';
        document.getElementById('statDist').innerText = row[12] || '0 km';
        document.getElementById('statPlan').innerText = row[11] || '0 km';
        document.getElementById('statTime').innerText = row[18] || '0h 0m';
        document.getElementById('statRev').innerText = row[15] || '€0';
        document.getElementById('statFuel').innerText = row[17] || '0 L';
        document.getElementById('statTopSpd').innerText = row[13] || '0 km/h';
        document.getElementById('statAvgSpd').innerText = row[19] || '0 km/h';
        document.getElementById('statPark').innerText = row[16] || 'NO';
        
        // Dynamic Timeline Injection
        const tlContainer = document.getElementById('modalTimelineContainer');
        let tlHtml = `
            <div class="relative">
                <div class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-tntc-accent border-2 border-[#05070a] shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div>
                <p class="text-[10px] font-black uppercase tracking-widest text-white">Engine Ignition</p>
                <p class="text-[10px] text-tntc-textSecondary font-mono mt-1">${(row[0] || '').split(' ')[1] || '00:00'}</p>
            </div>
        `;
        
        const timelineStr = row[20] || '';
        if(timelineStr && timelineStr !== 'Clean Drive') {
            const events = timelineStr.split('|');
            events.forEach(evt => {
                if(evt.trim()) {
                    tlHtml += `
                    <div class="relative mt-8">
                        <div class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-tntc-admin border-2 border-[#05070a] shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-tntc-admin drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]">Integrity Compromised</p>
                        <p class="text-[10px] text-tntc-textSecondary font-mono mt-1">${evt.trim()}</p>
                    </div>`;
                }
            });
        }
        
        tlHtml += `
            <div class="relative mt-8">
                <div class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-tntc-distance border-2 border-[#05070a] shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                <p class="text-[10px] font-black uppercase tracking-widest text-tntc-distance drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">Payload Delivered</p>
                <p class="text-[10px] text-tntc-textSecondary font-mono mt-1">Safe Arrival</p>
            </div>
        `;
        
        if(tlContainer) tlContainer.innerHTML = tlHtml;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        const modal = document.getElementById('jobDetailsModal');
        if(modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            requestAnimationFrame(() => {
                modal.classList.add('modal-open');
                modal.classList.remove('modal-closed');
            });
        }
        
    } catch(e) {
        console.error("Modal Render Error:", e);
    }
};

window.closeJobModal = function() {
    const modal = document.getElementById('jobDetailsModal');
    if(modal) {
        modal.classList.remove('modal-open');
        modal.classList.add('modal-closed');
        setTimeout(() => { 
            modal.classList.add('hidden'); 
            modal.classList.remove('flex');
        }, 300);
    }
};

// =============================================================================
// LOCAL TRACKER TELEMETRY (PORT 25555)
// =============================================================================

async function fetchActiveDispatch() {
    const dispatchContainer = document.getElementById('activeDispatchContainer');
    const dispatchBadge = document.getElementById('activeDispatchBadge');
    
    if (!dispatchContainer) return;

    const setOfflineState = () => {
        if (dispatchBadge) {
            dispatchBadge.className = "text-[8px] bg-tntc-admin/10 text-tntc-admin border border-tntc-admin/30 px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.2)]";
            dispatchBadge.innerText = "OFFLINE";
        }
        
        const offlineHtml = `
            <div class="flex flex-col items-center justify-center py-10 opacity-60 h-full">
                <div class="w-12 h-12 rounded-full bg-tntc-admin/10 border border-tntc-admin/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    <i data-lucide="power-off" class="w-5 h-5 text-tntc-admin drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]"></i>
                </div>
                <p class="text-[10px] font-black uppercase tracking-widest text-tntc-admin mb-1">System Offline</p>
                <p class="text-[9px] font-bold text-tntc-textSecondary text-center tracking-wider">No active logistics detected.</p>
            </div>
        `;
        
        if (lastRenderedDispatchHTML !== offlineHtml) {
            dispatchContainer.innerHTML = offlineHtml;
            lastRenderedDispatchHTML = offlineHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };

    try {
        const response = await fetch(TELEMETRY_API_URL);
        
        if (!response.ok) {
            throw new Error("Telemetry API returned an error status.");
        }
        
        const data = await response.json();
        
        // Validation: Game disconnected or no job loaded
        if (!data || data.game?.connected === false || !data.job || Object.keys(data.job).length === 0 || data.job.cargo === "") {
            setOfflineState();
            return;
        }
        
        const sourceCity = data.job.sourceCity || 'Unknown';
        const sourceCompany = data.job.sourceCompany || 'Unknown';
        const destCity = data.job.destinationCity || 'Unknown';
        const destCompany = data.job.destinationCompany || 'Unknown';
        const cargo = data.job.cargo || 'Unknown';
        const dist = data.job.plannedDistanceKm ? data.job.plannedDistanceKm + ' km' : '0 km';
        
        if (dispatchBadge) {
            dispatchBadge.className = "text-[8px] bg-tntc-distance/10 text-tntc-distance border border-tntc-distance/30 px-2.5 py-1 rounded-full animate-pulse font-black tracking-widest shadow-[0_0_10px_rgba(74,222,128,0.2)]";
            dispatchBadge.innerText = "LIVE UPLINK";
        }
        
        const activeHtml = `
            <div class="space-y-4 w-full">
                <div class="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                    <div class="absolute left-0 top-0 w-1 h-full bg-tntc-accent/50"></div>
                    <div class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-white/10 transition-colors">
                        <i data-lucide="map-pin" class="w-4 h-4 text-tntc-textSecondary"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[9px] text-tntc-textSecondary uppercase tracking-widest font-black mb-1">Departure</p>
                        <h5 class="text-sm font-black text-white leading-tight truncate">${sourceCity}</h5>
                        <p class="text-[10px] text-tntc-textSecondary font-bold truncate tracking-wider uppercase mt-0.5"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-1"></i> ${sourceCompany}</p>
                    </div>
                </div>
                
                <div class="flex justify-center -my-2 relative z-10">
                    <div class="h-6 w-[2px] bg-gradient-to-b from-white/10 to-tntc-distance/30"></div>
                </div>
                
                <div class="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-tntc-distance/10 relative overflow-hidden group hover:border-tntc-distance/30 transition-colors shadow-[0_0_15px_rgba(74,222,128,0.02)]">
                    <div class="absolute left-0 top-0 w-1 h-full bg-tntc-distance/50"></div>
                    <div class="w-10 h-10 rounded-full bg-tntc-distance/10 border border-tntc-distance/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                        <i data-lucide="map-pin" class="w-4 h-4 text-tntc-distance"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[9px] text-tntc-distance uppercase tracking-widest font-black mb-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">Destination</p>
                        <h5 class="text-sm font-black text-white leading-tight truncate">${destCity}</h5>
                        <p class="text-[10px] text-tntc-textSecondary font-bold truncate tracking-wider uppercase mt-0.5"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-1"></i> ${destCompany}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 mt-2">
                    <div class="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                        <p class="text-[8px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1 flex items-center gap-1"><i data-lucide="package" class="w-3 h-3"></i> Cargo</p>
                        <p class="text-xs font-bold text-white truncate" title="${cargo}">${cargo}</p>
                    </div>
                    <div class="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                        <p class="text-[8px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1 flex items-center gap-1"><i data-lucide="milestone" class="w-3 h-3"></i> Target</p>
                        <p class="text-xs font-mono font-black text-tntc-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.5)] truncate">${dist}</p>
                    </div>
                </div>
            </div>
        `;
        
        if (lastRenderedDispatchHTML !== activeHtml) {
            dispatchContainer.innerHTML = activeHtml;
            lastRenderedDispatchHTML = activeHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        
    } catch (error) {
        setOfflineState();
    }
}

function startTelemetryPolling() {
    if (telemetryPollInterval) clearInterval(telemetryPollInterval);
    fetchActiveDispatch();
    // 3 Second constant poll logic
    telemetryPollInterval = setInterval(fetchActiveDispatch, 3000); 
}