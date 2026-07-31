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
    
    // SECURITY CHECK: Get current user role
    let role = sessionStorage.getItem('tntc_role');
    let isAdmin = (role === 'leader' || role === 'admin');
    
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    masterToursList.forEach((tour, index) => {
        let safeId = "tour-" + index;
        
        // DATE LOGIC: Check if tour is in the future
        let startDate = new Date(tour.startDate);
        let isComingSoon = startDate > today;
        let isLockedForUser = isComingSoon && !isAdmin;
        
        let options = { month: 'long', day: 'numeric', year: 'numeric' };
        let formattedStartDate = startDate.toLocaleDateString('en-US', options);
        
        // Status Styling & Dynamic Overlays
        let statusBadge = "";
        let bannerOverlay = "";
        
        if (isComingSoon) {
            statusBadge = `<span class="bg-yellow-500 text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.5)] mb-3 inline-block">COMING SOON</span>`;
            bannerOverlay = `<div class="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-4 rounded-xl text-sm font-bold flex items-center gap-3 mb-6 shadow-lg"><i data-lucide="info" class="w-5 h-5 shrink-0"></i><p>This tour officially begins on <span class="text-[#f8fafc] font-black">${formattedStartDate}</span>.</p></div>`;
        } else if (tour.status === "LIVE") {
            statusBadge = `<span class="bg-tntc-active text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.5)] mb-3 inline-block">🟢 LIVE CAMPAIGN</span>`;
        } else if (tour.status === "PAUSED") {
            statusBadge = `<span class="bg-tntc-revenue text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(250,204,21,0.5)] mb-3 inline-block animate-pulse">🟡 PAUSED</span>`;
            bannerOverlay = `<div class="bg-tntc-revenue/10 border border-tntc-revenue/30 text-tntc-revenue p-4 rounded-xl text-sm font-bold flex items-center gap-3 mb-6 shadow-lg"><i data-lucide="pause-circle" class="w-5 h-5 shrink-0"></i><p>Tour Paused: <span class="text-[#f8fafc] font-normal">${tour.reason}</span></p></div>`;
        } else if (tour.status === "ENDED") {
            statusBadge = `<span class="bg-tntc-admin text-white px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.5)] mb-3 inline-block">🔴 CAMPAIGN ENDED</span>`;
            bannerOverlay = `<div class="bg-tntc-admin/10 border border-tntc-admin/30 text-tntc-admin p-4 rounded-xl text-sm font-bold flex items-center gap-3 mb-6 shadow-lg"><i data-lucide="flag" class="w-5 h-5 shrink-0"></i><p>Tour Concluded: <span class="text-[#f8fafc] font-normal">${tour.reason}</span></p></div>`;
        }

        html += `
        <div class="mb-10 relative">
            <!-- Header Card -->
            <div onclick="toggleCampaign('${safeId}', ${isLockedForUser})" class="cursor-pointer group relative bg-tntc-card border ${tour.status==='LIVE' && !isComingSoon ? 'border-tntc-active/30 shadow-[0_10px_40px_-10px_rgba(34,197,94,0.15)] hover:border-tntc-active' : 'border-tntc-muted/30 shadow-lg hover:border-tntc-muted'} rounded-2xl overflow-hidden transition-all mb-6">
                <div class="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500" style="background-image: url('${tour.banner}')"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/90 to-transparent"></div>
                
                <div class="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                    <div>
                        ${statusBadge}
                        <h2 class="text-3xl md:text-4xl font-black text-tntc-textPrimary uppercase tracking-tight mb-2">${tour.name}</h2>
                        <p class="text-tntc-textSecondary text-xs font-mono font-bold flex items-center gap-4">
                            <span><i data-lucide="calendar" class="w-3 h-3 inline mr-1 text-tntc-accent"></i> ${startDate.toLocaleDateString()}</span>
                            <span><i data-lucide="flag" class="w-3 h-3 inline mr-1 text-tntc-admin"></i> ${tour.endDate ? new Date(tour.endDate).toLocaleDateString() : 'Ongoing'}</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2 ${isLockedForUser ? 'text-red-400 border-red-500/20 group-hover:bg-red-500 group-hover:text-white' : 'text-tntc-accent border-tntc-accent/20 group-hover:bg-tntc-accent group-hover:text-[#05070a]'} font-bold text-sm bg-tntc-main/50 px-4 py-2.5 rounded-lg border backdrop-blur-sm transition-colors">
                        <span id="${safeId}-toggle-text">${isLockedForUser ? 'Manifest Locked' : 'View Manifest'}</span>
                        ${isLockedForUser ? `<i data-lucide="lock" class="w-4 h-4 ml-1"></i>` : `<i data-lucide="chevron-down" class="w-4 h-4 transition-transform duration-300" id="${safeId}-chevron"></i>`}
                    </div>
                </div>
                
                <!-- Progress Bar Shell -->
                <div class="px-6 md:px-8 pb-6 relative z-10">
                    <div class="flex justify-between text-[10px] font-bold text-tntc-textSecondary mb-1.5 uppercase tracking-wider"><span id="prog-title-${safeId}">Overall Division Progress</span><span id="prog-txt-${safeId}">Loading...</span></div>
                    <div class="w-full bg-[#05070a] border border-tntc-muted/20 rounded-full h-3 overflow-hidden shadow-inner"><div id="prog-bar-${safeId}" class="bg-tntc-distance h-full rounded-full transition-all duration-[1500ms] ease-out" style="width: 0%;"></div></div>
                </div>
            </div>

            <!-- Content Area (Hidden by Default) -->
            <div id="${safeId}-content" class="collapse-content">
                ${bannerOverlay}
                
                <!-- Filter & Stats Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-accent/30 shadow-[0_0_15px_rgba(56,189,248,0.05)] flex flex-col justify-center">
                        <label class="text-tntc-accent text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5"><i data-lucide="filter" class="w-3 h-3"></i> Filter Campaign Driver</label>
                        <select id="tour-filter-${safeId}" onchange="renderTourManifest('${safeId}')" class="w-full bg-tntc-main border border-tntc-muted/50 text-tntc-textPrimary text-sm font-semibold rounded-lg p-2.5 outline-none focus:border-tntc-accent focus:ring-1 focus:ring-tntc-accent transition-all">
                            <option value="ALL">All Drivers (Global Progress)</option>
                            <!-- Injected Dynamically -->
                        </select>
                    </div>
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-muted/30 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[10px] font-bold uppercase tracking-wider mb-1">Routes Done</p><h2 class="text-2xl font-black text-tntc-accent"><span id="stat-routes-${safeId}">0</span> <span class="text-sm font-bold text-tntc-textSecondary">/ <span id="stat-tot-routes-${safeId}">0</span></span></h2></div>
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-muted/30 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[10px] font-bold uppercase tracking-wider mb-1">Distance Covered</p><h2 class="text-2xl font-black text-tntc-distance"><span id="stat-dist-${safeId}">0</span> <span class="text-sm font-bold text-tntc-textSecondary">km</span></h2></div>
                    <div class="bg-tntc-card p-4 rounded-xl border border-tntc-muted/30 shadow-xl flex flex-col justify-center"><p class="text-tntc-textSecondary text-[10px] font-bold uppercase tracking-wider mb-1">Total Target</p><h2 class="text-2xl font-black text-yellow-500"><span id="stat-targ-${safeId}">0</span> <span class="text-sm font-bold text-tntc-textSecondary">km</span></h2></div>
                </div>

                <!-- Table Shell -->
                <div class="bg-tntc-card rounded-xl border border-tntc-muted/30 shadow-xl overflow-hidden mb-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="bg-tntc-hover text-tntc-textSecondary text-[10px] font-semibold uppercase tracking-wider border-b border-tntc-muted/30">
                                    <th class="p-4 w-12 text-center">No.</th>
                                    <th class="p-4">Route Path</th>
                                    <th class="p-4">Target Dist.</th>
                                    <th class="p-4 text-center">Status</th>
                                    <th class="p-4 text-right">Details</th>
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
            // Dynamically map drivers starting from Column H (index 7)
            for (let i = 7; i < headers.length; i++) {
                if (headers[i] && headers[i] !== 'UNKNOWN' && !headers[i].includes('ATTENDANCE')) {
                    driverCols.push({ index: i, name: headers[i].trim() });
                }
            }

            let routesData = [];
            let totalBaseDist = 0;

            for(let r=1; r<data.length; r++) {
                let row = data[r];
                if (row[1] === 'Start' || row[1] === 'Start City') continue;

                let sNo = row[0]; let src = row[1]; let srcCo = row[2]; let dst = row[3]; let dstCo = row[4];
                let dist = cleanNumber(row[5]);
                totalBaseDist += dist;
                
                let completedBy = [];
                driverCols.forEach(dc => {
                    let val = String(row[dc.index] || '').replace(/["']/g, '').trim().toUpperCase();
                    if(val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓' || val === '✔' || val === '☑' || val === 'CHECKED') {
                        completedBy.push(dc.name);
                    }
                });

                let routeImg = row[6] && String(row[6]).startsWith('http') ? row[6] : tourObj.banner;

                routesData.push({
                    sNo: sNo, src: src, srcCo: srcCo, dst: dst, dstCo: dstCo, dist: dist, 
                    routeImg: routeImg, completedBy: completedBy
                });
            }

            // Save to memory for local filtering
            loadedTourData[safeId] = {
                tourObj: tourObj,
                drivers: driverCols.map(dc => dc.name).sort(),
                routes: routesData,
                baseTargetDist: totalBaseDist
            };

            // Populate the Dropdown Filter
            let selectEl = document.getElementById(`tour-filter-${safeId}`);
            if (selectEl) {
                loadedTourData[safeId].drivers.forEach(d => {
                    selectEl.innerHTML += `<option value="${d}">${d}</option>`;
                });
            }

            // Render the initial UI
            renderTourManifest(safeId);
        }
    });
}

function renderTourManifest(safeId) {
    let tourData = loadedTourData[safeId];
    if (!tourData) return;

    let selectEl = document.getElementById(`tour-filter-${safeId}`);
    let selectedDriver = selectEl ? selectEl.value : "ALL";
    let numDrivers = tourData.drivers.length > 0 ? tourData.drivers.length : 1;

    let targetRoutes = 0;
    let targetDist = 0;
    let routesCompleted = 0;
    let distanceCovered = 0;
    let tableHtml = "";

    // The Critical Math Engine
    if (selectedDriver === "ALL") {
        targetRoutes = tourData.routes.length * numDrivers;
        targetDist = tourData.baseTargetDist * numDrivers;
    } else {
        targetRoutes = tourData.routes.length;
        targetDist = tourData.baseTargetDist;
    }

    tourData.routes.forEach(route => {
        let statusBadge = "";
        let isCompletedForIndividual = false;

        if (selectedDriver === "ALL") {
            let completions = route.completedBy.length;
            routesCompleted += completions;
            distanceCovered += (completions * route.dist);
            
            if (completions === 0) {
                statusBadge = `<span class="bg-tntc-textSecondary/10 text-tntc-textSecondary border border-tntc-textSecondary/20 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i data-lucide="clock" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Pending</span>`;
            } else if (completions === numDrivers) {
                statusBadge = `<span class="bg-tntc-distance/20 text-tntc-distance border border-tntc-distance/30 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i data-lucide="check-circle-2" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> All Cleared</span>`;
            } else {
                statusBadge = `<span class="bg-tntc-accent/20 text-tntc-accent border border-tntc-accent/30 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm"><i data-lucide="users" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> ${completions}/${numDrivers} Cleared</span>`;
            }
        } else {
            isCompletedForIndividual = route.completedBy.includes(selectedDriver);
            if (isCompletedForIndividual) {
                routesCompleted++;
                distanceCovered += route.dist;
            }
            
            statusBadge = isCompletedForIndividual 
                ? `<span class="bg-tntc-distance/20 text-tntc-distance border border-tntc-distance/30 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i data-lucide="check-circle-2" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Cleared</span>` 
                : `<span class="bg-tntc-textSecondary/10 text-tntc-textSecondary border border-tntc-textSecondary/20 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest"><i data-lucide="clock" class="w-3 h-3 inline mr-1 relative -top-[1px]"></i> Pending</span>`;
        }

        let isRowHighlighted = selectedDriver === "ALL" ? route.completedBy.length > 0 : isCompletedForIndividual;

        tableHtml += `
        <tr class="hover:bg-tntc-hover transition-colors group">
            <td class="p-4 text-center text-tntc-textSecondary font-bold text-sm border-l-2 border-transparent ${isRowHighlighted ? 'group-hover:border-tntc-distance' : 'group-hover:border-tntc-textSecondary'}">${route.sNo}</td>
            <td class="p-4">
                <div class="flex flex-col">
                    <span class="text-tntc-textPrimary font-bold text-sm truncate max-w-[220px]" title="${route.src} -> ${route.dst}">${route.src} <i data-lucide="arrow-right" class="w-3 h-3 inline text-tntc-accent mx-1"></i> ${route.dst}</span>
                    <span class="text-tntc-textSecondary text-[10px] font-medium mt-0.5 truncate max-w-[220px]" title="${route.srcCo} -> ${route.dstCo}">${route.srcCo} -> ${route.dstCo}</span>
                </div>
            </td>
            <td class="p-4 text-tntc-textSecondary font-mono font-bold">${route.dist.toLocaleString()} <span class="text-[10px]">km</span></td>
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4 text-right">
                <button onclick="openCampModal('${tourData.tourObj.name}', ${route.sNo}, '${route.src}', '${route.srcCo}', '${route.dst}', '${route.dstCo}', ${route.dist}, '${route.routeImg}', ${JSON.stringify(route.completedBy).replace(/"/g, '&quot;')}, ${numDrivers})" class="px-3 py-2 bg-tntc-main border border-tntc-muted/30 hover:bg-tntc-hover hover:border-tntc-accent/50 rounded-lg text-xs font-semibold text-tntc-textPrimary inline-flex items-center gap-1.5 transition-all shadow-sm">
                    <i data-lucide="eye" class="w-3.5 h-3.5 text-tntc-accent"></i> View
                </button>
            </td>
        </tr>`;
    });

    if(typeof updateDOMIfChanged === 'function') {
        updateDOMIfChanged(`table-${safeId}`, tableHtml); 
    } else {
        document.getElementById(`table-${safeId}`).innerHTML = tableHtml;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    // Inject the math into the DOM
    document.getElementById(`stat-routes-${safeId}`).innerText = routesCompleted;
    document.getElementById(`stat-tot-routes-${safeId}`).innerText = targetRoutes;
    document.getElementById(`stat-targ-${safeId}`).innerText = targetDist.toLocaleString();
    
    if(typeof animateValue === 'function') {
        animateValue(`stat-dist-${safeId}`, parseInt(document.getElementById(`stat-dist-${safeId}`).innerText.replace(/,/g,'')) || 0, distanceCovered, 1000);
    } else {
        document.getElementById(`stat-dist-${safeId}`).innerText = distanceCovered.toLocaleString();
    }
    
    // Progress Bar Update
    let percent = targetDist > 0 ? Math.min(100, (distanceCovered / targetDist) * 100) : 0;
    let displayPercent = percent % 1 === 0 ? percent : percent.toFixed(1); 
    
    document.getElementById(`prog-title-${safeId}`).innerText = selectedDriver === "ALL" ? "OVERALL DIVISION PROGRESS" : `${selectedDriver}'S PROGRESS`;
    document.getElementById(`prog-txt-${safeId}`).innerText = displayPercent + "%";
    document.getElementById(`prog-bar-${safeId}`).style.width = percent + "%";
}

function toggleCampaign(id, isLocked) {
    if (isLocked) {
        // Show inline professional access denied alert instead of browser prompt
        let existingAlert = document.getElementById(id + "-alert");
        if (existingAlert) {
            existingAlert.remove();
        } else {
            let headerCard = document.querySelector(`[onclick="toggleCampaign('${id}', true)"]`);
            if (headerCard) {
                let alertDiv = document.createElement("div");
                alertDiv.id = id + "-alert";
                alertDiv.className = "bg-red-500/10 border border-red-500/30 text-red-500 px-5 py-4 rounded-xl text-sm font-bold mt-4 flex items-center gap-3 animate-pulse shadow-lg";
                alertDiv.innerHTML = `<i data-lucide="shield-alert" class="w-5 h-5 shrink-0"></i> <div><span class="block uppercase tracking-wider text-[10px] mb-0.5">Access Denied</span>The route manifest is locked until the tour officially begins.</div>`;
                headerCard.parentElement.insertBefore(alertDiv, headerCard.nextSibling);
                if (typeof lucide !== 'undefined') lucide.createIcons();
                setTimeout(() => { if(document.getElementById(id + "-alert")) document.getElementById(id + "-alert").remove(); }, 5000);
            }
        }
        return;
    }

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

function openCampModal(tourName, sNo, src, srcCo, dst, dstCo, dist, imgUrl, completedDriversArr, totalDriversCount) {
    document.getElementById('campModalId').textContent = `#${sNo} - ${tourName}`;
    document.getElementById('campModalSource').textContent = src;
    document.getElementById('campModalDest').textContent = dst;
    document.getElementById('campModalDist').textContent = dist.toLocaleString();
    
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
    
    let totalEl = document.getElementById('campModalTotalDrivers');
    if(totalEl) totalEl.textContent = totalDriversCount;
    
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