// ==========================================
// TNTC HOMEPAGE ENGINE
// ==========================================

// Add all your CSV URLs here inside the array
const JOB_LOGS_URLS = [
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0v7TKTub1VD6qG-d9vloA7IaKoO7eNSZIZaFK3yn-1RUbrff2EZ0mTcSb-MMj_PIZIk8RPF3UVCIp/pub?gid=1370844484&single=true&output=csv", 
];

const NEWS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=1131291013&single=true&output=csv"; 
const GALLERY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqXzcL2gWNqsxzrzesOvz2cdAKuj1kNGHk__4snl815GEU3GGJY8e6epOWOilpp_3a0NiZhasQISqn/pub?gid=792315654&single=true&output=csv";

// 🔴 YOUR GOOGLE APPS SCRIPT WEB APP URL (RENAMED TO PREVENT VAR COLLISIONS) 🔴
const HOME_APP_URL = "https://script.google.com/macros/s/AKfycbyZ0uzactYvGqMYrQDlIR1ULVWpqxtMSrYUI88pooSP4x8RAl0WyJfimru-7acQVn_c/exec"; 

document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    loadStatsAndMarquee();
    loadNews();
    loadGallery();
    initScrollReveal();
});

// ==========================================
// USER AUTHENTICATION & REGISTRATION
// ==========================================
let redirectTarget = "dashboard.html"; 

function secureDownloadLogin() {
    redirectTarget = "dashboard.html?tab=overview"; 
    if(typeof openAuthModal === 'function') openAuthModal('login');
}

// 🔐 BULLETPROOF LOGIN ENGINE
async function submitLogin() {
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const errorMsg = document.getElementById('loginErrorMsg');
    const btn = document.getElementById('btnLoginSubmit');

    if (!user || !pass) {
        errorMsg.innerText = "Username and Password required!";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');
    let originalBtnText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Verifying...`;
    btn.disabled = true;

    // Construct the GET URL
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
            errorMsg.innerText = result.message || "Invalid credentials or account pending.";
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Login Error:", err);
        errorMsg.innerText = "Connection error. Ensure script is deployed correctly.";
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// 📝 BULLETPROOF REGISTRATION ENGINE
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
        errorMsg.innerText = "Username, Tracker Name, and Password are required!";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');
    successMsg.classList.add('hidden');
    
    let originalBtnText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Submitting...`;
    btn.disabled = true;

    // Construct the GET URL
    const url = `${HOME_APP_URL}?action=REGISTER_USER&username=${encodeURIComponent(user)}&trackerName=${encodeURIComponent(tracker)}&password=${encodeURIComponent(pass)}&discord=${encodeURIComponent(discord)}&steamId=${encodeURIComponent(steam)}&tmpId=${encodeURIComponent(tmp)}&reason=${encodeURIComponent(reason)}`;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === "success") {
            successMsg.innerText = result.message || "Application Submitted! Wait for Admin Approval.";
            successMsg.classList.remove('hidden');
            
            ['regUsername', 'regTracker', 'regPassword', 'regDiscord', 'regSteam', 'regTMP', 'regReason'].forEach(id => {
                document.getElementById(id).value = '';
            });

            setTimeout(() => {
                if(typeof switchAuthTab === 'function') switchAuthTab('login');
            }, 3000);
        } else {
            errorMsg.innerText = result.message || "Registration failed. Username may already exist.";
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Register Error:", err);
        errorMsg.innerText = "Connection error. Please try again.";
        errorMsg.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        if(typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ==========================================
// VTC STATS & MARQUEE ENGINE
// ==========================================
function loadStatsAndMarquee() {
    let marqueeEl = document.getElementById('marqueeData');
    if(!marqueeEl) return; 

    let fetchPromises = JOB_LOGS_URLS.map(url => {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: false,
                skipEmptyLines: 'greedy',
                complete: function(results) {
                    let dataRows = results.data.slice(1); 
                    resolve(dataRows);
                },
                error: function(err) {
                    console.error("Error fetching URL:", url, err);
                    resolve([]); 
                }
            });
        });
    });

    Promise.all(fetchPromises).then(allResults => {
        let combinedRows = [];
        
        allResults.forEach(rows => {
            combinedRows = combinedRows.concat(rows);
        });

        combinedRows.sort((a, b) => {
            let dateA = new Date(a[0]).getTime() || 0; 
            let dateB = new Date(b[0]).getTime() || 0;
            return dateA - dateB;
        });

        let totalDist = 0;
        let totalJobs = 0;
        let recentJobsList = [];

        for(let i = 0; i < combinedRows.length; i++) {
            let row = combinedRows[i];
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

    }).catch(err => {
        console.error("Promise Array Error:", err);
        if(marqueeEl) marqueeEl.innerHTML = `<span class="text-red-500 font-bold">Error combining VTC Databases.</span>`;
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

// ==========================================
// CONTENT ENGINES (NEWS & GALLERY)
// ==========================================
function loadNews() {
    let container = document.getElementById('newsContainer');
    if(!container) return; 

    if(NEWS_CSV_URL.includes("YOUR_")) return;
    
    Papa.parse(NEWS_CSV_URL, { 
        download: true, 
        header: true, 
        skipEmptyLines: 'greedy',
        complete: function(results) {
            if(results.data && results.data.length > 0 && results.data[0].TITLE) {
                let newsSection = document.getElementById('news');
                if(newsSection) newsSection.classList.remove('hidden');
                
                let sortedNews = [...results.data].sort((a, b) => {
                    let dateA = new Date(a.DATE).getTime() || 0;
                    let dateB = new Date(b.DATE).getTime() || 0;
                    return dateB - dateA; 
                });
                
                let html = "";
                let previewItems = sortedNews.slice(0, 3);
                
                previewItems.forEach(item => {
                    if(item.TITLE) {
                        let safeTitle = (item.TITLE || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        let safeCat = (item.CATEGORY || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        let safeImg = (item.IMAGE_URL || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        let safeDesc = (item.DESCRIPTION || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/(\r\n|\n|\r)/gm, " ");
                        let safeLink = (item.LINK || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

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
    let container = document.getElementById('galleryContainer');
    if(!container) return; 

    if(GALLERY_CSV_URL.includes("YOUR_")) return;
    
    Papa.parse(GALLERY_CSV_URL, { 
        download: true, 
        header: true, 
        skipEmptyLines: 'greedy',
        complete: function(results) {
            if(results.data && results.data.length > 0 && results.data[0].IMAGE_URL) {
                let gallerySection = document.getElementById('gallery');
                if(gallerySection) gallerySection.classList.remove('hidden');

                let html = "";
                let previewImages = [...results.data].reverse().slice(0, 4);

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

// ==========================================
// SCROLL REVEAL ENGINE
// ==========================================
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    reveals.forEach(reveal => {
        observer.observe(reveal);
    });
}