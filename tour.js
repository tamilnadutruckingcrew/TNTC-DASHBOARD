
        function toggleCampaign(id) {
            let content = document.getElementById(id + '-content');
            let icon = document.getElementById(id + '-chevron');
            let text = document.getElementById(id + '-toggle-text');
            if(content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                icon.style.transform = 'rotate(0deg)';
                text.innerText = 'View Manifest';
            } else {
                content.classList.add('expanded');
                icon.style.transform = 'rotate(180deg)';
                text.innerText = 'Hide Manifest';
            }
        }

        function processCampaignData() {
            let campaignTableBody = document.getElementById('campaignTableBody');
            if(!globalTourData.rows || globalTourData.rows.length === 0) {
                if (campaignTableBody) campaignTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-tntc-textSecondary">Loading Tour Data...</td></tr>`;
                return;
            }

            let tourStartDate = new Date('2026-08-01T00:00:00');
            let now = new Date();
            let isLive = now >= tourStartDate;
            
            let badge = document.getElementById('campaignStatusBadge');
            let banner = document.getElementById('campaignUpcomingBanner');
            
            if (!isLive) {
                if(banner) { banner.classList.remove('hidden'); banner.classList.add('flex'); }
                if (badge) {
                    badge.innerText = "COMING SOON";
                    badge.className = "bg-tntc-revenue text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(250,204,21,0.5)] mb-3 inline-block transition-colors";
                }
            } else {
                if(banner) { banner.classList.add('hidden'); banner.classList.remove('flex'); }
                if (badge) {
                    badge.innerText = "LIVE CAMPAIGN";
                    badge.className = "bg-tntc-accent text-[#05070a] px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(56,189,248,0.5)] mb-3 inline-block transition-colors";
                }
            }

            currentProcessedRoutes = [];
            validCampaignDrivers = new Map();
            dynamicTotalTargetDist = 0;

            for(let i = 7; i < globalTourData.headers.length; i++) {
                let orig = String(globalTourData.headers[i] || '');
                let norm = normalizeKey(orig);
                if(norm) validCampaignDrivers.set(norm, orig.trim());
            }

            globalTourData.rows.forEach(tourRow => {
                let id = parseInt(tourRow[0]); 
                if (isNaN(id) || id <= 0) return;

                let source = String(tourRow[1] || '').trim();
                let dest = String(tourRow[3] || '').trim();
                let dist = cleanNumber(tourRow[5] || '0');
                let imageLink = String(tourRow[6] || '').trim(); 

                dynamicTotalTargetDist += dist; 

                let completedByNorm = new Set();
                
                for(let i = 7; i < globalTourData.headers.length; i++) {
                    let norm = normalizeKey(globalTourData.headers[i]);
                    if(!norm) continue;
                    
                    let val = String(tourRow[i] || '').trim().toUpperCase();
                    if(val === 'TRUE' || val === '1' || val === 'YES' || val === '✓') {
                        if (isLive) completedByNorm.add(norm);
                    }
                }

                let driversDisplay = Array.from(completedByNorm).map(n => validCampaignDrivers.get(n) || n).sort();

                currentProcessedRoutes.push({
                    id: id, source: source, dest: dest, dist: dist, image: imageLink,
                    driversNorm: Array.from(completedByNorm), drivers: driversDisplay
                });
            });

            let filterCampaignDriver = document.getElementById('filterCampaignDriver');
            if (filterCampaignDriver) {
                filterCampaignDriver.innerHTML = '<option value="ALL">All Drivers (Global Progress)</option>';
                let sortedNorms = Array.from(validCampaignDrivers.keys()).sort();
                sortedNorms.forEach(norm => { 
                    filterCampaignDriver.innerHTML += `<option value="${norm}">${validCampaignDrivers.get(norm)}</option>`; 
                });
            }
            applyCampaignFilter();
        }

        function applyCampaignFilter() {
            let filterEl = document.getElementById('filterCampaignDriver');
            if(!filterEl) return;
            
            let selectedDriverNorm = filterEl.value;
            let activeDriverCount = validCampaignDrivers.size || 1; 
            
            let dispDist = 0; let dispRoutes = 0; let targetDist = 0; let targetRoutes = 0;
            let displayRoutes = [...currentProcessedRoutes];

            currentProcessedRoutes.forEach(r => {
                let driverCompletes = r.driversNorm.length;
                if (selectedDriverNorm === 'ALL') {
                    dispDist += (r.dist * driverCompletes);
                    dispRoutes += driverCompletes;
                } else {
                    if (r.driversNorm.includes(selectedDriverNorm)) {
                        dispDist += r.dist;
                        dispRoutes += 1;
                    }
                }
            });

            if (selectedDriverNorm === 'ALL') {
                targetDist = dynamicTotalTargetDist * activeDriverCount;
                targetRoutes = currentProcessedRoutes.length * activeDriverCount;
            } else {
                targetDist = dynamicTotalTargetDist;
                targetRoutes = currentProcessedRoutes.length;
            }

            displayRoutes.sort((a, b) => {
                let aCompleted = selectedDriverNorm === 'ALL' ? a.driversNorm.length > 0 : a.driversNorm.includes(selectedDriverNorm);
                let bCompleted = selectedDriverNorm === 'ALL' ? b.driversNorm.length > 0 : b.driversNorm.includes(selectedDriverNorm);
                if (aCompleted && !bCompleted) return -1;
                if (!aCompleted && bCompleted) return 1;
                return a.id - b.id; 
            });

            let tableHTML = "";
            displayRoutes.forEach((route) => {
                let realIndex = currentProcessedRoutes.findIndex(r => r.id === route.id);
                let driverCount = route.driversNorm.length;
                let isVisuallyCompleted = selectedDriverNorm === 'ALL' ? driverCount > 0 : route.driversNorm.includes(selectedDriverNorm);

                if (isVisuallyCompleted) {
                    let statusBadgeHTML = selectedDriverNorm === 'ALL' ? 
                        `<span class="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-tntc-accent/10 text-tntc-accent text-[10px] font-black tracking-widest uppercase rounded border border-tntc-accent/20"><i data-lucide="users" class="w-3 h-3"></i> ${driverCount} / ${activeDriverCount}</span>` : 
                        `<span class="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#166534]/40 text-tntc-distance text-[10px] font-black tracking-widest uppercase rounded border border-tntc-distance/30"><i data-lucide="check" class="w-3.5 h-3.5"></i> Verified</span>`;

                    tableHTML += `
                    <tr class="bg-[#166534]/10 border-l-4 border-tntc-distance transition-colors">
                        <td class="p-3 sm:p-4 text-tntc-textPrimary font-black text-center">${route.id}</td>
                        <td class="p-3 sm:p-4 text-tntc-textPrimary font-bold opacity-90"><span class="text-tntc-textSecondary font-normal text-[10px] uppercase block mb-0.5">Route</span>${route.source} <i data-lucide="arrow-right" class="w-3 h-3 inline text-tntc-distance mx-1"></i> ${route.dest}</td>
                        <td class="p-3 sm:p-4 text-tntc-textSecondary font-mono text-xs">${route.dist.toLocaleString()} km</td>
                        <td class="p-3 sm:p-4 text-center">${statusBadgeHTML}</td>
                        <td class="p-3 sm:p-4 text-right"><button onclick="openCampaignModal(${realIndex})" class="px-3 py-1.5 bg-tntc-main border border-tntc-muted/30 hover:bg-[#166534]/40 hover:border-tntc-distance/50 rounded text-xs font-semibold text-tntc-textPrimary flex items-center justify-center gap-1 transition-colors ml-auto shadow-sm"><i data-lucide="eye" class="w-3 h-3 text-tntc-distance"></i> View</button></td>
                    </tr>`;
                } else {
                    let pendingBadgeHTML = selectedDriverNorm === 'ALL' ? `<span class="text-tntc-textSecondary/40 text-[10px] font-bold">0 / ${activeDriverCount}</span>` : `<span class="inline-flex items-center justify-center px-2 py-1 bg-tntc-muted/10 text-tntc-textSecondary text-[10px] font-bold tracking-wider rounded border border-tntc-muted/20">PENDING</span>`;

                    tableHTML += `
                    <tr class="hover:bg-tntc-hover transition-colors border-l-4 border-transparent opacity-60 hover:opacity-100">
                        <td class="p-3 sm:p-4 text-tntc-textSecondary font-bold text-center">${route.id}</td>
                        <td class="p-3 sm:p-4 text-tntc-textSecondary font-bold"><span class="text-tntc-textSecondary/50 font-normal text-[10px] uppercase block mb-0.5">Route</span>${route.source} <i data-lucide="arrow-right" class="w-3 h-3 inline opacity-50 mx-1"></i> ${route.dest}</td>
                        <td class="p-3 sm:p-4 text-tntc-textSecondary font-mono text-xs">${route.dist.toLocaleString()} km</td>
                        <td class="p-3 sm:p-4 text-center">${pendingBadgeHTML}</td>
                        <td class="p-3 sm:p-4 text-right"><button onclick="openCampaignModal(${realIndex})" class="px-3 py-1.5 bg-tntc-main border border-tntc-muted/30 hover:bg-tntc-hover rounded text-xs font-semibold text-tntc-textPrimary flex items-center justify-center gap-1 transition-colors ml-auto shadow-sm"><i data-lucide="eye" class="w-3 h-3 text-tntc-accent"></i> View</button></td>
                    </tr>`;
                }
            });

            updateDOMIfChanged('campaignTableBody', tableHTML);

            let trsSpan = document.getElementById('campaignTotalRoutesSpan');
            let crsSpan = document.getElementById('campaignRoutesStat');
            let ctsSpan = document.getElementById('campaignTargetStat');
            let cdsSpan = document.getElementById('campaignDistStat');

            if(trsSpan) trsSpan.innerText = targetRoutes;
            if(crsSpan) crsSpan.innerText = dispRoutes;
            if(ctsSpan) ctsSpan.innerText = targetDist.toLocaleString();
            if(cdsSpan) animateValue("campaignDistStat", parseInt(cdsSpan.innerText.replace(/,/g, '')) || 0, dispDist, 800);
            
            let globalPercent = targetDist > 0 ? ((dispDist / targetDist) * 100).toFixed(1) : 0;
            let sbRoutes = document.getElementById('statBoxRoutes');
            let sbDist = document.getElementById('statBoxDist');

            if (sbRoutes && sbDist) {
                if(selectedDriverNorm !== 'ALL') {
                    sbRoutes.classList.add('border-tntc-accent/50', 'bg-tntc-accent/5');
                    sbDist.classList.add('border-tntc-accent/50', 'bg-tntc-accent/5');
                } else {
                    sbRoutes.classList.remove('border-tntc-accent/50', 'bg-tntc-accent/5');
                    sbDist.classList.remove('border-tntc-accent/50', 'bg-tntc-accent/5');
                }
            }

            setTimeout(() => {
                let pBar2 = document.getElementById('campaignCardProgressBar');
                let pText2 = document.getElementById('campaignCardPercent');
                if(pBar2) pBar2.style.width = globalPercent + "%";
                if(pText2) pText2.innerText = globalPercent + "%";
            }, 50);

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function openCampaignModal(index) {
            let route = currentProcessedRoutes[index];
            if(!route) return;
            try {
                let idEl = document.getElementById('campModalId');
                let srcEl = document.getElementById('campModalSource');
                let dstEl = document.getElementById('campModalDest');
                let distEl = document.getElementById('campModalDist');
                let cntEl = document.getElementById('campModalCount');
                let totEl = document.getElementById('campModalTotalDrivers');

                if(idEl) idEl.textContent = route.id;
                if(srcEl) srcEl.textContent = route.source;
                if(dstEl) dstEl.textContent = route.dest;
                if(distEl) distEl.textContent = route.dist.toLocaleString();
                if(cntEl) cntEl.textContent = route.drivers.length;
                if(totEl) totEl.textContent = validCampaignDrivers.size;

                let headerDiv = document.getElementById('campModalHeader');
                if(headerDiv) {
                    if (route.image && route.image.startsWith('http')) {
                        headerDiv.style.backgroundImage = `url('${route.image}')`;
                        headerDiv.innerHTML = `
                            <div class="absolute inset-0 bg-gradient-to-t from-tntc-card via-tntc-card/50 to-transparent z-0"></div>
                            <button onclick="closeModal('campaignModal')" class="absolute top-4 right-4 bg-red-600/80 p-1.5 rounded-full text-white hover:bg-red-600 transition-colors z-20"><i data-lucide="x" class="w-5 h-5"></i></button>`;
                    } else {
                        headerDiv.style.backgroundImage = `url('https://i.postimg.cc/9F7K94r8/map-pattern.png')`;
                        headerDiv.innerHTML = `
                            <div class="absolute inset-0 opacity-20 bg-tntc-accent z-0"></div>
                            <button onclick="closeModal('campaignModal')" class="absolute top-4 right-4 bg-red-600/80 p-1.5 rounded-full text-white hover:bg-red-600 transition-colors z-20"><i data-lucide="x" class="w-5 h-5"></i></button>`;
                    }
                }

                let driversHTML = "";
                if(route.drivers && route.drivers.length > 0) {
                    route.drivers.forEach(d => { driversHTML += `<span class="bg-[#166534]/40 border border-tntc-distance/30 text-tntc-distance px-3 py-1.5 rounded-md text-xs font-bold tracking-wide shadow-sm flex items-center gap-1"><i data-lucide="user-check" class="w-3 h-3"></i> ${d}</span>`; });
                } else {
                    driversHTML = `<p class="text-tntc-textSecondary text-xs italic w-full">Nobody has completed this route yet.</p>`;
                }
                let listEl = document.getElementById('campModalDriversList');
                if(listEl) listEl.innerHTML = driversHTML;
                
                if (typeof lucide !== 'undefined') lucide.createIcons();

                let modal = document.getElementById('campaignModal');
                if(modal) { modal.classList.remove('modal-closed'); modal.classList.add('modal-open'); }
            } catch (err) { console.error("Campaign Modal Error:", err); }
        }