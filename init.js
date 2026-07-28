function switchTab(tabName) {
    const tabs = ['overview', 'logs', 'events', 'campaign', 'liveriders'];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const btnEl = document.getElementById(`btn-${t}`);
        if (!tabEl || !btnEl) return;
        
        if (t === tabName) {
            tabEl.classList.remove('hidden');
            btnEl.classList.add('tab-active');
            btnEl.classList.remove('tab-inactive');
        } else {
            tabEl.classList.add('hidden');
            btnEl.classList.remove('tab-active');
            btnEl.classList.add('tab-inactive');
        }
    });

    // LAZY LOADING
    if (tabName === 'campaign') {
        if (!isTourDataFetched && typeof fetchTourData === "function") fetchTourData();
        else if (typeof processCampaignData === "function") processCampaignData();
    } else {
        if (typeof refreshActiveTab === "function") refreshActiveTab();
    }
}

function refreshActiveTab() {
    let tabOverview = document.getElementById('tab-overview');
    let tabLogs = document.getElementById('tab-logs');
    let tabEvents = document.getElementById('tab-events');
    
    if(tabOverview && !tabOverview.classList.contains('hidden') && typeof applyOverviewFilter === "function") applyOverviewFilter();
    else if(tabLogs && !tabLogs.classList.contains('hidden') && typeof applyLogFilters === "function") applyLogFilters();
    else if(tabEvents && !tabEvents.classList.contains('hidden') && typeof applyEventFilters === "function") applyEventFilters();
}

function logout() {
    sessionStorage.removeItem('tntc_role');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Role-Based Auth Check before showing anything
    const role = sessionStorage.getItem('tntc_role');
    if (!role) {
        // If accessed dashboard directly without auth, throw back to landing page
        window.location.href = 'index.html';
        return;
    }

    // Show Admin Tools if Logged in via Admin Passcode
    if (role === 'admin') {
        let adminBtn = document.getElementById('adminToolsBtn');
        if (adminBtn) {
            adminBtn.classList.remove('hidden');
            adminBtn.classList.add('flex');
        }
    }

    document.querySelectorAll('.custom-modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if(e.target === this) closeModal(this.id); });
    });

    // Fetch initial data
    if (typeof fetchData === "function") fetchData(true);
    if (typeof fetchLiveRidersOnly === "function") fetchLiveRidersOnly();

    // NEW: Check if redirected from Homepage "Download Tracker" button
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if(tabParam) {
        switchTab(tabParam);
        
        // If they came for the tracker, automatically scroll to the bottom of the overview page!
        if(tabParam === 'overview') {
            setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 600);
        }
    }

    // Polling Intervals
    if (typeof fetchLiveRidersOnly === "function") {
        setInterval(fetchLiveRidersOnly, 10000); // Super fast 10-sec poll for telemetry
    }
    if (typeof fetchData === "function") {
        setInterval(() => fetchData(false), 180000); // 3 min poll for static data
    }
});