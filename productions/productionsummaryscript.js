const apiUrl = "https://script.google.com/macros/s/AKfycbyRUs_n-UANxDNkNxyGxnNeWKJklXg9pI4aXE0kl0_itK7S4phO5JbKWHFF5eu7DOR8/exec";
let rawData = [];
let headers = [];
let chartInstance = null;

function exportToPDF() {
  const doc = new jspdf.jsPDF();
  doc.autoTable({
    html: '#sheet-table',
    startY: 20,
    headStyles: { fillColor: [22, 160, 133] },
  });
  doc.save('table-export.pdf');
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
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

function saveTokenToSheet(token){
  // Send token to your Google Script to save in "Tokens" sheet
  fetch(apiUrl + "?action=saveToken&token=" + token)
 .then(res => res.json())
 .then(d => console.log("Token saved", d))
}

function initPush(){
  // Register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('firebase-messaging-sw.js')
  }

  Notification.requestPermission().then(permission => {
    if(permission === "granted"){
      messaging.getToken({vapidKey: "PASTE_YOUR_VAPID_KEY"}).then(token => {
        console.log("FCM Token:", token);
        saveTokenToSheet(token);
      }).catch(err => console.log('No token', err))
    }
  })
}

// Run on page load
initPush();

// Handle foreground notifications
messaging.onMessage(function(payload) {
  console.log('Message received. ', payload);
  alert(payload.notification.title + "\n" + payload.notification.body);
});
