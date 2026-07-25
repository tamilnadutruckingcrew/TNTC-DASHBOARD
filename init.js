
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
                if (!isTourDataFetched) fetchTourData();
                else processCampaignData();
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

        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.custom-modal').forEach(modal => {
                modal.addEventListener('click', function(e) { if(e.target === this) closeModal(this.id); });
            });

            fetchData(true);
            fetchLiveRidersOnly();

            setInterval(fetchLiveRidersOnly, 10000); // Super fast 10-sec poll for telemetry
            setInterval(() => fetchData(false), 180000); // 3 min poll for static data
        });