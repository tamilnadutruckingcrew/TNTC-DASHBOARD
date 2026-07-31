// ==========================================
// DATA FETCHING & API ROUTING (api.js)
// ==========================================

async function fetchVTCData(isInitialLoad = false) {
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
            if(typeof updateOverviewTab === 'function') updateOverviewTab();
            if(typeof updateJobLogsTab === 'function') updateJobLogsTab();
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
        
        let fetchPromises = DASHBOARD_JOB_URLS.map(url => {
            return new Promise((resolve, reject) => {
                Papa.parse(url, {
                    download: true,
                    header: false,
                    skipEmptyLines: 'greedy',
                    complete: function(results) {
                        let startIdx = String(results.data[0][0]).toUpperCase().includes('TIME') ? 1 : 0;
                        if(startIdx === 0 && String(results.data[0][1]).toUpperCase().includes('DATE')) startIdx = 1; 
                        
                        resolve(results.data.slice(startIdx));
                    },
                    error: function(err) {
                        console.error("PapaParse Job Fetch Error for URL:", url, err);
                        resolve([]); 
                    }
                });
            });
        });

        Promise.all(fetchPromises).then(allResults => {
            let combinedRows = [];
            allResults.forEach(rows => {
                combinedRows = combinedRows.concat(rows);
            });

            combinedRows.sort((a, b) => {
                let dateA = new Date(a[0]).getTime() || 0; 
                let dateB = new Date(b[0]).getTime() || 0;
                return dateA - dateB;
            });

            globalJobData = combinedRows;
            
            if(typeof populateDriverDropdowns === "function") populateDriverDropdowns();
            if(typeof applyLogFilters === "function") applyLogFilters();
            
            jobsLoaded = true;
            checkAndRenderOverview();
            
            if (syncEl) {
                syncEl.innerText = "Database Synced";
                syncEl.classList.remove('animate-pulse');
                setTimeout(() => { syncEl.innerText = "Live Connected"; }, 3000);
            }
        }).catch(err => {
            console.error("Dashboard Promise Array Error:", err);
            jobsLoaded = true;
            checkAndRenderOverview();
            if (syncEl) {
                syncEl.innerText = "Sync Error";
                syncEl.classList.replace('text-tntc-textPrimary', 'text-tntc-admin');
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

// ==========================================
// DYNAMIC ASSETS (CMS ENGINE)
// ==========================================

function fetchSiteAssets() {
    if (typeof ASSETS_CSV_URL === 'undefined') return;

    if (typeof Papa !== 'undefined') {
        Papa.parse(ASSETS_CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: 'greedy',
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    globalSiteAssets = {};
                    
                    results.data.forEach(row => {
                        let assetName = String(row[0]).trim().toUpperCase();
                        let assetUrl = String(row[1]).trim();
                        if (assetName && assetUrl) {
                            globalSiteAssets[assetName] = assetUrl;
                        }
                    });
                    
                    applyDynamicAssets(); 
                }
            },
            error: function(err) {
                console.error("Assets Fetch Error:", err);
            }
        });
    }
}

function applyDynamicAssets() {
    // 1. Update standard <img> tags
    document.querySelectorAll('img[data-asset]').forEach(img => {
        let key = img.getAttribute('data-asset').toUpperCase();
        if (globalSiteAssets[key]) {
            img.src = globalSiteAssets[key];
        }
    });

    // 2. Update background images
    document.querySelectorAll('[data-bg-asset]').forEach(el => {
        let key = el.getAttribute('data-bg-asset').toUpperCase();
        if (globalSiteAssets[key]) {
            el.style.backgroundImage = `url('${globalSiteAssets[key]}')`;
        }
    });

    // 3. Update YouTube Promo Video iframe securely
    document.querySelectorAll('iframe[data-video-asset]').forEach(iframe => {
        let key = iframe.getAttribute('data-video-asset').toUpperCase();
        let rawUrl = globalSiteAssets[key];
        
        if (rawUrl) {
            let videoId = "";
            // Smart Extractor: Handles standard links, short links, and embed links
            if (rawUrl.includes("youtu.be/")) {
                videoId = rawUrl.split("youtu.be/")[1].split("?")[0];
            } else if (rawUrl.includes("youtube.com/watch?v=")) {
                videoId = rawUrl.split("v=")[1].split("&")[0];
            } else if (rawUrl.includes("youtube.com/embed/")) {
                videoId = rawUrl.split("embed/")[1].split("?")[0];
            }

            if (videoId) {
                // Ensure it plays securely with proper parameters
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
            }
        }
    });
}

function fetchLiveRidersOnly() {
    if (typeof LIVE_RIDERS_CSV_URL === 'undefined') return;
    
    if (typeof Papa !== 'undefined') {
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
}