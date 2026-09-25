const timeElement = document.querySelector("#local-time");
const healthButton = document.querySelector("#health-check");
const lastCheck = document.querySelector("#last-check");
const activityList = document.querySelector("#activity-list");
const osName = document.querySelector("#os-name");
const osBitness = document.querySelector("#os-bitness");
const osManufacturer = document.querySelector("#os-manufacturer");
const portGraph = document.querySelector("#port-graph");
const portList = document.querySelector("#port-list");

let portConfig = [];

async function refreshPorts() {
  try {
    const response = await fetch("http://127.0.0.1:8443/ports", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    portConfig = await response.json();
    renderPorts();
  } catch (error) {
    portConfig = [
      { port: 22, label: "SSH", state: "closed" },
      { port: 80, label: "HTTP", state: "closed" },
      { port: 443, label: "HTTPS", state: "closed" },
      { port: 8443, label: "MESH", state: "open" },
      { port: 8080, label: "API", state: "closed" },
      { port: 3306, label: "DB", state: "closed" }
    ];
    renderPorts();
  }
}

function renderPorts() {
  if (!portGraph || !portList) return;

  portGraph.innerHTML = "";
  portConfig.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "port-graph-item";
    const bar = document.createElement("span");
    const state = entry.state === "open" ? "open" : "closed";
    bar.className = `bar ${state}`;
    bar.style.height = state === "open" ? `${68 + (entry.port % 10) * 4}%` : "18%";
    const label = document.createElement("label");
    label.textContent = entry.port;
    item.appendChild(bar);
    item.appendChild(label);
    portGraph.appendChild(item);
  });

  portList.innerHTML = "";
  portConfig.forEach((entry) => {
    const row = document.createElement("div");
    row.className = `port-row ${entry.state}`;
    row.innerHTML = `
      <div class="port-row-main">
        <span class="port-number">${entry.port}</span>
        <span class="port-label">${entry.label}</span>
      </div>
      <span class="port-state">${entry.state === "open" ? "Open" : "Closed"}</span>
      <button class="port-toggle" data-port="${entry.port}" type="button">${entry.state === "open" ? "Close" : "Open"}</button>
    `;
    portList.appendChild(row);
  });
}

async function togglePort(portNumber) {
  const entry = portConfig.find((item) => item.port === Number(portNumber));
  if (!entry) return;

  const nextOpen = entry.state !== "open";
  try {
    const response = await fetch("http://127.0.0.1:8443/ports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ port: Number(portNumber), open: nextOpen })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    addActivity(nextOpen ? "Port opened" : "Port closed", `${entry.port} / ${entry.label} policy changed`);
    await refreshPorts();
  } catch (error) {
    addActivity("Firewall update failed", `Unable to change ${entry.port} / ${entry.label}`);
  }
}

function detectOperatingSystem() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const platformStr = platform.toLowerCase();
  const architecture = navigator.userAgentData?.architecture || "";

  let name = "Unknown";
  let manufacturer = "Unknown";
  let bitness = "Unknown";

  if (ua.includes("Windows")) {
    name = "Windows";
    manufacturer = "Microsoft";
    bitness = /Win64|WOW64|x64|amd64/i.test(ua) || architecture === "x86_64" ? "64-bit" : "32-bit";
  } else if (ua.includes("Mac OS") || ua.includes("Macintosh")) {
    name = "macOS";
    manufacturer = "Apple Inc.";
    bitness = "64-bit";
  } else if (ua.includes("Android")) {
    name = "Android";
    manufacturer = "Google";
    bitness = /arm64|aarch64/i.test(ua) || architecture === "arm64" ? "64-bit" : "32-bit";
  } else if (ua.includes("Linux")) {
    name = "Linux";
    manufacturer = "Linux Foundation";
    bitness = /x86_64|amd64|arm64|aarch64/i.test(platformStr) || /x86_64|amd64|arm64|aarch64/i.test(ua) || architecture === "arm64" ? "64-bit" : /x86|i386|i686/.test(ua) || /x86|i386|i686/.test(platformStr) ? "32-bit" : "64-bit";
  } else if (platformStr.includes("linux")) {
    name = "Linux";
    manufacturer = "Linux Foundation";
    bitness = platformStr.includes("64") ? "64-bit" : "32-bit";
  } else if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) {
    name = "iOS";
    manufacturer = "Apple Inc.";
    bitness = "64-bit";
  } else {
    name = "Unknown";
    manufacturer = "Unknown";
    bitness = "Unknown";
  }

  osName.textContent = name;
  osBitness.textContent = bitness;
  osManufacturer.textContent = manufacturer;
}

function updateClock() {
  const now = new Date();
  timeElement.dateTime = now.toISOString();
  timeElement.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function addActivity(message, detail) {
  const item = document.createElement("li");
  item.innerHTML = `<time>NOW</time><span class="activity-marker activity-marker-green"></span><div><strong>${message}</strong><small>${detail}</small></div>`;
  activityList.prepend(item);
  while (activityList.children.length > 4) activityList.lastElementChild.remove();
}

async function checkGateway() {
  healthButton.disabled = true;
  healthButton.querySelector(".button-icon").textContent = "...";
  lastCheck.textContent = "Checking 127.0.0.1:8443...";
  try {
    const response = await fetch("http://127.0.0.1:8443/health", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    lastCheck.textContent = `Gateway responded: ${result.status}`;
    addActivity("Gateway health confirmed", `Latency ${result.latency_ms} ms / local bridge`);
  } catch (error) {
    lastCheck.textContent = "Gateway unavailable from this browser";
    addActivity("Gateway check returned no response", "Start the local service on 127.0.0.1:8443");
  } finally {
    healthButton.disabled = false;
    healthButton.querySelector(".button-icon").textContent = "+";
  }
}

if (healthButton) {
  healthButton.addEventListener("click", checkGateway);
}

portList?.addEventListener("click", (event) => {
  const button = event.target.closest(".port-toggle");
  if (!button) return;
  togglePort(button.dataset.port);
});

updateClock();
detectOperatingSystem();
renderPorts();
setInterval(updateClock, 1000);