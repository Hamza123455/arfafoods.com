fetch("https://script.google.com/macros/s/AKfycbzjMSOfkrfYweMX2uI0LXSTVylQU_f1KIZV6P7_qVNle4Rjj64jtASAQ0vMqpjfiZzh/exec")
  .then(res => res.json())
  .then(data => {

    console.log("HEADERS FROM SHEET:", Object.keys(data[0]));

    const itemKey = Object.keys(data[0]).find(k => k.toLowerCase().includes("item"));
    const qtyKey  = Object.keys(data[0]).find(k => k.toLowerCase().includes("qty") || k.toLowerCase().includes("quantity"));

    console.log("Detected Item Column:", itemKey);
    console.log("Detected qty Column:", qtyKey);

    rawData = data.map(row => ({
      "Item Name": row[itemKey],
      "qty": row[qtyKey]
    }));

    headers = ["Item Name", "qty"];

    const thead = document.querySelector("#sheet-table thead");
    const tbody = document.querySelector("#sheet-table tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const headerRow = document.createElement("tr");
    headers.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    rawData.forEach(row => {
      const tr = document.createElement("tr");
      headers.forEach(h => {
        const td = document.createElement("td");
        td.textContent = row[h] || "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

  })
  .catch(err => {
    console.error("Error:", err);
    document.querySelector(".table-wrapper").innerHTML =
      "<p style='color:red;'>Failed to load data.</p>";
  });
