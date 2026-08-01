// ==========================================
// JOB LOGS & EVENT RECORDS WITH PAGINATION
// ==========================================

function populateEventCategoryDropdown() {
    let dropdown = document.getElementById('filterEventCategory');
    if(!dropdown) return;

    let categories = new Set();
    globalEventData.rows.forEach(row => {
        let dateStr = String(row[1] || ''); let nameStr = String(row[2] || '');
        if (dateStr.trim() === '' || nameStr.trim() === '') return;
        let cat = String(row[4] || ''); 
        if(cat.trim() !== '') categories.add(cat.trim().toUpperCase());
    });
    
    let currentVal = dropdown.value; 
    dropdown.innerHTML = '<option value="ALL">All Categories</option>';
    Array.from(categories).sort().forEach(c => { dropdown.innerHTML += `<option value="${c}">${c}</option>`; });
    dropdown.value = currentVal || 'ALL';
}

function populateEventDriverDropdown() {
    let dropdown = document.getElementById('filterEventDriver');
    if(!dropdown) return;

    let driverMap = new Map();
    for(let i = 6; i < globalEventData.headers.length; i++) {
        let orig = String(globalEventData.headers[i] || '').trim();
        let norm = normalizeKey(orig);
        if(norm && norm !== 'UNKNOWN' && !norm.includes('ATTENDANCE')) {
            if (!driverMap.has(norm)) driverMap.set(norm, orig);
        }
    }
    
    let currentVal = dropdown.value; 
    dropdown.innerHTML = '<option value="ALL">All Drivers</option>';
    let sortedKeys = Array.from(driverMap.keys()).sort();
    sortedKeys.forEach(norm => { 
        dropdown.innerHTML += `<option value="${norm}">${driverMap.get(norm)}</option>`; 
    });
    dropdown.value = currentVal || 'ALL';
}

function applyLogFilters() {
    let filterDriverEl = document.getElementById('filterDriver');
    let filterTimeEl = document.getElementById('filterTime');
    let jobDatePickerEl = document.getElementById('jobDatePicker');

    if(!filterDriverEl || !filterTimeEl || !jobDatePickerEl) return;

    let driverFilter = filterDriverEl.value; 
    let timeFilter = filterTimeEl.value;
    let customDate = jobDatePickerEl.value;
    
    let filteredKm = 0;
    globalFilteredJobs = [];
    let recentRows = [...globalJobData].reverse(); 

    recentRows.forEach(row => {
        let origName = String(row[2] || '').trim();
        let normName = normalizeKey(origName);
        if(!normName || normName === 'UNKNOWN') return;
        
        let timeStr = String(row[0] || '');
        let drivenKm = cleanNumber(row[12]);
        
        if (driverFilter !== 'ALL' && normName !== driverFilter) return;
        if (!checkDateFilter(timeStr, timeFilter, customDate)) return;
        
        filteredKm += drivenKm;
        globalFilteredJobs.push(row);
    });

    let filteredTotalKmEl = document.getElementById('filteredTotalKm');
    if(filteredTotalKmEl) filteredTotalKmEl.innerText = filteredKm.toLocaleString() + " km";
    
    renderJobPage(1);
}

function renderJobPage(page) {
    let limitEl = document.getElementById('jobPageLimit');
    const rowsPerPage = limitEl ? parseInt(limitEl.value) : 25; 
    const totalPages = Math.ceil(globalFilteredJobs.length / rowsPerPage) || 1;
    
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentJobPage = page;

    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageJobs = globalFilteredJobs.slice(startIndex, endIndex);

    let tableHTML = "";
    if(pageJobs.length === 0) {
        tableHTML = `<tr><td colspan="6" class="p-6 text-center text-tntc-textSecondary">No jobs found.</td></tr>`;
    } else {
        pageJobs.forEach(row => {
            let dName = String(row[2] || '').trim();
            tableHTML += `
            <tr class="hover:bg-tntc-hover transition-colors border-b border-tntc-muted/5">
                <td class="p-3 sm:p-4 text-tntc-textSecondary font-mono text-[10px] sm:text-xs">${row[0] || '--'}</td>
                <td class="p-3 sm:p-4 text-tntc-textPrimary font-bold">${dName}</td>
                <td class="p-3 sm:p-4 text-tntc-textPrimary font-bold truncate max-w-[200px]" title="${row[5]} -> ${row[7]}">${row[5] || '--'} <i data-lucide="arrow-right" class="w-3 h-3 inline text-tntc-accent mx-1"></i> ${row[7] || '--'}</td>
                <td class="p-3 sm:p-4 text-tntc-textSecondary text-xs truncate max-w-[150px]" title="${row[3]}">${row[3] || '--'}</td>
                <td class="p-3 sm:p-4 text-tntc-distance font-mono font-bold">${cleanNumber(row[12]).toLocaleString()} km</td>
                <td class="p-3 sm:p-4 text-tntc-revenue font-mono font-bold">€ ${cleanNumber(row[15]).toLocaleString()}</td>
            </tr>`;
        });
    }
    updateDOMIfChanged('filteredJobTableBody', tableHTML);

    let infoEl = document.getElementById('jobPageInfo');
    if (infoEl) infoEl.innerText = `Page ${page} of ${totalPages}`;

    let prevBtn = document.getElementById('btnPrevPage');
    let nextBtn = document.getElementById('btnNextPage');
    if (prevBtn) prevBtn.disabled = (page === 1);
    if (nextBtn) nextBtn.disabled = (page === totalPages);
}

function nextJobPage() {
    renderJobPage(currentJobPage + 1);
}

function prevJobPage() {
    renderJobPage(currentJobPage - 1);
}

function applyEventFilters() {
    let catFilterEl = document.getElementById('filterEventCategory');
    let driverFilterEl = document.getElementById('filterEventDriver');
    let timeFilterEl = document.getElementById('filterEventTime');
    let eventDatePickerEl = document.getElementById('eventDatePicker');

    if(!catFilterEl || !driverFilterEl || !timeFilterEl || !eventDatePickerEl) return;

    let catFilter = catFilterEl.value;
    let driverFilter = driverFilterEl.value; 
    let timeFilter = timeFilterEl.value;
    let customDate = eventDatePickerEl.value;
    
    window.currentFilteredEvents = []; 

    let recentEvents = [...globalEventData.rows].reverse();
    let headers = globalEventData.headers;

    if (!headers || headers.length === 0) return;

    recentEvents.forEach(row => {
        let dateStr = String(row[1] || ''); 
        let nameStr = String(row[2] || '');
        if (dateStr.trim() === '' || nameStr.trim() === '') return; 

        let category = String(row[4] || '').trim().toUpperCase(); 
        if (catFilter !== 'ALL' && category !== catFilter) return;
        if (!checkDateFilter(dateStr, timeFilter, customDate)) return;

        if (driverFilter !== 'ALL') {
            let matchingCols = [];
            for (let i = 6; i < headers.length; i++) {
                if (normalizeKey(headers[i]) === driverFilter) matchingCols.push(i);
            }
            if (matchingCols.length === 0) return;
            
            let driverAttended = false;
            matchingCols.forEach(colIdx => {
                let val = String(row[colIdx] || '').replace(/["']/g, '').trim().toUpperCase();
                if(val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓' || val === '✔' || val === '☑' || val === 'CHECKED') {
                    driverAttended = true;
                }
            });
            if (!driverAttended) return;
        }

        let driversAttended = [];
        for(let i = 6; i < headers.length; i++) {
            let origName = String(headers[i] || '').trim();
            let normKey = normalizeKey(origName);
            if(!normKey || normKey === 'UNKNOWN' || normKey.includes('ATTENDANCE')) continue;
            
            let val = String(row[i] || '').replace(/["']/g, '').trim().toUpperCase();
            if(val === 'TRUE' || val.includes('TRUE') || val === '1' || val === 'YES' || val === '✓' || val === '✔' || val === '☑' || val === 'CHECKED') {
                driversAttended.push(origName); 
            }
        }

        window.currentFilteredEvents.push({
            date: dateStr,
            name: String(row[2] || 'Unknown Event'),
            link: String(row[3] || '#'),
            category: category,
            image: String(row[5] || ''),
            attendance: driversAttended.length,
            drivers: driversAttended
        });
    });

    let filteredTotalEventsEl = document.getElementById('filteredTotalEvents');
    if(filteredTotalEventsEl) filteredTotalEventsEl.innerText = window.currentFilteredEvents.length;

    renderEventPage(1);
}

function renderEventPage(page) {
    let limitEl = document.getElementById('eventPageLimit');
    const rowsPerPage = limitEl ? parseInt(limitEl.value) : 25; 
    const totalPages = Math.ceil(window.currentFilteredEvents.length / rowsPerPage) || 1;
    
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentEventPage = page;

    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageEvents = window.currentFilteredEvents.slice(startIndex, endIndex);

    let tableHTML = "";
    if(pageEvents.length === 0) {
        tableHTML = `<tr><td colspan="5" class="p-6 text-center text-tntc-textSecondary">No events found.</td></tr>`;
    } else {
        pageEvents.forEach((ev, index) => {
            let realIndex = startIndex + index; 
            let badgeColor = ev.category.includes('PRIVATE') ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'bg-tntc-muted/20 text-tntc-accent border border-tntc-muted/30';
            tableHTML += `
            <tr class="hover:bg-tntc-hover transition-colors">
                <td class="p-3 sm:p-4 text-tntc-textSecondary font-mono text-[10px] sm:text-xs">${ev.date}</td>
                <td class="p-3 sm:p-4"><span class="px-2 py-1 rounded text-[10px] font-bold tracking-wider ${badgeColor}">${ev.category}</span></td>
                <td class="p-3 sm:p-4 text-tntc-textPrimary font-bold text-sm max-w-[200px] truncate" title="${ev.name}">${ev.name}</td>
                <td class="p-3 sm:p-4 text-center text-tntc-accent font-black">${ev.attendance} <i data-lucide="users" class="w-4 h-4 inline ml-1 opacity-70"></i></td>
                <td class="p-3 sm:p-4 text-right">
                    <button onclick="openEventModal(${realIndex})" class="px-3 py-1.5 bg-tntc-main border border-tntc-muted/30 hover:bg-tntc-hover rounded text-xs font-semibold text-tntc-textPrimary flex items-center justify-center gap-1 transition-colors ml-auto shadow-sm">
                        <i data-lucide="eye" class="w-3 h-3 text-tntc-accent"></i> View
                    </button>
                </td>
            </tr>`;
        });
    }
    updateDOMIfChanged('filteredEventTableBody', tableHTML);

    let infoEl = document.getElementById('eventPageInfo');
    if (infoEl) infoEl.innerText = `Page ${page} of ${totalPages}`;

    let prevBtn = document.getElementById('btnPrevEventPage');
    let nextBtn = document.getElementById('btnNextEventPage');
    if (prevBtn) prevBtn.disabled = (page === 1);
    if (nextBtn) nextBtn.disabled = (page === totalPages);
}

function nextEventPage() {
    renderEventPage(currentEventPage + 1);
}

function prevEventPage() {
    renderEventPage(currentEventPage - 1);
}

function openEventModal(index) {
    if(!window.currentFilteredEvents) return;
    let ev = window.currentFilteredEvents[index];
    if(!ev) return;
    
    try {
        let nameEl = document.getElementById('modalEventName');
        let dateEl = document.getElementById('modalDate');
        let catEl = document.getElementById('modalCategory');
        let attEl = document.getElementById('modalAttendanceCount');

        if(nameEl) nameEl.textContent = ev.name || 'Unknown Event';
        if(dateEl) dateEl.textContent = ev.date || 'No Date';
        if(catEl) catEl.textContent = ev.category || 'EVENT';
        if(attEl) attEl.textContent = ev.attendance || '0';

        let eventDate = new Date(ev.date.replace(/-/g, ' '));
        let monthYearKey = "";
        
        if (!isNaN(eventDate)) {
            let monthName = eventDate.toLocaleString('en-US', { month: 'long' }); 
            let year = eventDate.getFullYear();
            monthYearKey = `${monthName} ${year}`.toUpperCase(); 
        } else {
            monthYearKey = ev.date.toUpperCase();
        }

        let coverUrl = globalEventCovers[monthYearKey];
        let imgContainer = document.getElementById('modalImageContainer');
        
        if (imgContainer) {
            if (coverUrl && coverUrl.startsWith('http')) {
                imgContainer.style.backgroundImage = `url('${coverUrl}')`;
            } else {
                imgContainer.style.backgroundImage = `linear-gradient(to right, #05070a, #0c1017)`;
            }
        }

        let entryContainer = document.getElementById('modalEntryImageContainer');
        let entryImage = document.getElementById('modalEntryImage');
        
        if (entryContainer && entryImage) {
            if (ev.image && ev.image.startsWith('http')) {
                entryImage.src = ev.image;
                entryContainer.classList.remove('hidden');
            } else {
                entryImage.src = "";
                entryContainer.classList.add('hidden');
            }
        }

        let linkBtn = document.getElementById('modalLinkBtn');
        if (linkBtn) {
            if(ev.link && ev.link !== '#' && ev.link.startsWith('http')) {
                linkBtn.href = ev.link;
                linkBtn.style.display = 'block';
            } else {
                linkBtn.style.display = 'none';
            }
        }

        let driversHTML = "";
        if (ev.drivers && ev.drivers.length > 0) {
            ev.drivers.forEach(d => {
                driversHTML += `<span class="bg-tntc-main border border-tntc-muted/40 text-tntc-accent px-3 py-1.5 rounded-md text-xs font-bold tracking-wide shadow-sm">${d}</span>`;
            });
        } else {
            driversHTML = `<p class="text-tntc-textSecondary text-xs italic w-full">No drivers logged for this event.</p>`;
        }
        let drvList = document.getElementById('modalDriversList');
        if(drvList) drvList.innerHTML = driversHTML;

        let modal = document.getElementById('eventModal');
        if(modal) {
            modal.classList.remove('modal-closed');
            modal.classList.add('modal-open');
        }
    } catch (err) { console.error("Event Modal Error:", err); }
}