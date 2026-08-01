// ==========================================
// OVERVIEW DASHBOARD ENGINE (overview.js)
// ==========================================

function applyOverviewFilter() {
    // NEW: Dynamic UI State Reader (Premium Filter Logic)
    let timeFilter = 'ALL';
    let customDate = '';
    if (window.vtcFilterStates && window.vtcFilterStates['overview']) {
        let state = window.vtcFilterStates['overview'];
        if (state.mode === 'MONTHLY') { timeFilter = 'CUSTOM_MONTH'; customDate = state.value; }
        else if (state.mode === 'DAILY') { timeFilter = 'CUSTOM'; customDate = state.value; }
    }
    
    let totalKm = 0;
    let totalJobs = 0;
    let totalRevenue = 0;
    let activeDrivers = new Set();
    
    let driverKmMap = {}; 
    let driverEventMap = {}; 
    let hallOfFame = [];
    
    // Safety check
    if (!globalJobData || globalJobData.length === 0) return;

    globalJobData.forEach(row => {
        let name = String(row[2] || '').trim();
        let normName = normalizeKey(name);
        
        if(!normName || normName === 'UNKNOWN') return;
        
        let timeStr = String(row[0] || '');
        if (!checkDateFilter(timeStr, timeFilter, customDate)) return;

        let drivenKm = cleanNumber(row[12]);
        let rev = cleanNumber(row[15]);

        if (drivenKm > 0) {
            totalKm += drivenKm;
            totalJobs++;
            totalRevenue += rev;
            activeDrivers.add(normName);
            
            if(!driverKmMap[name]) driverKmMap[name] = { km: 0, jobs: 0 };
            driverKmMap[name].km += drivenKm;
            driverKmMap[name].jobs += 1;
        }
    });

    let filteredEventsCount = 0;
    
    if (globalEventData && globalEventData.rows && globalEventData.headers) {
        let headers = globalEventData.headers;
        
        // Pre-compute valid driver columns starting from index 6
        let driverCols = [];
        for (let i = 6; i < headers.length; i++) {
            let dName = String(headers[i] || '').trim();
            let normKey = normalizeKey(dName);
            
            if (normKey && normKey !== 'UNKNOWN' && !normKey.includes('ATTENDANCE')) {
                driverCols.push({ index: i, name: dName });
            }
        }

        globalEventData.rows.forEach(row => {
            let dateStr = String(row[1] || '');
            if (dateStr.trim() === '') return;
            
            if (checkDateFilter(dateStr, timeFilter, customDate)) {
                filteredEventsCount++;
                
                // Iterate through pre-computed driver columns
                driverCols.forEach(dc => {
                    // Strip out quotes, extra spaces, and enforce uppercase for robust matching
                    let val = String(row[dc.index] || '').replace(/["']/g, '').trim().toUpperCase();
                    
                    // Explicit check for checked box values exported by Google Sheets CSV
                    if (val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓' || val === '✔' || val === '☑' || val === 'CHECKED') {
                        if (!driverEventMap[dc.name]) driverEventMap[dc.name] = 0;
                        driverEventMap[dc.name]++;
                    }
                });
            }
        });
    }

    animateValue('statDistance', parseInt(document.getElementById('statDistance').innerText.replace(/,/g,'')) || 0, totalKm, 1000);
    animateValue('statJobs', parseInt(document.getElementById('statJobs').innerText) || 0, totalJobs, 1000);
    animateValue('statRevenue', parseInt(document.getElementById('statRevenue').innerText.replace(/,/g,'')) || 0, totalRevenue, 1000);
    document.getElementById('statDrivers').innerText = activeDrivers.size;
    document.getElementById('statEvents').innerText = filteredEventsCount;

    let kmLeaderboard = [];
    for(let d in driverKmMap) kmLeaderboard.push({ name: d, km: driverKmMap[d].km, jobs: driverKmMap[d].jobs });
    kmLeaderboard.sort((a,b) => b.km - a.km);
    
    let eventLeaderboard = [];
    for(let d in driverEventMap) eventLeaderboard.push({ name: d, events: driverEventMap[d] });
    eventLeaderboard.sort((a,b) => b.events - a.events);
    
    // Sort logic for Hall of Fame based on events
    // This looks for past members who are no longer active in the job sheet
    if (globalJobData && globalJobData.length > 0) {
        let allCurrentDrivers = new Set(globalJobData.map(r => normalizeKey(r[2])));
        for (let d in driverEventMap) {
            if (!allCurrentDrivers.has(normalizeKey(d))) {
                hallOfFame.push({ name: d, events: driverEventMap[d] });
            }
        }
        hallOfFame.sort((a,b) => b.events - a.events);
    }

    renderLeaderboardList('kmLeaderboardList', kmLeaderboard, 'km');
    renderLeaderboardList('eventLeaderboardList', eventLeaderboard, 'events');
    renderHallOfFame('pastLeaderboardList', hallOfFame);

    updateCharts(kmLeaderboard, eventLeaderboard);
}

function renderLeaderboardList(elementId, data, type) {
    let container = document.getElementById(elementId);
    if (!container) return;
    
    let html = "";
    if(data.length === 0) {
        html = `<p class="text-xs text-tntc-textSecondary italic text-center mt-10">No data found for this period.</p>`;
    } else {
        data.slice(0, 10).forEach((item, index) => {
            let rankColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-tntc-textSecondary';
            let valStr = type === 'km' ? `<span class="text-tntc-distance font-mono font-bold">${item.km.toLocaleString()} km</span>` : `<span class="text-tntc-accent font-bold">${item.events} Convoys</span>`;
            let subStr = type === 'km' ? `${item.jobs} Jobs` : ``;
            
            html += `
            <div class="flex items-center justify-between p-3 bg-tntc-main border border-tntc-muted/20 rounded-lg hover:border-tntc-muted/50 transition-colors shadow-sm">
                <div class="flex items-center gap-3">
                    <span class="font-black ${rankColor} w-5">#${index+1}</span>
                    <div>
                        <p class="text-sm font-bold text-tntc-textPrimary leading-tight">${item.name}</p>
                        ${subStr ? `<p class="text-[10px] text-tntc-textSecondary">${subStr}</p>` : ''}
                    </div>
                </div>
                ${valStr}
            </div>`;
        });
    }
    container.innerHTML = html;
}

function renderHallOfFame(elementId, data) {
    let container = document.getElementById(elementId);
    if (!container) return;
    
    let html = "";
    if(data.length === 0) {
        html = `<p class="text-xs text-tntc-textSecondary italic text-center mt-10">No past members found.</p>`;
    } else {
        data.slice(0, 10).forEach(item => {
            html += `
            <div class="flex items-center justify-between p-3 bg-tntc-main/50 border border-tntc-muted/10 rounded-lg opacity-70 hover:opacity-100 transition-opacity">
                <div class="flex items-center gap-3">
                    <i data-lucide="user-minus" class="w-4 h-4 text-tntc-textSecondary"></i>
                    <div>
                        <p class="text-xs font-bold text-tntc-textSecondary leading-tight">${item.name}</p>
                        <p class="text-[9px] text-tntc-textSecondary/70">${item.events} Events</p>
                    </div>
                </div>
                <span class="text-tntc-textSecondary text-[10px] font-mono">Inactive</span>
            </div>`;
        });
    }
    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateCharts(kmData, eventData) {
    const kmTop5 = kmData.slice(0,5);
    const evTop5 = eventData.slice(0,5);

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0c1017', titleColor: '#f8fafc', bodyColor: '#38bdf8', borderColor: '#334155', borderWidth: 1 } },
        scales: { 
            y: { beginAtZero: true, grid: { color: 'rgba(51,65,85,0.2)' }, border: { display: false } },
            x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, minRotation: 0, font: { size: 9 } } }
        }
    };

    if (kmChartInstance) kmChartInstance.destroy();
    let kmCtx = document.getElementById('kmBarChart');
    if (kmCtx) {
        let grad = kmCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        grad.addColorStop(0, 'rgba(74,222,128,0.8)'); grad.addColorStop(1, 'rgba(74,222,128,0.2)');
        
        kmChartInstance = new Chart(kmCtx, {
            type: 'bar',
            data: {
                labels: kmTop5.map(d => { let parts = d.name.split(' '); return parts[0]; }), 
                datasets: [{ data: kmTop5.map(d => d.km), backgroundColor: grad, borderRadius: 4, barThickness: 40 }]
            },
            options: commonOptions
        });
    }

    if (eventChartInstance) eventChartInstance.destroy();
    let evCtx = document.getElementById('eventBarChart');
    if (evCtx) {
        let grad2 = evCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        grad2.addColorStop(0, 'rgba(56,189,248,0.8)'); grad2.addColorStop(1, 'rgba(56,189,248,0.2)');
        
        eventChartInstance = new Chart(evCtx, {
            type: 'bar',
            data: {
                labels: evTop5.map(d => { let parts = d.name.split(' '); return parts[0]; }),
                datasets: [{ data: evTop5.map(d => d.events), backgroundColor: grad2, borderRadius: 4, barThickness: 40 }]
            },
            options: commonOptions
        });
    }
}