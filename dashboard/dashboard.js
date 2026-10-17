function loadPage(url) {
  const main = document.getElementById('mainContent');
  main.innerHTML = '';
  main.classList.add('p-0');
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.className = 'content-frame';
  main.appendChild(iframe);
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
function setSidebar(open) {
  document.getElementById('sidebar').classList.toggle('sidebar-open', open);
  document.getElementById('sidebarBackdrop').classList.toggle('show', open);
}
document.getElementById('sidebarToggle').addEventListener('click', () => {
  setSidebar(!document.getElementById('sidebar').classList.contains('sidebar-open'));
});
document.getElementById('sidebarBackdrop').addEventListener('click', () => setSidebar(false));
document.getElementById('sidebar').addEventListener('click', (e) => {
  const a = e.target.closest('.accordion-body a');
  if (a && a.getAttribute('href') !== '#erp' && window.innerWidth < 768) setSidebar(false);
});

/* ================= NOTIFICATION BELL: Leave Form + Cold Store, with total ================= */
const leaveUrl = () => window.ARFA_BACKEND_URL + '?module=leave';

function escHtml(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function fetchLeavePending() {
  if (!window.ARFA_BACKEND_URL) throw new Error('Not connected');
  const res = await fetch(`${leaveUrl()}&action=pending`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.data || [];
}

async function fetchColdStoreCounts() {
  const url = localStorage.getItem('coldstore_webapp_url') || '';
  const key = localStorage.getItem('coldstore_secret_key') || '';
  if (!url || !key) throw new Error('Not connected');
  const get = async (action) => {
    const res = await fetch(`${url}?module=coldstore&action=${encodeURIComponent(action)}&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.data;
  };
  const [lookups, receipts] = await Promise.all([get('lookups'), get('list')]);
  const l = lookups || { items: [], coldStores: [] };
  return {
    coldStores: (l.coldStores || []).length,
    items: (l.items || []).length,
    receipts: new Set((receipts || []).map(r => r['Receipt No'])).size
  };
}

async function loadNotifications() {
  const [leave, cold] = await Promise.allSettled([fetchLeavePending(), fetchColdStoreCounts()]);

  const leaveList = leave.status === 'fulfilled' ? leave.value : null;
  const coldCounts = cold.status === 'fulfilled' ? cold.value : null;
  const leaveCount = leaveList ? leaveList.length : 0;
  const coldCount = coldCounts ? coldCounts.receipts : 0;
  const total = leaveCount + coldCount;

  const link = (path) => `href="#" onclick="setActiveLink(this); loadPage('${path}'); return false;"`;
  const pill = (n, cls) => `<span class="badge ${cls} rounded-pill">${n}</span>`;

  let html = '';

  /* --- Leave Form --- */
  html += `<div class="px-3 py-2 fw-bold border-bottom bg-light d-flex justify-content-between align-items-center">
             <a class="text-dark text-decoration-none" ${link('../employees-data/leaveform/leaveform')}>Leave Form</a>
             ${pill(leaveList ? leaveCount : '-', 'bg-danger')}
           </div>`;
  if (!leaveList) {
    html += `<div class="px-3 py-2 small text-muted border-bottom">${
      leave.reason && leave.reason.message === 'Not connected' ? 'Not connected' : 'Could not load leave forms'}</div>`;
  } else {
    html += `<div class="px-3 py-1 small text-muted border-bottom">Form To Be Update = ${leaveCount}</div>`;
    html += leaveCount
      ? leaveList.slice().reverse().map(r => `
          <div class="px-3 py-2 border-bottom small">
            <strong>${escHtml(r.name)}</strong><br>
            <span class="text-muted" style="font-size:12px;">${escHtml(r.date)} &middot; Period of Leave missing</span>
          </div>`).join('')
      : '<div class="px-3 py-2 small text-muted border-bottom">No forms to update.</div>';
  }

  /* --- Cold Store --- */
  html += `<div class="px-3 py-2 fw-bold border-bottom bg-light d-flex justify-content-between align-items-center">
             <span>Cold Store</span>
             ${pill(coldCounts ? coldCount : '-', 'bg-danger')}
           </div>`;
  if (!coldCounts) {
    html += `<div class="px-3 py-2 small text-muted border-bottom">${
      cold.reason && cold.reason.message === 'Not connected'
        ? 'Not connected'
        : 'Could not load Cold Store counts'}</div>`;
  } else {
    const row = (label, n, path) => `
      <a class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom small text-dark text-decoration-none" ${link(path)}>
        ${label} ${pill(n, 'bg-secondary')}
      </a>`;
    html += row('Cold Stores', coldCounts.coldStores, '../coldstore/reports/by-store/b-loc');
    html += row('Items', coldCounts.items, '../coldstore/reports/by-item/b-i');
    html += row('Receipts', coldCounts.receipts, '../coldstore/reports/by-receipt/b-rcpt');
  }

  /* --- Total --- */
  html += `<div class="px-3 py-2 fw-bold d-flex justify-content-between align-items-center">
             <span>Total</span>${pill(total, 'bg-danger')}
           </div>
           <div class="px-3 pb-2 small text-muted">Updated ${new Date().toLocaleTimeString()}</div>`;

  document.getElementById('notifBody').innerHTML = html;
  const badge = document.getElementById('notifBadge');
  badge.textContent = total;
  badge.classList.toggle('d-none', total === 0);
}

document.getElementById('notifDropdown').addEventListener('show.bs.dropdown', loadNotifications);
window.addEventListener('message', (e) => {
  if (e.origin === window.location.origin && e.data && e.data.type === 'notif-refresh') loadNotifications();
});
loadNotifications();
setInterval(loadNotifications, 60000);

/* ================= COLD STORE CONNECTION (icon next to the bell) ================= */
function coldConfig() {
  return {
    url: localStorage.getItem('coldstore_webapp_url') || '',
    key: localStorage.getItem('coldstore_secret_key') || ''
  };
}

async function coldGet(action) {
  const cfg = coldConfig();
  if (!cfg.url || !cfg.key) throw new Error('Not connected');
  const res = await fetch(`${cfg.url}?module=coldstore&action=${encodeURIComponent(action)}&key=${encodeURIComponent(cfg.key)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function checkColdConnection() {
  const dot = document.getElementById('connStatusDot');
  try {
    await coldGet('settings');
    dot.style.background = '#28a745';
    return true;
  } catch (err) {
    dot.style.background = '#dc3545';
    return false;
  }
}

document.getElementById('connectModal').addEventListener('show.bs.modal', () => {
  const cfg = coldConfig();
  document.getElementById('mgmtWebAppUrl').value = cfg.url || window.ARFA_BACKEND_URL || '';
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
  localStorage.setItem('arfa_backend_url', url);
  window.ARFA_BACKEND_URL = url;
  localStorage.setItem('coldstore_secret_key', key);
  statusEl.textContent = 'Testing connection...';
  statusEl.className = 'small text-muted';
  const ok = await checkColdConnection();
  statusEl.textContent = ok ? 'Connected successfully.' : 'Could not connect - check the URL and key.';
  statusEl.className = 'small ' + (ok ? 'text-success' : 'text-danger');
  if (ok) {
    loadNotifications();
    const iframe = document.querySelector('#mainContent iframe');
    if (iframe) iframe.src = iframe.src;
  }
});

checkColdConnection();