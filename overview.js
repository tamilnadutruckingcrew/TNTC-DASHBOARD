
        function populateDriverDropdown(rows) {
            let dropdown = document.getElementById('filterDriver');
            if(!dropdown) return;

            let driverMap = new Map();
            rows.forEach(row => { 
                let orig = String(row[2] || '').trim(); 
                let norm = normalizeKey(orig);
                if(norm && norm !== 'UNKNOWN') {
                    if (!driverMap.has(norm)) driverMap.set(norm, orig);
                } 
            });
            
            let currentVal = dropdown.value; 
            dropdown.innerHTML = '<option value="ALL">All Drivers</option>';
            let sortedKeys = Array.from(driverMap.keys()).sort();
            sortedKeys.forEach(norm => { 
                dropdown.innerHTML += `<option value="${norm}">${driverMap.get(norm)}</option>`; 
            });
            dropdown.value = currentVal || 'ALL';
        }

        function applyOverviewFilter() {
            let timeFilterEl = document.getElementById('overviewTimeFilter');
            let customDateEl = document.getElementById('overviewDatePicker');
            
            if (!timeFilterEl || !customDateEl) return;
            
            let timeFilter = timeFilterEl.value;
            let customDate = customDateEl.value;
            
            let filteredJobs = globalJobData.filter(row => checkDateFilter(row[0] || '', timeFilter, customDate));
            
            let thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            let driverLastJobDate = {};
            let originalDriverNames = {}; 
            let driverAllTimeKm = {};
            let driverAllTimeEvents = {};
            
            globalJobData.forEach(row => {
                let origName = String(row[2] || '').trim();
                let normKey = normalizeKey(origName);
                if (!normKey || normKey === 'UNKNOWN') return;

                if (!originalDriverNames[normKey]) originalDriverNames[normKey] = origName;
                
                let dateStr = String(row[0] || '');
                let jobDate = new Date(dateStr.replace(/-/g, ' '));
                if (!isNaN(jobDate)) {
                    if (!driverLastJobDate[normKey] || jobDate > driverLastJobDate[normKey]) {
                        driverLastJobDate[normKey] = jobDate;
                    }
                }
                
                if (!driverAllTimeKm[normKey]) driverAllTimeKm[normKey] = 0;
                driverAllTimeKm[normKey] += cleanNumber(row[12]);
            });

            globalEventData.rows.forEach(row => {
                for(let i = 6; i < globalEventData.headers.length; i++) {
                    let origName = String(globalEventData.headers[i] || '').trim();
                    let normKey = normalizeKey(origName);
                    
                    if (!normKey || normKey === 'UNKNOWN' || normKey.includes('ATTENDANCE')) continue;

                    let val = String(row[i] || '').trim().toUpperCase();
                    if(val !== '' && val !== 'FALSE' && val !== '0' && val !== '☐' && val !== 'NO') {
                        if (!originalDriverNames[normKey]) originalDriverNames[normKey] = origName;
                        if (!driverLastJobDate[normKey]) driverLastJobDate[normKey] = new Date(0); 
                        if (!driverAllTimeEvents[normKey]) driverAllTimeEvents[normKey] = 0;
                        driverAllTimeEvents[normKey]++;
                    }
                }
            });

            let activeDriversSet = new Set();
            let pastDriversSet = new Set();

            Object.keys(driverLastJobDate).forEach(normKey => {
                if (driverLastJobDate[normKey] >= thirtyDaysAgo) {
                    activeDriversSet.add(normKey);
                } else {
                    pastDriversSet.add(normKey);
                }
            });

            let statDriversEl = document.getElementById('statDrivers');
            if (statDriversEl) animateValue("statDrivers", parseInt(statDriversEl.innerText) || 0, activeDriversSet.size, 500);

            let pastStats = {};
            pastDriversSet.forEach(normKey => {
                pastStats[normKey] = {
                    name: originalDriverNames[normKey],
                    km: driverAllTimeKm[normKey] || 0,
                    events: driverAllTimeEvents[normKey] || 0
                };
            });
            renderPastDrivers(pastStats);

            processTelemetryData(filteredJobs, activeDriversSet, originalDriverNames);
            processEventData(timeFilter, customDate, activeDriversSet, originalDriverNames);
        }

        function processTelemetryData(rows, activeDriversSet, originalDriverNames) {
            let totalKm = 0, totalRev = 0, totalJobs = rows.length;
            let driverMap = {};
            
            rows.forEach((row) => {
                let normKey = normalizeKey(row[2]);
                if(!normKey || normKey === 'UNKNOWN') return;

                let drivenKm = cleanNumber(row[12]);
                let revenue = cleanNumber(row[15]);
                
                totalKm += drivenKm; 
                totalRev += revenue;
                
                if (!driverMap[normKey]) driverMap[normKey] = { km: 0, jobs: 0 };
                driverMap[normKey].km += drivenKm;
                driverMap[normKey].jobs += 1;
            });

            let statDistEl = document.getElementById('statDistance');
            let statJobsEl = document.getElementById('statJobs');
            let statRevEl = document.getElementById('statRevenue');

            if (statDistEl) animateValue("statDistance", parseInt(statDistEl.innerText.replace(/,/g, '')) || 0, totalKm, 1000);
            if (statJobsEl) animateValue("statJobs", parseInt(statJobsEl.innerText.replace(/,/g, '')) || 0, totalJobs, 800);
            if (statRevEl) animateValue("statRevenue", parseInt(statRevEl.innerText.replace(/,/g, '')) || 0, totalRev, 1000);

            let activeKMDrivers = [];

            Object.keys(driverMap).forEach(normKey => {
                if (activeDriversSet.has(normKey)) {
                    activeKMDrivers.push({ name: originalDriverNames[normKey] || normKey, km: driverMap[normKey].km, jobs: driverMap[normKey].jobs });
                }
            });

            activeKMDrivers.sort((a, b) => b.km - a.km);

            let leaderboardHTML = "";
            if (activeKMDrivers.length === 0) leaderboardHTML = `<p class="text-tntc-textSecondary text-sm text-center mt-4">No active logs found.</p>`;
            else {
                activeKMDrivers.forEach((d, rank) => {
                    let badgeClass = rank === 0 ? 'text-tntc-revenue font-black' : (rank === 1 ? 'text-slate-300 font-bold' : (rank === 2 ? 'text-amber-600 font-bold' : 'text-slate-500 font-semibold'));
                    leaderboardHTML += `<div class="flex items-center justify-between p-3 rounded-xl bg-tntc-main border border-tntc-muted/20 hover:bg-tntc-hover transition-colors"><div class="flex items-center gap-3"><span class="text-sm ${badgeClass}">#${rank + 1}</span><div><p class="text-xs font-bold text-tntc-textPrimary">${d.name}</p><p class="text-[10px] text-tntc-textSecondary">${d.jobs} Jobs</p></div></div><p class="text-xs font-mono font-bold text-tntc-distance">${d.km.toLocaleString()} km</p></div>`;
                });
            }
            updateDOMIfChanged('kmLeaderboardList', leaderboardHTML);
            renderKmChart(activeKMDrivers.slice(0, 8)); 
        }

        function processEventData(timeFilter, customDate, activeDriversSet, originalDriverNames) {
            if(!globalEventData.rows.length) return;
            let totalEvents = 0;
            let driverEventMap = {};
            let headers = globalEventData.headers;

            globalEventData.rows.forEach(row => {
                let dateStr = String(row[1] || ''); 
                let nameStr = String(row[2] || '');
                if (dateStr.trim() === '' || nameStr.trim() === '') return; 

                if(checkDateFilter(dateStr, timeFilter, customDate)) {
                    totalEvents++; 
                    for(let i = 6; i < headers.length; i++) { 
                        let normKey = normalizeKey(headers[i]);
                        if(!normKey || normKey === 'UNKNOWN' || normKey.includes('ATTENDANCE')) continue;
                        
                        let val = String(row[i] || '').trim().toUpperCase();
                        if(val !== '' && val !== 'FALSE' && val !== '0' && val !== '☐' && val !== 'NO') {
                            if(!driverEventMap[normKey]) driverEventMap[normKey] = 0;
                            driverEventMap[normKey]++;
                        }
                    }
                }
            });

            let statEventsEl = document.getElementById('statEvents');
            if (statEventsEl) animateValue("statEvents", parseInt(statEventsEl.innerText) || 0, totalEvents, 800);

            let activeEventDrivers = [];

            Object.keys(driverEventMap).forEach(normKey => {
                if (activeDriversSet.has(normKey)) {
                    activeEventDrivers.push({ name: originalDriverNames[normKey] || normKey, events: driverEventMap[normKey] });
                }
            });

            activeEventDrivers.sort((a, b) => b.events - a.events);

            let leaderboardHTML = "";
            if (activeEventDrivers.length === 0) leaderboardHTML = `<p class="text-tntc-textSecondary text-sm text-center mt-4">No events found.</p>`;
            else {
                activeEventDrivers.forEach((d, rank) => {
                    let badgeClass = rank === 0 ? 'text-tntc-accent font-black' : (rank === 1 ? 'text-slate-300 font-bold' : (rank === 2 ? 'text-amber-600 font-bold' : 'text-slate-500 font-semibold'));
                    leaderboardHTML += `<div class="flex items-center justify-between p-3 rounded-xl bg-tntc-main border border-tntc-muted/20 hover:bg-tntc-hover transition-colors"><div class="flex items-center gap-3"><span class="text-sm ${badgeClass}">#${rank + 1}</span><div><p class="text-xs font-bold text-tntc-textPrimary">${d.name}</p></div></div><p class="text-xs font-mono font-bold text-tntc-accent">${d.events} Convoys</p></div>`;
                });
            }
            updateDOMIfChanged('eventLeaderboardList', leaderboardHTML);
            renderEventChart(activeEventDrivers.slice(0, 8)); 
        }

        function renderPastDrivers(pastStats) {
            let pastArray = Object.keys(pastStats).map(normKey => ({
                name: pastStats[normKey].name || normKey,
                km: pastStats[normKey].km || 0,
                events: pastStats[normKey].events || 0
            })).filter(d => String(d.name).toUpperCase() !== 'UNKNOWN' && d.name !== ''); 

            pastArray.sort((a, b) => b.km - a.km);

            let pastHTML = "";
            if (pastArray.length === 0) {
                pastHTML = `<p class="text-tntc-textSecondary text-sm text-center mt-4">No past members found.</p>`;
            } else {
                pastArray.forEach(d => {
                    pastHTML += `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-tntc-main border border-tntc-muted/10 opacity-70 hover:opacity-100 transition-opacity">
                        <div class="flex items-center gap-3">
                            <i data-lucide="user-minus" class="w-4 h-4 text-tntc-textSecondary"></i>
                            <div>
                                <p class="text-xs font-bold text-tntc-textSecondary">${d.name}</p>
                                <p class="text-[9px] text-tntc-textSecondary/60">${d.events} Events</p>
                            </div>
                        </div>
                        <p class="text-xs font-mono font-semibold text-tntc-textSecondary">${d.km.toLocaleString()} km</p>
                    </div>`;
                });
            }
            updateDOMIfChanged('pastLeaderboardList', pastHTML);
        }

        function renderKmChart(topDrivers) {
            let canvasEl = document.getElementById('kmBarChart');
            if(!canvasEl) return;

            const labels = topDrivers.map(d => d.name);
            const dataKm = topDrivers.map(d => d.km);
            
            if (kmChartInstance) {
                kmChartInstance.data.labels = labels;
                kmChartInstance.data.datasets[0].data = dataKm;
                kmChartInstance.update(); 
                return;
            }

            const ctx = canvasEl.getContext('2d');
            let gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(74, 222, 128, 0.8)'); 
            gradient.addColorStop(1, 'rgba(74, 222, 128, 0.1)');
            kmChartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ data: dataKm, backgroundColor: gradient, borderColor: '#4ade80', borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(2, 132, 199, 0.2)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } } } } });
        }

        function renderEventChart(topEventDrivers) {
            let canvasEl = document.getElementById('eventBarChart');
            if(!canvasEl) return;

            const labels = topEventDrivers.map(d => d.name);
            const dataEvents = topEventDrivers.map(d => d.events);
            
            if (eventChartInstance) {
                eventChartInstance.data.labels = labels;
                eventChartInstance.data.datasets[0].data = dataEvents;
                eventChartInstance.update();
                return;
            }

            const ctx = canvasEl.getContext('2d');
            let gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); 
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0.1)');
            eventChartInstance = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ data: dataEvents, backgroundColor: gradient, borderColor: '#38bdf8', borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(2, 132, 199, 0.2)' }, ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } } } } });
        }