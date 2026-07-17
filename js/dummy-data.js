/* =========================================================
   DUMMY-DATA.JS
   Simulasi data sensor & device selama backend FastAPI
   belum tersedia. Setiap function di sini punya "kembaran"
   versi fetch() ke backend asli (lihat komentar di dashboard.js).

   Saat backend sudah siap:
   1. Set APP_CONFIG.USE_DUMMY_DATA = false di config.js
   2. File ini otomatis tidak lagi dipakai
   ========================================================= */

// nilai dasar, akan "bergerak" sedikit setiap kali dipanggil biar terasa real-time
let _dummyState = {
  soilMoisture: 38,
  airTemp: 29,
  pumpPower: 3.1,
  pumpVoltage: 4.98,
  pumpCurrent: 0.62,
  ultrasonicDetected: false,
  pumpOn: false,
  autoMode: true,
  threshold: 40,
};

function _jitter(value, range, min, max) {
  const next = value + (Math.random() - 0.5) * range;
  return Math.min(max, Math.max(min, next));
}

function getDummySensorLatest() {
  _dummyState.soilMoisture = Math.round(_jitter(_dummyState.soilMoisture, 2, 15, 85));
  _dummyState.airTemp = Math.round(_jitter(_dummyState.airTemp, 0.6, 24, 34) * 10) / 10;
  _dummyState.pumpVoltage = Math.round(_jitter(_dummyState.pumpVoltage, 0.05, 4.8, 5.05) * 100) / 100;

  // logika sederhana: kalau mode otomatis & kelembapan di bawah ambang, pompa nyala
  if (_dummyState.autoMode) {
    _dummyState.pumpOn = _dummyState.soilMoisture < _dummyState.threshold;
  }
  _dummyState.pumpCurrent = _dummyState.pumpOn ? Math.round(_jitter(0.62, 0.05, 0.5, 0.75) * 100) / 100 : 0;
  _dummyState.pumpPower = Math.round(_dummyState.pumpVoltage * _dummyState.pumpCurrent * 10) / 10;

  return { ..._dummyState };
}

function getDummyMoistureHistory() {
  // 8 titik data 3-jam-an dalam sehari
  return {
    labels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
    values: [52, 49, 45, 41, 36, 38, 42, 47],
  };
}

function getDummyVoltageCurrentHistory() {
  const labels = ["01/06", "02/06", "03/06", "04/06", "05/06", "06/06", "07/06"];
  return {
    labels,
    voltage: labels.map(() => Math.round(_jitter(4.95, 0.08, 4.8, 5.05) * 100) / 100),
    current: labels.map(() => Math.round(_jitter(0.6, 0.1, 0.45, 0.78) * 100) / 100),
  };
}

function getDummyDevices() {
  return [
    { id: "dev001", name: "ESP32 DevKit V1", type: "Mikrokontroler", status: "online", lastSeen: "Baru saja" },
    { id: "dev002", name: "Relay Module 1CH", type: "Aktuator", status: "online", lastSeen: "Baru saja" },
    { id: "dev003", name: "Pompa Air Mini DC", type: "Aktuator", status: "online", lastSeen: "2 menit lalu" },
    { id: "dev004", name: "Soil Moisture Sensor", type: "Sensor", status: "online", lastSeen: "Baru saja" },
    { id: "dev005", name: "DHT22", type: "Sensor", status: "online", lastSeen: "Baru saja" },
    { id: "dev006", name: "Sensor Ultrasonic", type: "Sensor", status: "offline", lastSeen: "14 menit lalu" },
  ];
}

function getDummySensors() {
  const latest = getDummySensorLatest();
  return [
    { id: "sn001", name: "Soil Moisture Sensor", value: `${latest.soilMoisture}%`, status: latest.soilMoisture < _dummyState.threshold ? "warning" : "normal" },
    { id: "sn002", name: "DHT22 - Suhu udara", value: `${latest.airTemp}°C`, status: "normal" },
    { id: "sn003", name: "INA219 - Tegangan pompa", value: `${latest.pumpVoltage} V`, status: "normal" },
    { id: "sn004", name: "INA219 - Arus pompa", value: `${latest.pumpCurrent} A`, status: "normal" },
    { id: "sn005", name: "Sensor Ultrasonic - Jarak objek", value: latest.ultrasonicDetected ? "Objek terdeteksi" : "Tidak ada objek", status: latest.ultrasonicDetected ? "warning" : "normal" },
  ];
}

function getDummyActuators() {
  return [
    { id: "act001", name: "Relay 1 - Pompa air", state: _dummyState.pumpOn },
  ];
}

function getDummyLogs() {
  return [
    { time: "14:32", type: "info", text: "Penyiraman otomatis dimulai (kelembapan tanah 37%)" },
    { time: "14:38", type: "success", text: "Pompa berhenti otomatis (kelembapan tanah 52%)" },
    { time: "15:10", type: "warning", text: "Objek terdeteksi di area kebun (sensor ultrasonic)" },
    { time: "15:45", type: "info", text: "Data berhasil dikirim ke MQTT broker HiveMQ" },
    { time: "16:02", type: "danger", text: "Sensor ultrasonic mendeteksi objek mencurigakan di malam hari" },
  ];
}
