
        function renderLiveRiders(data) {
            let grid = document.getElementById('liveRidersGrid');
            if(!grid) return;
            
            try {
                let validRows = [];
                data.forEach(row => {
                    if(row && row[0] && String(row[0]).toUpperCase() !== 'DRIVER' && String(row[0]).trim() !== '') {
                        validRows.push(row);
                    }
                });
                
                let activeRiders = validRows.filter(r => String(r[8] || '').toUpperCase().trim() !== 'PAUSED');
                let pausedRiders = validRows.filter(r => String(r[8] || '').toUpperCase().trim() === 'PAUSED');
                
                let activeRiderCountEl = document.getElementById('activeRiderCount');
                if (activeRiderCountEl) activeRiderCountEl.innerText = activeRiders.length;
                
                if(validRows.length === 0) {
                    updateDOMIfChanged('liveRidersGrid', `
                    <div class="col-span-full bg-tntc-card border border-tntc-muted/30 p-12 rounded-xl text-center shadow-xl flex flex-col items-center justify-center">
                        <div class="p-4 bg-tntc-main rounded-full border border-tntc-muted/20 mb-4 shadow-inner">
                            <i data-lucide="coffee" class="w-10 h-10 text-tntc-textSecondary"></i>
                        </div>
                        <h3 class="text-xl font-black text-tntc-textPrimary uppercase tracking-wide">No Active Deliveries</h3>
                        <p class="text-tntc-textSecondary text-sm mt-2 max-w-sm">All division drivers are currently off duty or in deep sleep. Waiting for telemetry link...</p>
                    </div>`);
                    return;
                }
                
                let html = "";
                
                activeRiders.forEach(row => {
                    let driver = String(row[0] || 'Unknown');
                    let source_city = String(row[1] || 'Unknown');
                    let source_company = String(row[2] || 'Unknown');
                    let dest_city = String(row[3] || 'Unknown');
                    let dest_company = String(row[4] || 'Unknown');
                    let cargo = String(row[5] || 'Unknown');
                    let dist = String(row[6] || '0 km');
                    let time = String(row[7] || '');
                    
                    html += `
                    <div class="bg-tntc-card border border-tntc-muted/40 rounded-xl overflow-hidden shadow-xl hover:border-tntc-accent/50 transition-colors group relative flex flex-col h-full">
                        <div class="absolute inset-0 bg-gradient-to-br from-tntc-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <div class="p-5 border-b border-tntc-muted/20 bg-[#0a0d14] flex justify-between items-center relative z-10 shrink-0">
                            <div class="flex items-center gap-3.5">
                                <div class="w-10 h-10 rounded-full bg-tntc-accent/20 border border-tntc-accent/50 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                                    <i data-lucide="user" class="w-5 h-5 text-tntc-accent"></i>
                                </div>
                                <div>
                                    <h3 class="text-base font-black text-tntc-textPrimary uppercase tracking-wide leading-tight">${driver}</h3>
                                    <p class="text-[10px] text-tntc-textSecondary font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5"><i data-lucide="clock" class="w-3 h-3"></i> Started at ${time}</p>
                                </div>
                            </div>
                            <span class="flex h-3 w-3 relative ml-2">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                            </span>
                        </div>
                        <div class="p-6 relative z-10 flex-1 flex flex-col justify-between">
                            <div class="flex flex-col gap-4 mb-6">
                                <div class="flex items-start gap-3">
                                    <div class="w-6 h-6 rounded-full bg-tntc-main border border-tntc-muted/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><i data-lucide="map-pin" class="w-3 h-3 text-tntc-textSecondary"></i></div>
                                    <div><p class="text-[10px] text-tntc-textSecondary font-black uppercase tracking-wider mb-1">Source</p><p class="text-sm font-bold text-tntc-textPrimary leading-tight">${source_city}</p><p class="text-[10px] font-semibold text-tntc-textSecondary mt-0.5"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-0.5"></i> ${source_company}</p></div>
                                </div>
                                <div class="ml-3 border-l-2 border-dashed border-tntc-muted/30 h-6 my-[-16px]"></div>
                                <div class="flex items-start gap-3">
                                    <div class="w-6 h-6 rounded-full bg-tntc-distance/20 border border-tntc-distance/50 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-tntc-distance/20"><i data-lucide="map-pin" class="w-3 h-3 text-tntc-distance"></i></div>
                                    <div><p class="text-[10px] text-tntc-distance font-black uppercase tracking-wider mb-1">Destination</p><p class="text-sm font-bold text-tntc-textPrimary leading-tight">${dest_city}</p><p class="text-[10px] font-semibold text-tntc-textSecondary mt-0.5"><i data-lucide="building-2" class="w-3 h-3 inline relative -top-[1px] mr-0.5"></i> ${dest_company}</p></div>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3 p-3.5 bg-tntc-main rounded-xl border border-tntc-muted/20 shadow-inner">
                                <div><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i data-lucide="package" class="w-3 h-3"></i> Cargo</p><p class="text-xs font-bold text-tntc-textPrimary truncate" title="${cargo}">${cargo}</p></div>
                                <div class="border-l border-tntc-muted/20 pl-3"><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i data-lucide="milestone" class="w-3 h-3"></i> Distance</p><p class="text-xs font-mono font-bold text-tntc-accent">${dist}</p></div>
                            </div>
                        </div>
                    </div>`;
                });
                
                if (pausedRiders.length > 0) {
                    html += `<div class="col-span-full mt-4 mb-2 border-b border-amber-500/20 pb-2 flex items-center justify-between"><h3 class="text-sm font-black text-amber-500 flex items-center gap-2 uppercase tracking-wide"><i data-lucide="pause-circle" class="w-5 h-5"></i> Paused Deliveries (Cached)</h3></div>`;
                             
                    pausedRiders.forEach(row => {
                        let driver = String(row[0] || 'Unknown');
                        let source_city = String(row[1] || 'Unknown');
                        let dest_city = String(row[3] || 'Unknown');
                        let cargo = String(row[5] || 'Unknown');
                        let dist = String(row[6] || '0 km');
                        let savedTimeStr = String(row[9] || '');
                        let cleanStr = savedTimeStr.replace(/-/g, ' '); 
                        let savedDate = new Date(cleanStr);
                        let expiresTime = isNaN(savedDate) ? 0 : savedDate.getTime() + (48 * 60 * 60 * 1000);
                        
                        html += `
                        <div class="bg-[#0f141e] border border-amber-500/30 rounded-xl overflow-hidden shadow-xl hover:border-amber-500/50 transition-colors group relative flex flex-col h-full opacity-80 hover:opacity-100">
                            <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            <div class="p-5 border-b border-amber-500/20 bg-[#0a0d14] flex justify-between items-center relative z-10 shrink-0">
                                <div class="flex items-center gap-3.5">
                                    <div class="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]"><i data-lucide="user" class="w-5 h-5 text-amber-500"></i></div>
                                    <div>
                                        <h3 class="text-base font-black text-tntc-textPrimary uppercase tracking-wide leading-tight">${driver}</h3>
                                        <p class="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5"><i data-lucide="pause" class="w-3 h-3"></i> <span class="paused-timer" data-expires="${expiresTime}">Calculating...</span></p>
                                    </div>
                                </div>
                                <i data-lucide="moon" class="w-4 h-4 text-amber-500/70"></i>
                            </div>
                            <div class="p-6 relative z-10 flex-1 flex flex-col justify-between grayscale-[30%]">
                                <div class="flex flex-col gap-4 mb-6">
                                    <div class="flex items-start gap-3">
                                        <div class="w-6 h-6 rounded-full bg-tntc-main border border-tntc-muted/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"><i data-lucide="map-pin" class="w-3 h-3 text-tntc-textSecondary"></i></div>
                                        <div><p class="text-[10px] text-tntc-textSecondary font-black uppercase tracking-wider mb-1">Source</p><p class="text-sm font-bold text-tntc-textPrimary leading-tight">${source_city}</p></div>
                                    </div>
                                    <div class="ml-3 border-l-2 border-dashed border-tntc-muted/30 h-6 my-[-16px]"></div>
                                    <div class="flex items-start gap-3">
                                        <div class="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-amber-500/20"><i data-lucide="map-pin" class="w-3 h-3 text-amber-500"></i></div>
                                        <div><p class="text-[10px] text-amber-500 font-black uppercase tracking-wider mb-1">Destination</p><p class="text-sm font-bold text-tntc-textPrimary leading-tight">${dest_city}</p></div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 p-3.5 bg-tntc-main rounded-xl border border-tntc-muted/20 shadow-inner">
                                    <div><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i data-lucide="package" class="w-3 h-3"></i> Cargo</p><p class="text-xs font-bold text-tntc-textPrimary truncate" title="${cargo}">${cargo}</p></div>
                                    <div class="border-l border-tntc-muted/20 pl-3"><p class="text-[9px] text-tntc-textSecondary font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i data-lucide="milestone" class="w-3 h-3"></i> Distance</p><p class="text-xs font-mono font-bold text-amber-500">${dist}</p></div>
                                </div>
                            </div>
                        </div>`;
                    });
                }
                
                updateDOMIfChanged('liveRidersGrid', html);
            } catch (err) { console.error("Live Riders Render Error:", err); }
        }

        setInterval(() => {
            document.querySelectorAll('.paused-timer').forEach(el => {
                let expires = parseInt(el.getAttribute('data-expires'));
                if(isNaN(expires) || expires === 0) return;
                let diff = expires - new Date().getTime();
                if(diff <= 0) {
                    el.innerText = "Expired (Dropping soon)";
                    el.classList.add('text-red-500'); el.classList.remove('text-amber-500');
                } else {
                    let h = Math.floor(diff / (1000 * 60 * 60));
                    let m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    el.innerText = `${h}h ${m}m left`;
                }
            });
        }, 1000);