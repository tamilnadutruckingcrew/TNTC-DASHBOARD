
        function fetchData(isInitialLoad = false) {
            let syncStatus = document.getElementById('syncStatus');
            if (isInitialLoad && syncStatus) {
                syncStatus.innerText = "Syncing with Cloud...";
            }
            
            let timeParam = "t=" + new Date().getTime() + "_" + Math.floor(Math.random() * 100000); // Super cache buster
            let fetchCount = 0;
            
            const checkSyncDone = () => {
                fetchCount++;
                if(fetchCount >= 3) { 
                    let finalSyncStatus = document.getElementById('syncStatus');
                    if (isInitialLoad && finalSyncStatus) finalSyncStatus.innerText = "Live Cloud Sync Active";
                    if (typeof refreshActiveTab === "function") refreshActiveTab();
                }
            };

            // 1. Fetch Event Cover Images (From New Sheet)
            if (EVENT_COVERS_CSV_URL && EVENT_COVERS_CSV_URL !== "YOUR_NEW_COVER_SHEET_URL_HERE") {
                let coverUrl = EVENT_COVERS_CSV_URL + (EVENT_COVERS_CSV_URL.includes('?') ? '&' : '?') + timeParam;
                Papa.parse(coverUrl, {
                    download: true, header: false, skipEmptyLines: true,
                    complete: function(results) {
                        if (results.data && results.data.length > 0) {
                            results.data.forEach(row => {
                                let monthYear = String(row[0] || '').trim().toUpperCase(); // e.g. "JUNE 2026"
                                let imgLink = String(row[1] || '').trim();
                                if (monthYear && imgLink) globalEventCovers[monthYear] = imgLink;
                            });
                        }
                        checkSyncDone();
                    },
                    error: function() { checkSyncDone(); }
                });
            } else {
                checkSyncDone(); 
            }

            // 2. Fetch Jobs (PURE ARRAY FOR 100% STABILITY)
            let jobUrl = GOOGLE_SHEET_CSV_URL + (GOOGLE_SHEET_CSV_URL.includes('?') ? '&' : '?') + timeParam;
            Papa.parse(jobUrl, {
                download: true, header: false, skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 1) {
                        globalJobData = results.data.slice(1); // Keep as clean 2D array!
                        try {
                            if (typeof populateDriverDropdown === "function") populateDriverDropdown(globalJobData);
                        } catch(e) { console.error("Dropdown error:", e); }
                    }
                    checkSyncDone();
                },
                error: function(err) { console.error("Job Sync Error:", err); checkSyncDone(); }
            });

            // 3. Fetch Events
            let eventUrl = EVENT_SHEET_CSV_URL + (EVENT_SHEET_CSV_URL.includes('?') ? '&' : '?') + timeParam;
            Papa.parse(eventUrl, {
                download: true, header: false, skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 1) {
                        let headerIndex = -1;
                        for(let i = 0; i < Math.min(20, results.data.length); i++) {
                            let rowStr = results.data[i].join(" ").toUpperCase();
                            if(rowStr.includes("EVENT NAME") && (rowStr.includes("CATEGORY") || rowStr.includes("DATE"))) {
                                headerIndex = i; break;
                            }
                        }
                        if (headerIndex !== -1) {
                            globalEventData.headers = results.data[headerIndex];
                            globalEventData.rows = results.data.slice(headerIndex + 1);
                            try {
                                if (typeof populateEventCategoryDropdown === "function") populateEventCategoryDropdown();
                                if (typeof populateEventDriverDropdown === "function") populateEventDriverDropdown();
                            } catch(e) { console.error("Event Dropdown error:", e); }
                        }
                    }
                    checkSyncDone();
                },
                error: function(err) { console.error("Event Sync Error:", err); checkSyncDone(); }
            });
        }

        function fetchTourData() {
            let timeParam = "t=" + new Date().getTime() + "_" + Math.floor(Math.random() * 100000);
            let tourUrl = TOUR_SHEET_CSV_URL + (TOUR_SHEET_CSV_URL.includes('?') ? '&' : '?') + timeParam;
            Papa.parse(tourUrl, {
                download: true, header: false, skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 1) {
                        let headerIndex = -1;
                        for(let i = 0; i < Math.min(20, results.data.length); i++) {
                            let rowStr = results.data[i].join(" ").toUpperCase();
                            if(rowStr.includes("SOURCE CITY") && rowStr.includes("DESTINATION CITY")) {
                                headerIndex = i; break;
                            }
                        }
                        if (headerIndex !== -1) {
                            globalTourData.headers = results.data[headerIndex];
                            globalTourData.rows = results.data.slice(headerIndex + 1);
                            isTourDataFetched = true;
                            if (typeof processCampaignData === "function") processCampaignData();
                        }
                    }
                },
                error: function(err) { console.error("Campaign Sync Error:", err); }
            });
        }

        function fetchLiveRidersOnly() {
            if (LIVE_RIDERS_CSV_URL && !LIVE_RIDERS_CSV_URL.includes("🔴")) {
                let timeParam = "t=" + new Date().getTime() + "_" + Math.floor(Math.random() * 100000);
                let liveUrl = LIVE_RIDERS_CSV_URL + (LIVE_RIDERS_CSV_URL.includes('?') ? '&' : '?') + timeParam;
                Papa.parse(liveUrl, {
                    download: true, header: false, skipEmptyLines: true,
                    complete: function(results) {
                        if (typeof renderLiveRiders === "function") renderLiveRiders(results.data);
                    },
                    error: function(err) { console.error("Live Rider Sync Failed:", err); }
                });
            }
        }