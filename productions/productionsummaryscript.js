const apiUrl = "https://script.google.com/macros/s/AKfycbyRUs_n-UANxDNkNxyGxnNeWKJklXg9pI4aXE0kl0_itK7S4phO5JbKWHFF5eu7DOR8/exec";
let rawData = [];
let headers = [];
let chartInstance = null;
let currentVisibleRows = []; // NEW: tracks whatever rows are currently visible/filtered

// ===== EXPORT (now opens a column-selection dialog first) =====
function exportToPDF() {
  openExportDialog();
}

function openExportDialog() {
  // Remove any existing instance so we always rebuild with current headers
  const existing = document.getElementById("exportDialogOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "exportDialogOverlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background: #fff; padding: 20px 24px; border-radius: 8px;
    max-width: 420px; width: 90%; max-height: 80vh; overflow-y: auto;
    font-family: Arial, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  const title = document.createElement("h3");
  title.textContent = "Select Columns to Export";
  title.style.marginTop = "0";
  box.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.textContent = "Uncheck any columns you want to omit. The export will only include rows that match your current search/filters.";
  subtitle.style.cssText = "font-size: 13px; color: #666; margin-top: -8px;";
  box.appendChild(subtitle);

  const selectAllRow = document.createElement("div");
  selectAllRow.style.cssText = "margin: 8px 0 4px; font-size: 13px;";
  const selectAllLink = document.createElement("a");
  selectAllLink.textContent = "Select All";
  selectAllLink.href = "#";
  selectAllLink.style.marginRight = "12px";
  selectAllLink.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll("#exportColumnList input[type=checkbox]").forEach(cb => cb.checked = true);
  };
  const selectNoneLink = document.createElement("a");
  selectNoneLink.textContent = "Select None";
  selectNoneLink.href = "#";
  selectNoneLink.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll("#exportColumnList input[type=checkbox]").forEach(cb => cb.checked = false);
  };
  selectAllRow.appendChild(selectAllLink);
  selectAllRow.appendChild(selectNoneLink);
  box.appendChild(selectAllRow);

  const list = document.createElement("div");
  list.id = "exportColumnList";
  list.style.cssText = "border-top: 1px solid #eee; padding-top: 8px;";
  headers.forEach((h) => {
    const label = document.createElement("label");
    label.style.cssText = "display:block; margin:6px 0; cursor:pointer; font-size: 14px;";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = h;
    cb.checked = true;
    cb.style.marginRight = "8px";
    label.appendChild(cb);
    label.appendChild(document.createTextNode(h.replaceAll("\n", " ")));
    list.appendChild(label);
  });
  box.appendChild(list);

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "margin-top:16px; text-align:right; border-top: 1px solid #eee; padding-top: 12px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = "margin-right:10px; padding:6px 14px; cursor:pointer;";
  cancelBtn.onclick = closeExportDialog;

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export PDF";
  exportBtn.style.cssText = "padding:6px 14px; background:#16a085; color:#fff; border:none; border-radius:4px; cursor:pointer;";
  exportBtn.onclick = confirmExport;

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(exportBtn);
  box.appendChild(btnRow);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function closeExportDialog() {
  const overlay = document.getElementById("exportDialogOverlay");
  if (overlay) overlay.remove();
}

function confirmExport() {
  const checkboxes = document.querySelectorAll("#exportColumnList input[type=checkbox]");
  const selectedHeaders = [...checkboxes].filter(cb => cb.checked).map(cb => cb.value);

  if (!selectedHeaders.length) {
    alert("Please select at least one column to export.");
    return;
  }

  closeExportDialog();
  runPDFExport(selectedHeaders);
}

function runPDFExport(selectedHeaders) {
  const doc = new jspdf.jsPDF();

  const head = [selectedHeaders.map(h => h.replaceAll("\n", " "))];
  const body = currentVisibleRows.map(row =>
    selectedHeaders.map(h => {
      const value = row[h];
      return (!isNaN(value) && value !== "") ? Math.round(+value) : value;
    })
  );

  doc.autoTable({
    head: head,
    body: body,
    startY: 20,
    headStyles: { fillColor: [22, 160, 133] },
  });

  doc.save('Exported-Table.pdf');
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
  const searchText = document.getElementById("itemSearch").value.toLowerCase().trim();
  const filterCells = document.querySelectorAll("#sheet-table thead tr:nth-child(2) th");

  // Find the index of the Item Name column once
  const itemNameIndex = headers.findIndex(h => h.trim().toLowerCase().includes("item name"));

  tbody.innerHTML = "";
  let visibleRows = [];

  rawData.forEach(row => {
    let show = true;

    // 1. Search box filter - only check the Item Name column
    if (searchText!== "" && itemNameIndex!== -1) {
      const itemNameCol = headers[itemNameIndex];
      const value = (row[itemNameCol] || "").toString().toLowerCase();
      if (!value.includes(searchText)) show = false;
    }

    // 2. Column filters
    if (show) {
      headers.forEach((header, i) => {
        // Skip item name column here since we already handled it
        if (i === itemNameIndex) return;

        const cell = filterCells[i];
        if (!cell) return;

        if (isNumericColumn(header)) {
          const op = cell.querySelector("select")?.value;
          const val1 = parseFloat(cell.querySelectorAll("input")[0]?.value || "");
          const val2 = parseFloat(cell.querySelectorAll("input")[1]?.value || "");
          const actual = parseFloat(row[header]);

          if (op === "=" && actual!== val1) show = false;
          if (op === ">" && actual <= val1) show = false;
          if (op === "<" && actual >= val1) show = false;
          if (op === "between" && (actual < val1 || actual > val2)) show = false;
        } else {
          const selVal = cell.querySelector("select")?.value;
          if (selVal && row[header]!== selVal) show = false;
        }
      });
    }

    if (show) {
      visibleRows.push(row);
      const tr = document.createElement("tr");
      headers.forEach((header) => {
        const td = document.createElement("td");
        const value = row[header];
        td.textContent =!isNaN(value) && value!== ''?
                       Math.round(+value) : value;
        if (header.trim().toLowerCase().includes("item name")) td.classList.add("left-align");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  });

  currentVisibleRows = visibleRows; // NEW: keep the export in sync with active filters
  renderChartIfOneMatch(visibleRows);
}
document.getElementById("itemSearch").addEventListener("input", filterTable);
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
 .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
 .then(data => {
    rawData = data.rows.map(row => {
    const newRow = {};
    Object.keys(row).forEach(key => {
      newRow[key] = row[key];
    });
    return newRow;
  });

  document.getElementById("lastUpdate").textContent =
    "Last Production Update: " + data.lastUpdate;

  headers = Object.keys(rawData[0] || {});
  if (!headers.length) {
    document.querySelector(".table-wrapper").innerHTML =
      "<p style='text-align:center;'>No data returned</p>";
    return;
  }

  const thead = document.querySelector("#sheet-table thead");
  thead.innerHTML = "";
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
    console.error("Fetch error:", err);
    document.querySelector(".table-wrapper").innerHTML =
      "<p style='color:red; text-align:center;'>Failed to load data: " + err.message + "</p>";
    document.getElementById("lastUpdate").textContent = "Last Production Update: Error";
  });

function applyPDFView(choice) {
  const table = document.getElementById("sheet-table");
  const rows = table.querySelectorAll("tr");

  rows.forEach(row => {
    const cells = row.querySelectorAll("th, td");

    headers.forEach((header, i) => {
      const cleanHeader = header.trim().toLowerCase();

      // SHOW ALL
      if (choice === "1") {
        cells[i].style.display = "";
      }

      // PRODUCTION VIEW
      else if (choice === "2") {
        if (
          cleanHeader.includes("item name") ||
          cleanHeader.includes("planned") ||
          cleanHeader.includes("total-req") ||
          cleanHeader.includes("produced") ||
          cleanHeader.includes("further required")
        ) {
          cells[i].style.display = "";
        } else {
          cells[i].style.display = "none";
        }
      }


      // CURRENT STOCK VIEW
      else if (choice === "3") {
        if (
          cleanHeader.includes("item name") ||
          cleanHeader.includes("stock") ||
          cleanHeader.includes("inhand")
        ) {
          cells[i].style.display = "";
        } else {
          cells[i].style.display = "none";
        }
      }
    });
  });
}
// ===== FIREBASE PUSH NOTIFICATION SETUP =====
const firebaseConfig = {
  apiKey: "AIzaSyDhHrDsQ800-OL8a9p8KxD7x2FOgP70dh0",
  authDomain: "productionsummary-de8b2.firebaseapp.com", 
  projectId: "productionsummary-de8b2",
  messagingSenderId: "954992538861",
  appId: "1:954992538861:web:b4f15a0cde8338e71808e4"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 2. YOUR APPS SCRIPT URL - REPLACE THIS
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRUs_n-UANxDNkNxyGxnNeWKJklXg9pI4aXE0kl0_itK7S4phO5JbKWHFF5eu7DOR8/exec";

// 3. FUNCTION TO SAVE TOKEN - DEFINED FIRST
async function saveTokenToSheet(token){
  console.log("Saving token to sheet...");
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({token: token})
    });
    console.log("Token saved to sheet");
  } catch(err) {
    console.error("Failed to save token:", err);
  }
}

// 4. MAIN PUSH FUNCTION
async function initPush(){
  if(!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js', {
      scope: '/arfafoods.com/productions/'
    });
    console.log("SW Registered:", reg.scope);
    await navigator.serviceWorker.ready;
    console.log("SW is Active");

    const permission = await Notification.requestPermission();
    if(permission !== "granted") return;

    const token = await messaging.getToken({
      vapidKey: "BJ32KI9w2XpHbF1LjvUMxOywFv5WBrQi-s8ktts-ngCP8Hm_naG-m-TixVldidWR3lbLpXuk9IhFN_JPET_2PSo",
      serviceWorkerRegistration: reg
    });

    if(token){
      console.log("FCM Token:", token);
      saveTokenToSheet(token); // now this exists
    }

  } catch(err) {
    console.error("Push Failed:", err);
  }

  messaging.onMessage((payload) => {
    console.log('Message received. ', payload);
    new Notification(payload.notification.title, {body: payload.notification.body});
  });
}

// 5. RUN IT ON BUTTON CLICK FOR SAFARI
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.createElement('button');
  btn.innerText = "Enable Notifications";
  btn.onclick = initPush;
  document.body.appendChild(btn);
});

// THIS IS THE MISSING FUNCTION
async function saveTokenToSheet(token){
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // github pages to apps script needs this
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: "saveToken",
        token: token,
        page: "production-summary"
      })
    });
    console.log("Token saved to sheet");
  } catch(err) {
    console.error("Failed to save token:", err);
  }
}
initPush();
