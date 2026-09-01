function applyOverviewFilter() {
    let timeFilter = 'ALL';
    let customDate = '';
    if (window.vtcFilterStates && window.vtcFilterStates['overview']) {
        let state = window.vtcFilterStates['overview'];
        if (state.mode === 'MONTHLY') { timeFilter = 'CUSTOM_MONTH'; customDate = state.value; }
        else if (state.mode === 'DAILY') { timeFilter = 'CUSTOM'; customDate = state.value; }
    }
    
    let totalKm = 0; let totalJobs = 0; let totalRevenue = 0;
    let activeDrivers = new Set();
    
    let driverStats = {}; 
    let today = new Date();
    let thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    // 🚀 THE FIX: Smart Date Parser (Bypasses American Date Bug)
    function parseSmartDate(dateStr) {
        if (!dateStr) return new Date(0);
        dateStr = String(dateStr).trim();
        // Detects DD/MM/YYYY or DD-MM-YYYY
        let parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (parts) return new Date(parts[3], parts[2] - 1, parts[1]);
        return new Date(dateStr);
    }

    if (!globalJobData || globalJobData.length === 0) return;

    // --- 1. PROCESS JOBS ---
    globalJobData.forEach(row => {
        let rawName = String(row[2] || '').trim();
        let normKey = normalizeKey(rawName); // Force UPPERCASE for strict matching
        
        if(!normKey || normKey === 'UNKNOWN') return;
        
        let timeStr = String(row[0] || '');
        if (!checkDateFilter(timeStr, timeFilter, customDate)) return;

        let drivenKm = cleanNumber(row[12]);
        let rev = cleanNumber(row[15]);
        let jobDate = parseSmartDate(timeStr);

        if (!driverStats[normKey]) {
            driverStats[normKey] = { name: rawName, km: 0, jobs: 0, events: 0, lastSeen: new Date(0) };
        }

        if (drivenKm > 0) {
            totalKm += drivenKm;
            totalJobs++;
            totalRevenue += rev;
            activeDrivers.add(normKey);
            
            driverStats[normKey].km += drivenKm;
            driverStats[normKey].jobs += 1;
            
            if (!isNaN(jobDate.getTime()) && jobDate > driverStats[normKey].lastSeen) {
                driverStats[normKey].lastSeen = jobDate;
            }
        }
    });

    let filteredEventsCount = 0;
    
    // --- 2. PROCESS EVENTS ---
    if (globalEventData && globalEventData.rows && globalEventData.headers) {
        let headers = globalEventData.headers;
        let driverCols = [];
        
        for (let i = 6; i < headers.length; i++) {
            let dName = String(headers[i] || '').trim();
            let normKey = normalizeKey(dName);
            if (normKey && normKey !== 'UNKNOWN' && !normKey.includes('ATTENDANCE')) {
                driverCols.push({ index: i, name: dName, normKey: normKey });
            }
        }

        globalEventData.rows.forEach(row => {
            let dateStr = String(row[1] || '');
            if (dateStr.trim() === '') return;
            
            if (checkDateFilter(dateStr, timeFilter, customDate)) {
                filteredEventsCount++;
                let evDate = parseSmartDate(dateStr);
                
                driverCols.forEach(dc => {
                    let val = String(row[dc.index] || '').replace(/["']/g, '').trim().toUpperCase();
                    
                    if (val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓' || val === '✔' || val === '☑' || val === 'CHECKED') {
                        if (!driverStats[dc.normKey]) {
                            driverStats[dc.normKey] = { name: dc.name, km: 0, jobs: 0, events: 0, lastSeen: new Date(0) };
                        }
                        driverStats[dc.normKey].events++;
                        
                        // 🚀 NEW: Attending an event counts as active!
                        if (!isNaN(evDate.getTime()) && evDate > driverStats[dc.normKey].lastSeen) {
                            driverStats[dc.normKey].lastSeen = evDate;
                        }
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

    // --- 3. SEPARATE ACTIVE & PAST MEMBERS ---
    let kmLeaderboard = [];
    let eventLeaderboard = [];
    let hallOfFame = [];

    for (let key in driverStats) {
        let stats = driverStats[key];
        
        // Prevent accidental future dates from breaking the system
        let lastSeenTime = stats.lastSeen.getTime();
        if (lastSeenTime > today.getTime()) lastSeenTime = today.getTime();
        
        let timeSinceLastActivity = today.getTime() - lastSeenTime;

        if (timeSinceLastActivity > thirtyDaysMs || lastSeenTime === 0) {
            hallOfFame.push({ name: stats.name, km: stats.km, jobs: stats.jobs, events: stats.events });
        } else {
            if (stats.km > 0) kmLeaderboard.push({ name: stats.name, km: stats.km, jobs: stats.jobs });
            if (stats.events > 0) eventLeaderboard.push({ name: stats.name, events: stats.events });
        }
    }

    kmLeaderboard.sort((a, b) => b.km - a.km);
    eventLeaderboard.sort((a, b) => b.events - a.events);
    hallOfFame.sort((a, b) => b.km - a.km);

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
        html = `<div class="h-full flex flex-col items-center justify-center opacity-50"><i data-lucide="database" class="w-8 h-8 text-tntc-textSecondary mb-2"></i><p class="text-xs font-bold text-tntc-textSecondary uppercase tracking-widest">No Data Found</p></div>`;
    } else {
        data.slice(0, 10).forEach((item, index) => {
            // Dynamic Rank Badges (Gold, Silver, Bronze, Standard)
            let rankBadge = "";
            let cardStyle = "bg-white/[0.02] border-white/5 hover:border-tntc-muted/40 hover:bg-white/[0.04]";
            
            if (index === 0) { 
                // 1st Place - Gold
                rankBadge = `<div class="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] shrink-0"><span class="text-xs font-black text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,1)]">1</span></div>`;
                cardStyle = "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30 hover:border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.05)]";
            } else if (index === 1) { 
                // 2nd Place - Silver
                rankBadge = `<div class="w-8 h-8 rounded-full bg-slate-300/20 border border-slate-300/50 flex items-center justify-center shadow-[0_0_15px_rgba(203,213,225,0.4)] shrink-0"><span class="text-xs font-black text-slate-300 drop-shadow-[0_0_5px_rgba(203,213,225,1)]">2</span></div>`;
                cardStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30 hover:border-slate-400/60 shadow-[0_0_15px_rgba(203,213,225,0.05)]";
            } else if (index === 2) { 
                // 3rd Place - Bronze
                rankBadge = `<div class="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-600/50 flex items-center justify-center shadow-[0_0_15px_rgba(217,119,6,0.4)] shrink-0"><span class="text-xs font-black text-amber-500 drop-shadow-[0_0_5px_rgba(217,119,6,1)]">3</span></div>`;
                cardStyle = "bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/30 hover:border-amber-600/60 shadow-[0_0_15px_rgba(217,119,6,0.05)]";
            } else { 
                // Standard Ranking
                rankBadge = `<div class="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center shrink-0"><span class="text-xs font-black text-tntc-textSecondary">#${index + 1}</span></div>`;
            }
            
            let valStr = type === 'km' 
                ? `<span class="text-tntc-distance font-mono font-black drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] text-sm whitespace-nowrap">${item.km.toLocaleString()} km</span>` 
                : `<span class="text-tntc-accent font-black drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] text-sm whitespace-nowrap">${item.events} Events</span>`;
            let subStr = type === 'km' ? `${item.jobs} Jobs` : ``;
            
            html += `
            <div class="flex items-center justify-between p-3.5 border rounded-xl transition-all duration-300 backdrop-blur-sm relative overflow-hidden group ${cardStyle}">
                <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div class="flex items-center gap-3.5 relative z-10 w-full">
                    ${rankBadge}
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-black text-tntc-textPrimary leading-tight group-hover:text-white transition-colors truncate tracking-wide">${item.name}</p>
                        ${subStr ? `<p class="text-[9px] text-tntc-textSecondary font-bold tracking-widest uppercase mt-0.5">${subStr}</p>` : ''}
                    </div>
                </div>
                <div class="relative z-10 pl-3">
                    ${valStr}
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderHallOfFame(elementId, data) {
    let container = document.getElementById(elementId);
    if (!container) return;
    
    let html = "";
    if(data.length === 0) {
        html = `<div class="h-full flex flex-col items-center justify-center opacity-50"><i data-lucide="ghost" class="w-8 h-8 text-tntc-textSecondary mb-2"></i><p class="text-xs font-bold text-tntc-textSecondary uppercase tracking-widest">No Past Members</p></div>`;
    } else {
        data.slice(0, 10).forEach(item => {
            let details = [];
            if(item.km > 0) details.push(`${item.km.toLocaleString()} km`);
            if(item.events > 0) details.push(`${item.events} Events`);
            
            html += `
            <div class="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl opacity-60 hover:opacity-100 transition-all duration-300 backdrop-blur-sm grayscale hover:grayscale-0 group relative overflow-hidden">
                <div class="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div class="flex items-center gap-3.5 relative z-10 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500/70 group-hover:text-red-500 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.1)] shrink-0">
                        <i data-lucide="user-minus" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-black text-tntc-textSecondary group-hover:text-tntc-textPrimary leading-tight transition-colors truncate tracking-wide">${item.name}</p>
                        <p class="text-[9px] text-tntc-textSecondary/60 font-mono tracking-widest mt-0.5 truncate uppercase font-bold">${details.join(' • ')}</p>
                    </div>
                </div>
                <span class="text-red-500/50 group-hover:text-red-500 group-hover:bg-red-500/10 text-[9px] font-black tracking-widest uppercase border border-red-500/20 px-2 py-1 rounded shadow-[0_0_10px_rgba(239,68,68,0)] group-hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all relative z-10 shrink-0 ml-2">Inactive</span>
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

    if (window.kmChartInstance) window.kmChartInstance.destroy();
    let kmCtx = document.getElementById('kmBarChart');
    if (kmCtx) {
        let grad = kmCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        grad.addColorStop(0, 'rgba(74,222,128,0.8)'); grad.addColorStop(1, 'rgba(74,222,128,0.2)');
        
        window.kmChartInstance = new Chart(kmCtx, {
            type: 'bar',
            data: {
                labels: kmTop5.map(d => { let parts = d.name.split(' '); return parts[0]; }), 
                datasets: [{ data: kmTop5.map(d => d.km), backgroundColor: grad, borderRadius: 4, barThickness: 40 }]
            },
            options: commonOptions
        });
    }

    if (window.eventChartInstance) window.eventChartInstance.destroy();
    let evCtx = document.getElementById('eventBarChart');
    if (evCtx) {
        let grad2 = evCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        grad2.addColorStop(0, 'rgba(56,189,248,0.8)'); grad2.addColorStop(1, 'rgba(56,189,248,0.2)');
        
        window.eventChartInstance = new Chart(evCtx, {
            type: 'bar',
            data: {
                labels: evTop5.map(d => { let parts = d.name.split(' '); return parts[0]; }),
                datasets: [{ data: evTop5.map(d => d.events), backgroundColor: grad2, borderRadius: 4, barThickness: 40 }]
            },
            options: commonOptions
        });
    }
}