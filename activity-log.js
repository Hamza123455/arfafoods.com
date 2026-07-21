const API_URL = "https://script.google.com/macros/s/AKfycbx0aCqswSRjLkDNfE6n6ijQnfuqUZll9nvn3ulx3McFIsgG3KGnCZMLnrHZMRFUt8k2/exec";

// 1. Device Type
function getDevice() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
}

// 2. Full Browser + OS Info
function getBrowserInfo() {
  const ua = navigator.userAgent;
  return {
    userAgent: ua,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    online: navigator.onLine
  };
}

// 3. Full Device Specs
function getDeviceSpecs() {
  return {
    deviceType: getDevice(),
    vendor: navigator.vendor,
    cores: navigator.hardwareConcurrency || "Unknown",
    memoryGB: navigator.deviceMemory ? navigator.deviceMemory + " GB" : "Unknown",
    screen: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// 4. IP + Country from free API
async function getIPandLocation() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return {
      ip: data.ip,
      country: data.country_name,
      city: data.city,
      region: data.region,
      isp: data.org
    };
  } catch {
    return {ip: "Unknown", country: "Unknown", city: "Unknown", region: "Unknown", isp: "Unknown"};
  }
}

// 5. GPS - Latitude, Longitude, Altitude
async function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({lat: "N/A", lon: "N/A", alt: "N/A"});
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude || "N/A",
          accuracy: pos.coords.accuracy + "m"
        });
      },
      () => resolve({lat: "Denied", lon: "Denied", alt: "Denied"}), // if user blocks
      {enableHighAccuracy: true, timeout: 5000}
    );
  });
}

// 6. Main Send Log Function - now async to wait for GPS/IP
async function sendLog(action, search = "", time = "") {
  const [ipData, gpsData] = await Promise.all([getIPandLocation(), getGPS()]);
  const browserData = getBrowserInfo();
  const deviceData = getDeviceSpecs();

  const payload = {
    device: deviceData.deviceType,
    browser: browserData.userAgent,
    os: browserData.platform,
    language: browserData.language,
    specs: JSON.stringify(deviceData), // full specs as string
    action: action,
    search: search,
    page: window.location.href,
    time: time,
    ip: ipData.ip,
    country: ipData.country,
    city: ipData.city,
    region: ipData.region,
    isp: ipData.isp,
    latitude: gpsData.lat,
    longitude: gpsData.lon,
    altitude: gpsData.alt,
    gpsAccuracy: gpsData.accuracy
  };

  fetch(API_URL, {
    method: "POST",
    mode: "no-cors", // for github pages
    body: JSON.stringify(payload)
  }).then(() => console.log("Log sent:", action));
}

let startTime = Date.now();

// First visit + returning user
if (!localStorage.getItem("visited")) {
  alert("Please Click Ok To Continue. We will ask for location permission.");
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

// Search tracking
document.addEventListener("change", (e) => {
  if (e.target.tagName === "INPUT") {
    sendLog("Search", e.target.value);
  }
});
