// The combined backend URL is NOT stored in this (public) repo.
// It is entered once per device from the dashboard's connection icon
// and kept in this browser's local storage. This file only reads it.
(function () {
  var url = '';
  try {
    url = localStorage.getItem('arfa_backend_url') || localStorage.getItem('coldstore_webapp_url') || '';
  } catch (e) {}
  window.ARFA_BACKEND_URL = url;
})();