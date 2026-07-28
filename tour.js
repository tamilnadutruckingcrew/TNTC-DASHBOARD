// ==========================================
// TNTC DYNAMIC MULTI-TOUR ENGINE
// ==========================================

let masterToursList = [];
let loadedTourData = {}; 

async function fetchTourData() {
    if (isTourDataFetched) return;
    
    Papa.parse(TOUR_SHEET_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: async function(results) {
            let rows = results.data;
            
            // Error Handling: If the sheet is empty or we read the wrong tab
            if (rows.length <= 1 || rows[0][0] !== "TOUR NAME") {
                document.getElementById('dynamic-campaign-container').innerHTML = 
                    `<div class="text-center p-10 bg-tntc-admin/10 border border-tntc-admin/30 rounded-xl">
                        <i data-lucide="alert-triangle" class="w-8 h-8 text-tntc-admin mx-auto mb-3"></i>
                        <h3 class="text-tntc-admin font-bold text-lg mb-1">Database Connection Error</h3>
                        <p class="text-tntc-textSecondary text-sm">The dashboard is reading the wrong Google Sheet tab. Please ensure the TOUR_SHEET_CSV_URL in core.js is pointing to the exact GID of the TOUR_MASTER tab.</p>
                    </div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            masterToursList = [];
            // Parse Master Index (Skip Row 0 Headers)
            for(let i=1; i<rows.length; i++) {
                if(!rows[i][0]) continue; // Skip truly empty rows
                masterToursList.push({
                    name: rows[i][0] || "Unnamed Tour",
                    startDate: rows[i][1] || "TBD",
                    endDate: rows[i][2] || "Ongoing",
                    status: rows[i][3] || "LIVE",
                    reason: rows[i][4] || "",
                    banner: rows[i][5] || "https://images.unsplash.com/photo-1519003722824-194d4455a60c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
                    gid: rows[i][6] || ""
                });
            }

            // Generate Shell UI
            generateTourShells();
            
            // Fetch individual route data for each tour concurrently
            for (let tour of masterToursList) {
                if (tour.gid) {
                    await fetchSpecificTourData(tour);
                }
            }
            
            isTourDataFetched = true;
        }
    });
}

function generateTourShells() {
    let container = document.getElementById('dynamic-campaign-container');
    let html = "";
    
    masterToursList.forEach((tour, index) => {
        let safeId = "tour-" + index;
        
        // Status Styling
        let statusBadge = "";
        let bannerOverlay = "";
        
        if (tour.status === "LIVE") {
            statusBadge = `<span class="bg-tntc-active text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.5)] mb-3 inline-block">🟢 LIVE CAMPAIGN</span>`;
        } else if (tour.status === "PAUSED") {
            statusBadge = `<span class="bg-tntc-revenue text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(250,204,21,0.5)] mb-3 inline-block animate-pulse">🟡 PAUSED</span>`;
            bannerOverlay = `<div class="bg-tntc-revenue/10 border-l-4 border-tntc-revenue text-tntc-revenue p-4 rounded-r-xl text-sm font-bold flex items-center gap-3 shadow-lg mb-6"><i data-lucide="alert-triangle" class="w-5 h-5 shrink-0"></i><p>Notice: <span class="text-[#f8fafc] font-normal">${tour.reason}</span></p></div>`;
        } else if (tour.status === "ENDED") {
            statusBadge = `<span class="bg-tntc-admin text-white px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.5)] mb-3 inline-block">🔴 CAMPAIGN ENDED</span>`;
            bannerOverlay = `<div class="bg-tntc-admin/10 border-l-4 border-tntc-admin text-tntc-admin p-4 rounded-r-xl text-sm font-bold flex items-center gap-3 shadow-lg mb-6"><i data-lucide="flag" class="w-5 h-5 shrink-0"></i><p>This tour concluded on <span class="text-[#f8fafc] font-normal">${new Date(tour.endDate).toLocaleDateString()}</span>. ${tour.reason}</p></div>`;
        }

        html += `
        <div class="mb-10">
            <!-- Header Card -->
            <div onclick="toggleCampaign('${safeId}')" class="cursor-pointer group relative bg-tntc-card border ${tour.status==='LIVE' ? 'border-tntc-active/30 shadow-[0_10px_40px_-10px_rgba(34,197,94,0.15)] hover:border-tntc-active' : 'border-tntc-muted/30 shadow-lg hover:border-tntc-muted'} rounded-2xl overflow-hidden transition-all mb-6">
                <div class="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500" style="background-image: url('${tour.banner}')"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/90 to-transparent"></div>
                
                <div class="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                    <div>
                        ${statusBadge}
                        <h2 class="text-3xl md:text-4xl font-black text-tntc-textPrimary uppercase tracking-tight mb-2">${tour.name}</h2>
                        <p class="text-tntc-textSecondary text-xs font-mono font-bold flex items-center gap-4">
                            <span><i data-lucide="calendar" class="w-3 h-3 inline mr-1 text-tntc-accent"></i> ${new Date(tour.startDate).toLocaleDateString()}</span>
                            <span><i data-lucide="flag" class="w-3 h-3 inline mr-1 text-tntc-admin"></i> ${tour.endDate ? new Date(tour.endDate).toLocaleDateString() : 'Ongoing'}</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2 text-tntc-accent font-bold text-sm bg-tntc-main/50 px-4 py-2.5 rounded-lg border border-tntc-accent/20 backdrop-blur-sm group-hover:bg-tntc-accent group-hover:text-[#05070a] transition-colors">
                        <span id="${safeId}-toggle-text">View Manifest</span><i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300" id="${safeId}-chevron"></i>
                    </div>
                </div>
                
                <!-- Progress Bar Shell -->
                <div class="px-6 md:px-8 pb-6 relative z-10">
                    <div class="flex justify-between text-[10px] font-bold text-tntc-textSecondary mb-1.5 uppercase tracking-wider"><span>Overall Division Progress</span><span id="prog-txt-${safeId}">Loading...</span></div>
                    <div class="w-full bg-[#05070a] border border-tntc-muted/20 rounded-full h-3 overflow-hidden shadow-inner"><div id="prog-bar-${safeId}" class="bg-tntc-distance h-full rounded-full transition-all duration-[1500ms] ease-out" style="width: 0%;"></div></div>
                </div>
            </div>

            <!-- Content Area -->
            <div id="${safeId}-content" class="collapse-content">
                ${bannerOverlay}
                
                <!-- Stats Shell -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-muted/30 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[10px] font-bold uppercase mb-1">Routes Done</p><h2 class="text-2xl font-black text-tntc-textPrimary"><span id="stat-routes-${safeId}" class="text-tntc-accent">0</span> <span class="text-sm text-tntc-textSecondary">/ <span id="stat-tot-routes-${safeId}">0</span></span></h2></div>
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-muted/30 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[10px] font-bold uppercase mb-1">Distance Covered</p><h2 class="text-2xl font-black text-tntc-distance"><span id="stat-dist-${safeId}">0</span> <span class="text-sm text-tntc-textSecondary">km</span></h2></div>
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-muted/30 shadow-xl flex flex-col justify-center col-span-2 md:col-span-1"><p class="text-tntc-textSecondary text-[10px] font-bold uppercase mb-1">Total Target</p><h2 class="text-2xl font-black text-tntc-revenue"><span id="stat-targ-${safeId}">0</span> <span class="text-sm text-tntc-textSecondary">km</span></h2></div>
                </div>

                <!-- Table Shell -->
                <div class="bg-tntc-card rounded-xl border border-tntc-muted/30 shadow-xl overflow-hidden mb-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="bg-tntc-hover text-tntc-textSecondary text-[10px] font-semibold uppercase border-b border-tntc-muted/30">
                                    <th class="p-3 sm:p-4 w-12 text-center">No.</th>
                                    <th class="p-3 sm:p-4">Route Path</th>
                                    <th class="p-3 sm:p-4">Target Dist.</th>
                                    <th class="p-3 sm:p-4 text-center">Status</th>
                                    <th class="p-3 sm:p-4 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody id="table-${safeId}" class="text-xs divide-y divide-tntc-muted/10 font-medium">
                                <tr><td colspan="5" class="p-6 text-center text-tntc-textSecondary">Fetching route data...</td></tr>
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
    let index = masterToursList.indexOf(tourObj);
    let safeId = "tour-" + index;
    // Inject the specific GID for this route tab
    let specificUrl = TOUR_SHEET_CSV_URL.replace(/gid=\d+/, 'gid=' + tourObj.gid);

    Papa.parse(specificUrl, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            let data = results.data;
            if(data.length < 2) return;
            
            let headers = data[0];
            let driverCols = [];
            for (let i = 7; i < headers.length; i++) {
                if (headers[i] && headers[i] !== 'UNKNOWN' && !headers[i].includes('ATTENDANCE')) {
                    driverCols.push({ index: i, name: headers[i] });
                }
            }

            let routesCompleted = 0;
            let distanceCovered = 0;
            let totalTargetDist = 0;
            let tableHtml = "";

            for(let r=1; r<data.length; r++) {
                let row = data[r];
                if (row[1] === 'Start' || row[1] === 'Start City') continue;

                let sNo = row[0]; let src = row[1]; let srcCo = row[2]; let dst = row[3]; let dstCo = row[4];
                let dist = cleanNumber(row[5]);
                totalTargetDist += dist;
                
                let completedBy = [];
                driverCols.forEach(dc => {
                    let val = String(row[dc.index]).toUpperCase().trim();
                    if(val === 'TRUE' || val === '✓' || val === 'YES') {
                        completedBy.push(dc.name);
                    }
                });

                let isCompleted = completedBy.length > 0;
                if(isCompleted) {
                    routesCompleted++;
                    distanceCovered += dist;
                }
                
                // Get Route Image (Column G) or fallback to Tour Banner
                let routeImg = row[6] && String(row[6]).startsWith('http') ? row[6] : tourObj.banner;

                let statusBadge = isCompleted 
                    ? `<span class="bg-tntc-distance/20 text-tntc-distance border border-tntc-distance/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"><i data-lucide="check-circle-2" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Cleared</span>` 
                    : `<span class="bg-tntc-textSecondary/10 text-tntc-textSecondary border border-tntc-textSecondary/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"><i data-lucide="clock" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Pending</span>`;

                tableHtml += `
                <tr class="hover:bg-tntc-hover transition-colors">
                    <td class="p-3 sm:p-4 text-center text-tntc-textSecondary font-bold">${sNo}</td>
                    <td class="p-3 sm:p-4">
                        <div class="flex flex-col">
                            <span class="text-tntc-textPrimary font-bold text-sm truncate max-w-[200px]" title="${src} -> ${dst}">${src} <i data-lucide="arrow-right" class="w-3 h-3 inline text-tntc-accent mx-1"></i> ${dst}</span>
                            <span class="text-tntc-textSecondary text-[10px] mt-0.5 truncate max-w-[200px]" title="${srcCo} -> ${dstCo}">${srcCo} -> ${dstCo}</span>
                        </div>
                    </td>
                    <td class="p-3 sm:p-4 text-tntc-distance font-mono font-bold">${dist.toLocaleString()} <span class="text-[10px] text-tntc-textSecondary">km</span></td>
                    <td class="p-3 sm:p-4 text-center">${statusBadge}</td>
                    <td class="p-3 sm:p-4 text-right">
                        <button onclick="openCampModal('${tourObj.name}', ${sNo}, '${src}', '${srcCo}', '${dst}', '${dstCo}', ${dist}, '${routeImg}', ${JSON.stringify(completedBy).replace(/"/g, '&quot;')})" class="px-3 py-1.5 bg-tntc-main border border-tntc-muted/30 hover:bg-tntc-hover rounded text-xs font-semibold text-tntc-textPrimary inline-flex items-center gap-1 transition-colors shadow-sm">
                            <i data-lucide="eye" class="w-3 h-3 text-tntc-accent"></i> View
                        </button>
                    </td>
                </tr>`;
            }

            document.getElementById(`table-${safeId}`).innerHTML = tableHtml;
            document.getElementById(`stat-routes-${safeId}`).innerText = routesCompleted;
            document.getElementById(`stat-tot-routes-${safeId}`).innerText = (data.length - 1);
            document.getElementById(`stat-dist-${safeId}`).innerText = distanceCovered.toLocaleString();
            document.getElementById(`stat-targ-${safeId}`).innerText = totalTargetDist.toLocaleString();
            
            let percent = totalTargetDist > 0 ? Math.min(100, Math.round((distanceCovered / totalTargetDist) * 100)) : 0;
            document.getElementById(`prog-txt-${safeId}`).innerText = percent + "%";
            document.getElementById(`prog-bar-${safeId}`).style.width = percent + "%";

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });
}

function toggleCampaign(id) {
    let content = document.getElementById(id + "-content");
    let chevron = document.getElementById(id + "-chevron");
    let toggleText = document.getElementById(id + "-toggle-text");
    if (!content) return;

    if (content.classList.contains("expanded")) {
        content.classList.remove("expanded");
        if(chevron) chevron.style.transform = "rotate(0deg)";
        if(toggleText) toggleText.innerText = "View Manifest";
    } else {
        content.classList.add("expanded");
        if(chevron) chevron.style.transform = "rotate(180deg)";
        if(toggleText) toggleText.innerText = "Hide Manifest";
    }
}

function openCampModal(tourName, sNo, src, srcCo, dst, dstCo, dist, imgUrl, completedDriversArr) {
    document.getElementById('campModalId').textContent = `#${sNo} - ${tourName}`;
    document.getElementById('campModalSource').textContent = src;
    document.getElementById('campModalDest').textContent = dst;
    document.getElementById('campModalDist').textContent = dist.toLocaleString();
    
    // Populate the newly added elements
    let srcCoEl = document.getElementById('campModalSrcCo');
    if (srcCoEl) srcCoEl.textContent = srcCo;
    
    let dstCoEl = document.getElementById('campModalDstCo');
    if (dstCoEl) dstCoEl.textContent = dstCo;
    
    let headerEl = document.getElementById('campModalHeader');
    if (headerEl) headerEl.style.backgroundImage = `url('${imgUrl}')`;
    
    let html = "";
    if (completedDriversArr.length > 0) {
        completedDriversArr.forEach(d => {
            html += `<span class="bg-tntc-main border border-tntc-distance/30 text-tntc-distance px-3 py-1.5 rounded-md text-xs font-bold tracking-wide shadow-[0_0_10px_rgba(74,222,128,0.1)] flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3 h-3"></i> ${d}</span>`;
        });
    } else {
        html = `<p class="text-tntc-textSecondary text-xs italic w-full p-2 bg-tntc-main rounded border border-tntc-muted/20">Awaiting completion by division members.</p>`;
    }
    
    document.getElementById('campModalDriversList').innerHTML = html;
    document.getElementById('campModalCount').textContent = completedDriversArr.length;
    
    let modal = document.getElementById('campaignModal');
    if(modal) {
        modal.classList.remove('modal-closed');
        modal.classList.add('modal-open');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function populateManageToursDropdown() {
    let select = document.getElementById('manageTourSelect');
    if (!select) return;
    
    if (masterToursList.length === 0) {
        select.innerHTML = '<option value="">No tours available</option>';
        return;
    }
    
    let html = '<option value="">-- Select a Tour --</option>';
    masterToursList.forEach(t => {
        let emoji = t.status === 'LIVE' ? '🟢' : t.status === 'PAUSED' ? '🟡' : '🔴';
        html += `<option value="${t.name}">${emoji} ${t.name} (Started: ${new Date(t.startDate).toLocaleDateString()})</option>`;
    });
    select.innerHTML = html;
}