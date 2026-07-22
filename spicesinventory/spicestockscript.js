const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxfu-3NZxa36vgflAG4utGTIdd6vJBK-zRi8mGQUxADMDZQ3djVnUx4a7kFEA93SVg4/exec';
const LOG_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwRk3J3FdLWQ49VHxgb3s4JxkEkqc-dyQ6j5viYeDVpKY-uscK9DYNpDzdF6tZaSR88Aw/exec';
let itemList = [];
let rowCount = 0;

const VOUCHER_TYPES = ['APINV', 'PRD', 'SALE OR', 'APCN', 'ARCN'];

// Load items on start
fetch(WEB_APP_URL + '?action=getItems')
.then(res => res.json())
.then(items => {
    itemList = items;
    const dl = document.getElementById('itemList');
    dl.innerHTML = '';
    items.forEach(it => {
      const opt = document.createElement('option');
      opt.value = it;
      dl.appendChild(opt);
    });
    addRow();
  })
.catch(err => showMsg('Error loading items: ' + err, 'red'));

// Add new row
function addRow() {
  rowCount++;
  const tbody = document.getElementById('tableBody');
  const tr = document.createElement('tr');
  tr.id = 'row_' + rowCount;

  const today = new Date().toISOString().split('T')[0];

  tr.innerHTML = `
    <td>${rowCount}</td>
    <td><input type="date" class="date" value="${today}"></td>
    <td><input type="text" class="itemSearch" list="itemList" placeholder="Select item" onchange="loadDesc(this)"></td>
    <td>
      <select class="voucherType" onchange="toggleQty(this)">
        <option value="">--</option>
        ${VOUCHER_TYPES.map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>
    </td>
    <td><input type="text" class="voucherNo"></td>
    <td>
      <input type="text" class="description" list="" placeholder="Type or select">
      <datalist class="descList"></datalist>
    </td>
    <td><input type="number" class="qtyIn hidden" value="0" min="0"></td>
    <td><input type="number" class="qtyOut hidden" value="0" min="0"></td>
    <td><button class="btn-delete" onclick="deleteRow(${rowCount})">X</button></td>
  `;

  tbody.appendChild(tr);
}

// Delete row
function deleteRow(id) {
  document.getElementById('row_' + id).remove();
  renumberRows();
}

// Renumber rows after delete
function renumberRows() {
  const rows = document.querySelectorAll('#tableBody tr');
  rows.forEach((row, idx) => {
    row.cells[0].textContent = idx + 1;
  });
}

// Load descriptions when item changes
function loadDesc(input) {
  const item = input.value.trim();
  const row = input.closest('tr');
  const descList = row.querySelector('.descList');
  const descInput = row.querySelector('.description');

  descList.innerHTML = '';
  descInput.value = '';

  if (!item) return;

  fetch(WEB_APP_URL + '?action=getDescriptions&item=' + encodeURIComponent(item))
 .then(res => res.json())
 .then(descs => {
      const listId = 'descList_' + Math.random().toString(36).substr(2, 9);
      descList.id = listId;
      descInput.setAttribute('list', listId);

      descs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        descList.appendChild(opt);
      });
    })
 .catch(err => console.error(err));
}

// Show/hide qty fields based on voucher type
function toggleQty(select) {
  const row = select.closest('tr');
  const type = select.value;
  const qtyIn = row.querySelector('.qtyIn');
  const qtyOut = row.querySelector('.qtyOut');

  qtyIn.classList.add('hidden');
  qtyOut.classList.add('hidden');
  qtyIn.value = 0;
  qtyOut.value = 0;

  if (type === 'APINV' || type === 'ARCN') {
    qtyIn.classList.remove('hidden');
  } else if (type === 'PRD' || type === 'SALE OR' || type === 'APCN') {
    qtyOut.classList.remove('hidden');
  }
}

// Save all rows with countdown
async function saveAll() {
  const rows = document.querySelectorAll('#tableBody tr');
  if (rows.length === 0) {
    showMsg('No rows to save', 'red');
    return;
  }

  const countdownEl = document.getElementById('countdown');
  document.getElementById('saveBtn').disabled = true;

  for (let i = 3; i > 0; i--) {
    countdownEl.textContent = `Saving in ${i}...`;
    await new Promise(r => setTimeout(r, 1000));
  }
  countdownEl.textContent = '';

  showMsg('Saving...', 'blue');

  let successCount = 0;
  let errorCount = 0;
  const savedThisBatch = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const date = row.querySelector('.date').value;
    const itemName = row.querySelector('.itemSearch').value.trim();
    const voucherType = row.querySelector('.voucherType').value;
    const voucherNo = row.querySelector('.voucherNo').value.trim();
    const description = row.querySelector('.description').value.trim();
    const qtyIn = row.querySelector('.qtyIn').value;
    const qtyOut = row.querySelector('.qtyOut').value;

    // Skip completely empty rows
    if (!date &&!itemName &&!voucherType &&!voucherNo &&!description && qtyIn == 0 && qtyOut == 0) {
      continue;
    }

    // Validate required fields
    if (!date ||!itemName ||!voucherType ||!voucherNo ||!description) {
      showMsg(`Row ${i+1}: Fill all fields`, 'red');
      errorCount++;
      continue;
    }

    const qtyInVisible =!row.querySelector('.qtyIn').classList.contains('hidden');
    const qtyOutVisible =!row.querySelector('.qtyOut').classList.contains('hidden');

    if (qtyInVisible && (!qtyIn || qtyIn == 0)) {
      showMsg(`Row ${i+1}: Enter Qty In`, 'red');
      errorCount++;
      continue;
    }
    if (qtyOutVisible && (!qtyOut || qtyOut == 0)) {
      showMsg(`Row ${i+1}: Enter Qty Out`, 'red');
      errorCount++;
      continue;
    }

    const data = {
      itemName: itemName,
      entry: {
        date: date,
        voucherNo: voucherNo,
        voucherType: voucherType,
        description: description,
        qtyIn: qtyIn,
        qtyOut: qtyOut
      }
    };

    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      successCount++;
      savedThisBatch.push({
        date: date,
        itemName: itemName,
        voucherType: voucherType,
        voucherNo: voucherNo,
        description: description,
        qtyIn: qtyInVisible ? qtyIn : '',
        qtyOut: qtyOutVisible ? qtyOut : ''
      });
    } catch(err) {
      errorCount++;
    }
  }

  // Overwrite the separate Log sheet with whatever was successfully saved this run
  if (savedThisBatch.length > 0) {
    try {
      await fetch(LOG_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveLog', entries: savedThisBatch })
      });
    } catch (err) {
      console.error('Log save failed:', err);
    }
  }

  document.getElementById('saveBtn').disabled = false;

  if (errorCount === 0) {
    showMsg(`Saved ${successCount} rows successfully!`, 'green');
    document.getElementById('tableBody').innerHTML = '';
    addRow();
  } else {
    showMsg(`Saved ${successCount} rows. ${errorCount} failed.`, 'orange');
  }
}

// View History Modal Functions
function openViewModal() {
  document.getElementById('viewModal').classList.remove('hidden');
}

function closeViewModal() {
  document.getElementById('viewModal').classList.add('hidden');
}

function loadSheetData() {
  const item = document.getElementById('viewItemSearch').value.trim();
  if (!item) {
    showMsg('Select an item first', 'red');
    return;
  }

  document.getElementById('modalTitle').textContent = 'History: ' + item;
  showMsg('Loading...', 'blue');

  fetch(WEB_APP_URL + '?action=getSheetData&item=' + encodeURIComponent(item))
.then(res => res.json())
.then(res => {
    if (res.error) {
      showMsg(res.error, 'red');
      return;
    }

    // Build table header
    const head = document.getElementById('historyHead');
    head.innerHTML = '<tr>' + res.headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

    // Format dates and build table body
    const body = document.getElementById('historyBody');
    body.innerHTML = res.data.map(row => {
      // Format first column if it looks like a date
      const formattedRow = row.map((cell, idx) => {
        if (idx === 0 && cell && typeof cell === 'string' && cell.includes('T')) {
          // Convert ISO date to DD/MM/YYYY
          const d = new Date(cell);
          if (!isNaN(d)) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `<td>${day}/${month}/${year}</td>`;
          }
        }
        return `<td>${cell}</td>`;
      }).join('');
      return `<tr>${formattedRow}</tr>`;
    }).join('');

    showMsg('', '');
  })
.catch(err => showMsg('Error: ' + err.message, 'red'));
}

// Log Modal Functions
function openLogModal() {
  document.getElementById('logModal').classList.remove('hidden');
  loadLog();
}

function closeLogModal() {
  document.getElementById('logModal').classList.add('hidden');
}

function loadLog() {
  const head = document.getElementById('logHead');
  const body = document.getElementById('logBody');
  head.innerHTML = '';
  body.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';

  fetch(LOG_WEB_APP_URL + '?action=getLog')
    .then(res => res.json())
    .then(res => {
      if (res.error) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">${res.error}</td></tr>`;
        return;
      }

      head.innerHTML = '<tr>' + res.headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

      if (res.data.length === 0) {
        body.innerHTML = `<tr><td colspan="${res.headers.length || 7}" style="text-align:center;">No entries saved yet</td></tr>`;
        return;
      }

      body.innerHTML = res.data.map(row =>
        '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>'
      ).join('');
    })
    .catch(err => {
      body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Error loading log</td></tr>`;
    });
}

function showMsg(text, color) {
  const msg = document.getElementById('msg');
  msg.textContent = text;
  msg.style.color = color;
}
