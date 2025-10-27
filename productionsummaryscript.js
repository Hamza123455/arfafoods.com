const apiUrl = "https://script.google.com/macros/s/AKfycbwKi1rtGxO89KHaDhUgiI3lzAoWth8mP5jtqYi4kYvlX3OpzzzKlTYRJgHhAcBmK2PW/exec";
let rawData = [];
let headers = [];
let chartInstance = null;

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
        td.textContent = row[header];
        if (header.toLowerCase().includes("item name")) td.classList.add("left-align");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  });

  renderChartIfOneMatch(visibleRows);
}

function renderChartIfOneMatch(rows) {
  const canvas = document.getElementById("itemChart");

  if (rows.length === 1) {
    const item = rows[0];

    const planned = parseFloat(item["Planned"]) || 0;
    const requirement = parseFloat(item["Total-Req"]) || 0;
    const produced = parseFloat(item["Produced"]) || 0;
    const furtherRequired = parseFloat(item["Further Required"]) || 0;

    const max = Math.max(planned, requirement, produced, furtherRequired);

    const data = {
      labels: ["Planned", "Total Required", "Produced", "Further Required"],
      datasets: [{
        label: item["Item Name"] || "Item",
        data: [planned, requirement, produced, furtherRequired],
        backgroundColor: ["#36a2eb", "#3e95cd", "#8e5ea2", "#c45850"]
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
            text: `Production Summary for "${item["Item Name"]}"`
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (val) => {
              return max > 0 ? `${Math.round((val / max) * 100)}%` : '';
            },
            color: '#333',
            font: { weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Quantity' }
          }
        }
      },
      plugins: [ChartDataLabels]
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

    headers = Object.keys(rawData[0]);

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

function exportToPDF() {
  const originalTitle = document.title;
  document.title = "Production Summary";

  const filterRow = document.querySelector("#sheet-table thead tr:nth-child(2)");
  if (filterRow) filterRow.style.display = "none";

  window.print();

  document.title = originalTitle;
  setTimeout(() => {
    if (filterRow) filterRow.style.display = "";
  }, 1000);
}
