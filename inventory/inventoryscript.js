const apiUrl = "https://script.google.com/macros/s/AKfycbwwP9aymvL3FrHdGBzPDuGpqKdWfmTLZo8-8ETXpZ6lUqbUI-sUasQ1Ss0z75awNuGgEg/exec";
let rawData = [];
let headers = [];
let chartInstance = null;

// Only these columns will ever be shown/used anywhere in the app.
// "item name" matches your Item Name column; "stock"/"inhand" matches your stock column
// (whichever your sheet actually calls it).
function isAllowedColumn(header) {
  const h = header.toLowerCase();
  return h.includes("item name") || h.includes("stock") || h.includes("inhand");
}

function createColumnToggle() {
  const container = document.createElement('div');
  container.className = 'column-toggle';

  headers.forEach(header => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${header}`;
    checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      const index = headers.indexOf(header);
      const rows = document.querySelectorAll('#sheet-table tr');
      rows.forEach(row => {
        const cell = row.cells[index];
        cell.style.display = checkbox.checked ? '' : 'none';
      });
    });

    const label = document.createElement('label');
    label.htmlFor = `toggle-${header}`;
    label.textContent = header;

    container.appendChild(checkbox);
    container.appendChild(label);
    container.appendChild(document.createElement('br'));
  });

  document.querySelector('.table-wrapper').prepend(container);
}

function isNumericColumn(column) {
  return rawData.every(row => !isNaN(parseFloat(row[column])) || row[column] === "");
}

function createAdvancedFilters() {
  const thead = document.querySelector("#sheet-table thead");
  const filterRow = document.createElement("tr");

  headers.forEach((header) => {
    const th = document.createElement("th");

    if (header.toLowerCase().includes("item name")) {
      th.innerHTML = '&nbsp;';
    } else if (isNumericColumn(header)) {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="">All</option>
        <option value="=">Equal To</option>
        <option value="<">Less Than</option>
        <option value=">">Greater Than</option>
        <option value="between">Between</option>
      `;

      const input1 = document.createElement("input");
      input1.type = "number";
      input1.placeholder = "Value";

      const input2 = document.createElement("input");
      input2.type = "number";
      input2.placeholder = "and";
      input2.style.display = "none";

      select.addEventListener("change", () => {
        input2.style.display = (select.value === "between") ? "inline-block" : "none";
        filterTable();
      });

      input1.addEventListener("input", filterTable);
      input2.addEventListener("input", filterTable);

      th.appendChild(select);
      th.appendChild(input1);
      th.appendChild(input2);
    } else {
      const select = document.createElement("select");
      select.innerHTML = `<option value="">All</option>`;
      const uniqueVals = [...new Set(rawData.map(row => row[header]).filter(val => val !== ""))];
      uniqueVals.sort().forEach(val => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      });
      select.addEventListener("change", filterTable);
      th.appendChild(select);
    }

    filterRow.appendChild(th);
  });

  thead.appendChild(filterRow);
}

function filterTable() {
  const tbody = document.querySelector("#sheet-table tbody");
  const searchText = document.getElementById("itemSearch").value.toLowerCase();
  const filterCells = document.querySelectorAll("#sheet-table thead tr:nth-child(2) th");

  tbody.innerHTML = "";
  let visibleRows = [];

  rawData.forEach(row => {
    let show = true;

    headers.forEach((header, i) => {
      const cell = filterCells[i];

      if (header.toLowerCase().includes("item name")) {
        const value = (row[header] || "").toString().toLowerCase();
        if (!value.includes(searchText)) show = false;
        return;
      }

      if (isNumericColumn(header)) {
        const op = cell.querySelector("select")?.value;
        const val1 = parseFloat(cell.querySelectorAll("input")[0]?.value || "");
        const val2 = parseFloat(cell.querySelectorAll("input")[1]?.value || "");
        const actual = parseFloat(row[header]);

        if (op === "=" && actual !== val1) show = false;
        if (op === ">" && actual <= val1) show = false;
        if (op === "<" && actual >= val1) show = false;
        if (op === "between" && (actual < val1 || actual > val2)) show = false;
      } else {
        const selVal = cell.querySelector("select")?.value;
        if (selVal && row[header] !== selVal) show = false;
      }
    });

    if (show) {
      visibleRows.push(row);
      const tr = document.createElement("tr");
      headers.forEach((header) => {
        const td = document.createElement("td");
        td.textContent = isNumericColumn(header) ?
                 Math.round(row[header]) : row[header];
        if (header.toLowerCase().includes("item name")) td.classList.add("left-align");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  });

  renderChartIfOneMatch(visibleRows);
}

// Simplified: with only Item Name + Stock available, the chart just shows
// the stock level for the single matched item rather than a 5-metric comparison.
function renderChartIfOneMatch(rows) {
  const canvas = document.getElementById("itemChart");

  if (rows.length === 1) {
    const item = rows[0];
    const stockHeader = headers.find(h => {
      const lh = h.toLowerCase();
      return lh.includes("stock") || lh.includes("inhand");
    });
    const stockValue = parseFloat(item[stockHeader]) || 0;

    const data = {
      labels: [stockHeader || "Stock"],
      datasets: [{
        label: item["Item Name"] || "Item",
        data: [stockValue],
        backgroundColor: ["#36a2eb"]
      }]
    };

    const config = {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Stock for "${item["Item Name"]}"`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Quantity' }
          }
        }
      }
    };

    canvas.style.display = "block";
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, config);
  } else {
    canvas.style.display = "none";
    if (chartInstance) chartInstance.destroy();
  }
}

fetch(apiUrl)
  .then(res => res.json())
  .then(data => {
    rawData = data.map(row => {
      const keys = Object.keys(row);
      const newRow = {};
      keys.forEach((key, i) => {
        if (i !== 0) newRow[key] = row[key];
      });
      return newRow;
    });

    // Restrict every row to only the allowed columns (Item Name + Stock).
    rawData = rawData.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        if (isAllowedColumn(key)) newRow[key] = row[key];
      });
      return newRow;
    });

    headers = Object.keys(rawData[0]).filter(isAllowedColumn);

    createColumnToggle();

    const thead = document.querySelector("#sheet-table thead");
    const headerRow = document.createElement("tr");

    headers.forEach(h => {
      const th = document.createElement("th");
      th.innerHTML = h.replaceAll("\n", "<br>");
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    createAdvancedFilters();
    filterTable();
  })
  .catch(err => {
    console.error("Error:", err);
    document.querySelector(".table-wrapper").innerHTML = "<p style='color:red;'>Failed to load data.</p>";
  });

document.getElementById("itemSearch").addEventListener("input", filterTable);

// With only 2 columns left, every PDF view choice just shows both columns.
// Kept as a no-op-equivalent function so any existing buttons calling
// applyPDFView(choice) don't break.
function applyPDFView(choice) {
  const table = document.getElementById("sheet-table");
  const rows = table.querySelectorAll("tr");

  rows.forEach(row => {
    const cells = row.querySelectorAll("th, td");
    headers.forEach((header, i) => {
      if (cells[i]) cells[i].style.display = "";
    });
  });
}

// Triggers the browser's print dialog (use "Save as PDF" as the destination).
// Relies on the existing @media print rules in the CSS to hide buttons,
// the search box, the chart, and the filter row before printing.
function exportToPDF() {
  applyPDFView("1");
  window.print();
}

// Requests permission to show browser notifications.
function askNotificationPermission() {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return;
  }

  if (Notification.permission === "granted") {
    alert("Notifications are already enabled.");
    return;
  }

  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      new Notification("Notifications enabled", {
        body: "You'll be notified about inventory updates."
      });
    } else {
      alert("Notification permission was not granted.");
    }
  });
}
