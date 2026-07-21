const API_URL = "https://script.google.com/macros/s/AKfycbx0aCqswSRjLkDNfE6n6ijQnfuqUZll9nvn3ulx3McFIsgG3KGnCZMLnrHZMRFUt8k2/exec"; // <-- paste your exec URL here

let gpsData = {lat: "Not Asked", lon: "Not Asked", alt: "N/A", accuracy: "N/A"};
let gpsAsked = false;
let sessionStart = Date.now();

// 1. Get IP
async function getIPandLocation() {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();
    return {
      ip: data.ip,
      country: data.country,
      city: data.city,
      region: data.region,
      isp: data.connection?.isp || data.org
    };
  } catch {
    return {ip: "Unknown", country: "Unknown", city: "Unknown", region: "Unknown", isp: "Unknown"};
  }
}

// 2. Browser Info
function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform
  };
}

// 3. Device Specs
function getDeviceSpecs() {
  const ua = navigator.userAgent;
  let deviceType = /Mobi|Android/i.test(ua)? "Mobile" : /Tablet|iPad/i.test(ua)? "Tablet" : "Desktop";
  return {
    deviceType: deviceType,
    vendor: navigator.vendor || "Unknown",
    cores: navigator.hardwareConcurrency || "Unknown",
    memoryGB: navigator.deviceMemory? navigator.deviceMemory + " GB" : "Unknown",
    screen: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// 4. Ask for GPS only once, after first click - YOUR UPDATED CODE
async function requestGPS() {
  if(gpsAsked) return;
  gpsAsked = true;

  gpsData = await new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({lat: "No Support", lon: "No Support", alt: "N/A", accuracy: "N/A"});

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude || "N/A",
          accuracy: Math.round(pos.coords.accuracy) + "m"
        });
        // Send a new log now that we have GPS
        sendLog("GPS Acquired");
      },
      (err) => resolve({lat: "Denied", lon: "Denied", alt: "Denied", accuracy: err.message}),
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
    );
  });
}

// 5. Main Send Log Function - YOUR UPDATED CODE
async function sendLog(action, search = "", time = "") {
  // Ask GPS only on first "Click" or "Search" action
  if(!gpsAsked && (action === "Click" || action === "Search")){
    await requestGPS();
  }

  const [ipData] = await Promise.all([getIPandLocation()]);
  const browserData = getBrowserInfo();
  const deviceData = getDeviceSpecs();

  const payload = {
    device: deviceData.deviceType,
    browser: browserData.userAgent,
    os: browserData.platform,
    language: browserData.language,
    specs: JSON.stringify(deviceData),
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
    mode: "no-cors",
    body: JSON.stringify(payload)
  }).then(() => console.log("Log sent:", action));
}

// 6. Triggers
sendLog("Page Visit"); // First log, GPS = "Not Asked"

document.addEventListener("click", (e) => {
  sendLog("Click", e.target.innerText.substring(0,50));
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Enter") sendLog("Search", window.location.search);
});

// For mobile: trigger on first touch too
document.addEventListener("touchstart", () => requestGPS(), {once: true});
