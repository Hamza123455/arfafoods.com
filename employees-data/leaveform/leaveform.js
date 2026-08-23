const EMPLOYEES_JSON_URL = 'https://script.google.com/macros/s/AKfycbxEBOL9LWqrPTEvMHdJXtcOt5BhmmYleCji-XwvBvf6gWnWfUQGkuqSvouALHABZE79eQ/exec';
const GOOGLE_SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxX8GDhvPBDLHnv2wMoCaa7ZY3GEPg5YnbRKrsY1Q9yFGifUwVE4mP7nRa25D5iJdPPqw/exec';
let employees = [];
let leaveEntries = [];
const employeeInput = document.getElementById('employee-name');
const contactInput = document.getElementById('contactNumber');
const suggestionBox = document.getElementById('suggestions');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const lastSynced = document.getElementById('lastSynced');
const tableBody = document.getElementById('tableBody');
const rowCount = document.getElementById('rowCount');
function todayStr() { return new Date().toISOString().slice(0, 10); }
document.getElementById('date').value = todayStr();

function escapeHtml(str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function setStatus(state, text) {
  statusDot.classList.remove('dot-off', 'dot-on', 'dot-busy');
  statusDot.classList.add(state === 'on' ? 'dot-on' : state === 'busy' ? 'dot-busy' : 'dot-off');
  statusText.textContent = text;
}
function showToast(message, type) {
  type = type || 'success'; 
  const bgClass = { success: 'text-bg-success', error: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-secondary' }[type] || 'text-bg-success';
  const icon = { success: 'bi-check-circle', error: 'bi-x-circle', warning: 'bi-exclamation-triangle', info: 'bi-info-circle' }[type] || 'bi-check-circle';
  const el = document.createElement('div');
  el.className = `toast align-items-center ${bgClass} border-0 shadow`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body"><i class="bi ${icon} me-1"></i> ${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.getElementById('toastContainer').appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 4000 });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}
let deleteModalInstance = null;
let deleteResolver = null;
function showDeleteConfirm(summaryText) {
  return new Promise(resolve => {
    deleteResolver = resolve;
    document.getElementById('deleteModalSummary').textContent = summaryText;
    document.getElementById('deleteModalPassword').value = '';
    document.getElementById('deleteModalFeedback').textContent = '';
    if (!deleteModalInstance) deleteModalInstance = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModalInstance.show();
    setTimeout(() => document.getElementById('deleteModalPassword').focus(), 150);
  });
}
document.getElementById('deleteModalConfirmBtn').addEventListener('click', () => {
  const pwd = document.getElementById('deleteModalPassword').value;
  if (!pwd) {
    document.getElementById('deleteModalFeedback').textContent = 'Password is required.';
    return;
  }
  deleteModalInstance.hide();
  if (deleteResolver) deleteResolver(pwd);
  deleteResolver = null;
});
document.getElementById('deleteModal').addEventListener('hidden.bs.modal', () => {
  if (deleteResolver) deleteResolver(null);
  deleteResolver = null;
});
setStatus('busy', 'Loading employee list...');
fetch(EMPLOYEES_JSON_URL, { cache: 'no-store' })
  .then(r => r.json())
  .then(data => {
    employees = Array.isArray(data) ? data : (data.employees || []);
    setStatus('on', `Loaded Total ${employees.length} employees.`);
  })
  .catch(err => {
    setStatus('off', 'Could not load employee list.');
    console.error('Failed to load employees:', err);
  });
employeeInput.addEventListener('input', function () {
  const value = this.value.trim().toLowerCase();
  suggestionBox.innerHTML = '';
  if (!value) return;
  const matches = employees.filter(emp => {
    const nameMatch = (emp.name || '').toLowerCase().includes(value);
    const idMatch = String(emp.empid || '').toLowerCase().includes(value);
    return nameMatch || idMatch;
  }).slice(0, 25);
  matches.forEach(emp => {
    const div = document.createElement('div');
    div.textContent = `${emp.srno || ''} - ${emp.empid || ''} - ${emp.name}_${emp.fathername || ''}`;
    div.addEventListener('click', () => {
      employeeInput.value = `${emp.srno}_${emp.empid}_${emp.name}`;
      contactInput.value = emp.empcontactno || '';
      document.getElementById('employee-id').value = emp.empid || '';
      suggestionBox.innerHTML = '';
    });
    suggestionBox.appendChild(div);
  });
});
document.addEventListener('click', function (e) {
  if (!suggestionBox.contains(e.target) && e.target !== employeeInput) suggestionBox.innerHTML = '';
});
let lookupModalInstance = null;
document.getElementById('lookupLeaveBtn').addEventListener('click', () => {
  const empid = document.getElementById('employee-id').value;
  if (!empid) { showToast('Select an employee first.', 'warning'); return; }
  fetch(`${GOOGLE_SHEET_WEBAPP_URL}?empid=${empid}`)
    .then(res => res.json())
    .then(dates => {
      const list = document.getElementById('leaveList');
      list.innerHTML = '';
      if (!dates.length) { list.innerHTML = '<p class="text-muted mb-0">No previous leave records found.</p>'; }
      dates.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:8px;border-bottom:1px solid #eee;cursor:pointer;';
        div.innerHTML = `<strong>Date Selected:</strong> ${escapeHtml(item.date)}<br><span class="text-muted">Last Leave Date: ${escapeHtml(item.lastLeaveDate)}</span>`;
        div.onclick = () => {
          document.getElementById('lastLeaveDate').value = item.lastLeaveDate;
          lookupModalInstance.hide();
        };
        list.appendChild(div);
      });
      if (!lookupModalInstance) lookupModalInstance = new bootstrap.Modal(document.getElementById('lookupModal'));
      lookupModalInstance.show();
    })
    .catch(err => showToast('Could not fetch leave history: ' + err.message, 'error'));
});
let logAdminPassword = null;
async function apiGet(action, extraParams) {
  const params = new URLSearchParams({ action, ...(extraParams || {}) });
  const res = await fetch(`${GOOGLE_SHEET_WEBAPP_URL}?${params.toString()}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
async function apiPost(body) {
  const res = await fetch(GOOGLE_SHEET_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, 
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
function renderTable() {
  rowCount.textContent = leaveEntries.length + (leaveEntries.length === 1 ? ' entry' : ' entries');
  if (!leaveEntries.length) {
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No leave applications yet</td></tr>';
    return;
  }
  tableBody.innerHTML = leaveEntries.slice().reverse().map((r, idx) => {
    const realIdx = leaveEntries.length - 1 - idx;
    return `
    <tr>
      <td>${escapeHtml(r.leave_id)}</td>
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.contact)}</td>
      <td>${escapeHtml(r.department)}</td>
      <td>${escapeHtml(r.periodOfLeave)}</td>
      <td>${escapeHtml(r.reasonOfLeave)}</td>
      <td>${escapeHtml(r.lastLeaveDate)}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" onclick="reprintRow(${realIdx})" title="Print"><i class="bi bi-printer"></i></button>
        <button class="btn btn-sm btn-outline-primary" onclick="editRow(${realIdx})" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteRow(${realIdx})" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}
let logCollapseInstance = null;
async function loadLog() {
  if (!logAdminPassword) return;
  try {
    const result = await apiGet('list', { admin: logAdminPassword });
    console.log('Leave Log raw response:', result); 
    leaveEntries = result.data || [];
    lastSynced.textContent = 'Last synced ' + new Date().toLocaleTimeString();
    renderTable();
    if (leaveEntries.length === 0) {
      showToast('Log loaded, but the sheet returned 0 entries. Check For info.', 'warning');
    }
  } catch (err) {
    console.error('Could not load leave log:', err);
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">${escapeHtml(err.message)}</td></tr>`;
    showToast('Could not load Leave Log: ' + err.message, 'error');
  }
}
document.getElementById('refreshBtn').addEventListener('click', () => { if (logAdminPassword) loadLog(); });
const logPasswordGate = document.getElementById('logPasswordGate');
const logTableWrapper = document.getElementById('logTableWrapper');
const logPasswordInput = document.getElementById('logPasswordInput');
const logPasswordFeedback = document.getElementById('logPasswordFeedback');
document.getElementById('logHeader').addEventListener('click', () => {
  const logBody = document.getElementById('receiptLogBody');
  if (!logCollapseInstance) logCollapseInstance = new bootstrap.Collapse(logBody, { toggle: false });
  if (logAdminPassword) {
    logCollapseInstance.toggle();
    return;
  }
  logCollapseInstance.show();
  setTimeout(() => logPasswordInput.focus(), 150);
});
async function handleLogPasswordSubmit() {
  const pwd = logPasswordInput.value.trim();

  if (!pwd) {
    logPasswordFeedback.className = 'mt-2 small fw-bold text-danger';
    logPasswordFeedback.textContent = 'Password is required to view the leave log.';
    logPasswordInput.focus();
    return;
  }
  logPasswordFeedback.className = 'mt-2 small fw-bold text-muted';
  logPasswordFeedback.textContent = 'Verifying...';
  try {
    await apiPost({ action: 'verify', admin: pwd });
    logAdminPassword = pwd;
    document.getElementById('logChevron').classList.replace('bi-lock', 'bi-chevron-down');
    const lockLabel = document.getElementById('logLockLabel');
    if (lockLabel) lockLabel.remove();
    logPasswordGate.classList.add('d-none');
    logTableWrapper.classList.remove('d-none');
    await loadLog();
    showToast('Leave Log unlocked.', 'success');
  } catch (err) {
    logPasswordFeedback.className = 'mt-2 small fw-bold text-danger';
    logPasswordFeedback.textContent = 'Incorrect password. Please try again.';
    logPasswordInput.value = '';
    logPasswordInput.focus();
  }
}
document.getElementById('submitLogPasswordBtn').addEventListener('click', handleLogPasswordSubmit);
logPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); handleLogPasswordSubmit(); }
});
let editModalInstance = null;
window.editRow = function (index) {
  const r = leaveEntries[index];
  document.getElementById('editLeaveId').value = r.leave_id;
  document.getElementById('editDate').value = r.date;
  document.getElementById('editName').value = r.name;
  document.getElementById('editContact').value = r.contact;
  document.getElementById('editDepartment').value = r.department;
  document.getElementById('editPeriod').value = r.periodOfLeave;
  document.getElementById('editReason').value = r.reasonOfLeave;
  document.getElementById('editLastLeave').value = r.lastLeaveDate;
  document.getElementById('editAdminPassword').value = '';
  document.getElementById('editModalFeedback').textContent = '';
  if (!editModalInstance) editModalInstance = new bootstrap.Modal(document.getElementById('editModal'));
  editModalInstance.show();
};
document.getElementById('saveEditBtn').addEventListener('click', async () => {
  const feedback = document.getElementById('editModalFeedback');
  const pwd = document.getElementById('editAdminPassword').value;
  feedback.className = 'mt-2 small fw-bold text-danger';
  if (!pwd) { feedback.textContent = 'Enter the password to save changes.'; return; }
  const entry = {
    date: document.getElementById('editDate').value,
    name: document.getElementById('editName').value.trim(),
    contact: document.getElementById('editContact').value.trim(),
    department: document.getElementById('editDepartment').value.trim(),
    periodOfLeave: document.getElementById('editPeriod').value.trim(),
    reasonOfLeave: document.getElementById('editReason').value.trim(),
    lastLeaveDate: document.getElementById('editLastLeave').value.trim()
  };
  const leave_id = document.getElementById('editLeaveId').value;
  const btn = document.getElementById('saveEditBtn');
  btn.disabled = true;
  feedback.textContent = '';
  try {
    await apiPost({ action: 'update', admin: pwd, leave_id, entry });
    editModalInstance.hide();
    showToast('Changes saved.', 'success');
    await loadLog();
  } catch (err) {
    feedback.textContent = 'Could not save changes: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});
window.deleteRow = async function (index) {
  const r = leaveEntries[index];
  const pwd = await showDeleteConfirm(`Delete the leave application for "${r.name}" (${r.date})? This cannot be undone.`);
  if (pwd === null) return;
  try {
    await apiPost({ action: 'delete', admin: pwd, leave_id: r.leave_id });
    showToast('Entry deleted.', 'success');
    await loadLog();
  } catch (err) {
    showToast('Could not delete: ' + err.message, 'error');
  }
};
function fillPrintArea(entry) {
  document.getElementById('p_date').textContent = entry.date;
  document.getElementById('p_name').textContent = entry.name;
  document.getElementById('p_contact').textContent = entry.contact;
  document.getElementById('p_department').textContent = entry.department;
  document.getElementById('p_period').textContent = entry.periodOfLeave;
  document.getElementById('p_reason').textContent = entry.reasonOfLeave;
  document.getElementById('p_lastleave').textContent = entry.lastLeaveDate;
  document.getElementById('p_printedon').textContent = 'Printed on: ' + new Date().toLocaleString('en-GB');
}
window.reprintRow = function (index) {
  const r = leaveEntries[index];
  fillPrintArea({
    date: r.date, name: r.name, contact: r.contact, department: r.department,
    periodOfLeave: r.periodOfLeave, reasonOfLeave: r.reasonOfLeave, lastLeaveDate: r.lastLeaveDate
  });
  window.print();
};
function currentFormEntry() {
  return {
    date: document.getElementById('date').value,
    name: employeeInput.value.trim(),
    contact: contactInput.value.trim(),
    department: document.getElementById('department-name').value.trim(),
    periodOfLeave: document.getElementById('periodOfLeave').value.trim(),
    reasonOfLeave: document.getElementById('reasonOfLeave').value.trim(),
    lastLeaveDate: document.getElementById('lastLeaveDate').value.trim()
  };
}
document.getElementById('printBtn').addEventListener('click', async () => {
  const entry = currentFormEntry();
  if (!entry.name || !entry.contact || !entry.lastLeaveDate) {
    showToast('Please fill in Employee Name, Contact Number and Last Leave Date before printing.', 'warning');
    return;
  }
  const btn = document.getElementById('printBtn');
  btn.disabled = true;
  try {
    await apiPost({ action: 'add', entry: { ...entry, empid: document.getElementById('employee-id').value } });
  } catch (err) {
    await fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, empid: document.getElementById('employee-id').value })
    });
  }
  fillPrintArea(entry);
  window.print();
  document.getElementById('leaveForm').reset();
  document.getElementById('date').value = todayStr();
  document.getElementById('employee-id').value = '';
  await loadLog();
  btn.disabled = false;
});
document.getElementById('leaveForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const entry = { ...currentFormEntry(), empid: document.getElementById('employee-id').value };
  if (!entry.name || !entry.contact || !entry.lastLeaveDate) {
    showToast('Please fill in Employee Name, Contact Number and Last Leave Date before saving.', 'warning');
    return;
  }
  const btn = document.getElementById('addBtn');
  btn.disabled = true;
  try {
    await apiPost({ action: 'add', entry });
  } catch (err) {
    await fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  }
  showToast('Leave application saved.', 'success');
  this.reset();
  document.getElementById('date').value = todayStr();
  document.getElementById('employee-id').value = '';
  await loadLog();
  btn.disabled = false;
});
loadLog();