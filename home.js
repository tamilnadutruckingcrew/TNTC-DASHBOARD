// ==========================================
// TNTC HOMEPAGE ENGINE
// ==========================================

const JOB_LOGS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=1370844484&single=true&output=csv"; 
const NEWS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=0&single=true&output=csv"; 
const GALLERY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=323596247&single=true&output=csv";
const APP_URL = "https://script.google.com/macros/s/AKfycbzvotvrNlRG82W5XIjfkyljzhhZ2508umguh2yLulnLcmXCEuLB2mhhokra6zfcJTQmaA/exec"; 

document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    loadStatsAndMarquee();
    loadNews();
    loadGallery();
});

function loadStatsAndMarquee() {
    let marqueeEl = document.getElementById('marqueeData');
    if(!marqueeEl) return; // Skip if not on home page

    Papa.parse(JOB_LOGS_CSV_URL, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            const rows = results.data;
            let totalDist = 0;
            let totalJobs = 0;
            let recentJobsList = [];

            for(let i = 1; i < rows.length; i++) {
                let row = rows[i];
                let driverName = String(row[2] || '').trim();
                
                if(!driverName || driverName.toUpperCase() === 'UNKNOWN') continue;

                let source = String(row[5] || 'Unknown');
                let dest = String(row[7] || 'Unknown');
                let distStr = String(row[12] || '0').replace(/[^0-9.-]/g, '');
                let dist = parseFloat(distStr) || 0;

                if (dist > 0) {
                    totalDist += dist;
                    totalJobs++;
                    recentJobsList.push({ driver: driverName, source: source, dest: dest, dist: dist });
                }
            }
            
            let marqueeHtml = "";
            let topRecent = recentJobsList.slice(-10).reverse(); 
            topRecent.forEach(job => {
                marqueeHtml += `
                <span class="mx-6 flex items-center gap-2 inline-flex">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-tntc-distance"></i> 
                    JOB DELIVERED: <span class="text-white">${job.driver}</span> 
                    <span class="text-tntc-muted mx-2">|</span> 
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-tntc-accent"></i>
                    <span class="text-tntc-accent">${job.source} ➔ ${job.dest}</span> (${job.dist}km)
                </span>`;
            });

            if (marqueeEl) {
                if (marqueeHtml === "") marqueeHtml = `<span class="text-tntc-textSecondary">Waiting for new jobs...</span>`;
                let repeatingBlock = `<span class="inline-flex items-center">${marqueeHtml}</span>`;
                marqueeEl.innerHTML = repeatingBlock + repeatingBlock;
                if(typeof lucide !== 'undefined') lucide.createIcons({ root: marqueeEl });
            }

            const earthOrbitKm = 40075;
            const exactOrbits = totalDist / earthOrbitKm;
            const orbits = Math.floor(exactOrbits);
            const kmToNextOrbit = earthOrbitKm - (totalDist % earthOrbitKm);
            
            let progressDecimal = exactOrbits / 400; 
            if (progressDecimal > 1) progressDecimal = 1; 

            animateValue("statDistance", 0, totalDist, 2500);
            animateValue("statJobs", 0, totalJobs, 2500);
            animateValue("statOrbits", 0, orbits, 2500);
            animateValue("statNextOrbit", 0, kmToNextOrbit, 2500);
            
            let orbitCountDisplay = document.getElementById('orbitCountDisplay');
            if(orbitCountDisplay) orbitCountDisplay.innerText = orbits;

            drawOrbitCurve(progressDecimal);
        },
        error: function(err) {
            console.error("PapaParse Network Error:", err);
            if(marqueeEl) marqueeEl.innerHTML = `<span class="text-red-500 font-bold">Error connecting to VTC Database.</span>`;
        }
    });
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let val = Math.floor(progress * (end - start) + start);
        
        if (val >= 1000000) {
            obj.innerHTML = (val / 1000000).toFixed(1) + '<span class="text-3xl ml-1 font-bold">M</span>';
        } else if (val >= 1000 && id !== 'statOrbits') {
            obj.innerHTML = (val / 1000).toFixed(1) + '<span class="text-3xl ml-1 font-bold">K</span>';
        } else {
            obj.innerHTML = val.toLocaleString();
        }
        
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function drawOrbitCurve(progress) {
    const path = document.getElementById('orbitProgressPath');
    const truck = document.getElementById('truckIndicator');
    if(!path || !truck) return;

    const length = path.getTotalLength() || 1000; 
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    
    setTimeout(() => {
        path.style.strokeDashoffset = length - (length * progress);
        const point = path.getPointAtLength(length * progress);
        truck.style.left = `${(point.x / 1000) * 100}%`;
        truck.style.top = `${(point.y / 200) * 100}%`;
        truck.style.opacity = "1";
    }, 500);
}

function loadNews() {
    if(NEWS_CSV_URL.includes("YOUR_")) return;
    Papa.parse(NEWS_CSV_URL, { 
        download: true, 
        header: true, 
        skipEmptyLines: true,
        complete: function(results) {
            let container = document.getElementById('newsContainer');
            if(!container) return; // Safe check for homepage container

            if(results.data && results.data.length > 0 && results.data[0].TITLE) {
                let newsSection = document.getElementById('news');
                if(newsSection) newsSection.classList.remove('hidden');
                
                let html = "";
                // Show latest 3 items as preview on home page
                let previewItems = results.data.slice(0, 3);
                
                previewItems.forEach(item => {
                    if(item.TITLE) {
                        let safeTitle = (item.TITLE || '').replace(/'/g, "\\'");
                        let safeCat = (item.CATEGORY || '').replace(/'/g, "\\'");
                        let safeImg = (item.IMAGE_URL || '').replace(/'/g, "\\'");
                        let safeDesc = (item.DESCRIPTION || '').replace(/'/g, "\\'").replace(/(\r\n|\n|\r)/gm, " ");
                        let safeLink = (item.LINK || '').replace(/'/g, "\\'");

                        html += `
                        <div class="bg-tntc-card border border-tntc-muted/50 rounded-xl overflow-hidden hover:border-tntc-accent/50 transition-colors group flex flex-col justify-between">
                            <div>
                                <img src="${item.IMAGE_URL}" class="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" onerror="this.src='https://placehold.co/600x400/0a0e14/06b6d4?text=TNTC+News'">
                                <div class="p-6">
                                    <span class="text-[10px] text-tntc-accent font-bold uppercase tracking-widest">${item.CATEGORY}</span>
                                    <h3 class="text-xl font-bold text-white mt-2 mb-3">${item.TITLE}</h3>
                                    <p class="text-sm text-tntc-textSecondary mb-4 line-clamp-3">${item.DESCRIPTION}</p>
                                </div>
                            </div>
                            <div class="px-6 pb-6">
                                <button onclick="openNewsModal('${safeTitle}', '${safeCat}', '${safeImg}', '${safeDesc}', '${safeLink}')" class="text-xs font-bold text-white flex items-center gap-2 group-hover:text-tntc-accent transition-colors cursor-pointer">READ MORE <i data-lucide="arrow-right" class="w-3 h-3"></i></button>
                            </div>
                        </div>`;
                    }
                });
                container.innerHTML = html;
                if(typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    });
}

function loadGallery() {
    if(GALLERY_CSV_URL.includes("YOUR_")) return;
    Papa.parse(GALLERY_CSV_URL, { 
        download: true, 
        header: true, 
        skipEmptyLines: true,
        complete: function(results) {
            let container = document.getElementById('galleryContainer');
            if(!container) return; // Safe check for homepage container

            if(results.data && results.data.length > 0 && results.data[0].IMAGE_URL) {
                let gallerySection = document.getElementById('gallery');
                if(gallerySection) gallerySection.classList.remove('hidden');

                let html = "";
                // Show latest 4 images as preview on home page
                let previewImages = results.data.slice(0, 4);

                previewImages.forEach(item => {
                    if(item.IMAGE_URL) {
                        html += `
                        <div class="aspect-square rounded-xl overflow-hidden bg-tntc-main border border-tntc-muted/30 group">
                            <img src="${item.IMAGE_URL}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://placehold.co/400x400/0a0e14/06b6d4?text=TNTC'">
                        </div>`;
                    }
                });
                container.innerHTML = html;
            }
        }
    });
}

// --- SECURITY GATEWAY & DOWNLOAD LOGIN ---
let redirectTarget = "dashboard.html"; 

function secureDownloadLogin() {
    redirectTarget = "dashboard.html?tab=overview"; 
    let modal = document.getElementById('authModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function openAuthModal() {
    redirectTarget = "dashboard.html";
    let modal = document.getElementById('authModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeAuthModal() {
    let modal = document.getElementById('authModal');
    if(modal) { modal.classList.remove('flex'); modal.classList.add('hidden'); }
}

function checkPasscode() {
    const code = document.getElementById('passcode').value;
    if (code === 'TNTC2024' || code === 'ADMIN007') {
        sessionStorage.setItem('tntc_role', code === 'ADMIN007' ? 'admin' : 'driver');
        window.location.href = redirectTarget; 
    } else {
        alert('Invalid Passcode!');
    }
}

function openApplyModal() {
    let modal = document.getElementById('applyModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeApplyModal() {
    let modal = document.getElementById('applyModal');
    if(modal) { modal.classList.remove('flex'); modal.classList.add('hidden'); }
}

async function submitApplication(e) {
    e.preventDefault();
    if(APP_URL.includes("YOUR_")) {
        alert("Admin needs to connect the Database URL in home.js first!");
        return;
    }

    const btn = document.getElementById('btnSubmitApp');
    if(!btn) return;

    btn.innerText = "Sending...";
    btn.disabled = true;
    
    const payload = {
        action: "SUBMIT_APPLICATION",
        data: {
            name: document.getElementById('appName').value,
            steamId: document.getElementById('appSteam').value,
            tmpId: document.getElementById('appTMP').value,
            discord: document.getElementById('appDiscord').value,
            reason: document.getElementById('appReason').value
        }
    };
    
    try {
        await fetch(APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        btn.innerText = "Application Sent!";
        btn.classList.add('bg-green-500', 'text-white');
        btn.classList.remove('bg-yellow-500', 'text-black');
        setTimeout(() => {
            closeApplyModal();
            let form = document.getElementById('applicationForm');
            if(form) form.reset();
            btn.innerText = "Submit Application";
            btn.classList.remove('bg-green-500', 'text-white');
            btn.classList.add('bg-yellow-500', 'text-black');
            btn.disabled = false;
        }, 2000);
    } catch (err) {
        alert("Error sending application.");
        btn.innerText = "Submit Application";
        btn.disabled = false;
    }
}