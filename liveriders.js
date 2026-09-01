function renderLiveRiders(data) {
    let grid = document.getElementById('liveRidersGrid');
    let dispatchContainer = document.getElementById('activeDispatchContainer');
    let dispatchBadge = document.getElementById('activeDispatchBadge');
    
    // 1. Identify the current logged-in user
    const currentUserTracker = (sessionStorage.getItem('tntc_tracker') || '').toUpperCase().trim();
    const currentUsername = (sessionStorage.getItem('tntc_username') || '').toUpperCase().trim();

    try {
        let validRows = [];
        data.forEach(row => { if(row && row[0] && String(row[0]).toUpperCase() !== 'DRIVER' && String(row[0]).trim() !== '') validRows.push(row); });
        
        // ==========================================
        // PART A: UPDATE PERSONAL DASHBOARD DISPATCH
        // ==========================================
        if (dispatchContainer) {
            let myDispatchFound = false;

            if (currentUserTracker || currentUsername) {
                // Find row matching tracker name OR username
                const myRow = validRows.find(r => {
                    let d = String(r[0]).toUpperCase().trim();
                    return d !== '' && (d === currentUserTracker || d === currentUsername);
                });

                if (myRow) {
                    myDispatchFound = true;
                    let source_city = String(myRow[1] || 'Unknown'); let source_company = String(myRow[2] || 'Unknown');
                    let dest_city = String(myRow[3] || 'Unknown'); let dest_company = String(myRow[4] || 'Unknown'); 
                    let cargo = String(myRow[5] || 'Unknown'); let dist = String(myRow[6] || '0 km'); 
                    let status = String(myRow[8] || '').toUpperCase().trim();
                    let isPaused = status === 'PAUSED';

                    // Update Badge Status
                    if (dispatchBadge) {
                        if (isPaused) {
                            dispatchBadge.className = "text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2.5 py-1 rounded-full font-black tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.2)]";
                            dispatchBadge.innerText = "HALTED";
                        } else {
                            dispatchBadge.className = "text-[8px] bg-tntc-distance/10 text-tntc-distance border border-tntc-distance/30 px-2.5 py-1 rounded-full animate-pulse font-black tracking-widest shadow-[0_0_10px_rgba(74,222,128,0.2)]";
                            dispatchBadge.innerText = "LIVE UPLINK";
                        }
                    }

                    // Render Glassmorphic Active Job Card
                    let myDispatchHtml = `
                        <div class="space-y-4 w-full ${isPaused ? 'grayscale-[40%] opacity-80' : ''}">
                            <!-- Source Box -->
                            <div class="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                                <div class="absolute left-0 top-0 w-1 h-full ${isPaused ? 'bg-yellow-500/50' : 'bg-tntc-accent/50'}"></div>
                                <div class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-white/10 transition-colors">
                                    <i data-lucide="map-pin" class="w-4 h-4 text-tntc-textSecondary"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-[9px] text-tntc-textSecondary uppercase tracking-widest font-black mb-1">Departure</p>
                                    <h5 class="text-sm font-black text-white leading-tight truncate">${source_city}</h5>
                                    <p class="text-[10px] text-tntc-textSecondary font-bold truncate tracking-wider uppercase mt-0.5"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-1"></i> ${source_company}</p>
                                </div>
                            </div>
                            
                            <!-- Connecting Route Line -->
                            <div class="flex justify-center -my-2 relative z-10">
                                <div class="h-6 w-[2px] bg-gradient-to-b from-white/10 to-tntc-distance/30"></div>
                            </div>
                            
                            <!-- Destination Box -->
                            <div class="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-tntc-distance/10 relative overflow-hidden group hover:border-tntc-distance/30 transition-colors shadow-[0_0_15px_rgba(74,222,128,0.02)]">
                                <div class="absolute left-0 top-0 w-1 h-full bg-tntc-distance/50"></div>
                                <div class="w-10 h-10 rounded-full bg-tntc-distance/10 border border-tntc-distance/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                                    <i data-lucide="map-pin" class="w-4 h-4 text-tntc-distance"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-[9px] text-tntc-distance uppercase tracking-widest font-black mb-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">Destination</p>
                                    <h5 class="text-sm font-black text-white leading-tight truncate">${dest_city}</h5>
                                    <p class="text-[10px] text-tntc-textSecondary font-bold truncate tracking-wider uppercase mt-0.5"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-1"></i> ${dest_company}</p>
                                </div>
                            </div>

                            <!-- Cargo & Distance Metrics -->
                            <div class="grid grid-cols-2 gap-3 mt-2">
                                <div class="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                                    <p class="text-[8px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1 flex items-center gap-1"><i data-lucide="package" class="w-3 h-3"></i> Cargo</p>
                                    <p class="text-xs font-bold text-white truncate" title="${cargo}">${cargo}</p>
                                </div>
                                <div class="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                                    <p class="text-[8px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1 flex items-center gap-1"><i data-lucide="milestone" class="w-3 h-3"></i> Target</p>
                                    <p class="text-xs font-mono font-black text-tntc-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.5)] truncate">${dist}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    updateDOMIfChanged('activeDispatchContainer', myDispatchHtml);
                }
            }

            // Fallback UI if no job is found for the user
            if (!myDispatchFound) {
                if (dispatchBadge) {
                    dispatchBadge.className = "text-[8px] bg-white/5 text-tntc-textSecondary border border-white/10 px-2.5 py-1 rounded-full font-black tracking-widest";
                    dispatchBadge.innerText = "OFF DUTY";
                }
                let fallbackHtml = `
                    <div class="flex flex-col items-center justify-center py-10 opacity-50 h-full">
                        <div class="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                            <i data-lucide="moon" class="w-5 h-5 text-tntc-textSecondary"></i>
                        </div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-tntc-textSecondary text-center">No active telemetry dispatch found.</p>
                        <p class="text-[9px] font-bold text-tntc-textSecondary/50 text-center mt-2 tracking-wider">Launch the tracker to initiate uplink.</p>
                    </div>
                `;
                updateDOMIfChanged('activeDispatchContainer', fallbackHtml);
            }
        }

        // ==========================================
        // PART B: RENDER FULL LIVE RIDERS GRID
        // ==========================================
        if (!grid) return; // Prevent errors if the Live Riders tab isn't loaded

        let activeRiders = validRows.filter(r => String(r[8] || '').toUpperCase().trim() !== 'PAUSED');
        let pausedRiders = validRows.filter(r => String(r[8] || '').toUpperCase().trim() === 'PAUSED');
        
        let activeRiderCountEl = document.getElementById('activeRiderCount');
        if (activeRiderCountEl) activeRiderCountEl.innerText = activeRiders.length;
        
        if(validRows.length === 0) {
            updateDOMIfChanged('liveRidersGrid', `
            <div class="col-span-full bg-slate-900/40 backdrop-blur-xl border border-white/5 p-16 rounded-3xl text-center shadow-2xl flex flex-col items-center justify-center">
                <div class="p-5 bg-black/40 rounded-full border border-white/10 mb-6 shadow-inner relative">
                    <i data-lucide="radio" class="w-10 h-10 text-tntc-textSecondary"></i>
                </div>
                <h3 class="text-xl font-black text-white uppercase tracking-widest drop-shadow-md">Grid Empty</h3>
                <p class="text-tntc-textSecondary text-xs mt-3 max-w-sm font-medium tracking-wide">All operatives are currently off duty. Awaiting incoming telemetry links...</p>
            </div>`);
            return;
        }
        
        let html = "";
        
        activeRiders.forEach(row => {
            let driver = String(row[0] || 'Unknown'); let source_city = String(row[1] || 'Unknown'); let source_company = String(row[2] || 'Unknown');
            let dest_city = String(row[3] || 'Unknown'); let dest_company = String(row[4] || 'Unknown'); let cargo = String(row[5] || 'Unknown');
            let dist = String(row[6] || '0 km'); let time = String(row[7] || '');
            
            html += `
            <div class="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-tntc-accent/50 transition-all duration-300 group relative flex flex-col h-full">
                <div class="absolute inset-0 bg-gradient-to-br from-tntc-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div class="p-6 border-b border-white/5 bg-black/40 flex justify-between items-center relative z-10 shrink-0">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-tntc-accent/10 border border-tntc-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                            <i data-lucide="user" class="w-6 h-6 text-tntc-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-white uppercase tracking-wider leading-tight drop-shadow-md">${driver}</h3>
                            <p class="text-[9px] text-tntc-textSecondary font-mono font-bold uppercase tracking-widest mt-1"><i data-lucide="clock" class="w-3 h-3 inline relative -top-[1px]"></i> ${time}</p>
                        </div>
                    </div>
                    <span class="relative flex h-3.5 w-3.5 shrink-0 shadow-[0_0_10px_rgba(74,222,128,0.8)] rounded-full">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                    </span>
                </div>
                <div class="p-7 relative z-10 flex-1 flex flex-col justify-between">
                    <div class="flex flex-col gap-5 mb-8">
                        <div class="flex items-start gap-4">
                            <div class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-inner"><i data-lucide="map-pin" class="w-4 h-4 text-tntc-textSecondary"></i></div>
                            <div class="min-w-0">
                                <p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1">Departure</p>
                                <p class="text-base font-black text-white leading-tight truncate">${source_city}</p>
                                <p class="text-[10px] font-bold text-tntc-textSecondary mt-1 truncate tracking-wider uppercase"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-1"></i> ${source_company}</p>
                            </div>
                        </div>
                        <div class="ml-4 border-l-2 border-dashed border-white/10 h-8 my-[-20px]"></div>
                        <div class="flex items-start gap-4">
                            <div class="w-8 h-8 rounded-full bg-tntc-distance/10 border border-tntc-distance/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(74,222,128,0.2)]"><i data-lucide="map-pin" class="w-4 h-4 text-tntc-distance"></i></div>
                            <div class="min-w-0">
                                <p class="text-[9px] text-tntc-distance font-black uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">Destination</p>
                                <p class="text-base font-black text-white leading-tight truncate">${dest_city}</p>
                                <p class="text-[10px] font-bold text-tntc-textSecondary mt-1 truncate tracking-wider uppercase"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-1"></i> ${dest_company}</p>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                        <div class="min-w-0">
                            <p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><i data-lucide="package" class="w-3.5 h-3.5"></i> Cargo</p>
                            <p class="text-sm font-bold text-white truncate tracking-wide" title="${cargo}">${cargo}</p>
                        </div>
                        <div class="border-l border-white/10 pl-4 min-w-0">
                            <p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><i data-lucide="milestone" class="w-3.5 h-3.5"></i> Target</p>
                            <p class="text-sm font-mono font-black text-tntc-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.5)] truncate">${dist}</p>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        
        if (pausedRiders.length > 0) {
            html += `<div class="col-span-full mt-6 mb-4 border-b border-amber-500/20 pb-4 flex items-center justify-between"><h3 class="text-sm font-black text-amber-500 flex items-center gap-2 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"><i data-lucide="pause-circle" class="w-5 h-5"></i> Dormant Links (Cached)</h3></div>`;
                     
            pausedRiders.forEach(row => {
                let driver = String(row[0] || 'Unknown'); let source_city = String(row[1] || 'Unknown'); let dest_city = String(row[3] || 'Unknown');
                let cargo = String(row[5] || 'Unknown'); let dist = String(row[6] || '0 km'); let savedTimeStr = String(row[9] || '');
                let cleanStr = savedTimeStr.replace(/-/g, ' '); 
                
                let savedDate = new Date(Date.parse(cleanStr));
                if (isNaN(savedDate)) {
                    let parts = savedTimeStr.match(/(\d+)-(\w+)-(\d+)\s+(\d+):(\d+)\s+(AM|PM)/i);
                    if (!parts) parts = cleanStr.match(/(\d+)\s+(\w+)\s+(\d+)\s+(\d+):(\d+)\s+(AM|PM)/i);
                    if (parts) {
                        let months = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
                        let hours = parseInt(parts[4]) + (parts[6].toUpperCase() === 'PM' && parts[4] !== '12' ? 12 : 0);
                        if (parts[6].toUpperCase() === 'AM' && parts[4] === '12') hours = 0;
                        savedDate = new Date(parts[3], months[parts[2]], parts[1], hours, parts[5]);
                    }
                }
                
                let expiresTime = isNaN(savedDate) ? 0 : savedDate.getTime() + (48 * 60 * 60 * 1000);
                
                html += `
                <div class="bg-slate-900/40 backdrop-blur-xl border border-amber-500/20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-amber-500/40 transition-all duration-300 group relative flex flex-col h-full opacity-70 hover:opacity-100 grayscale-[40%] hover:grayscale-0">
                    <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div class="p-6 border-b border-amber-500/10 bg-black/40 flex justify-between items-center relative z-10 shrink-0">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <i data-lucide="user" class="w-6 h-6 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-black text-white uppercase tracking-wider leading-tight drop-shadow-md">${driver}</h3>
                                <p class="text-[9px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-1 mt-1 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]"><i data-lucide="pause" class="w-3 h-3"></i> <span class="paused-timer" data-expires="${expiresTime}">Calculating...</span></p>
                            </div>
                        </div>
                        <i data-lucide="moon" class="w-5 h-5 text-amber-500/50"></i>
                    </div>
                    <div class="p-7 relative z-10 flex-1 flex flex-col justify-between">
                        <div class="flex flex-col gap-5 mb-8">
                            <div class="flex items-start gap-4">
                                <div class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-inner"><i data-lucide="map-pin" class="w-4 h-4 text-tntc-textSecondary"></i></div>
                                <div class="min-w-0"><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1">Departure</p><p class="text-base font-black text-white leading-tight truncate">${source_city}</p></div>
                            </div>
                            <div class="ml-4 border-l-2 border-dashed border-white/10 h-8 my-[-20px]"></div>
                            <div class="flex items-start gap-4">
                                <div class="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]"><i data-lucide="map-pin" class="w-4 h-4 text-amber-500"></i></div>
                                <div class="min-w-0"><p class="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1">Destination</p><p class="text-base font-black text-white leading-tight truncate">${dest_city}</p></div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                            <div class="min-w-0"><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><i data-lucide="package" class="w-3.5 h-3.5"></i> Cargo</p><p class="text-sm font-bold text-white truncate tracking-wide" title="${cargo}">${cargo}</p></div>
                            <div class="border-l border-white/10 pl-4 min-w-0"><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><i data-lucide="milestone" class="w-3.5 h-3.5"></i> Target</p><p class="text-sm font-mono font-black text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)] truncate">${dist}</p></div>
                        </div>
                    </div>
                </div>`;
            });
        }
        
        updateDOMIfChanged('liveRidersGrid', html);
    } catch (err) {}
}