/* =========================================================
   UI.JS
   Logic UI yang dipakai di semua halaman:
   - initTopbar()       → isi info user di topbar, tampilkan menu Admin
   - initMqttStatus()   → polling status MQTT, update indikator di topbar
   - initSidebar()      → hamburger toggle untuk mobile
   ========================================================= */

/* ---------- topbar & menu admin ---------- */

function initTopbar(session) {
  if (!session) return;

  const userName   = document.getElementById("userName");
  const userRole   = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");

  if (userName)   userName.textContent   = session.username;
  if (userRole)   userRole.textContent   = session.role;
  if (userAvatar) userAvatar.textContent = session.username.substring(0, 2).toUpperCase();

  // menu "Sistem" hanya untuk Admin
  if (session.role === "Admin") {
    const labels = document.querySelectorAll("#sistemSectionLabel");
    const settingsItems = document.querySelectorAll("#settingsNavItem");
    const usersItems    = document.querySelectorAll("#usersNavItem");
    labels.forEach((el)       => el.style.display = "");
    settingsItems.forEach((el) => el.style.display = "");
    usersItems.forEach((el)    => el.style.display = "");
  }
}

/* ---------- MQTT status polling ---------- */

function initMqttStatus() {
  // support dua varian id: "mqttPill" (baru) atau "connectionPill" (existing GardenTech)
  const pill = document.getElementById("mqttPill") || document.getElementById("connectionPill");
  if (!pill) return;

  async function checkStatus() {
    if (APP_CONFIG.USE_DUMMY_DATA) {
      pill.className = "connection-pill";
      pill.innerHTML = '<span class="dot"></span> MQTT (dummy)';
      return;
    }

    try {
      const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.MQTT_STATUS_ENDPOINT);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.connected) {
        pill.className = "connection-pill";
        pill.innerHTML = '<span class="dot"></span> MQTT terhubung';
      } else {
        pill.className = "connection-pill offline";
        const msg = data.error ? `MQTT: ${data.error}` : "MQTT terputus";
        pill.innerHTML = `<span class="dot"></span> ${msg}`;
      }
    } catch {
      pill.className = "connection-pill offline";
      pill.innerHTML = '<span class="dot"></span> MQTT: error';
    }
  }

  checkStatus();
  setInterval(checkStatus, 3000);
}

/* ---------- sidebar mobile toggle ---------- */

function initSidebar() {
  const sidebar     = document.querySelector(".sidebar");
  const hamburger   = document.getElementById("hamburgerBtn");
  const overlay     = document.getElementById("sidebarOverlay");
  const closeBtn    = document.getElementById("sidebarCloseBtn");

  if (!sidebar || !hamburger || !overlay) return;

  function openSidebar()  { sidebar.classList.add("open");    overlay.classList.add("show"); }
  function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("show"); }

  hamburger.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

  // tutup otomatis saat menu diklik di mobile
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });
}

/* ---------- auto-init saat DOM siap ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initMqttStatus();
});
