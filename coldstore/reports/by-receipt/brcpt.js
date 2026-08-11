 let receipts = [];
  let currentStampUrl = '';

  function getConfig() {
    return {
      url: localStorage.getItem('coldstore_webapp_url') || '',
      key: localStorage.getItem('coldstore_secret_key') || ''
    };
  }
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const lastSynced = document.getElementById('lastSynced');
  function setStatus(state, text) {
    statusDot.classList.remove('dot-off', 'dot-on', 'dot-busy');
    statusDot.classList.add(state === 'on' ? 'dot-on' : state === 'busy' ? 'dot-busy' : 'dot-off');
    statusText.textContent = text;
  }
  function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  async function apiGet(action) {
    const cfg = getConfig();
    const res = await fetch(`${cfg.url}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(cfg.key)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function connectAndLoad() {
    const cfg = getConfig();
    if (!cfg.url || !cfg.key) {
      setStatus('off', 'Not connected - configure via Cold Store Management');
      return;
    }
    setStatus('busy', 'Connecting...');
    try {
      const [listResult, settingsResult] = await Promise.all([apiGet('list'), apiGet('settings')]);
      receipts = listResult.data || [];
      currentStampUrl = (settingsResult.data && settingsResult.data.stampUrl) || '';
      setStatus('on', 'Connected - live data');
      lastSynced.textContent = 'Last synced ' + new Date().toLocaleTimeString();
      renderReport();
    } catch (err) {
      setStatus('off', 'Connection failed');
      alert('Could not connect: ' + err.message + '\n\nCheck the Web App URL and Secret Key match your Apps Script deployment.');
    }
  }
  document.getElementById('refreshBtn').addEventListener('click', connectAndLoad);
  function naturalReceiptSort(a, b) {
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b));
  }
  function computeReceiptGroups() {
    const groups = {};
    receipts.forEach(r => {
      const rn = (r['Receipt No'] || '(blank)').toString();
      if (!groups[rn]) {
        groups[rn] = {
          item: r['Item Name'], coldStore: r['Cold Store'], vendour: r['Vendour'], unit: r['Unit'],
          stockIn: 0, stockOut: 0, weightIn: 0, weightOut: 0, rows: []
        };
      }
      const grp = groups[rn];
      grp.stockIn += Number(r['Stock In']) || 0;
      grp.stockOut += Number(r['Stock Out']) || 0;
      grp.weightIn += Number(r['Weight In']) || 0;
      grp.weightOut += Number(r['Weight Out']) || 0;
      if (r['Unit']) grp.unit = r['Unit'];
      grp.rows.push(r);
    });
    return groups;
  }
  function renderReport() {
    const groups = computeReceiptGroups();
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const names = Object.keys(groups).filter(n => {
      const g = groups[n];
      return n.toLowerCase().includes(search) ||
        (g.item || '').toLowerCase().includes(search) ||
        (g.coldStore || '').toLowerCase().includes(search) ||
        (g.vendour || '').toLowerCase().includes(search);
    }).sort(naturalReceiptSort);
    let grandWeightIn = 0, grandWeightOut = 0;
    receipts.forEach(r => {
      grandWeightIn += Number(r['Weight In']) || 0;
      grandWeightOut += Number(r['Weight Out']) || 0;
    });
    const grandBalance = grandWeightIn - grandWeightOut;
    document.getElementById('grandStats').innerHTML = `
      <div class="stat"><div class="stat-num">${Object.keys(groups).length}</div><div class="stat-label">Receipt Nos</div></div>
      <div class="stat"><div class="stat-num">${receipts.length}</div><div class="stat-label">Total Entries</div></div>
      <div class="stat"><div class="stat-num">${grandWeightIn.toFixed(2)}</div><div class="stat-label">Total Weight In (kg)</div></div>
      <div class="stat"><div class="stat-num">${grandWeightOut.toFixed(2)}</div><div class="stat-label">Total Weight Out (kg)</div></div>
      <div class="stat"><div class="stat-num ${grandBalance < 0 ? 'bal-neg' : 'bal-pos'}">${grandBalance.toFixed(2)}</div><div class="stat-label">Weight Balance (kg)</div></div>
    `;
    const container = document.getElementById('reportContainer');
    if (receipts.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-4">No receipts recorded yet.</p>';
      return;
    }
    if (names.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-4">No matching receipt no. found.</p>';
      return;
    }
    container.innerHTML = names.map((name, i) => {
      const grp = groups[name];
      const qtyBal = grp.stockIn - grp.stockOut;
      const wBal = grp.weightIn - grp.weightOut;
      const sortedRows = grp.rows.slice().sort((a, b) => String(a['Date']).localeCompare(String(b['Date'])));
      let runningQty = 0, runningWeight = 0;
      const ledgerRows = sortedRows.map(r => {
        runningQty += (Number(r['Stock In']) || 0) - (Number(r['Stock Out']) || 0);
        runningWeight += (Number(r['Weight In']) || 0) - (Number(r['Weight Out']) || 0);
        return `
          <tr>
            <td>${escapeHtml(r['Date'])}</td>
            <td>${escapeHtml(r['Description'])}</td>
            <td>${r['Stock In'] ? `<span class="bal-pos">${escapeHtml(r['Stock In'])}</span>` : ''}</td>
            <td>${r['Stock Out'] ? `<span class="bal-neg">${escapeHtml(r['Stock Out'])}</span>` : ''}</td>
            <td class="fw-bold">${runningQty} ${escapeHtml(grp.unit || '')}</td>
            <td>${r['Weight In'] ? escapeHtml(r['Weight In']) : ''}</td>
            <td>${r['Weight Out'] ? escapeHtml(r['Weight Out']) : ''}</td>
            <td class="fw-bold">${runningWeight.toFixed(2)} kg</td>
            <td>${escapeHtml(r['Vehicle No'])}</td>
            <td>${escapeHtml(r['Driver Name'])}</td>
            <td><button class="btn btn-sm btn-outline-secondary print-row-btn" data-recipt-id="${escapeHtml(r.recipt_id)}" title="View Receipt"><i class="bi bi-receipt"></i></button></td>
          </tr>`;
      }).join('');
      return `
        <div class="card mb-2 group-card">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2"
               data-bs-toggle="collapse" data-bs-target="#grp-${i}" role="button" aria-expanded="false">
            <div>
              <strong>Receipt No ${escapeHtml(name)}</strong>
              <div class="small text-muted">${escapeHtml(grp.item)} &middot; ${escapeHtml(grp.coldStore)} &middot; ${escapeHtml(grp.vendour)}</div>
            </div>
            <span class="group-summary">
              ${grp.rows.length} entries &middot;
              Qty Balance: <span class="${qtyBal < 0 ? 'bal-neg' : 'bal-pos'}">${qtyBal} ${escapeHtml(grp.unit || '')}</span> &middot;
              Weight Balance: <span class="${wBal < 0 ? 'bal-neg' : 'bal-pos'}">${wBal.toFixed(2)} kg</span>
            </span>
          </div>
          <div class="collapse" id="grp-${i}">
            <div class="table-responsive">
              <table class="table table-sm table-striped mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Date</th><th>Description</th><th>Stock In</th><th>Stock Out</th><th>Qty Balance</th>
                    <th>Weight In</th><th>Weight Out</th><th>Weight Balance</th><th>Vehicle No</th><th>Driver</th><th></th>
                  </tr>
                </thead>
                <tbody>${ledgerRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  document.getElementById('searchInput').addEventListener('input', renderReport);
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function buildSlipHtml(entry) {
    const txnType = Number(entry['Stock Out']) > 0 ? 'out' : 'in';
    const typeLabel = txnType === 'in' ? 'STOCK IN' : 'STOCK OUT';
    const qtyShown = txnType === 'in' ? entry['Stock In'] : entry['Stock Out'];
    const extra = txnType === 'out'
      ? `<div class="extra">
           Vehicle No: <strong>${escapeHtml(entry['Vehicle No'] || '-')}</strong><br>
           Driver: <strong>${escapeHtml(entry['Driver Name'] || '-')}</strong>
         </div>`
      : '';
    return `
      <h4>Arfa Foods and Spices</h4>
      <div class="sub">Cold Store Receipt &mdash; ${typeLabel}</div>
      <table>
        <tr><td class="label">Receipt No</td><td class="value">${escapeHtml(entry['Receipt No'])}</td></tr>
        <tr><td class="label">Date</td><td class="value">${escapeHtml(entry['Date'] || todayStr())}</td></tr>
        <tr><td class="label">Item Name</td><td class="value">${escapeHtml(entry['Item Name'])}</td></tr>
        <tr><td class="label">Description</td><td class="value">${escapeHtml(entry['Description'] || '-')}</td></tr>
        <tr><td class="label">Cold Store</td><td class="value">${escapeHtml(entry['Cold Store'])}</td></tr>
        <tr><td class="label">Unit</td><td class="value">${escapeHtml(entry['Unit'] || '-')}</td></tr>
        <tr><td class="label">QTY</td><td class="value">${escapeHtml(qtyShown)}</td></tr>
      </table>
      ${extra}
      <div class="sign-stamp-single">
        <div class="sign-line">${currentStampUrl ? `<img class="stamp-img" src="${currentStampUrl}">` : ''}</div>
        <div class="sign-label">Authorized Signature &amp; Stamp</div>
      </div>
      <div class="footer-note">Printed ${new Date().toLocaleDateString()}</div>
    `;
  }
  let printModalInstance = null;
  function openPrintModal(entry) {
    document.getElementById('printArea').innerHTML = buildSlipHtml(entry);
    if (!printModalInstance) printModalInstance = new bootstrap.Modal(document.getElementById('printModal'));
    printModalInstance.show();
  }
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('reportContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('.print-row-btn');
    if (!btn) return;
    const row = receipts.find(r => r.recipt_id === btn.dataset.reciptId);
    if (row) openPrintModal(row);
  });
  connectAndLoad();
