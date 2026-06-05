const GITHUB_USER = "Hamza123455";  
const REPO = "masterfile";         
const BRANCH = "main";

// ✅ Token is injected from HTML (as window.GITHUB_TOKEN)
const TOKEN = window.GITHUB_TOKEN;

const itemsURL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO}/${BRANCH}/items.json`;
const employeesURL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO}/${BRANCH}/employees.json`;
const barcodeAPI = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/barcode.json`;

let itemsList = [];
let employeesList = [];

// Load dropdowns
async function loadDropdowns() {
  itemsList = await fetch(itemsURL).then(r => r.json());
  employeesList = await fetch(employeesURL).then(r => r.json());

  if (!Array.isArray(itemsList) && itemsList.items) itemsList = itemsList.items;
  if (!Array.isArray(employeesList) && employeesList.employees) employeesList = employeesList.employees;

  renderDropdown(itemsList, document.getElementById("itemName"), "ItemName");
  renderDropdown(employeesList, document.getElementById("pickedBy"), "name");
}

function renderDropdown(list, dropdown, key) {
  dropdown.innerHTML = "";
  list.forEach(obj => {
    const opt = document.createElement("option");
    opt.value = obj[key];
    opt.textContent = obj[key];
    dropdown.appendChild(opt);
  });
}

loadDropdowns();

// Search filters
document.getElementById("itemSearch").addEventListener("input", function() {
  const keyword = this.value.toLowerCase();
  const filtered = itemsList.filter(obj => obj.ItemName.toLowerCase().includes(keyword));
  renderDropdown(filtered, document.getElementById("itemName"), "ItemName");
});

document.getElementById("employeeSearch").addEventListener("input", function() {
  const keyword = this.value.toLowerCase();
  const filtered = employeesList.filter(obj => obj.name.toLowerCase().includes(keyword));
  renderDropdown(filtered, document.getElementById("pickedBy"), "name");
});

// Submit form
document.getElementById("barcodeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const item = document.getElementById("itemName").value;
  const qty = document.getElementById("qty").value;
  const pickedBy = document.getElementById("pickedBy").value;
  const time = document.getElementById("time").value;
  const file = document.getElementById("barcodeImage").files[0];

  let imageUrl = "";

  if (file) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result.split(",")[1];
      const imageFileName = `barcode_images/${Date.now()}_${file.name}`;

      await fetch(`https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${imageFileName}`, {
        method: "PUT",
        headers: { "Authorization": `token ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Upload ${imageFileName}`, content: base64Image, branch: BRANCH })
      });

      imageUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO}/${BRANCH}/${imageFileName}`;
      await saveData(item, qty, pickedBy, time, imageUrl);
    };
    reader.readAsDataURL(file);
  } else {
    await saveData(item, qty, pickedBy, time, imageUrl);
  }
});

async function saveData(item, qty, pickedBy, time, barcodeImage) {
  let existingData = [];
  let sha = null;

  const barcodeRes = await fetch(barcodeAPI, { headers: { "Authorization": `token ${TOKEN}` } });

  if (barcodeRes.status === 200) {
    const barcodeData = await barcodeRes.json();
    sha = barcodeData.sha;
    try {
      const decoded = atob(barcodeData.content);
      existingData = JSON.parse(decoded);
      if (!Array.isArray(existingData)) {
        alert("⚠ barcode.json is corrupted. Fix it manually on GitHub.");
        return;
      }
    } catch (e) {
      alert("⚠ barcode.json is invalid. Please fix it on GitHub.");
      return;
    }
  } else if (barcodeRes.status === 404) {
    existingData = [];
  }

  existingData.push({ item, qty, pickedBy, time, barcodeImage });

  await fetch(barcodeAPI, {
    method: "PUT",
    headers: { "Authorization": `token ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Append new barcode entry",
      content: btoa(JSON.stringify(existingData, null, 2)),
      sha: sha,
      branch: BRANCH
    })
  });

  alert("✅ Data saved successfully!");
  document.getElementById("barcodeForm").reset();
  loadDropdowns();
}

// View History
document.getElementById("viewHistory").addEventListener("click", async () => {
  const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${REPO}/${BRANCH}/barcode.json`);
  const data = await res.json();

  renderHistory(data);

  document.getElementById("historySection").classList.remove("d-none");

  document.getElementById("searchBar").addEventListener("input", function() {
    const keyword = this.value.toLowerCase();
    const filtered = data.filter(entry => entry.item.toLowerCase().includes(keyword));
    renderHistory(filtered);
  });
});

function renderHistory(records) {
  const historyTable = document.getElementById("historyTable");
  historyTable.innerHTML = "";
  records.forEach(row => {
    const formattedDate = row.time ? new Date(row.time).toLocaleString() : "";
    historyTable.innerHTML += `
      <tr>
        <td>${row.item}</td>
        <td>${row.qty}</td>
        <td>${row.pickedBy}</td>
        <td>${formattedDate}</td>
        <td>${row.barcodeImage ? `<img src="${row.barcodeImage}" alt="barcode">` : "No Image"}</td>
      </tr>`;
  });
}
