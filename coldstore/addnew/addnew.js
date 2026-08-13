let currentLookups = { items: [], vendours: [], coldStores: [] };
  let selectedType = 'items';
  let activeListTab = 'items';

  const TYPE_LABELS = { items: 'Item', coldStores: 'Cold Store', vendours: 'Vendour' };

  function getConfig() {
    return {
      url: localStorage.getItem('coldstore_webapp_url') || '',
      key: localStorage.getItem('coldstore_secret_key') || ''
    };
  }

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const lastSynced = document.getElementById('lastSynced');
  const addNewBtn = document.getElementById('addNewBtn');

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
      addNewBtn.disabled = true;
      return;
    }
    setStatus('busy', 'Connecting...');
    try {
      const result = await apiGet('lookups');
      currentLookups = result.data || { items: [], vendours: [], coldStores: [] };
      setStatus('on', 'Connected - synced live across PCs');
      lastSynced.textContent = 'Last synced ' + new Date().toLocaleTimeString();
      addNewBtn.disabled = false;
      renderListTab();
      updateTabCounts();
      updateNameHint();
    } catch (err) {
      setStatus('off', 'Connection failed');
      alert('Could not connect: ' + err.message);
    }
  }
  document.getElementById('refreshBtn').addEventListener('click', connectAndLoad);

  // ---- Type selector ----
  document.querySelectorAll('.type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedType = card.dataset.type;
      document.getElementById('nameLabel').textContent = TYPE_LABELS[selectedType] + ' Name';
      document.getElementById('newName').placeholder = `Type the ${TYPE_LABELS[selectedType].toLowerCase()} name...`;
      updateNameHint();
    });
  });

  function updateNameHint() {
    const hint = document.getElementById('nameHint');
    const name = document.getElementById('newName').value.trim().toLowerCase();
    if (!name) { hint.textContent = '\u00a0'; hint.className = 'form-text'; return; }
    const list = currentLookups[selectedType] || [];
    const dup = list.some(v => String(v).trim().toLowerCase() === name);
    if (dup) {
      hint.textContent = `"${document.getElementById('newName').value.trim()}" already exists in this list.`;
      hint.className = 'form-text text-danger';
    } else {
      hint.textContent = 'Looks new - not currently in the list.';
      hint.className = 'form-text text-success';
    }
  }
  document.getElementById('newName').addEventListener('input', updateNameHint);

  // ---- Current lists tabs ----
  document.getElementById('listTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-link');
    if (!btn) return;
    document.querySelectorAll('#listTabs .nav-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeListTab = btn.dataset.list;
    renderListTab();
  });

  function renderListTab() {
    const list = (currentLookups[activeListTab] || []).slice().sort((a, b) => String(a).localeCompare(String(b)));
    const el = document.getElementById('listDisplay');
    el.innerHTML = list.length
      ? list.map(v => `<div class="list-group-item">${escapeHtml(v)}</div>`).join('')
      : '<div class="list-group-item text-muted">Nothing added yet.</div>';
  }

  function updateTabCounts() {
    document.getElementById('tabCountItems').textContent = (currentLookups.items || []).length;
    document.getElementById('tabCountColdStores').textContent = (currentLookups.coldStores || []).length;
    document.getElementById('tabCountVendours').textContent = (currentLookups.vendours || []).length;
  }

  // ---- Add New -> confirm -> save ----
  let confirmAddModalInstance = null;

  document.getElementById('addNewBtn').addEventListener('click', () => {
    const name = document.getElementById('newName').value.trim();
    if (!name) { alert('Enter a name first.'); return; }
    const list = currentLookups[selectedType] || [];
    if (list.some(v => String(v).trim().toLowerCase() === name.toLowerCase())) {
      alert(`"${name}" already exists in the ${TYPE_LABELS[selectedType]} list.`);
      return;
    }
    document.getElementById('confirmTypeLabel').textContent = TYPE_LABELS[selectedType];
    document.getElementById('confirmNameLabel').textContent = name;
    if (!confirmAddModalInstance) confirmAddModalInstance = new bootstrap.Modal(document.getElementById('confirmAddModal'));
    confirmAddModalInstance.show();
  });

  document.getElementById('confirmAddBtn').addEventListener('click', async () => {
    const name = document.getElementById('newName').value.trim();
    const btn = document.getElementById('confirmAddBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    try {
      await apiPost({ action: 'addLookup', lookupType: selectedType, name });
      confirmAddModalInstance.hide();
      document.getElementById('newName').value = '';
      await connectAndLoad();
      activeListTab = selectedType;
      document.querySelectorAll('#listTabs .nav-link').forEach(b => b.classList.toggle('active', b.dataset.list === selectedType));
      renderListTab();
    } catch (err) {
      alert('Could not save: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm & Save';
    }
  });

  // init
  connectAndLoad();
