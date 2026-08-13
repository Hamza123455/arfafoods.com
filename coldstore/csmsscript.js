const dashboardHtml = document.getElementById('mainContent').innerHTML;
    function loadPage(url) {
      const main = document.getElementById('mainContent');
      main.innerHTML = '';
      main.classList.add('p-0');
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.className = 'content-frame';
      main.appendChild(iframe);
    }
    function showDashboard() {
      const main = document.getElementById('mainContent');
      main.classList.remove('p-0');
      main.innerHTML = dashboardHtml;
    }
    function setActiveLink(el) {
      document.querySelectorAll('.sidebar .accordion-body a').forEach(a => a.classList.remove('active-link'));
      el.classList.add('active-link');
    }
    document.getElementById('quickSearch').addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.sidebar .accordion-item').forEach(item => {
        const links = item.querySelectorAll('.accordion-body a');
        if (links.length === 0) return; 
        let anyMatch = false;
        links.forEach(a => {
          const match = !term || a.textContent.toLowerCase().includes(term);
          a.parentElement.style.display = match ? '' : 'none';
          if (match) anyMatch = true;
        });
        const collapseEl = item.querySelector('.accordion-collapse');
        if (term && anyMatch) {
          collapseEl.classList.add('show');
        } else if (term && !anyMatch) {
          collapseEl.classList.remove('show');
        }
      });
    });
    document.getElementById('clearSearch').addEventListener('click', () => {
      const input = document.getElementById('quickSearch');
      input.value = '';
      input.dispatchEvent(new Event('input'));
    });
    function getBellConfig() {
      return {
        url: localStorage.getItem('coldstore_webapp_url') || '',
        key: localStorage.getItem('coldstore_secret_key') || ''
      };
    }
    async function bellApiGet(action) {
      const cfg = getBellConfig();
      if (!cfg.url || !cfg.key) throw new Error('Not connected');
      const res = await fetch(`${cfg.url}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(cfg.key)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    }
    async function loadBellCounts() {
      const statusText = document.getElementById('bellStatusText');
      try {
        const [lookupsResult, listResult] = await Promise.all([bellApiGet('lookups'), bellApiGet('list')]);
        const lookups = lookupsResult.data || { items: [], vendours: [], coldStores: [] };
        const receipts = listResult.data || [];
        const distinctReceiptNos = new Set(receipts.map(r => r['Receipt No'])).size;
        document.getElementById('countColdStores').textContent = lookups.coldStores.length;
        document.getElementById('countItems').textContent = lookups.items.length;
        document.getElementById('countReceipts').textContent = distinctReceiptNos;
        document.getElementById('bellBadge').textContent = distinctReceiptNos;
        statusText.textContent = 'Updated ' + new Date().toLocaleTimeString();
      } catch (err) {
        document.getElementById('countColdStores').textContent = '-';
        document.getElementById('countItems').textContent = '-';
        document.getElementById('countReceipts').textContent = '-';
        document.getElementById('bellBadge').textContent = '0';
        statusText.textContent = err.message === 'Not connected'
          ? 'Connect via the Receipts page first'
          : 'Could not load counts';
      }
    }
    document.getElementById('bellDropdown').addEventListener('show.bs.dropdown', loadBellCounts);
    loadBellCounts();
    const connStatusDot = document.getElementById('connStatusDot');
    async function checkConnection() {
      try {
        await bellApiGet('settings');
        connStatusDot.style.background = '#28a745';
        return true;
      } catch (err) {
        connStatusDot.style.background = '#dc3545';
        return false;
      }
    }
    document.getElementById('connectModal').addEventListener('show.bs.modal', () => {
      const cfg = getBellConfig();
      document.getElementById('mgmtWebAppUrl').value = cfg.url;
      document.getElementById('mgmtSecretKey').value = cfg.key;
      document.getElementById('connModalStatus').innerHTML = '&nbsp;';
    });
    document.getElementById('mgmtSaveConnBtn').addEventListener('click', async () => {
      const url = document.getElementById('mgmtWebAppUrl').value.trim();
      const key = document.getElementById('mgmtSecretKey').value.trim();
      const statusEl = document.getElementById('connModalStatus');
      if (!url || !key) {
        statusEl.textContent = 'Please enter both the URL and the Key.';
        statusEl.className = 'small text-danger';
        return;
      }
      localStorage.setItem('coldstore_webapp_url', url);
      localStorage.setItem('coldstore_secret_key', key);
      statusEl.textContent = 'Testing connection...';
      statusEl.className = 'small text-muted';
      const ok = await checkConnection();
      statusEl.textContent = ok ? 'Connected successfully.' : 'Could not connect - check the URL and key.';
      statusEl.className = 'small ' + (ok ? 'text-success' : 'text-danger');
      if (ok) {
        loadBellCounts();
        const iframe = document.querySelector('#mainContent iframe');
        if (iframe) iframe.src = iframe.src;
      }
    });
    checkConnection();
