let masterToursList = [];
let loadedTourData = {}; 

async function fetchTourData() {
    if (isTourDataFetched) return;
    if (typeof TOUR_SHEET_CSV_URL === 'undefined' || !TOUR_SHEET_CSV_URL) {
        document.getElementById('dynamic-campaign-container').innerHTML = `<div class="text-center py-20"><p class="text-tntc-admin font-bold tracking-widest uppercase text-xs">Missing Database Source Link.</p></div>`; return;
    }

    Papa.parse(TOUR_SHEET_CSV_URL, {
        download: true, header: false, skipEmptyLines: true,
        complete: async function(results) {
            let rows = results.data;
            if (!rows || rows.length <= 1) {
                document.getElementById('dynamic-campaign-container').innerHTML = 
                    `<div class="text-center p-12 bg-tntc-admin/10 border border-tntc-admin/30 rounded-3xl shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                        <i data-lucide="alert-triangle" class="w-10 h-10 text-tntc-admin mx-auto mb-4 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"></i>
                        <h3 class="text-tntc-admin font-black text-xl mb-2 tracking-wide uppercase">No Campaign Data Found</h3>
                        <p class="text-tntc-textSecondary text-xs">Admin command center must generate a manifest first.</p>
                    </div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons(); return;
            }

            masterToursList = [];
            for(let i=1; i<rows.length; i++) {
                if(!rows[i][0]) continue;
                masterToursList.push({ name: rows[i][0] || "Unnamed Tour", startDate: rows[i][1] || "TBD", endDate: rows[i][2] || "Ongoing", status: rows[i][3] || "LIVE", reason: rows[i][4] || "", banner: rows[i][5] || "https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80", gid: rows[i][6] || "" });
            }
            if (masterToursList.length === 0) { document.getElementById('dynamic-campaign-container').innerHTML = `<div class="text-center py-20"><p class="text-tntc-textSecondary font-bold tracking-widest uppercase text-xs">No active tours available right now.</p></div>`; return; }

            generateTourShells();
            for (let tour of masterToursList) { if (tour.gid) await fetchSpecificTourData(tour); }
            isTourDataFetched = true;
        },
        error: function() { document.getElementById('dynamic-campaign-container').innerHTML = `<p class="text-tntc-admin text-center py-20 font-bold uppercase tracking-widest text-xs">Network Link Severed.</p>`; }
    });
}

function generateTourShells() {
    let container = document.getElementById('dynamic-campaign-container');
    let html = ""; let role = sessionStorage.getItem('tntc_role'); let isAdmin = (role === 'leader' || role === 'admin');
    let today = new Date(); today.setHours(0, 0, 0, 0);

    masterToursList.forEach((tour, index) => {
        let safeId = "tour-" + index;
        let startDate = new Date(tour.startDate); startDate.setHours(0, 0, 0, 0); 
        let isValidDate = !isNaN(startDate.getTime()); let isComingSoon = isValidDate && startDate > today; let isLockedForUser = isComingSoon && !isAdmin;
        let displayDate = isValidDate ? startDate.toLocaleDateString() : "TBD";
        let displayEndDate = tour.endDate ? (isNaN(new Date(tour.endDate)) ? tour.endDate : new Date(tour.endDate).toLocaleDateString()) : 'Ongoing';
        
        let statusBadge = ""; let bannerOverlay = "";
        
        if (isComingSoon) {
            statusBadge = `<span class="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.3)] mb-4 inline-flex items-center gap-1.5 backdrop-blur-md"><i data-lucide="clock" class="w-3 h-3"></i> STANDBY</span>`;
            bannerOverlay = `<div class="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-5 rounded-2xl text-xs font-bold flex items-center gap-3 mb-8 shadow-[0_0_20px_rgba(59,130,246,0.1)] backdrop-blur-md"><i data-lucide="info" class="w-5 h-5 shrink-0"></i><p>This campaign officially begins on <span class="text-white font-black">${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>.</p></div>`;
        } else if (tour.status === "LIVE") {
            statusBadge = `<span class="bg-tntc-distance/10 border border-tntc-distance/30 text-tntc-distance px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(74,222,128,0.3)] mb-4 inline-flex items-center gap-1.5 backdrop-blur-md"><span class="w-2 h-2 rounded-full bg-tntc-distance animate-pulse"></span> LIVE CAMPAIGN</span>`;
            bannerOverlay = `<div class="bg-tntc-distance/10 border border-tntc-distance/30 text-tntc-distance p-5 rounded-2xl text-xs font-bold flex items-center justify-between mb-8 shadow-[0_0_20px_rgba(74,222,128,0.1)] relative overflow-hidden backdrop-blur-md"><div class="flex items-center gap-3 relative z-10"><i data-lucide="satellite-dish" class="w-5 h-5"></i><p>The campaign is <span class="text-white font-black tracking-wide uppercase">Officially Live!</span> Start logging your deliveries.</p></div></div>`;
        } else if (tour.status === "PAUSED") {
            statusBadge = `<span class="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.3)] mb-4 inline-flex items-center gap-1.5 backdrop-blur-md"><i data-lucide="pause-circle" class="w-3 h-3"></i> HALTED</span>`;
            bannerOverlay = `<div class="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-5 rounded-2xl text-xs font-bold flex items-center gap-3 mb-8 shadow-[0_0_20px_rgba(234,179,8,0.1)] backdrop-blur-md"><i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i><p>Campaign Halted: <span class="text-white font-normal">${tour.reason}</span></p></div>`;
        } else if (tour.status === "ENDED") {
            statusBadge = `<span class="bg-tntc-admin/10 border border-tntc-admin/30 text-tntc-admin px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.3)] mb-4 inline-flex items-center gap-1.5 backdrop-blur-md"><i data-lucide="flag" class="w-3 h-3"></i> CONCLUDED</span>`;
            bannerOverlay = `<div class="bg-tntc-admin/10 border border-tntc-admin/30 text-tntc-admin p-5 rounded-2xl text-xs font-bold flex items-center gap-3 mb-8 shadow-[0_0_20px_rgba(244,63,94,0.1)] backdrop-blur-md"><i data-lucide="shield-alert" class="w-5 h-5 shrink-0"></i><p>Tour Ended: <span class="text-white font-normal">${tour.reason}</span></p></div>`;
        }

        html += `
        <div class="mb-12 relative">
            <div onclick="toggleCampaign('${safeId}', ${isLockedForUser})" class="cursor-pointer group relative bg-slate-900/40 backdrop-blur-xl border ${tour.status==='LIVE' && !isComingSoon ? 'border-tntc-distance/50 shadow-[0_0_30px_rgba(74,222,128,0.15)] hover:border-tntc-distance' : 'border-white/10 shadow-xl hover:border-white/30'} rounded-3xl overflow-hidden transition-all duration-300 mb-6">
                <div class="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" style="background-image: url('${tour.banner}')"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/90 to-transparent"></div>
                
                <div class="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div>
                        ${statusBadge}
                        <h2 class="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-3 drop-shadow-lg">${tour.name}</h2>
                        <p class="text-tntc-textSecondary text-[10px] font-mono font-bold flex items-center gap-4 bg-[#05070a]/50 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md w-fit">
                            <span><i data-lucide="calendar" class="w-3 h-3 inline mr-1 text-tntc-accent"></i> ${displayDate}</span>
                            <span><i data-lucide="flag" class="w-3 h-3 inline mr-1 text-tntc-admin"></i> ${displayEndDate}</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2 ${isLockedForUser ? 'text-tntc-admin border-tntc-admin/30 group-hover:bg-tntc-admin group-hover:text-white' : 'text-tntc-accent border-tntc-accent/30 group-hover:bg-tntc-accent group-hover:text-[#05070a] shadow-[0_0_15px_rgba(56,189,248,0.2)]'} font-black text-[10px] uppercase tracking-widest bg-black/60 px-5 py-3 rounded-xl border backdrop-blur-md transition-all">
                        <span id="${safeId}-toggle-text">${isLockedForUser ? 'Manifest Locked' : 'View Manifest'}</span>
                        ${isLockedForUser ? `<i data-lucide="lock" class="w-4 h-4 ml-1"></i>` : `<i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300" id="${safeId}-chevron"></i>`}
                    </div>
                </div>
                
                <div class="px-8 md:px-10 pb-10 relative z-10">
                    <div class="flex justify-between text-[10px] font-black text-tntc-textSecondary mb-2 uppercase tracking-widest"><span id="prog-title-${safeId}">Global Division Progress</span><span id="prog-txt-${safeId}">Loading...</span></div>
                    <div class="w-full bg-black/60 border border-white/10 rounded-full h-3.5 shadow-inner relative overflow-hidden backdrop-blur-md">
                        <div id="prog-bar-${safeId}" class="bg-gradient-to-r from-tntc-distance to-emerald-300 h-full rounded-full transition-all duration-[1500ms] ease-out relative shadow-[0_0_10px_rgba(74,222,128,0.8)]" style="width: 0%;"></div>
                    </div>
                </div>
            </div> 

            ${bannerOverlay}

            <div id="${safeId}-content" class="collapse-content">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-tntc-accent/30 shadow-[0_0_20px_rgba(56,189,248,0.05)] flex flex-col justify-center">
                        <label class="text-tntc-accent text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 drop-shadow-md"><i data-lucide="filter" class="w-3.5 h-3.5"></i> Filter Manifest Target</label>
                        <select id="tour-filter-${safeId}" onchange="renderTourManifest('${safeId}')" class="w-full bg-[#05070a]/80 border border-white/10 text-white text-xs font-bold rounded-xl p-3 outline-none focus:border-tntc-accent focus:ring-2 focus:ring-tntc-accent/50 transition-all shadow-inner">
                            <option value="ALL">All Drivers (Global View)</option>
                        </select>
                    </div>
                    <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[9px] font-black uppercase tracking-widest mb-2">Routes Cleared</p><h2 class="text-3xl font-black text-tntc-accent drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"><span id="stat-routes-${safeId}">0</span> <span class="text-xs font-bold text-tntc-textSecondary">/ <span id="stat-tot-routes-${safeId}">0</span></span></h2></div>
                    <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[9px] font-black uppercase tracking-widest mb-2">Distance Covered</p><h2 class="text-3xl font-black text-tntc-distance drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"><span id="stat-dist-${safeId}">0</span> <span class="text-xs font-bold text-tntc-textSecondary">km</span></h2></div>
                    <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[9px] font-black uppercase tracking-widest mb-2">Target Goal</p><h2 class="text-3xl font-black text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"><span id="stat-targ-${safeId}">0</span> <span class="text-xs font-bold text-tntc-textSecondary">km</span></h2></div>
                </div>

                <div class="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="bg-black/60 text-tntc-textSecondary text-[10px] font-black uppercase tracking-widest border-b border-white/10">
                                    <th class="p-5 w-16 text-center">No.</th>
                                    <th class="p-5">Routing Details</th>
                                    <th class="p-5">Target KM</th>
                                    <th class="p-5 text-center">Status</th>
                                    <th class="p-5 text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody id="table-${safeId}" class="text-xs divide-y divide-white/5 font-medium">
                                <tr><td colspan="5" class="p-10 text-center text-tntc-textSecondary"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-tntc-accent inline-block align-middle mr-2"></div> Extracting routing data...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function fetchSpecificTourData(tourObj) {
    return new Promise((resolve) => {
        let isResolved = false;
        const safeResolve = () => { if(!isResolved) { isResolved = true; resolve(); } };
        setTimeout(safeResolve, 4000); 

        let index = masterToursList.indexOf(tourObj);
        let safeId = "tour-" + index;
        
        let specificUrl = TOUR_SHEET_CSV_URL;
        if (specificUrl.includes("gid=")) specificUrl = specificUrl.replace(/gid=[0-9]+/, 'gid=' + tourObj.gid);
        else specificUrl += (specificUrl.includes('?') ? '&' : '?') + 'gid=' + tourObj.gid;

        Papa.parse(specificUrl, {
            download: true, header: false, skipEmptyLines: true,
            complete: function(results) {
                try {
                    let data = results.data;
                    if(!data || data.length < 2 || String(data[0][0]).includes('<html')) return; 
                    
                    let headers = data[0]; let driverCols = []; let seenDrivers = new Set();
                    for (let i = 7; i < headers.length; i++) {
                        let dName = headers[i] ? String(headers[i]).trim() : "";
                        if (dName && dName.toUpperCase() !== 'UNKNOWN' && !dName.toUpperCase().includes('ATTENDANCE')) {
                            if(!seenDrivers.has(dName)) { seenDrivers.add(dName); driverCols.push({ index: i, name: dName }); }
                        }
                    }

                    let routesData = []; let totalBaseDist = 0;
                    for(let r=1; r<data.length; r++) {
                        let row = data[r];
                        if (!row || row.length < 6) continue;
                        if (row[1] === 'Start' || row[1] === 'Start City') continue;

                        let sNo = row[0]; let src = row[1]; let srcCo = row[2]; let dst = row[3]; let dstCo = row[4];
                        let dist = parseInt(String(row[5]).replace(/[^\d.-]/g, '')) || 0;
                        totalBaseDist += dist;
                        
                        let completedBy = [];
                        driverCols.forEach(dc => {
                            let val = String(row[dc.index] || '').replace(/["']/g, '').trim().toUpperCase();
                            if(val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓') completedBy.push(dc.name);
                        });
                        let routeImg = row[6] && String(row[6]).startsWith('http') ? row[6] : tourObj.banner;
                        routesData.push({ sNo: sNo, src: src, srcCo: srcCo, dst: dst, dstCo: dstCo, dist: dist, routeImg: routeImg, completedBy: completedBy });
                    }

                    loadedTourData[safeId] = { tourObj: tourObj, drivers: driverCols.map(dc => dc.name).sort(), routes: routesData, baseTargetDist: totalBaseDist };

                    let selectEl = document.getElementById(`tour-filter-${safeId}`);
                    if (selectEl) {
                        loadedTourData[safeId].drivers.forEach(d => { selectEl.innerHTML += `<option value="${d}">${d}</option>`; });
                        let trackerName = sessionStorage.getItem('tntc_tracker');
                        if (trackerName) {
                            let targetOpt = loadedTourData[safeId].drivers.find(d => d.toUpperCase() === trackerName.toUpperCase());
                            if (targetOpt) selectEl.value = targetOpt;
                        }
                    }
                    renderTourManifest(safeId);
                } catch(err) {} finally { safeResolve(); }
            },
            error: function() { safeResolve(); }
        });
    });
}

function renderTourManifest(safeId) {
    let tourData = loadedTourData[safeId]; if (!tourData) return;
    let selectEl = document.getElementById(`tour-filter-${safeId}`);
    let selectedDriver = selectEl ? selectEl.value : "ALL";
    let numDrivers = tourData.drivers.length > 0 ? tourData.drivers.length : 1;

    let targetRoutes = 0; let targetDist = 0; let routesCompleted = 0; let distanceCovered = 0; let tableHtml = "";

    if (selectedDriver === "ALL") { targetRoutes = tourData.routes.length * numDrivers; targetDist = tourData.baseTargetDist * numDrivers; } 
    else { targetRoutes = tourData.routes.length; targetDist = tourData.baseTargetDist; }

    tourData.routes.forEach(route => {
        let statusBadge = ""; let isCompletedForIndividual = false;

        if (selectedDriver === "ALL") {
            let completions = route.completedBy.length; routesCompleted += completions; distanceCovered += (completions * route.dist);
            if (completions === 0) statusBadge = `<span class="bg-white/5 text-tntc-textSecondary border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"><i data-lucide="clock" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Pending</span>`;
            else if (completions === numDrivers) statusBadge = `<span class="bg-tntc-distance/10 text-tntc-distance border border-tntc-distance/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(74,222,128,0.2)]"><i data-lucide="check-circle-2" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Fully Cleared</span>`;
            else statusBadge = `<span class="bg-tntc-accent/10 text-tntc-accent border border-tntc-accent/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(56,189,248,0.2)]"><i data-lucide="users" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> ${completions}/${numDrivers} Cleared</span>`;
        } else {
            isCompletedForIndividual = route.completedBy.includes(selectedDriver);
            if (isCompletedForIndividual) { routesCompleted++; distanceCovered += route.dist; }
            statusBadge = isCompletedForIndividual 
                ? `<span class="bg-tntc-distance/10 text-tntc-distance border border-tntc-distance/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(74,222,128,0.2)]"><i data-lucide="check-circle-2" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Cleared</span>` 
                : `<span class="bg-white/5 text-tntc-textSecondary border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"><i data-lucide="clock" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Pending</span>`;
        }

        let isRowHighlighted = selectedDriver === "ALL" ? route.completedBy.length > 0 : isCompletedForIndividual;
        let safeTourName = tourData.tourObj.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        tableHtml += `
        <tr class="hover:bg-white/5 transition-colors group">
            <td class="p-5 text-center text-tntc-textSecondary font-black text-sm border-l-2 border-transparent ${isRowHighlighted ? 'group-hover:border-tntc-distance text-tntc-distance' : 'group-hover:border-tntc-textSecondary'}">${route.sNo}</td>
            <td class="p-5">
                <div class="flex flex-col">
                    <span class="text-white font-black text-sm truncate max-w-[250px] tracking-wide" title="${route.src} -> ${route.dst}">${route.src} <i data-lucide="arrow-right" class="w-3 h-3 inline text-tntc-accent mx-1 opacity-50"></i> ${route.dst}</span>
                    <span class="text-tntc-textSecondary text-[10px] font-bold mt-1 truncate max-w-[250px] uppercase tracking-wider">${route.srcCo} -> ${route.dstCo}</span>
                </div>
            </td>
            <td class="p-5 text-white font-mono font-black text-sm">${route.dist.toLocaleString()} <span class="text-[9px] text-tntc-textSecondary ml-0.5">KM</span></td>
            <td class="p-5 text-center">${statusBadge}</td>
            <td class="p-5 text-right">
                <button onclick="openCampModal('${safeTourName}', ${route.sNo}, '${route.src}', '${route.srcCo}', '${route.dst}', '${route.dstCo}', ${route.dist}, '${route.routeImg}', ${JSON.stringify(route.completedBy).replace(/"/g, '&quot;')}, ${numDrivers})" class="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-tntc-accent/10 hover:border-tntc-accent/50 rounded-xl text-[10px] font-black text-white hover:text-tntc-accent uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-md">
                    <i data-lucide="scan" class="w-3.5 h-3.5 text-tntc-accent"></i> View
                </button>
            </td>
        </tr>`;
    });

    if(typeof updateDOMIfChanged === 'function') updateDOMIfChanged(`table-${safeId}`, tableHtml); 
    else { document.getElementById(`table-${safeId}`).innerHTML = tableHtml; if (typeof lucide !== 'undefined') lucide.createIcons(); }
    
    document.getElementById(`stat-routes-${safeId}`).innerText = routesCompleted;
    document.getElementById(`stat-tot-routes-${safeId}`).innerText = targetRoutes;
    document.getElementById(`stat-targ-${safeId}`).innerText = targetDist.toLocaleString();
    
    if(typeof animateValue === 'function') animateValue(`stat-dist-${safeId}`, parseInt(document.getElementById(`stat-dist-${safeId}`).innerText.replace(/,/g,'')) || 0, distanceCovered, 1000);
    else document.getElementById(`stat-dist-${safeId}`).innerText = distanceCovered.toLocaleString();
    
    let percent = targetDist > 0 ? Math.min(100, (distanceCovered / targetDist) * 100) : 0;
    let displayPercent = percent % 1 === 0 ? percent : percent.toFixed(1); 
    
    document.getElementById(`prog-title-${safeId}`).innerText = selectedDriver === "ALL" ? "GLOBAL DIVISION PROGRESS" : `${selectedDriver}'S PROGRESS`;
    document.getElementById(`prog-txt-${safeId}`).innerText = displayPercent + "%";
    document.getElementById(`prog-bar-${safeId}`).style.width = percent + "%";
}

function toggleCampaign(id, isLocked) {
    if (isLocked) {
        let existingAlert = document.getElementById(id + "-alert");
        if (existingAlert) existingAlert.remove();
        else {
            let headerCard = document.querySelector(`[onclick="toggleCampaign('${id}', true)"]`);
            if (headerCard) {
                let alertDiv = document.createElement("div"); alertDiv.id = id + "-alert";
                alertDiv.className = "bg-tntc-admin/10 border border-tntc-admin/30 text-tntc-admin px-6 py-4 rounded-2xl text-xs font-bold mt-4 flex items-center gap-4 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.15)] backdrop-blur-md";
                alertDiv.innerHTML = `<i data-lucide="shield-alert" class="w-6 h-6 shrink-0 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"></i> <div><span class="block uppercase tracking-widest text-[9px] mb-1 font-black">Access Denied</span>The route manifest is secured until campaign commencement.</div>`;
                headerCard.parentElement.insertBefore(alertDiv, headerCard.nextSibling);
                if (typeof lucide !== 'undefined') lucide.createIcons();
                setTimeout(() => { if(document.getElementById(id + "-alert")) document.getElementById(id + "-alert").remove(); }, 4000);
            }
        }
        return;
    }
    let content = document.getElementById(id + "-content"); let chevron = document.getElementById(id + "-chevron"); let toggleText = document.getElementById(id + "-toggle-text");
    if (!content) return;
    if (content.classList.contains("expanded")) { content.classList.remove("expanded"); if(chevron) chevron.style.transform = "rotate(0deg)"; if(toggleText) toggleText.innerText = "View Manifest"; } 
    else { content.classList.add("expanded"); if(chevron) chevron.style.transform = "rotate(180deg)"; if(toggleText) toggleText.innerText = "Hide Manifest"; }
}

function openCampModal(tourName, sNo, src, srcCo, dst, dstCo, dist, imgUrl, completedDriversArr, totalDriversCount) {
    document.getElementById('campModalId').textContent = `#${sNo} - ${tourName}`;
    document.getElementById('campModalSource').textContent = src; document.getElementById('campModalDest').textContent = dst;
    document.getElementById('campModalDist').textContent = dist.toLocaleString();
    if(document.getElementById('campModalSrcCo')) document.getElementById('campModalSrcCo').textContent = srcCo;
    if(document.getElementById('campModalDstCo')) document.getElementById('campModalDstCo').textContent = dstCo;
    if(document.getElementById('campModalHeader')) document.getElementById('campModalHeader').style.backgroundImage = `url('${imgUrl}')`;
    
    let html = "";
    if (completedDriversArr.length > 0) {
        completedDriversArr.forEach(d => {
            html += `<span class="bg-tntc-distance/10 border border-tntc-distance/30 text-tntc-distance px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(74,222,128,0.2)] flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3 h-3"></i> ${d}</span>`;
        });
    } else { html = `<p class="text-tntc-textSecondary text-xs font-bold uppercase tracking-widest w-full p-4 bg-black/40 rounded-xl border border-white/5 text-center">Awaiting operative completion.</p>`; }
    
    document.getElementById('campModalDriversList').innerHTML = html;
    document.getElementById('campModalCount').textContent = completedDriversArr.length;
    if(document.getElementById('campModalTotalDrivers')) document.getElementById('campModalTotalDrivers').textContent = totalDriversCount;
    
    let modal = document.getElementById('campaignModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); requestAnimationFrame(() => { modal.classList.remove('modal-closed'); modal.classList.add('modal-open'); }); }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function populateManageToursDropdown() {
    let select = document.getElementById('manageTourSelect'); if (!select) return;
    if (masterToursList.length === 0) { select.innerHTML = '<option value="">No campaigns available</option>'; return; }
    let html = '<option value="">-- Select a Campaign --</option>';
    masterToursList.forEach(t => { let emoji = t.status === 'LIVE' ? '🟢' : t.status === 'PAUSED' ? '🟡' : '🔴'; html += `<option value="${t.name}">${emoji} ${t.name} (Launch: ${new Date(t.startDate).toLocaleDateString()})</option>`; });
    select.innerHTML = html;
}