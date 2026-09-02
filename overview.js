// ==========================================
// OVERVIEW.JS - VTC Dashboard Analytics
// ==========================================

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
    
    // Smart Date Parser (Bypasses American Date Bug)
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
        let normKey = typeof normalizeKey === 'function' ? normalizeKey(rawName) : rawName.toUpperCase();
        
        if(!normKey || normKey === 'UNKNOWN') return;
        
        let timeStr = String(row[0] || '');
        if (typeof checkDateFilter === 'function' && !checkDateFilter(timeStr, timeFilter, customDate)) return;

        let drivenKm = typeof cleanNumber === 'function' ? cleanNumber(row[12]) : parseFloat(String(row[12]).replace(/[^0-9.-]/g, '')) || 0;
        let rev = typeof cleanNumber === 'function' ? cleanNumber(row[15]) : parseFloat(String(row[15]).replace(/[^0-9.-]/g, '')) || 0;
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
    if (typeof globalEventData !== 'undefined' && globalEventData.rows && globalEventData.headers) {
        let headers = globalEventData.headers;
        let driverCols = [];
        
        for (let i = 6; i < headers.length; i++) {
            let dName = String(headers[i] || '').trim();
            let normKey = typeof normalizeKey === 'function' ? normalizeKey(dName) : dName.toUpperCase();
            if (normKey && normKey !== 'UNKNOWN' && !normKey.includes('ATTENDANCE')) {
                driverCols.push({ index: i, name: dName, normKey: normKey });
            }
        }

        globalEventData.rows.forEach(row => {
            let dateStr = String(row[1] || '');
            if (dateStr.trim() === '') return;
            
            if (typeof checkDateFilter === 'function' && checkDateFilter(dateStr, timeFilter, customDate)) {
                filteredEventsCount++;
                let evDate = parseSmartDate(dateStr);
                
                driverCols.forEach(dc => {
                    let val = String(row[dc.index] || '').replace(/["']/g, '').trim().toUpperCase();
                    
                    if (val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓' || val === '✔' || val === '☑' || val === 'CHECKED') {
                        if (!driverStats[dc.normKey]) {
                            driverStats[dc.normKey] = { name: dc.name, km: 0, jobs: 0, events: 0, lastSeen: new Date(0) };
                        }
                        driverStats[dc.normKey].events++;
                        
                        // Attending an event counts as active
                        if (!isNaN(evDate.getTime()) && evDate > driverStats[dc.normKey].lastSeen) {
                            driverStats[dc.normKey].lastSeen = evDate;
                        }
                    }
                });
            }
        });
    }

    if(typeof animateValue === 'function') {
        animateValue('statDistance', parseInt(document.getElementById('statDistance').innerText.replace(/,/g,'')) || 0, totalKm, 1000);
        animateValue('statJobs', parseInt(document.getElementById('statJobs').innerText) || 0, totalJobs, 1000);
        animateValue('statRevenue', parseInt(document.getElementById('statRevenue').innerText.replace(/,/g,'')) || 0, totalRevenue, 1000);
    } else {
        document.getElementById('statDistance').innerText = totalKm.toLocaleString();
        document.getElementById('statJobs').innerText = totalJobs.toLocaleString();
        document.getElementById('statRevenue').innerText = totalRevenue.toLocaleString();
    }
    
    let statDriversEl = document.getElementById('statDrivers');
    if (statDriversEl) statDriversEl.innerText = activeDrivers.size;
    
    let statEventsEl = document.getElementById('statEvents');
    if (statEventsEl) statEventsEl.innerText = filteredEventsCount;

    // --- 3. SEPARATE ACTIVE & PAST MEMBERS ---
    let kmLeaderboard = [];
    let eventLeaderboard = [];
    let hallOfFame = [];

    for (let key in driverStats) {
        let stats = driverStats[key];
        
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

    // Call the new Custom DOM Chart generator
    renderCustomOverview(kmLeaderboard, eventLeaderboard);
}

/**
 * Generates custom HTML/Tailwind 3D Vertical Bars and Horizontal Progress Bars
 * Replaces Chart.js entirely with DOM-based styled elements.
 * 
 * @param {Array} distanceData - Array of top distance drivers [{name: 'Name', km: 5000, jobs: 20}]
 * @param {Array} attendanceData - Array of top event drivers [{name: 'Name', events: 15}]
 */
function renderCustomOverview(distanceData, attendanceData) {
    const distanceContainer = document.getElementById('distance-chart-container');
    const attendanceContainer = document.getElementById('attendance-leaderboard-container');

    // ==========================================
    // LEFT PANEL: 3D VERTICAL CYLINDER CHART
    // ==========================================
    if (distanceContainer) {
        const topDist = distanceData.slice(0, 5);
        const maxKm = Math.max(...topDist.map(d => d.km), 1);
        let distHtml = "";

        if (topDist.length === 0) {
            distHtml = `<div class="w-full h-full flex items-center justify-center text-tntc-textSecondary text-xs font-bold tracking-widest uppercase">No Analytics Available</div>`;
        } else {
            let colsHtml = topDist.map(item => {
                let hPercent = Math.max((item.km / maxKm) * 100, 8); // Floor at 8% so lid renders well
                let shortName = item.name.split(' ')[0]; 

                return `
                <div class="flex flex-col items-center h-full justify-end group w-1/5 max-w-[4rem]">
                    <!-- The 3D Bar -->
                    <div class="w-full relative rounded-b-full bg-gradient-to-t from-emerald-400 to-transparent transition-all duration-1000 ease-out group-hover:from-cyan-400 group-hover:shadow-[0_0_15px_#22d3ee]" style="height: ${hPercent}%;">
                        <!-- 3D Lid (Cylindrical Opening Effect) -->
                        <div class="absolute -top-1.5 left-0 w-full h-3 rounded-[50%] bg-cyan-400 shadow-[0_0_12px_#22d3ee]"></div>
                    </div>
                    
                    <!-- Metadata Below Bar -->
                    <div class="flex flex-col items-center gap-1.5 mt-4">
                        <span class="text-xs font-black text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">${item.km.toLocaleString()}</span>
                        <div class="w-8 h-8 rounded bg-white/10 flex items-center justify-center shadow-inner border border-white/5 group-hover:border-cyan-400/50 transition-colors">
                            <i data-lucide="user" class="w-4 h-4 text-cyan-400 drop-shadow-[0_0_5px_#22d3ee]"></i>
                        </div>
                        <span class="text-[9px] text-tntc-textSecondary uppercase tracking-widest truncate w-full text-center group-hover:text-white transition-colors">${shortName}</span>
                    </div>
                </div>`;
            }).join('');

            distHtml = `<div class="h-64 flex justify-around items-end w-full px-2 mt-auto relative z-10">${colsHtml}</div>`;
        }
        distanceContainer.innerHTML = distHtml;
    }

    // ==========================================
    // RIGHT PANEL: HORIZONTAL PROGRESS LEADERBOARD
    // ==========================================
    if (attendanceContainer) {
        const topAtt = attendanceData.slice(0, 5); // Fallback to top 5
        const maxEvents = Math.max(...topAtt.map(d => d.events), 1);
        let attHtml = "";

        if (topAtt.length === 0) {
            attHtml = `<div class="w-full h-full flex items-center justify-center text-tntc-textSecondary text-xs font-bold tracking-widest uppercase">No Events Logged</div>`;
        } else {
            attHtml = topAtt.map((item, index) => {
                let wPercent = Math.max((item.events / maxEvents) * 100, 2); // Floor at 2%

                return `
                <div class="w-full group mb-5 last:mb-0">
                    <!-- Text Header -->
                    <div class="flex justify-between items-end mb-2">
                        <div class="flex items-center gap-4">
                            <span class="text-2xl font-black text-cyan-400 drop-shadow-[0_0_8px_#22d3ee] w-6 text-center">${index + 1}</span>
                            <div class="w-px h-8 bg-white/10 group-hover:bg-cyan-400/50 transition-colors"></div>
                            <div>
                                <h4 class="text-sm text-white font-black uppercase tracking-wider group-hover:text-cyan-400 transition-colors">${item.name}</h4>
                                <p class="text-[9px] text-tntc-textSecondary uppercase tracking-widest">Rank #${index + 1} Elite</p>
                            </div>
                        </div>
                        <span class="text-emerald-400 font-mono font-black drop-shadow-[0_0_5px_#34d399] text-lg">${item.events.toLocaleString()}</span>
                    </div>
                    
                    <!-- Progress Track & Fill -->
                    <div class="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden relative">
                        <div class="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_#34d399] rounded-full transition-all duration-1000 ease-out" style="width: ${wPercent}%;"></div>
                    </div>
                </div>`;
            }).join('');
        }
        attendanceContainer.innerHTML = attHtml;
    }

    // Refresh Lucide icons within newly generated DOM
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderLeaderboardList(elementId, data, type) {
    let container = document.getElementById(elementId);
    if (!container) return;
    
    let html = `
        <style>
            @keyframes slideInUp { 
                from { opacity: 0; transform: translateY(20px); } 
                to { opacity: 1; transform: translateY(0); } 
            }
        </style>
    `;

    if(data.length === 0) {
        html += `<div class="h-full flex flex-col items-center justify-center opacity-50" style="animation: slideInUp 0.4s ease-out forwards;"><i data-lucide="database" class="w-8 h-8 text-tntc-textSecondary mb-2"></i><p class="text-xs font-bold text-tntc-textSecondary uppercase tracking-widest">No Data Found</p></div>`;
    } else {
        data.slice(0, 10).forEach((item, index) => {
            let rankBadge = "";
            let cardStyle = "bg-white/[0.02] border-white/5 hover:border-tntc-accent/30";
            
            if (index === 0) { 
                rankBadge = `<div class="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] shrink-0"><i data-lucide="crown" class="w-4 h-4 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,1)]"></i></div>`;
                cardStyle = "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)] border-l-2 border-l-yellow-500";
            } else if (index === 1) { 
                rankBadge = `<div class="w-8 h-8 rounded-full bg-slate-300/10 border border-slate-300/50 flex items-center justify-center shadow-[0_0_15px_rgba(203,213,225,0.4)] shrink-0"><i data-lucide="medal" class="w-4 h-4 text-slate-300 drop-shadow-[0_0_5px_rgba(203,213,225,1)]"></i></div>`;
                cardStyle = "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30 shadow-[0_0_15px_rgba(203,213,225,0.05)] border-l-2 border-l-slate-300";
            } else if (index === 2) { 
                rankBadge = `<div class="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] shrink-0"><i data-lucide="award" class="w-4 h-4 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,1)]"></i></div>`;
                cardStyle = "bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.05)] border-l-2 border-l-orange-500";
            } else { 
                rankBadge = `<div class="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center shrink-0"><span class="text-xs font-black text-tntc-textSecondary">#${index + 1}</span></div>`;
            }
            
            let valStr = type === 'km' 
                ? `<span class="text-tntc-distance font-mono font-black drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] text-sm whitespace-nowrap">${item.km.toLocaleString()} km</span>` 
                : `<span class="text-tntc-accent font-black drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] text-sm whitespace-nowrap">${item.events} Events</span>`;
            let subStr = type === 'km' ? `${item.jobs} Jobs` : ``;
            
            html += `
            <div class="flex items-center justify-between p-3.5 border rounded-xl transition-all duration-300 backdrop-blur-sm relative overflow-hidden group ${cardStyle} hover:scale-[1.02] hover:bg-white/5" style="animation: slideInUp 0.4s ease-out forwards; animation-delay: ${index * 100}ms; opacity: 0;">
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
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
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
