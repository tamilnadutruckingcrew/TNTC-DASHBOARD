const JOB_LOGS_URLS = [
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=1370844484&single=true&output=csv", 
];
const NEWS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=1131291013&single=true&output=csv"; 
const GALLERY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=792315654&single=true&output=csv";
const HOME_APP_URL = "https://script.google.com/macros/s/AKfycbyZ0uzactYvGqMYrQDlIR1ULVWpqxtMSrYUI88pooSP4x8RAl0WyJfimru-7acQVn_c/exec"; 

document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    loadStatsAndMarquee();
    loadNews();
    loadGallery();
    initScrollReveal();
});

let redirectTarget = "dashboard.html"; 

function secureDownloadLogin() {
    redirectTarget = "dashboard.html?tab=overview"; 
    if(typeof openAuthModal === 'function') openAuthModal('login');
}

async function submitLogin() {
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const errorMsg = document.getElementById('loginErrorMsg');
    const btn = document.getElementById('btnLoginSubmit');

    if (!user || !pass) {
        errorMsg.innerText = "Credentials missing.";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');
    let originalBtnText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Processing...`;
    btn.disabled = true;

    const url = `${HOME_APP_URL}?action=LOGIN_USER&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === "success") {
            sessionStorage.setItem('tntc_role', result.user.role);
            sessionStorage.setItem('tntc_username', result.user.username);
            sessionStorage.setItem('tntc_tracker', result.user.trackerName);
            window.location.href = redirectTarget;
        } else {
            errorMsg.innerText = result.message || "Clearance denied.";
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        errorMsg.innerText = "Network link severed.";
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

async function submitRegister() {
    const btn = document.getElementById('btnRegSubmit');
    const errorMsg = document.getElementById('regErrorMsg');
    const successMsg = document.getElementById('regSuccessMsg');

    const user = document.getElementById('regUsername').value.trim();
    const tracker = document.getElementById('regTracker').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const discord = document.getElementById('regDiscord').value.trim();
    const steam = document.getElementById('regSteam').value.trim();
    const tmp = document.getElementById('regTMP').value.trim();
    const reason = document.getElementById('regReason').value.trim();

    if (!user || !pass || !tracker) {
        errorMsg.innerText = "Core parameters missing.";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');
    successMsg.classList.add('hidden');
    
    let originalBtnText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Transmitting...`;
    btn.disabled = true;

    const url = `${HOME_APP_URL}?action=REGISTER_USER&username=${encodeURIComponent(user)}&trackerName=${encodeURIComponent(tracker)}&password=${encodeURIComponent(pass)}&discord=${encodeURIComponent(discord)}&steamId=${encodeURIComponent(steam)}&tmpId=${encodeURIComponent(tmp)}&reason=${encodeURIComponent(reason)}`;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === "success") {
            successMsg.innerText = result.message || "Data Transmitted! Awaiting Command Approval.";
            successMsg.classList.remove('hidden');
            ['regUsername', 'regTracker', 'regPassword', 'regDiscord', 'regSteam', 'regTMP', 'regReason'].forEach(id => { document.getElementById(id).value = ''; });
            setTimeout(() => { if(typeof switchAuthTab === 'function') switchAuthTab('login'); }, 3000);
        } else {
            errorMsg.innerText = result.message || "Transmission failed.";
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        errorMsg.innerText = "Network link severed.";
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function loadStatsAndMarquee() {
    let marqueeEl = document.getElementById('marqueeData');
    if(!marqueeEl) return; 

    let fetchPromises = JOB_LOGS_URLS.map(url => {
        return new Promise((resolve) => {
            Papa.parse(url, {
                download: true, header: false, skipEmptyLines: 'greedy',
                complete: function(results) { resolve(results.data.slice(1)); },
                error: function() { resolve([]); }
            });
        });
    });

    Promise.all(fetchPromises).then(allResults => {
        let combinedRows = [];
        allResults.forEach(rows => combinedRows = combinedRows.concat(rows));
        combinedRows.sort((a, b) => (new Date(a[0]).getTime() || 0) - (new Date(b[0]).getTime() || 0));

        let totalDist = 0; let totalJobs = 0; let recentJobsList = [];

        for(let i = 0; i < combinedRows.length; i++) {
            let row = combinedRows[i];
            let driverName = String(row[2] || '').trim();
            if(!driverName || driverName.toUpperCase() === 'UNKNOWN') continue;

            let source = String(row[5] || 'Unknown'); let dest = String(row[7] || 'Unknown');
            let dist = parseFloat(String(row[12] || '0').replace(/[^0-9.-]/g, '')) || 0;

            if (dist > 0) {
                totalDist += dist; totalJobs++;
                recentJobsList.push({ driver: driverName, source: source, dest: dest, dist: dist });
            }
        }
        
        let marqueeHtml = "";
        let topRecent = recentJobsList.slice(-10).reverse(); 
        topRecent.forEach(job => {
            marqueeHtml += `
            <span class="mx-8 flex items-center gap-2 inline-flex">
                <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-tntc-distance drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]"></i> 
                DELIVERED: <span class="text-white font-black">${job.driver}</span> 
                <span class="text-white/20 mx-2">|</span> 
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-tntc-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]"></i>
                <span class="text-tntc-accent">${job.source} <span class="opacity-50">➔</span> ${job.dest}</span> (${job.dist}km)
            </span>`;
        });

        if (marqueeEl) {
            if (marqueeHtml === "") marqueeHtml = `<span class="text-tntc-textSecondary">Awaiting network data...</span>`;
            marqueeEl.innerHTML = `<span class="inline-flex items-center">${marqueeHtml}${marqueeHtml}</span>`;
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

    }).catch(() => { if(marqueeEl) marqueeEl.innerHTML = `<span class="text-red-500 font-bold">Error compiling array.</span>`; });
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let val = Math.floor(progress * (end - start) + start);
        
        if (val >= 1000000) obj.innerHTML = (val / 1000000).toFixed(1) + '<span class="text-3xl ml-1 font-bold opacity-50">M</span>';
        else if (val >= 1000 && id !== 'statOrbits') obj.innerHTML = (val / 1000).toFixed(1) + '<span class="text-3xl ml-1 font-bold opacity-50">K</span>';
        else obj.innerHTML = val.toLocaleString();
        
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
    let container = document.getElementById('newsContainer');
    if(!container) return; 
    
    Papa.parse(NEWS_CSV_URL, { 
        download: true, header: true, skipEmptyLines: 'greedy',
        complete: function(results) {
            if(results.data && results.data.length > 0 && results.data[0].TITLE) {
                let newsSection = document.getElementById('news');
                if(newsSection) newsSection.classList.remove('hidden');
                
                let sortedNews = [...results.data].sort((a, b) => (new Date(b.DATE).getTime() || 0) - (new Date(a.DATE).getTime() || 0));
                let html = "";
                
                sortedNews.slice(0, 3).forEach(item => {
                    if(item.TITLE) {
                        html += `
                        <div class="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden hover:border-tntc-accent/40 hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] hover:-translate-y-1 transition-all duration-300 group flex flex-col relative">
                            <div class="relative h-48 overflow-hidden shrink-0">
                                <div class="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-transparent z-10"></div>
                                <img src="${item.IMAGE_URL}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onerror="this.src='https://placehold.co/600x400/0a0e14/06b6d4?text=TNTC+News'">
                                <div class="absolute top-4 right-4 z-20">
                                    <span class="px-3 py-1.5 bg-[#05070a]/80 backdrop-blur-md border border-white/10 text-tntc-accent text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-tntc-accent shadow-[0_0_5px_#38bdf8]"></span> ${item.CATEGORY}</span>
                                </div>
                            </div>
                            <div class="p-6 md:p-8 relative z-20 flex-1 flex flex-col bg-gradient-to-b from-[#0a0e14] to-transparent">
                                <h3 class="text-lg font-black text-white mb-4 group-hover:text-tntc-accent transition-colors leading-tight drop-shadow-md">${item.TITLE}</h3>
                                <p class="text-xs text-tntc-textSecondary mb-6 line-clamp-3 leading-relaxed flex-1">${item.DESCRIPTION}</p>
                                <a href="news.html" class="w-full py-3 bg-white/5 hover:bg-tntc-accent/10 border border-white/10 hover:border-tntc-accent/50 text-white hover:text-tntc-accent text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                                    READ DISPATCH <i data-lucide="arrow-right" class="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform"></i>
                                </a>
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
    let container = document.getElementById('galleryContainer');
    if(!container) return; 
    
    Papa.parse(GALLERY_CSV_URL, { 
        download: true, header: true, skipEmptyLines: 'greedy',
        complete: function(results) {
            if(results.data && results.data.length > 0 && results.data[0].IMAGE_URL) {
                let gallerySection = document.getElementById('gallery');
                if(gallerySection) gallerySection.classList.remove('hidden');

                let html = "";
                [...results.data].reverse().slice(0, 4).forEach(item => {
                    if(item.IMAGE_URL) {
                        html += `
                        <a href="gallery.html" class="aspect-square rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-tntc-distance/50 hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] group relative transition-all duration-300 block">
                            <img src="${item.IMAGE_URL}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onerror="this.src='https://placehold.co/400x400/0a0e14/4ade80?text=TNTC'">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <i data-lucide="scan" class="w-10 h-10 text-tntc-distance drop-shadow-[0_0_10px_rgba(74,222,128,0.8)] transform scale-50 group-hover:scale-100 transition-transform duration-300"></i>
                            </div>
                        </a>`;
                    }
                });
                container.innerHTML = html;
                if(typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    });
}

function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('active'); observer.unobserve(entry.target); }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    reveals.forEach(reveal => observer.observe(reveal));
}