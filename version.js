// Single place to set the app version. Change the number here, push, and the
window.APP_VERSIONS = {
  managementSystem: { name: 'Management System', version: '1.2' }
};

(function applyVersionLabels() {
  function run() {
    document.querySelectorAll('option[data-app]').forEach(function (opt) {
      var app = window.APP_VERSIONS[opt.dataset.app];
      if (app) opt.textContent = app.name + ' (ver. ' + app.version + ')';
    });
    document.querySelectorAll('[data-version]').forEach(function (el) {
      var app = window.APP_VERSIONS[el.dataset.version];
      if (app) el.textContent = '(ver. ' + app.version + ')';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();