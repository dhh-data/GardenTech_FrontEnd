/* =========================================================
   AUTH.JS
   Logic login, register, dan manajemen user.
   Mendukung 2 mode lewat APP_CONFIG.USE_DUMMY_DATA:
   - true  -> localStorage (dummy, tanpa backend)
   - false -> fetch() ke backend FastAPI asli (lihat config.js)
   ========================================================= */

const AUTH_STORAGE_KEY = "sg_users";        // daftar akun (dummy "database")
const SESSION_STORAGE_KEY = "sg_session";   // siapa yang sedang login

/* ---------- helper dummy "database" di localStorage ---------- */

function getStoredUsers() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    // seed satu akun default biar bisa langsung dicoba tanpa register
    const seed = [
      { username: "admin", password: "admin123", role: "Admin", createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

function saveStoredUsers(users) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

/* ---------- helper bikin header Authorization dari token tersimpan ---------- */

function authHeaders() {
  const session = getSession();
  return session?.token
    ? { Authorization: `Bearer ${session.token}` }
    : {};
}

/* ---------- REGISTER ---------- */

async function registerUser(username, password) {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    const users = getStoredUsers();
    const exists = users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (exists) {
      throw new Error("Username sudah terdaftar, coba username lain.");
    }
    users.push({ username, password, role: "Viewer", createdAt: new Date().toISOString() });
    saveStoredUsers(users);
    return { success: true };
  }

  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.AUTH_REGISTER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registrasi gagal.");
  }
  return await res.json();
}

/* ---------- LOGIN ---------- */

async function loginUser(username, password) {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    const users = getStoredUsers();
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    );
    if (!found) {
      throw new Error("Username atau password salah.");
    }
    const session = { username: found.username, role: found.role, token: "dummy-token" };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.AUTH_LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Username atau password salah.");
  }

  const data = await res.json();
  const session = {
    username: data.username,
    role: data.role,
    token: data.access_token,
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

/* ---------- SESSION HELPERS ---------- */

function getSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function logoutUser() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.location.href = window.location.pathname.includes("/pages/")
    ? "../index.html"
    : "index.html";
}

// Panggil di awal setiap halaman yang butuh login (dashboard & semua halaman di /pages)
function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = window.location.pathname.includes("/pages/")
      ? "../index.html"
      : "index.html";
  }
  return session;
}

// Panggil di halaman khusus Admin (Config & Manajemen User).
// Kalau yang login bukan Admin, langsung dilempar ke dashboard.
function requireAdmin() {
  const session = requireAuth();
  if (session && session.role !== "Admin") {
    window.location.href = window.location.pathname.includes("/pages/")
      ? "../dashboard.html"
      : "dashboard.html";
    return null;
  }
  return session;
}

/* ---------- MANAJEMEN USER (khusus Admin) ----------
   Semua fungsi di bawah ini ASYNC (pakai await saat dipanggil),
   baik mode dummy maupun mode backend asli, supaya pages/users.html
   tidak perlu tahu mode mana yang sedang aktif. */

// Ambil semua user TANPA password, untuk ditampilkan di tabel.
async function getAllUsers() {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    return getStoredUsers().map(({ password, ...safe }) => safe);
  }

  const res = await fetch(APP_CONFIG.API_BASE_URL + APP_CONFIG.USERS_ENDPOINT, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Gagal mengambil daftar user.");

  const data = await res.json();
  // samakan nama field dengan versi dummy (created_at -> createdAt)
  return data.map((u) => ({
    username: u.username,
    role: u.role,
    createdAt: u.created_at,
  }));
}

async function updateUserRole(username, newRole) {
  if (APP_CONFIG.USE_DUMMY_DATA) {
    const users = getStoredUsers();
    const target = users.find((u) => u.username === username);
    if (!target) throw new Error("User tidak ditemukan.");
    target.role = newRole;
    saveStoredUsers(users);
    return { success: true };
  }

  const endpoint = APP_CONFIG.USER_ROLE_ENDPOINT.replace("{username}", encodeURIComponent(username));
  const res = await fetch(APP_CONFIG.API_BASE_URL + endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role: newRole }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Gagal mengubah role.");
  }
  return await res.json();
}

async function deleteUser(username) {
  const session = getSession();
  if (session && session.username === username) {
    throw new Error("Tidak bisa menghapus akun yang sedang login.");
  }

  if (APP_CONFIG.USE_DUMMY_DATA) {
    const users = getStoredUsers();
    const filtered = users.filter((u) => u.username !== username);
    saveStoredUsers(filtered);
    return { success: true };
  }

  const endpoint = APP_CONFIG.USER_DELETE_ENDPOINT.replace("{username}", encodeURIComponent(username));
  const res = await fetch(APP_CONFIG.API_BASE_URL + endpoint, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Gagal menghapus user.");
  }
  return await res.json();
}
