/* =========================================================
   DASHBOARD.JS
   Mengisi halaman dashboard dengan data sensor terbaru,
   menggambar grafik, dan menangani kontrol pompa.

   Mendukung 2 mode lewat APP_CONFIG.USE_DUMMY_DATA:
   - true  -> data dari dummy-data.js (simulasi, di memori browser)
   - false -> fetch() ke backend FastAPI asli
   ========================================================= */

// pastikan user sudah login, kalau belum lempar ke halaman login
const session = requireAuth();

let moistureChartInstance = null;

// state lokal pompa & mode otomatis, dipakai supaya toggle/tombol
// langsung terasa responsif tanpa harus nunggu refresh berikutnya
let currentPumpOn = false;
let currentAutoMode = true;

/* ---------- inisialisasi info user di topbar ---------- */

function renderUserInfo() {
  if (!session) return;
  document.getElementById("userName").textContent = session.username;
  document.getElementById("userRole").textContent = session.role;
  document.getElementById("userAvatar").textContent = session.username
    .substring(0, 2)
    .toUpperCase();

  // sapaan personal di subtitle dashboard, contoh: "Selamat siang, Budi 👋"
  const displayName = session.username.charAt(0).toUpperCase() + session.username.slice(1);
  const hour = new Date().getHours();
  let timeGreeting = "Selamat malam";
  if (hour >= 5 && hour < 11) timeGreeting = "Selamat pagi";
  else if (hour >= 11 && hour < 15) timeGreeting = "Selamat siang";
  else if (hour >= 15 && hour < 18) timeGreeting = "Selamat sore";
  document.getElementById("greetingText").textContent = `${timeGreeting}, ${displayName} 👋`;

  // menu "Sistem" (Config & Manajemen User) hanya untuk Admin
  if (session.role === "Admin") {
    document.getElementById("sistemSectionLabel").style.display = "";
    document.getElementById("settingsNavItem").style.display = "";
    document.getElementById("usersNavItem").style.display = "";
  }
}

/* ---------- fetch wrapper (dummy vs backend asli) ---------- */

async function fetchSensorLatest() {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    return getDummySensorLatest();
  }
  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.SENSORS_LATEST_ENDPOINT);
  if (!res.ok) throw new Error("Gagal mengambil data sensor terbaru.");
  return await res.json();
}

async function fetchMoistureHistory() {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    return getDummyMoistureHistory();
  }
  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.SENSORS_MOISTURE_HISTORY_ENDPOINT);
  if (!res.ok) throw new Error("Gagal mengambil histori kelembapan.");
  return await res.json();
}

async function fetchRecentLogs() {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    return getDummyLogs().slice(-4).reverse();
  }
  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.LOGS_ENDPOINT + "?limit=4");
  if (!res.ok) throw new Error("Gagal mengambil log aktivitas.");
  const data = await res.json();
  // backend sudah urut terbaru-dulu, tidak perlu reverse lagi
  return data;
}

async function sendPumpCommand(turnOn) {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    _dummyState.pumpOn = turnOn;
    _dummyState.autoMode = false; // perintah manual mengalahkan mode otomatis
    return { success: true };
  }
  const endpoint = APP_CONFIG.ACTUATOR_COMMAND_ENDPOINT.replace("{deviceId}", "dev002");
  const res = await fetch(APP_CONFIG.API_BASE_URL + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: turnOn ? "ON" : "OFF" }),
  });
  if (!res.ok) throw new Error("Gagal mengirim perintah ke pompa.");
  return await res.json();
}

async function updateAutoMode(autoMode) {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    _dummyState.autoMode = autoMode;
    return { success: true };
  }
  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.PUMP_SETTING_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auto_mode: autoMode }),
  });
  if (!res.ok) throw new Error("Gagal mengubah mode otomatis.");
  return await res.json();
}

/* ---------- render stat cards ---------- */

function renderStatCards(data) {
  document.getElementById("statSoilMoisture").innerHTML = `${data.soilMoisture}<span class="unit">%</span>`;
  document.getElementById("statAirTemp").innerHTML = `${data.airTemp}<span class="unit">°C</span>`;
  document.getElementById("statPumpPower").innerHTML = `${data.pumpPower}<span class="unit">W</span>`;

  const sub = document.getElementById("statSoilMoistureSub");
  if (data.soilMoisture < data.threshold) {
    sub.textContent = "Di bawah ambang batas, perlu disiram";
    sub.style.color = "var(--color-warning)";
  } else {
    sub.textContent = "Kondisi tanah normal";
    sub.style.color = "var(--color-text-muted)";
  }

  document.getElementById("lastUpdate").textContent =
    "Update: " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // simpan ke state lokal supaya event handler toggle/tombol tahu kondisi terbaru
  currentPumpOn = data.pumpOn;
  currentAutoMode = data.autoMode;

  // toggle & label ambang batas ikut sinkron sama state
  document.getElementById("autoModeToggle").checked = data.autoMode;
  document.getElementById("thresholdLabel").textContent = data.threshold;

  const pumpStatusText = document.getElementById("pumpStatusText");
  pumpStatusText.textContent = data.pumpOn ? "Pompa: menyala" : "Pompa: standby";
  pumpStatusText.style.color = data.pumpOn ? "var(--color-success)" : "var(--color-text-muted)";
}

/* ---------- render status sistem (ultrasonic, LED, tegangan) ---------- */

function renderSystemStatus(data) {
  const list = document.getElementById("systemStatusList");
  const rows = [
    {
      icon: "ti-radar-2",
      label: "Sensor ultrasonic",
      value: data.ultrasonicDetected
        ? '<span class="badge badge-warning">Objek terdeteksi</span>'
        : '<span class="badge badge-muted">Tidak ada objek</span>',
    },
    {
      icon: "ti-bulb",
      label: "LED indikator",
      value: '<span class="badge badge-success">Hijau · normal</span>',
    },
    {
      icon: "ti-gauge",
      label: "Tegangan pompa",
      value: `<strong>${data.pumpVoltage} V</strong>`,
    },
  ];

  list.innerHTML = rows
    .map(
      (r) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--color-border); font-size:13.5px;">
        <span style="color:var(--color-text-muted); display:flex; align-items:center; gap:8px;"><i class="ti ${r.icon}"></i> ${r.label}</span>
        <span>${r.value}</span>
      </div>`
    )
    .join("");
}

/* ---------- render log terbaru (cuplikan, 4 item) ---------- */

const LOG_TYPE_STYLE = {
  info: { icon: "ti-info-circle", bg: "var(--color-info)" },
  success: { icon: "ti-check", bg: "var(--color-success)" },
  warning: { icon: "ti-alert-triangle", bg: "var(--color-warning)" },
  danger: { icon: "ti-alert-circle", bg: "var(--color-danger)" },
};

async function renderRecentLogs() {
  const container = document.getElementById("recentLogList");
  let logs;
  try {
    logs = await fetchRecentLogs();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Gagal memuat log aktivitas</div>`;
    return;
  }

  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="ti ti-history"></i></div>Belum ada aktivitas</div>`;
    return;
  }

  container.innerHTML = logs
    .map((log) => {
      const style = LOG_TYPE_STYLE[log.type] || LOG_TYPE_STYLE.info;
      return `
      <div class="log-item">
        <span class="log-time">${log.time}</span>
        <span class="log-type-icon" style="background:${style.bg}1a; color:${style.bg};"><i class="ti ${style.icon}"></i></span>
        <span>${log.text}</span>
      </div>`;
    })
    .join("");
}

/* ---------- grafik kelembapan tanah ---------- */

async function renderMoistureChart() {
  let history;
  try {
    history = await fetchMoistureHistory();
  } catch (err) {
    return; // chart dibiarkan kosong, tidak fatal untuk halaman
  }
  const ctx = document.getElementById("moistureChart");

  if (moistureChartInstance) {
    moistureChartInstance.data.labels = history.labels;
    moistureChartInstance.data.datasets[0].data = history.values;
    moistureChartInstance.update();
    return;
  }

  moistureChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: history.labels,
      datasets: [
        {
          label: "Kelembapan tanah (%)",
          data: history.values,
          borderColor: "#2f5d3a",
          backgroundColor: "rgba(47, 93, 58, 0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { min: 0, max: 100, grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

/* ---------- toast kecil ---------- */

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

/* ---------- refresh utama ---------- */

async function refreshDashboard() {
  try {
    const data = await fetchSensorLatest();
    renderStatCards(data);
    renderSystemStatus(data);
  } catch (err) {
    showToast("Gagal memuat data sensor: " + err.message, "error");
  }
}

/* ---------- event handlers ---------- */

document.getElementById("logoutBtn").addEventListener("click", logoutUser);

document.getElementById("autoModeToggle").addEventListener("change", async (e) => {
  const next = e.target.checked;
  try {
    await updateAutoMode(next);
    showToast(next ? "Mode otomatis diaktifkan" : "Mode otomatis dimatikan");
    refreshDashboard();
  } catch (err) {
    e.target.checked = !next; // batalkan toggle kalau gagal
    showToast(err.message, "error");
  }
});

document.getElementById("manualPumpBtn").addEventListener("click", async () => {
  const next = !currentPumpOn;
  try {
    await sendPumpCommand(next);
    showToast(next ? "Pompa dinyalakan secara manual" : "Pompa dimatikan");
    refreshDashboard();
  } catch (err) {
    showToast(err.message, "error");
  }
});

/* ---------- init ---------- */

renderUserInfo();
renderRecentLogs();
renderMoistureChart();
refreshDashboard();

// polling berkala biar data terasa real-time, sesuai APP_CONFIG.REFRESH_INTERVAL_MS
setInterval(() => {
  refreshDashboard();
  renderRecentLogs();
}, APP_CONFIG.REFRESH_INTERVAL_MS);
