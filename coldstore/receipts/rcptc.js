  let receipts = [];
  let currentLookups = { items: [], vendours: [], coldStores: [] };
  let autoRefreshTimer = null;
  let printModalInstance = null;
  let editModalInstance = null;
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const lastSynced = document.getElementById('lastSynced');
  const addBtn = document.getElementById('addBtn');
  const disabledHint = document.getElementById('disabledHint');
  const tableBody = document.getElementById('tableBody');
  const rowCount = document.getElementById('rowCount');
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  document.getElementById('date').value = todayStr();
  function getConfig() {
    return {
      url: localStorage.getItem('coldstore_webapp_url') || '',
      key: localStorage.getItem('coldstore_secret_key') || ''
    };
  }
  function setStatus(state, text) {
    statusDot.classList.remove('dot-off', 'dot-on', 'dot-busy');
    statusDot.classList.add(state === 'on' ? 'dot-on' : state === 'busy' ? 'dot-busy' : 'dot-off');
    statusText.textContent = text;
  }
  let currentStampUrl = '';
  function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function renderTable() {
    rowCount.textContent = receipts.length + (receipts.length === 1 ? ' entry' : ' entries');
    if (receipts.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="16" class="text-center text-muted py-4">No receipts yet</td></tr>';
      return;
    }
    tableBody.innerHTML = receipts.slice().reverse().map((r, idx) => {
      const realIdx = receipts.length - 1 - idx;
      return `
      <tr>
        <td>${escapeHtml(r.recipt_id)}</td>
        <td>${escapeHtml(r["Receipt No"])}</td>
        <td>${escapeHtml(r["Date"])}</td>
        <td>${escapeHtml(r["Item Name"])}</td>
        <td>${escapeHtml(r["Description"])}</td>
        <td>${escapeHtml(r["Vendour"])}</td>
        <td>${escapeHtml(r["Cold Store"])}</td>
        <td>${escapeHtml(r["Unit"])}</td>
        <td>${escapeHtml(r["QTY"])}</td>
        <td>${r["Stock In"] ? `<span class="stock-in-badge">${escapeHtml(r["Stock In"])}</span>` : ''}</td>
        <td>${r["Stock Out"] ? `<span class="stock-out-badge">${escapeHtml(r["Stock Out"])}</span>` : ''}</td>
        <td>${r["Weight In"] ? `<span class="stock-in-badge">${escapeHtml(r["Weight In"])}</span>` : ''}</td>
        <td>${r["Weight Out"] ? `<span class="stock-out-badge">${escapeHtml(r["Weight Out"])}</span>` : ''}</td>
        <td>${escapeHtml(r["Vehicle No"])}</td>
        <td>${escapeHtml(r["Driver Name"])}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="reprintRow(${realIdx})" title="Print slip"><i class="bi bi-printer"></i></button>
          <button class="btn btn-sm btn-outline-primary" onclick="editRow(${realIdx})" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteRow(${realIdx})" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  }
  function populateSelect(selectEl, values, placeholder) {
    const current = selectEl.value;
    if (!values || values.length === 0) {
      selectEl.innerHTML = `<option value="" disabled selected>No ${placeholder} found - add in the sheet</option>`;
      selectEl.disabled = true;
      return;
    }
    selectEl.disabled = false;
    selectEl.innerHTML = `<option value="" disabled${current ? '' : ' selected'}>Select ${placeholder}...</option>` +
      values.map(v => `<option value="${escapeHtml(v)}" ${v === current ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  }
  function populateLookups(lookups) {
    populateSelect(document.getElementById('itemName'), lookups.items, 'item');
    populateSelect(document.getElementById('vendour'), lookups.vendours, 'vendour');
    populateSelect(document.getElementById('coldStore'), lookups.coldStores, 'cold store');
  }
  document.getElementById('receiptLogBody').addEventListener('show.bs.collapse', () => {
    document.getElementById('logChevron').classList.replace('bi-chevron-right', 'bi-chevron-down');
  });
  document.getElementById('receiptLogBody').addEventListener('hide.bs.collapse', () => {
    document.getElementById('logChevron').classList.replace('bi-chevron-down', 'bi-chevron-right');
  });
  async function apiGet(action) {
    const cfg = getConfig();
    const res = await fetch(`${cfg.url}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(cfg.key)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function apiPost(body) {
    const cfg = getConfig();
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, 
      body: JSON.stringify({ ...body, key: cfg.key })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function connectAndLoad() {
    const cfg = getConfig();
    if (!cfg.url || !cfg.key) {
      setStatus('off', 'Not connected - configure via Cold Store Management');
      addBtn.disabled = true;
      disabledHint.textContent = 'Not connected. Open Cold Store Management and use the connection icon in the navbar.';
      return;
    }
    setStatus('busy', 'Connecting...');
    try {
      const [listResult, lookupsResult, settingsResult] = await Promise.all([apiGet('list'), apiGet('lookups'), apiGet('settings')]);
      receipts = listResult.data || [];
      setStatus('on', 'Connected - synced live across devices');
      lastSynced.textContent = 'Last synced ' + new Date().toLocaleTimeString();
      addBtn.disabled = false;
      disabledHint.textContent = 'Changes save straight to the shared datqa and are visible on every device.';
      currentLookups = lookupsResult.data || { items: [], vendours: [], coldStores: [] };
      populateLookups(currentLookups);
      currentStampUrl = (settingsResult.data && settingsResult.data.stampUrl) || '';
      renderTable();
      updateBalanceHint();
    } catch (err) {
      setStatus('off', 'Connection failed');
      alert('Could not connect: ' + err.message + '\n\nCheck the Web App URL and Secret Key match your Apps Script deployment.');
    }
  }
  document.getElementById('refreshBtn').addEventListener('click', connectAndLoad);
  document.getElementById('autoRefresh').addEventListener('change', (e) => {
    if (e.target.checked) startAutoRefresh(); else stopAutoRefresh();
  });
  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => {
      const cfg = getConfig();
      if (cfg.url && cfg.key) connectAndLoad();
    }, 15000);
  }
  function stopAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  let currentBatchInfo = null;
  function computeBalance(receiptNo) {
    const rows = receipts.filter(r => String(r['Receipt No']).trim() === receiptNo.trim());
    if (!rows.length) return null;
    let totalIn = 0, totalOut = 0, weightIn = 0, weightOut = 0;
    rows.forEach(r => {
      totalIn += Number(r['Stock In']) || 0;
      totalOut += Number(r['Stock Out']) || 0;
      weightIn += Number(r['Weight In']) || 0;
      weightOut += Number(r['Weight Out']) || 0;
    });
    return {
      totalIn, totalOut, balance: totalIn - totalOut,
      weightIn, weightOut, weightBalance: weightIn - weightOut,
      weightPerUnit: totalIn > 0 ? (weightIn / totalIn) : null,
      item: rows[0]['Item Name'], coldStore: rows[0]['Cold Store'], vendour: rows[0]['Vendour'], unit: rows[0]['Unit']
    };
  }
  function lockBatchFields(info) {
    const itemSel = document.getElementById('itemName');
    const storeSel = document.getElementById('coldStore');
    const vendourSel = document.getElementById('vendour');
    const unitInput = document.getElementById('unit');
    itemSel.value = info.item;
    storeSel.value = info.coldStore;
    vendourSel.value = info.vendour;
    unitInput.value = info.unit;
    itemSel.disabled = true;
    storeSel.disabled = true;
    vendourSel.disabled = true;
    unitInput.readOnly = true;
  }
  function unlockBatchFields() {
    document.getElementById('itemName').disabled = false;
    document.getElementById('coldStore').disabled = false;
    document.getElementById('vendour').disabled = false;
    document.getElementById('unit').readOnly = false;
  }
  function suggestWeight() {
    const weightInput = document.getElementById('weight');
    if (document.getElementById('txnType').value !== 'out') return;
    if (!currentBatchInfo || currentBatchInfo.weightPerUnit === null) { weightInput.value = ''; return; }
    const qty = parseFloat(document.getElementById('qty').value) || 0;
    weightInput.value = qty > 0 ? (qty * currentBatchInfo.weightPerUnit).toFixed(2) : '';
  }
  function updateBalanceHint() {
    const no = document.getElementById('receiptNo').value.trim();
    const hint = document.getElementById('balanceHint');
    if (!no) {
      hint.textContent = ''; hint.className = 'form-text';
      unlockBatchFields(); currentBatchInfo = null;
      return;
    }
    const info = computeBalance(no);
    if (!info) {
      hint.textContent = 'New receipt no. - will start a fresh batch.';
      hint.className = 'form-text text-muted';
      unlockBatchFields(); currentBatchInfo = null;
      return;
    }
    currentBatchInfo = info;
    lockBatchFields(info);
    const qty = parseFloat(document.getElementById('qty').value) || 0;
    const txnType = document.getElementById('txnType').value;
    hint.textContent = `${info.item} @ ${info.coldStore} - Balance: ${info.balance} ${info.unit || ''} / ${info.weightBalance.toFixed(2)} kg`;
    hint.className = (txnType === 'out' && qty > info.balance) ? 'form-text text-danger fw-bold' : 'form-text text-success';
    suggestWeight();
  }
function getDistinctReceiptNos() {
  const set = new Set();
  receipts.forEach(r => { if (r['Receipt No']) set.add(String(r['Receipt No'])); });
  return Array.from(set).sort(naturalReceiptSort);
}
function naturalReceiptSort(a, b) {
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b));
}
function renderReceiptNoSuggestions() {
  const input = document.getElementById('receiptNo');
  const box = document.getElementById('receiptNoSuggestions');
  const term = input.value.trim().toLowerCase();
  const all = getDistinctReceiptNos();
  const matches = (term ? all.filter(n => n.toLowerCase().includes(term)) : all).slice(0, 8);
  if (matches.length === 0) { box.classList.add('d-none'); box.innerHTML = ''; return; }
  box.innerHTML = matches.map(n => {
    const info = computeBalance(n);
    const sub = info ? `${escapeHtml(info.item)} @ ${escapeHtml(info.coldStore)} \u2014 Balance: ${info.balance} ${escapeHtml(info.unit || '')}` : 'New batch';
    return `<button type="button" class="list-group-item list-group-item-action py-1 px-2 receipt-suggestion-item" data-value="${escapeHtml(n)}">
      <div class="fw-bold" style="font-size:13px;">${escapeHtml(n)}</div>
      <div class="text-muted" style="font-size:11px;">${sub}</div>
    </button>`;
  }).join('');
  box.classList.remove('d-none');
}
document.getElementById('receiptNoSuggestions').addEventListener('mousedown', (e) => {
  const btn = e.target.closest('.receipt-suggestion-item');
  if (!btn) return;
  e.preventDefault();
  document.getElementById('receiptNo').value = btn.dataset.value;
  document.getElementById('receiptNoSuggestions').classList.add('d-none');
  updateBalanceHint();
});
document.getElementById('receiptNo').addEventListener('focus', renderReceiptNoSuggestions);
document.getElementById('receiptNo').addEventListener('input', renderReceiptNoSuggestions);
document.getElementById('receiptNo').addEventListener('blur', () => {
  setTimeout(() => document.getElementById('receiptNoSuggestions').classList.add('d-none'), 150);
});
  document.getElementById('receiptNo').addEventListener('input', updateBalanceHint);
  document.getElementById('qty').addEventListener('input', updateBalanceHint);
  function toggleStockOutFields() {
    const isOut = document.getElementById('txnType').value === 'out';
    document.querySelectorAll('.stock-out-only').forEach(el => el.classList.toggle('d-none-fields', !isOut));
    document.getElementById('vehicleNo').required = isOut;
    document.getElementById('driverName').required = isOut;
    const weightInput = document.getElementById('weight');
    weightInput.readOnly = isOut;
    weightInput.required = !isOut;
    weightInput.classList.toggle('bg-light', isOut);
    if (!isOut) weightInput.value = '';
    updateBalanceHint();
  }
  document.getElementById('txnType').addEventListener('change', toggleStockOutFields);
  toggleStockOutFields();
  function buildSlipHtml(entry, txnType) {
    const typeLabel = txnType === 'in' ? 'STOCK IN' : 'STOCK OUT';
    const qtyShown = txnType === 'in' ? entry['Stock In'] : entry['Stock Out'];
    const extra = txnType === 'out'
      ? `<div class="extra">
           Vehicle No: <strong>${escapeHtml(entry['Vehicle No'] || '-')}</strong><br>
           Driver: <strong>${escapeHtml(entry['Driver Name'] || '-')}</strong>
         </div>`
      : '';
    const stampImg = currentStampUrl;
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
        <div class="sign-line">${stampImg ? `<img class="stamp-img" src="${stampImg}">` : ''}</div>
        <div class="sign-label">Authorized Signature &amp; Stamp</div>
      </div>
      <div class="footer-note">Printed ${new Date().toLocaleDateString()}</div>
    `;
  }
  function openPrintModal(entry, txnType) {
    document.getElementById('printArea').innerHTML = buildSlipHtml(entry, txnType);
    if (!printModalInstance) printModalInstance = new bootstrap.Modal(document.getElementById('printModal'));
    printModalInstance.show();
  }
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  window.reprintRow = function(index) {
    const entry = receipts[index];
    const txnType = Number(entry['Stock Out']) > 0 ? 'out' : 'in';
    openPrintModal(entry, txnType);
  };
  window.editRow = function(index) {
    const r = receipts[index];
    document.getElementById('editRecipt_id').value = r.recipt_id;
    document.getElementById('editReceiptNo').value = r['Receipt No'];
    document.getElementById('editDate').value = r['Date'];
    populateSelect(document.getElementById('editItemName'), currentLookups.items, 'item');
    document.getElementById('editItemName').value = r['Item Name'];
    document.getElementById('editDescription').value = r['Description'];
    populateSelect(document.getElementById('editVendour'), currentLookups.vendours, 'vendour');
    document.getElementById('editVendour').value = r['Vendour'];
    populateSelect(document.getElementById('editColdStore'), currentLookups.coldStores, 'cold store');
    document.getElementById('editColdStore').value = r['Cold Store'];
    document.getElementById('editUnit').value = r['Unit'];
    const isOut = Number(r['Stock Out']) > 0;
    document.getElementById('editTxnType').value = isOut ? 'out' : 'in';
    document.getElementById('editQty').value = r['QTY'];
    document.getElementById('editWeight').value = r['Weight'];
    document.getElementById('editVehicleNo').value = r['Vehicle No'];
    document.getElementById('editDriverName').value = r['Driver Name'];
    document.getElementById('editAdminPassword').value = '';
    if (!editModalInstance) editModalInstance = new bootstrap.Modal(document.getElementById('editModal'));
    editModalInstance.show();
  };
  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const pwd = document.getElementById('editAdminPassword').value;
    if (!pwd) { alert('Enter the admin password to save changes.'); return; }
    const txnType = document.getElementById('editTxnType').value;
    const qty = parseFloat(document.getElementById('editQty').value) || 0;
    const weight = parseFloat(document.getElementById('editWeight').value) || 0;
    const entry = {
      "Receipt No": document.getElementById('editReceiptNo').value.trim(),
      "Date": document.getElementById('editDate').value,
      "Item Name": document.getElementById('editItemName').value,
      "Description": document.getElementById('editDescription').value.trim(),
      "Vendour": document.getElementById('editVendour').value,
      "Cold Store": document.getElementById('editColdStore').value,
      "Unit": document.getElementById('editUnit').value.trim(),
      "QTY": qty,
      "Stock In": txnType === 'in' ? qty : 0,
      "Stock Out": txnType === 'out' ? qty : 0,
      "Weight": weight,
      "Weight In": txnType === 'in' ? weight : 0,
      "Weight Out": txnType === 'out' ? weight : 0,
      "Vehicle No": document.getElementById('editVehicleNo').value.trim(),
      "Driver Name": document.getElementById('editDriverName').value.trim()
    };
    const recipt_id = document.getElementById('editRecipt_id').value;
    const btn = document.getElementById('saveEditBtn');
    btn.disabled = true;
    try {
      await apiPost({ action: 'update', admin: pwd, recipt_id, entry });
      editModalInstance.hide();
      await connectAndLoad();
    } catch (err) {
      alert('Could not save changes: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });
  window.deleteRow = async function(index) {
    const r = receipts[index];
    const pwd = prompt(`Enter admin password to delete Receipt No "${r['Receipt No']}" (${r['Item Name']} @ ${r['Cold Store']}):`);
    if (pwd === null) return;
    if (!pwd) { alert('Password is required to delete.'); return; }
    if (!confirm('This permanently deletes this entry. Are you sure?')) return;
    try {
      await apiPost({ action: 'delete', admin: pwd, recipt_id: r.recipt_id });
      await connectAndLoad();
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };
  let confirmSaveModalInstance = null;
  let pendingEntry = null;
  let pendingTxnType = null;
  function buildConfirmSummary(entry, txnType) {
    const rows = [
      ['Receipt No', entry['Receipt No']],
      ['Date', entry['Date']],
      ['Item Name', entry['Item Name']],
      ['Vendour', entry['Vendour']],
      ['Cold Store', entry['Cold Store']],
      ['Description', entry['Description'] || '-'],
      ['Unit', entry['Unit'] || '-'],
      ['Transaction Type', txnType === 'in' ? 'Stock In' : 'Stock Out'],
      ['QTY', entry['QTY']],
      ['Weight (kg)', entry['Weight']]
    ];
    if (txnType === 'out') {
      rows.push(['Vehicle No', entry['Vehicle No'] || '-']);
      rows.push(['Driver Name', entry['Driver Name'] || '-']);
    }
    return rows.map(([label, value]) => `
      <tr><td class="text-muted" style="width:45%;">${escapeHtml(label)}</td><td class="fw-bold">${escapeHtml(value)}</td></tr>
    `).join('');
  }
  document.getElementById('receiptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cfg = getConfig();
    if (!cfg.url || !cfg.key) return;
    const receiptNo = document.getElementById('receiptNo').value.trim();
    const txnType = document.getElementById('txnType').value;
    const qty = parseFloat(document.getElementById('qty').value) || 0;
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const info = computeBalance(receiptNo);
    if (txnType === 'in' && info) {
      alert(`Receipt No "${receiptNo}" already has a Stock In entry (${info.item} @ ${info.coldStore}). A receipt no. can only be stocked in once.`);
      return;
    }
    if (txnType === 'out' && !info) {
      alert(`Receipt No "${receiptNo}" has no Stock In recorded yet. Add the Stock In first.`);
      return;
    }
    if (txnType === 'out' && info && qty > info.balance) {
      const proceed = confirm(`Only ${info.balance} ${info.unit || ''} remaining for receipt #${receiptNo}. Continue anyway?`);
      if (!proceed) return;
    }
    const entry = {
      "Receipt No": receiptNo,
      "Date": document.getElementById('date').value,
      "Item Name": document.getElementById('itemName').value.trim(),
      "Description": document.getElementById('description').value.trim(),
      "Vendour": document.getElementById('vendour').value.trim(),
      "Cold Store": document.getElementById('coldStore').value.trim(),
      "Unit": document.getElementById('unit').value.trim(),
      "QTY": qty,
      "Stock In": txnType === 'in' ? qty : 0,
      "Stock Out": txnType === 'out' ? qty : 0,
      "Weight": weight,
      "Weight In": txnType === 'in' ? weight : 0,
      "Weight Out": txnType === 'out' ? weight : 0,
      "Vehicle No": txnType === 'out' ? document.getElementById('vehicleNo').value.trim() : '',
      "Driver Name": txnType === 'out' ? document.getElementById('driverName').value.trim() : ''
    };

    pendingEntry = entry;
    pendingTxnType = txnType;
    document.getElementById('confirmSaveBody').innerHTML = buildConfirmSummary(entry, txnType);
    if (!confirmSaveModalInstance) confirmSaveModalInstance = new bootstrap.Modal(document.getElementById('confirmSaveModal'));
    confirmSaveModalInstance.show();
  });
  document.getElementById('confirmSaveBtn').addEventListener('click', async () => {
    if (!pendingEntry) return;
    const entry = pendingEntry;
    const txnType = pendingTxnType;
    const btn = document.getElementById('confirmSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    try {
      const result = await apiPost({ action: 'add', entry });
      confirmSaveModalInstance.hide();
      await connectAndLoad();
      openPrintModal(result.entry || entry, txnType);
      document.getElementById('receiptForm').reset();
      document.getElementById('date').value = todayStr();
      toggleStockOutFields();
      unlockBatchFields();
      updateBalanceHint();
      document.getElementById('receiptNo').focus();
    } catch (err) {
      alert('Could not save: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm & Save';
      pendingEntry = null;
      pendingTxnType = null;
    }
  });
  connectAndLoad();
  startAutoRefresh();
