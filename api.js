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

    let jobsLoaded = false;
    let eventsLoaded = false;

    function checkAndRenderOverview() {
        if (jobsLoaded && eventsLoaded) {
            if(typeof applyOverviewFilter === "function") applyOverviewFilter();
        }
    }

    try {
        Papa.parse(EVENT_COVERS_CSV_URL, {
            download: true,
            header: true,
            skipEmptyLines: 'greedy',
            complete: function(results) {
                globalEventCovers = {};
                results.data.forEach(row => {
                    if(row.MONTH_YEAR && row.IMAGE_URL) {
                        globalEventCovers[row.MONTH_YEAR.toUpperCase()] = row.IMAGE_URL;
                    }
                });
            }
        });

        Papa.parse(EVENT_SHEET_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: 'greedy', 
            complete: function(results) {
                if (results.data.length > 0) {
                    let headerIndex = 0;
                    for (let i = 0; i < Math.min(5, results.data.length); i++) {
                        let colB = String(results.data[i][1]).toUpperCase();
                        let colC = String(results.data[i][2]).toUpperCase();
                        if (colB.includes('DATE') || colC.includes('EVENT')) {
                            headerIndex = i;
                            break;
                        }
                    }
                    globalEventData.headers = results.data[headerIndex];
                    globalEventData.rows = results.data.slice(headerIndex + 1);
                    
                    if(typeof populateEventCategoryDropdown === "function") populateEventCategoryDropdown();
                    if(typeof populateEventDriverDropdown === "function") populateEventDriverDropdown();
                    if(typeof applyEventFilters === "function") applyEventFilters(); 
                }
                eventsLoaded = true;
                checkAndRenderOverview();
            }
        });
        
        Papa.parse(GOOGLE_SHEET_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: 'greedy',
            complete: function(results) {
                if (results.data.length > 0) {
                    let startIdx = String(results.data[0][0]).toUpperCase().includes('TIME') ? 1 : 0;
                    globalJobData = results.data.slice(startIdx);
                    
                    if(typeof populateDriverDropdowns === "function") populateDriverDropdowns();
                    if(typeof applyLogFilters === "function") applyLogFilters();
                }
                
                jobsLoaded = true;
                checkAndRenderOverview();
                
                if (syncEl) {
                    syncEl.innerText = "Database Synced";
                    syncEl.classList.remove('animate-pulse');
                    setTimeout(() => { syncEl.innerText = "Live Connected"; }, 3000);
                }
            },
            error: function(err) {
                console.error("PapaParse Job Fetch Error:", err);
                jobsLoaded = true;
                checkAndRenderOverview();
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
    
    let currentJobDriver = jobDriverFilter.value;
    jobDriverFilter.innerHTML = '<option value="ALL">All Drivers</option>';
    Array.from(drivers).sort().forEach(d => { 
        jobDriverFilter.innerHTML += `<option value="${d}">${d}</option>`; 
    });
    jobDriverFilter.value = currentJobDriver || 'ALL';
}

function fetchLiveRidersOnly() {
    if (typeof LIVE_RIDERS_CSV_URL === 'undefined') return;
    
    Papa.parse(LIVE_RIDERS_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: 'greedy',
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