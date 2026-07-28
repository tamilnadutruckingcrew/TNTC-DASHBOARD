// ==========================================
// DATA FETCHING & API ROUTING (api.js)
// ==========================================

async function fetchData(isInitialLoad = false) {
    if(isInitialLoad) {
        let jobBody = document.getElementById('filteredJobTableBody');
        let eventBody = document.getElementById('filteredEventTableBody');
        if (jobBody) jobBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-tntc-textSecondary"><div class="loader inline-block mr-2 relative top-1"></div> Fetching database...</td></tr>`;
        if (eventBody) eventBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-tntc-textSecondary"><div class="loader inline-block mr-2 relative top-1"></div> Fetching events...</td></tr>`;
    }

    let syncEl = document.getElementById('syncStatus');
    if (syncEl) {
        syncEl.innerText = "Syncing...";
        syncEl.classList.add('animate-pulse');
        syncEl.classList.remove('text-tntc-admin');
        syncEl.classList.add('text-tntc-textPrimary');
    }

    try {
        // 1. Fetch Event Covers for the Modals
        Papa.parse(EVENT_COVERS_CSV_URL, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                globalEventCovers = {};
                results.data.forEach(row => {
                    if(row.MONTH_YEAR && row.IMAGE_URL) {
                        globalEventCovers[row.MONTH_YEAR.toUpperCase()] = row.IMAGE_URL;
                    }
                });
            }
        });

        // 2. Fetch Event Data
        Papa.parse(EVENT_SHEET_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data.length > 1) {
                    globalEventData.headers = results.data[0];
                    globalEventData.rows = results.data.slice(1);
                    
                    // Trigger the dropdown builders, pagination renderers, and overview refresh
                    if(typeof populateEventCategoryDropdown === "function") populateEventCategoryDropdown();
                    if(typeof populateEventDriverDropdown === "function") populateEventDriverDropdown();
                    if(typeof applyEventFilters === "function") applyEventFilters(); 
                    if(typeof applyOverviewFilter === "function") applyOverviewFilter(); // <--- ADD THIS LINE
                }
            }
        });
        
        // 3. Fetch Job Logs
        Papa.parse(GOOGLE_SHEET_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data.length > 1) {
                    globalJobData = results.data.slice(1);
                    
                    if(typeof populateDriverDropdowns === "function") populateDriverDropdowns();
                    
                    // Trigger pagination and the overview dashboard charts
                    if(typeof applyLogFilters === "function") applyLogFilters();
                    if(typeof applyOverviewFilter === "function") applyOverviewFilter();
                }
                
                if (syncEl) {
                    syncEl.innerText = "Database Synced";
                    syncEl.classList.remove('animate-pulse');
                    setTimeout(() => { syncEl.innerText = "Live Connected"; }, 3000);
                }
            },
            error: function(err) {
                console.error("PapaParse Job Fetch Error:", err);
                if (syncEl) {
                    syncEl.innerText = "Sync Error";
                    syncEl.classList.replace('text-tntc-textPrimary', 'text-tntc-admin');
                }
            }
        });

    } catch (error) {
        console.error("API Fetch Error:", error);
        if (syncEl) {
            syncEl.innerText = "Sync Error";
            syncEl.classList.replace('text-tntc-textPrimary', 'text-tntc-admin');
        }
    }
}

function populateDriverDropdowns() {
    let jobDriverFilter = document.getElementById('filterDriver');
    if(!jobDriverFilter) return;

    let drivers = new Set();
    globalJobData.forEach(row => {
        let name = String(row[2] || '').trim();
        if(name && name.toUpperCase() !== 'UNKNOWN') {
            drivers.add(normalizeKey(name));
        }
    });
    
    // Save current selection so it doesn't reset while polling
    let currentJobDriver = jobDriverFilter.value;
    
    jobDriverFilter.innerHTML = '<option value="ALL">All Drivers</option>';
    Array.from(drivers).sort().forEach(d => { 
        // We use the normalized key as value, and original format for display
        jobDriverFilter.innerHTML += `<option value="${d}">${d}</option>`; 
    });
    
    jobDriverFilter.value = currentJobDriver || 'ALL';
}
function fetchLiveRidersOnly() {
    if (typeof LIVE_RIDERS_CSV_URL === 'undefined') return;
    
    Papa.parse(LIVE_RIDERS_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && typeof renderLiveRiders === "function") {
                renderLiveRiders(results.data);
            }
        },
        error: function(err) {
            console.error("Live Riders Fetch Error:", err);
        }
    });
}