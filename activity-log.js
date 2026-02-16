const API_URL = "https://script.google.com/macros/s/AKfycbx0aCqswSRjLkDNfE6n6ijQnfuqUZll9nvn3ulx3McFIsgG3KGnCZMLnrHZMRFUt8k2/exec";

// Device
function getDevice() {
  return /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
}

// Browser
function getBrowser() {
  return navigator.userAgent;
}

// Country (basic free API)
async function getCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.country_name;
  } catch {
    return "Unknown";
  }
}

// Send log
async function sendLog(action, search = "", time = "") {
  const country = await getCountry();

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      device: getDevice(),
      browser: getBrowser(),
      action: action,
      search: search,
      page: window.location.href,
      time: time,
      country: country
    })
  });
}

let startTime = Date.now();

// First visit + returning user
if (!localStorage.getItem("visited")) {
  alert("Please Click Ok To Continue.");
  localStorage.setItem("visited", "yes");
  sendLog("First Visit");
} else {
  sendLog("Returning User");
}

// Page visit
sendLog("Page Visit");

// Time on page
window.addEventListener("beforeunload", () => {
  let timeSpent = Math.floor((Date.now() - startTime) / 1000);
  sendLog("Time Spent", "", timeSpent + " sec");
});

// Click tracking
document.addEventListener("click", (e) => {
  let text = e.target.innerText || e.target.tagName;
  sendLog("Click", text);
});

// Search tracking (auto detect)
document.addEventListener("change", (e) => {
  if (e.target.tagName === "INPUT") {
    sendLog("Search", e.target.value);
  }

});
