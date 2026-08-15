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