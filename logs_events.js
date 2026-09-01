function safeCleanNumber(val) { return typeof val === 'number' ? val : parseInt(String(val).replace(/[^\d]/g, '')) || 0; }
function safeNormalize(val) { return String(val || '').trim().toUpperCase(); }
function escapeHtml(val) { return String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// ==========================================
// JOB LOGS SYSTEM
// ==========================================

function populateJobDriverDropdown() {
    let dropdown = document.getElementById('filterDriver');
    if(!dropdown || !globalJobData) return;
    let driverMap = new Map();
    globalJobData.forEach(rawRow => {
        let row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
        if (row.length < 5) return;
        let orig = String(row[2] || '').trim(); let norm = safeNormalize(orig);
        if(norm && norm !== 'UNKNOWN' && !norm.includes('DRIVER')) driverMap.set(norm, orig);
    });
    let currentVal = dropdown.value; 
    dropdown.innerHTML = '<option value="ALL">All Drivers</option>';
    Array.from(driverMap.keys()).sort().forEach(norm => dropdown.innerHTML += `<option value="${norm}">${driverMap.get(norm)}</option>`);
    let trackerName = sessionStorage.getItem('tntc_tracker');
    if (trackerName && (!currentVal || currentVal === 'ALL' || currentVal === '')) {
        let normTracker = safeNormalize(trackerName);
        if (driverMap.has(normTracker)) dropdown.value = normTracker; else dropdown.value = 'ALL';
    } else { dropdown.value = currentVal || 'ALL'; }
}

function applyLogFilters() {
    try {
        let filterDriverEl = document.getElementById('filterDriver');
        let driverFilter = filterDriverEl ? filterDriverEl.value : 'ALL'; 
        let timeFilter = 'ALL'; let customDate = '';
        if (window.vtcFilterStates && window.vtcFilterStates['logs']) {
            let state = window.vtcFilterStates['logs'];
            if (state.mode === 'MONTHLY') { timeFilter = 'CUSTOM_MONTH'; customDate = state.value; }
            else if (state.mode === 'DAILY') { timeFilter = 'CUSTOM'; customDate = state.value; }
        }

        let filteredKm = 0; globalFilteredJobs = [];
        if (globalJobData && globalJobData.length > 0) {
            [...globalJobData].reverse().forEach(rawRow => {
                let row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
                if (row.length < 5) return; 
                let origName = String(row[2] || '').trim(); let normName = safeNormalize(origName);
                if(!normName || normName === 'UNKNOWN' || normName.includes('DRIVER')) return;
                let timeStr = String(row[0] || ''); let drivenKm = safeCleanNumber(row[12]);
                let driverMatch = (driverFilter === 'ALL' || normName === safeNormalize(driverFilter));
                let dateMatch = true;
                try { dateMatch = checkDateFilter(timeStr, timeFilter, customDate); } catch(e) {}
                if (driverMatch && dateMatch) { filteredKm += drivenKm; globalFilteredJobs.push(row); }
            });
        }
        let filteredTotalKmEl = document.getElementById('filteredTotalKm');
        if(filteredTotalKmEl) filteredTotalKmEl.innerText = filteredKm.toLocaleString() + " km";
        renderJobPage(1);
    } catch(err) {
        let tbody = document.getElementById('filteredJobTableBody');
        let savedPage = typeof currentJobPage !== 'undefined' ? currentJobPage : 1;
        renderJobPage(savedPage);
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-tntc-admin font-bold p-6 text-center">System Error: ${err.message}</td></tr>`;
    }
}

function renderJobPage(page) {
    let tbody = document.getElementById('filteredJobTableBody');
    if (!tbody) return;
    try {
        let limitEl = document.getElementById('jobPageLimit');
        const rowsPerPage = parseInt(limitEl?.value, 10) || 10;
        const totalPages = Math.max(1, Math.ceil(globalFilteredJobs.length / rowsPerPage));
        if (page < 1) page = 1; if (page > totalPages) page = totalPages;
        currentJobPage = page;
        const startIndex = (page - 1) * rowsPerPage; const endIndex = startIndex + rowsPerPage;
        const pageJobs = globalFilteredJobs.slice(startIndex, endIndex);

        let tableHTML = "";
        if(pageJobs.length === 0) {
            tableHTML = `<tr><td colspan="6" class="p-16 text-center text-tntc-textSecondary bg-[#05070a]/50"><i data-lucide="database" class="w-8 h-8 mx-auto mb-3 opacity-30"></i><p class="font-bold text-[10px] tracking-widest uppercase">No records found.</p></td></tr>`;
        } else {
            pageJobs.forEach((row, index) => {
                let dName = String(row[2] || '').trim();
                let dateShort = String(row[0] || '').split(' ')[0] || '--';
                let realIndex = startIndex + index;

                tableHTML += `
                <tr class="hover:bg-white/5 transition-colors border-b border-white/5 group">
                    <td class="p-4 sm:p-5 text-tntc-textSecondary font-mono text-[10px] whitespace-nowrap">${escapeHtml(dateShort)}</td>
                    <td class="p-4 sm:p-5 text-white font-black tracking-wide">${escapeHtml(dName)}</td>
                    <td class="p-4 sm:p-5 text-tntc-textPrimary font-bold text-xs truncate max-w-[150px] sm:max-w-[200px]" title="${escapeHtml(row[5])} -> ${escapeHtml(row[7])}">${escapeHtml(row[5] || '--')} <i data-lucide="arrow-right" class="w-3 h-3 inline text-tntc-accent mx-1 opacity-50 group-hover:opacity-100 transition-opacity"></i> ${escapeHtml(row[7] || '--')}</td>
                    <td class="p-4 sm:p-5 text-tntc-textSecondary text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">${escapeHtml(row[3] || '--')}</td>
                    <td class="p-4 sm:p-5 text-tntc-distance font-mono font-black tracking-wider whitespace-nowrap drop-shadow-[0_0_5px_rgba(74,222,128,0.3)]">${safeCleanNumber(row[12]).toLocaleString()} km</td>
                    <td class="p-4 sm:p-5 text-right">
                        <button onclick="openJobModal(${realIndex})" class="px-4 py-2 bg-tntc-accent/10 hover:bg-tntc-accent border border-tntc-accent/30 text-tntc-accent hover:text-[#05070a] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(56,189,248,0.1)] hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] flex items-center justify-center gap-1.5 ml-auto">
                            View <i data-lucide="scan" class="w-3 h-3"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = tableHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        let infoEl = document.getElementById('jobPageInfo'); let prevBtn = document.getElementById('btnPrevPage'); let nextBtn = document.getElementById('btnNextPage');
        if (infoEl) infoEl.innerText = `PAGE ${page} OF ${totalPages}`;
        if (prevBtn) prevBtn.disabled = (page === 1);
        if (nextBtn) nextBtn.disabled = (page === totalPages);
    } catch(err) { tbody.innerHTML = `<tr><td colspan="6" class="text-tntc-admin font-bold p-6 text-center">Render Error: ${err.message}</td></tr>`; }
}

// ==========================================
// EVENT RECORDS SYSTEM
// ==========================================
function populateEventCategoryDropdown() {
    let dropdown = document.getElementById('filterEventCategory');
    if(!dropdown || !globalEventData || !globalEventData.rows) return;
    let categories = new Set();
    globalEventData.rows.forEach(rawRow => {
        let row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
        let dateStr = String(row[1] || ''); let nameStr = String(row[2] || '');
        if (dateStr.trim() === '' || nameStr.trim() === '' || nameStr.includes('EVENT NAME')) return;
        let cat = String(row[4] || ''); if(cat.trim() !== '') categories.add(cat.trim().toUpperCase());
    });
    let currentVal = dropdown.value; 
    dropdown.innerHTML = '<option value="ALL">All Categories</option>';
    Array.from(categories).sort().forEach(c => dropdown.innerHTML += `<option value="${c}">${c}</option>`);
    dropdown.value = currentVal || 'ALL';
}

function populateEventDriverDropdown() {
    let dropdown = document.getElementById('filterEventDriver');
    if(!dropdown || !globalEventData || !globalEventData.headers) return;
    let headers = globalEventData.headers; if (!headers || headers.length === 0) return;
    let driverMap = new Map();
    for(let i = 6; i < headers.length; i++) {
        let orig = String(headers[i] || '').trim(); let norm = safeNormalize(orig);
        if(norm && norm !== 'UNKNOWN' && !norm.includes('ATTENDANCE')) driverMap.set(norm, orig);
    }
    let currentVal = dropdown.value; 
    dropdown.innerHTML = '<option value="ALL">All Drivers</option>';
    Array.from(driverMap.keys()).sort().forEach(norm => dropdown.innerHTML += `<option value="${norm}">${driverMap.get(norm)}</option>`);
    let trackerName = sessionStorage.getItem('tntc_tracker');
    if (trackerName && (!currentVal || currentVal === 'ALL' || currentVal === '')) {
        let normTracker = safeNormalize(trackerName);
        if (driverMap.has(normTracker)) dropdown.value = normTracker; else dropdown.value = 'ALL';
    } else { dropdown.value = currentVal || 'ALL'; }
}

function applyEventFilters() {
    try {
        let catFilter = document.getElementById('filterEventCategory')?.value || 'ALL';
        let driverFilter = document.getElementById('filterEventDriver')?.value || 'ALL'; 
        let timeFilter = 'ALL'; let customDate = '';
        if (window.vtcFilterStates && window.vtcFilterStates['events']) {
            let state = window.vtcFilterStates['events'];
            if (state.mode === 'MONTHLY') { timeFilter = 'CUSTOM_MONTH'; customDate = state.value; }
            else if (state.mode === 'DAILY') { timeFilter = 'CUSTOM'; customDate = state.value; }
        }

        currentFilteredEvents = []; 
        if(!globalEventData || !globalEventData.rows || !globalEventData.headers) return;
        
        let sourceEvents = globalEventData.rows; let headers = globalEventData.headers;
        if (sourceEvents.length > 0) {
            [...sourceEvents].reverse().forEach(rawRow => {
                let row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
                if (row.length < 3) return;
                let dateStr = String(row[1] || ''); let nameStr = String(row[2] || '');
                if (dateStr.trim() === '' || nameStr.trim() === '' || nameStr.includes('EVENT NAME')) return; 
                let category = String(row[4] || '').trim().toUpperCase(); 
                if (catFilter !== 'ALL' && category !== catFilter) return;
                
                let dateMatch = true;
                try { dateMatch = checkDateFilter(dateStr, timeFilter, customDate); } catch(e) {}
                if (!dateMatch) return;

                if (driverFilter !== 'ALL') {
                    let matchingCols = [];
                    for (let i = 6; i < headers.length; i++) { if (safeNormalize(headers[i]) === safeNormalize(driverFilter)) matchingCols.push(i); }
                    if (matchingCols.length === 0) return;
                    let driverAttended = false;
                    matchingCols.forEach(colIdx => {
                        let val = String(row[colIdx] || '').replace(/["']/g, '').trim().toUpperCase();
                        if(['TRUE', '1', 'YES', '✓'].some(v => val.includes(v))) driverAttended = true;
                    });
                    if (!driverAttended) return;
                }

                let driversAttended = [];
                for(let i = 6; i < headers.length; i++) {
                    let origName = String(headers[i] || '').trim(); let normKey = safeNormalize(origName);
                    if(!normKey || normKey === 'UNKNOWN' || normKey.includes('ATTENDANCE')) continue;
                    let val = String(row[i] || '').replace(/["']/g, '').trim().toUpperCase();
                    if(['TRUE', '1', 'YES', '✓'].some(v => val.includes(v))) driversAttended.push(origName); 
                }

                currentFilteredEvents.push({ date: dateStr, name: String(row[2] || 'Unknown Event'), link: String(row[3] || '#'), category: category, image: String(row[5] || ''), attendance: driversAttended.length, drivers: driversAttended });
            });
        }
        let filteredTotalEventsEl = document.getElementById('filteredTotalEvents');
        if(filteredTotalEventsEl) filteredTotalEventsEl.innerText = currentFilteredEvents.length;
        renderEventPage(1);
    } catch (err) {
        let tbody = document.getElementById('filteredEventTableBody');
        let savedPage = typeof currentEventPage !== 'undefined' ? currentEventPage : 1;
        renderEventPage(savedPage);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-tntc-admin font-bold p-6 text-center">System Error: ${err.message}</td></tr>`;
    }
}

function renderEventPage(page) {
    let tbody = document.getElementById('filteredEventTableBody');
    if (!tbody) return;
    try {
        let limitEl = document.getElementById('eventPageLimit');
        const rowsPerPage = parseInt(limitEl?.value, 10) || 10;
        const totalPages = Math.max(1, Math.ceil(currentFilteredEvents.length / rowsPerPage));
        if (page < 1) page = 1; if (page > totalPages) page = totalPages;
        currentEventPage = page;
        const startIndex = (page - 1) * rowsPerPage; const endIndex = startIndex + rowsPerPage;
        const pageEvents = currentFilteredEvents.slice(startIndex, endIndex);

        let tableHTML = "";
        if(pageEvents.length === 0) {
            tableHTML = `<tr><td colspan="5" class="p-16 text-center text-tntc-textSecondary bg-[#05070a]/50"><i data-lucide="database" class="w-8 h-8 mx-auto mb-3 opacity-30"></i><p class="font-bold text-[10px] tracking-widest uppercase">No records found.</p></td></tr>`;
        } else {
            pageEvents.forEach((ev, index) => {
                let realIndex = startIndex + index; 
                let badgeColor = (ev.category || '').includes('PRIVATE') ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-tntc-accent/10 text-tntc-accent border border-tntc-accent/30';
                tableHTML += `
                <tr class="hover:bg-white/5 transition-colors border-b border-white/5 group">
                    <td class="p-4 sm:p-5 text-tntc-textSecondary font-mono text-[10px]">${escapeHtml(ev.date)}</td>
                    <td class="p-4 sm:p-5"><span class="px-2.5 py-1 rounded-md text-[8px] font-black tracking-widest uppercase shadow-sm backdrop-blur-md ${badgeColor}">${escapeHtml(ev.category)}</span></td>
                    <td class="p-4 sm:p-5 text-white font-black text-xs max-w-[200px] truncate tracking-wide" title="${escapeHtml(ev.name)}">${escapeHtml(ev.name)}</td>
                    <td class="p-4 sm:p-5 text-center text-yellow-500 font-black font-mono drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">${ev.attendance} <i data-lucide="users" class="w-4 h-4 inline ml-1 opacity-70"></i></td>
                    <td class="p-4 sm:p-5 text-right">
                        <button onclick="openEventModal(${realIndex})" class="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-tntc-accent/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-tntc-textPrimary flex items-center justify-center gap-1.5 transition-all shadow-sm ml-auto">
                            <i data-lucide="eye" class="w-3 h-3 text-tntc-accent group-hover:drop-shadow-[0_0_5px_#38bdf8]"></i> View
                        </button>
                    </td>
                </tr>`;
            });
        }
        tbody.innerHTML = tableHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        let infoEl = document.getElementById('eventPageInfo'); let prevBtn = document.getElementById('btnPrevEventPage'); let nextBtn = document.getElementById('btnNextEventPage');
        if (infoEl) infoEl.innerText = `PAGE ${page} OF ${totalPages}`;
        if (prevBtn) prevBtn.disabled = (page === 1);
        if (nextBtn) nextBtn.disabled = (page === totalPages);
    } catch(err) { tbody.innerHTML = `<tr><td colspan="5" class="text-tntc-admin font-bold p-6 text-center">Render Error: ${err.message}</td></tr>`; }
}

let hasSyncedJobs = false; let hasSyncedEvents = false; let syncAttempts = 0;
let syncTimer = setInterval(() => {
    syncAttempts++;
    if (!hasSyncedJobs && globalJobData && globalJobData.length > 0) { populateJobDriverDropdown(); applyLogFilters(); hasSyncedJobs = true; }
    if (!hasSyncedEvents && globalEventData && globalEventData.rows && globalEventData.rows.length > 0) { populateEventCategoryDropdown(); populateEventDriverDropdown(); applyEventFilters(); hasSyncedEvents = true; }
    if (hasSyncedJobs && hasSyncedEvents) clearInterval(syncTimer);
    if (syncAttempts > 120) clearInterval(syncTimer); 
}, 500); 

window.nextJobPage = function() { renderJobPage(currentJobPage + 1); };
window.prevJobPage = function() { renderJobPage(currentJobPage - 1); };
window.nextEventPage = function() { renderEventPage(currentEventPage + 1); };
window.prevEventPage = function() { renderEventPage(currentEventPage - 1); };
window.openEventModal = function(index) {
    if(!window.currentFilteredEvents) return;
    let ev = window.currentFilteredEvents[index];
    if(!ev) return;
    try {
        let nameEl = document.getElementById('modalEventName'); let dateEl = document.getElementById('modalDate'); let catEl = document.getElementById('modalCategory'); let attEl = document.getElementById('modalAttendanceCount');
        if(nameEl) nameEl.textContent = ev.name || 'Unknown Event';
        if(dateEl) dateEl.textContent = ev.date || 'No Date';
        if(catEl) catEl.textContent = ev.category || 'EVENT';
        if(attEl) attEl.textContent = ev.attendance || '0';

        let eventDate = new Date(ev.date.replace(/-/g, ' '));
        let monthYearKey = !isNaN(eventDate) ? `${eventDate.toLocaleString('en-US', { month: 'long' })} ${eventDate.getFullYear()}`.toUpperCase() : ev.date.toUpperCase();

        let coverUrl = window.globalEventCovers ? window.globalEventCovers[monthYearKey] : null;
        let imgContainer = document.getElementById('modalImageContainer');
        if (imgContainer) {
            if (coverUrl && coverUrl.startsWith('http')) imgContainer.style.backgroundImage = `url('${coverUrl}')`;
            else imgContainer.style.backgroundImage = `linear-gradient(to right, #0f172a, #05070a)`;
        }

        let entryContainer = document.getElementById('modalEntryImageContainer'); let entryImage = document.getElementById('modalEntryImage');
        if (entryContainer && entryImage) {
            if (ev.image && ev.image.startsWith('http')) { entryImage.src = ev.image; entryContainer.classList.remove('hidden'); } 
            else { entryImage.src = ""; entryContainer.classList.add('hidden'); }
        }

        let linkBtn = document.getElementById('modalLinkBtn');
        if (linkBtn) {
            if(ev.link && ev.link !== '#' && ev.link.startsWith('http')) { linkBtn.href = ev.link; linkBtn.style.display = 'flex'; } 
            else { linkBtn.style.display = 'none'; }
        }

        let driversHTML = "";
        if (ev.drivers && ev.drivers.length > 0) {
            ev.drivers.forEach(d => { driversHTML += `<span class="bg-white/5 border border-white/10 text-tntc-accent px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase shadow-sm">${d}</span>`; });
        } else { driversHTML = `<p class="text-tntc-textSecondary text-xs italic w-full p-4 text-center bg-black/40 rounded-xl border border-white/5">No drivers logged for this event.</p>`; }
        let drvList = document.getElementById('modalDriversList');
        if(drvList) drvList.innerHTML = driversHTML;

        let modal = document.getElementById('eventModal');
        if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); requestAnimationFrame(() => { modal.classList.remove('modal-closed'); modal.classList.add('modal-open'); }); }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {}
};