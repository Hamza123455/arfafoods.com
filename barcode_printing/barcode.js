let items = [];
                          fetch('https://raw.githubusercontent.com/Hamza123455/masterfile/main/items.json')
                         .then(response => response.json())
                         .then(data => {
                                                items = data;
                                                console.log("Items loaded from GitHub JSON:", items);
                                        })
                          .catch(error => {
                                                console.error("Error fetching items.json:", error);
                                           });
                          const searchInput = document.getElementById('searchInput');
                          const itemList = document.getElementById('itemList');
                          const resultsDiv = document.getElementById('results');
                          const printButton = document.getElementById('printButton');
                          let highlightedIndex = -1;
                          searchInput.addEventListener('input', function() {
                                                                                const query = searchInput.value.toLowerCase();
                                                                                itemList.innerHTML = '';
                                                                                highlightedIndex = -1;
                                                                                if (query) {
                                                                                            const filteredItems = items.filter(item =>
                                                                                                                                item.ItemName.toLowerCase().includes(query)
                                                                                                                               );
                                                                                            if (filteredItems.length > 0) {
                                                                                                                                itemList.style.display = 'block';
                                                                                                                                filteredItems.forEach(item => {
                                                                                                                                                                      const option = document.createElement('div');
                                                                                                                                                                      option.className = 'item-option';
                                                                                                                                                                      option.innerHTML = `${item.ItemCode} - ${item.ItemName} - ${item.UrduName}`;
                                                                                                                                                                      option.dataset.code = item.ItemCode;
                                                                                                                                                                      option.onclick = () => selectItem(item.ItemCode.toString());
                                                                                                                                                                      itemList.appendChild(option);
                                                                                                                                                              });
                                                                                                                            } 
                                                                                          else {
                                                                                                  itemList.style.display = 'none';
                                                                                                }
                                                                                          } else {
                                                                                                      itemList.style.display = 'none';
                                                                                                }
                                                                          });
                          searchInput.addEventListener('keydown', function(event) {
                                                                                        const options = itemList.querySelectorAll('.item-option');
                                                                                        if (event.key === 'ArrowDown') {
                                                                                                                              highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
                                                                                                                              updateHighlightedOption(options);
                                                                                                                              event.preventDefault();
                                                                                                                        } 
                                                                                        else if (event.key === 'ArrowUp') {
                                                                                                                              highlightedIndex = Math.max(highlightedIndex - 1, 0);
                                                                                                                              updateHighlightedOption(options);
                                                                                                                              event.preventDefault();
                                                                                                                           } 
                                                                                        else if (event.key === 'Enter' && highlightedIndex >= 0) {
                                                                                                                                                      selectItem(options[highlightedIndex].dataset.code);
                                                                                                                                                       event.preventDefault();
                                                                                                                                                  }
                                                                                      });

                          function updateHighlightedOption(options) {
                                                                            options.forEach((option, index) => {
                                                                                                                  option.style.backgroundColor = (index === highlightedIndex) ? '#e9ecef' : 'white';
                                                                                                                });
                                                                    }

                          function selectItem(code) {
                                                          searchInput.value = '';
                                                          itemList.style.display = 'none';
                                                          addItemToResults(code);
                                                    }

                          function addItemToResults(code) {
                                                             const foundItem = items.find(item => item.ItemCode.toString() === code);
                                                             resultsDiv.innerHTML = '';
                                                             printButton.style.display = 'none';
                                                             const currentDate = new Date();
                                                             const mfgDate = currentDate.toISOString().split('T')[0];
                                                             const expDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)).toISOString().split('T')[0];
                                                             if (foundItem) {
                                                                                    const itemDiv = document.createElement('div');
                                                                                    itemDiv.classList.add('item');
                                                                                    itemDiv.innerHTML = `
                                                                                    <h2>${foundItem.UrduName}</h2>
                                                                                    <div class="dates">
                                                                                          <span>MFG:</span>
                                                                                          <input type="text" value="${formatDate(new Date(mfgDate))}" />
                                                                                          <span>EXP:</span>
                                                                                          <input type="text" value="${formatDate(new Date(expDate))}" />
                                                                                    </div>
                                                                                    <img class="barcode-img" src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${foundItem.ItemCode}&scale=3" alt="Barcode">
                                                                                    <div class="barcode-number">${foundItem.ItemCode}</div>
                                                                                    <div class="info">
                                                                                        <input type="number" min="1" placeholder="Quantity" id="quantity-${foundItem.ItemCode}" />
                                                                                    </div>
                                                                                     `;
                                                                                    resultsDiv.appendChild(itemDiv);
                                                                                    printButton.style.display = 'inline';
                                                                             } 
                                                             else {
                                                                                    resultsDiv.innerHTML = 'No items found.';
                                                                  }
                                                            }

  document.getElementById('printButton').addEventListener('click', function() {
    const printWindow = window.open('', 'printBarcode1');
    printWindow.document.write(`
     <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Gulzar&family=Noto+Nastaliq+Urdu:wght@700&family=Oswald:wght@700&family=PT+Serif:ital,wght@0,400;1,700&family=Sigmar&display=swap" rel="stylesheet">
        <style>
          body {
                   font-family: 'Gulzar', sans-serif;
                   width: 5in;
                   margin: 0;
                   padding: 5px 0 0 0;
                   font-weight: 700;
                }
    .container {
                   display: flex;
                   flex-wrap: wrap;
                   justify-content: space-between;
                   margin-bottom: 2px; /* very tight space between rows */
                }
          .item {
                  width: 44%; /* very tight fit */
                  margin-right: 5%;
                  padding: 0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  line-height: 1;
                }
  .barcode-img {
                  height: 0.65in;
                  width: 75%;
                  display: block;
                  margin-right: 1;
                }
  .barcode-number {
                  font-size: 14px;
                  margin: 0;
                  line-height: 1.5;
                  font-weight: bold;
                }
  .dates {
    margin: 0;
    font-size: 10px;
    line-height: 1;
    font-weoght: bold;
  }
  h2 {
    font-size: 12px;
    margin: 0;
    line-height: 2.9;
    font-weight: 700;
  }
</style>

        </head>
        <body>
`);
    const itemsToPrint = resultsDiv.querySelectorAll('.item');
    let barcodes = [];
    itemsToPrint.forEach(itemDiv => {
      const name = itemDiv.querySelector('h2').textContent;
      const mfgDate = itemDiv.querySelector('input[type="text"]:nth-of-type(1)').value;
      const expDate = itemDiv.querySelector('input[type="text"]:nth-of-type(2)').value;
      const barcode = itemDiv.querySelector('.barcode-number').textContent;
      const quantityInput = itemDiv.querySelector('input[type="number"]');
      const quantity = parseInt(quantityInput.value) || 1;
      for (let i = 0; i < quantity; i++) {
        barcodes.push({ name, mfgDate, expDate, barcode });
      }
    });
    for (let i = 0; i < barcodes.length; i += 2) {
      printWindow.document.write('<div class="container">');
      for (let j = 0; j < 2; j++) {
        if (i + j < barcodes.length) {
          const item = barcodes[i + j];
          printWindow.document.write(`
            <div class="item">
              <h2>${item.name}</h2>
              <div class="dates">
                <span>MFG: ${item.mfgDate}</span>
                <span>EXP: ${item.expDate}</span>
              </div>
              <img class="barcode-img" src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${item.barcode}&scale=3" alt="Barcode">
              <div class="barcode-number">${item.barcode}</div>
            </div>
          `);
        }
      }
      printWindow.document.write('</div>');
    }
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  });

  function formatDate(date) {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/(\d{2})\s(\w{3})\s(\d{4})/, '$1-$2-$3');
  }