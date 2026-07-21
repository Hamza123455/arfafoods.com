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

let gpsData = {lat: "Not Asked", lon: "Not Asked", alt: "N/A", accuracy: "N/A"};
let gpsAsked = false;

// Ask for GPS only once, after first click
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
      },
      (err) => resolve({lat: "Denied", lon: "Denied", alt: "Denied", accuracy: err.message}),
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0}
    );
  });
}

// Main Send Log Function
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
