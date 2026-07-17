/* =========================================================
   CONFIG.JS
   Semua alamat backend & pengaturan global ada di sini.
   Saat backend FastAPI sudah jadi, cukup ubah nilai-nilai
   di bawah ini, dan ganti USE_DUMMY_DATA jadi false.
   ========================================================= */

const APP_CONFIG = {
  // Ganti ke alamat backend FastAPI asli, misal: "http://localhost:8000/api/v1"
  API_BASE_URL: "http://localhost:8000/api/v1",

  // Endpoint auth (dipakai di auth.js)
  AUTH_LOGIN_ENDPOINT: "/auth/login",
  AUTH_REGISTER_ENDPOINT: "/auth/register",

  // Endpoint manajemen user, khusus Admin (dipakai di pages/users.html)
  USERS_ENDPOINT: "/users",
  USER_ROLE_ENDPOINT: "/users/{username}/role",
  USER_DELETE_ENDPOINT: "/users/{username}",

  // Endpoint data sensor & device
  SENSORS_LATEST_ENDPOINT: "/sensors/latest",
  SENSORS_LIST_ENDPOINT: "/sensors/list",
  SENSORS_MOISTURE_HISTORY_ENDPOINT: "/sensors/history/moisture",
  SENSORS_VOLTAGE_HISTORY_ENDPOINT: "/sensors/history/voltage-current",
  DEVICES_ENDPOINT: "/devices",
  ACTUATOR_COMMAND_ENDPOINT: "/devices/{deviceId}/command",
  LOGS_ENDPOINT: "/logs",

  // Endpoint pengaturan pompa (mode otomatis & threshold)
  PUMP_SETTING_ENDPOINT: "/settings/pump",

  // Endpoint status koneksi MQTT (dicek periodik oleh topbar)
  MQTT_STATUS_ENDPOINT: "/mqtt/status",

  // Konfigurasi MQTT HiveMQ default (ditampilkan di halaman Settings/Config)
  MQTT_DEFAULT: {
    broker: "xxxx.s1.eu.hivemq.cloud",
    port: 8883,
    username: "iot_user",
    topicSensor: "gardenkit/+/sensor",
    topicControl: "gardenkit/+/control",
  },

  // true = pakai data dummy (localStorage + dummy-data.js)
  // false = pakai backend FastAPI asli lewat fetch()
  USE_DUMMY_DATA: false,

  // interval refresh data dashboard (ms)
  REFRESH_INTERVAL_MS: 3000,
};
