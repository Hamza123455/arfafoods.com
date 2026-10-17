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