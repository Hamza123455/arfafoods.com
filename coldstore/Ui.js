/* ================= COLD STORE POPUPS (replace alert / prompt / confirm) =================
 * Same look as the Leaveform popups. Needs Bootstrap CSS + bundle JS + Bootstrap Icons
 * (every Cold Store page already loads them).
 *
 *   uiToast(message, 'success' | 'error' | 'warning' | 'info')
 *   await uiAskPassword({ title, message, okLabel, danger })  -> password text, or null if cancelled
 *   await uiConfirm(message, { title, okLabel, danger })      -> true / false
 */
(function () {
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* ---------- toast ---------- */
  function toastContainer() {
    let c = document.getElementById('uiToastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'uiToastContainer';
      c.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2000;display:flex;flex-direction:column;gap:8px;width:340px;max-width:calc(100vw - 32px);';
      document.body.appendChild(c);
    }
    return c;
  }

  window.uiToast = function (message, type) {
    type = type || 'success';
    const bg = { success: 'text-bg-success', error: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-secondary' }[type] || 'text-bg-success';
    const icon = { success: 'bi-check-circle', error: 'bi-x-circle', warning: 'bi-exclamation-triangle', info: 'bi-info-circle' }[type] || 'bi-check-circle';
    const el = document.createElement('div');
    el.className = 'toast align-items-center ' + bg + ' border-0 shadow';
    el.setAttribute('role', 'alert');
    el.innerHTML =
      '<div class="d-flex">' +
        '<div class="toast-body"><i class="bi ' + icon + ' me-1"></i> ' + esc(message) + '</div>' +
        '<button type="button" class="btn-close ' + (type === 'warning' ? '' : 'btn-close-white ') + 'me-2 m-auto" data-bs-dismiss="toast"></button>' +
      '</div>';
    toastContainer().appendChild(el);
    const t = new bootstrap.Toast(el, { delay: type === 'error' || type === 'warning' ? 7000 : 4000 });
    t.show();
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
  };

  /* ---------- generic dialog ---------- */
  // Builds a modal, resolves with whatever `getResult(okClicked)` returns once it is fully hidden.
  function openDialog(opts) {
    return new Promise(function (resolve) {
      const wrap = document.createElement('div');
      wrap.className = 'modal fade';
      wrap.tabIndex = -1;
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML =
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title ' + (opts.danger ? 'text-danger' : '') + '"><i class="bi ' + (opts.danger ? 'bi-exclamation-triangle' : 'bi-question-circle') + '"></i> ' + esc(opts.title) + '</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<p class="mb-3" data-ui="message">' + esc(opts.message) + '</p>' +
              (opts.password
                ? '<label class="form-label small fw-bold">Admin password</label>' +
                  '<input type="password" class="form-control" data-ui="input" autocomplete="off" placeholder="required">' +
                  '<div class="mt-2 small fw-bold text-danger" data-ui="feedback"></div>'
                : '') +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>' +
              '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ui="ok">' + esc(opts.okLabel || 'OK') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap);

      const modal = new bootstrap.Modal(wrap);
      const input = wrap.querySelector('[data-ui="input"]');
      const feedback = wrap.querySelector('[data-ui="feedback"]');
      let result = opts.password ? null : false;

      function submit() {
        if (opts.password) {
          const value = input.value;
          if (!value) { feedback.textContent = 'Enter the admin password.'; input.focus(); return; }
          result = value;
        } else {
          result = true;
        }
        modal.hide();
      }

      wrap.querySelector('[data-ui="ok"]').addEventListener('click', submit);
      if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      wrap.addEventListener('shown.bs.modal', function () { if (input) input.focus(); });
      wrap.addEventListener('hidden.bs.modal', function () {
        modal.dispose();
        wrap.remove();
        resolve(result);
      });
      modal.show();
    });
  }

  window.uiAskPassword = function (opts) {
    opts = opts || {};
    return openDialog({
      title: opts.title || 'Admin password',
      message: opts.message || 'Enter the admin password to continue.',
      okLabel: opts.okLabel || 'OK',
      danger: !!opts.danger,
      password: true
    });
  };

  window.uiConfirm = function (message, opts) {
    opts = opts || {};
    return openDialog({
      title: opts.title || 'Please confirm',
      message: message,
      okLabel: opts.okLabel || 'OK',
      danger: !!opts.danger,
      password: false
    });
  };
})();