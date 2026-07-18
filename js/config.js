const APP_CONFIG = {
  API_BASE_URL: "https://gardentechbackend-production.up.railway.app/api/v1",

  AUTH_LOGIN_ENDPOINT: "/auth/login",
  AUTH_REGISTER_ENDPOINT: "/auth/register",

  USERS_ENDPOINT: "/users",
  USER_ROLE_ENDPOINT: "/users/{username}/role",
  USER_DELETE_ENDPOINT: "/users/{username}",

  SENSORS_LATEST_ENDPOINT: "/sensors/latest",
  SENSORS_LIST_ENDPOINT: "/sensors/list",
  SENSORS_MOISTURE_HISTORY_ENDPOINT: "/sensors/history/moisture",
  SENSORS_VOLTAGE_HISTORY_ENDPOINT: "/sensors/history/voltage-current",
  DEVICES_ENDPOINT: "/devices",
  ACTUATOR_COMMAND_ENDPOINT: "/devices/{deviceId}/command",
  LOGS_ENDPOINT: "/logs",

  PUMP_SETTING_ENDPOINT: "/settings/pump",
  MQTT_STATUS_ENDPOINT: "/mqtt/status",

  MQTT_DEFAULT: {
    broker: "xxxx.s1.eu.hivemq.cloud",
    port: 8883,
    username: "iot_user",
    topicSensor: "gardenkit/+/sensor",
    topicControl: "gardenkit/+/control",
  },

  USE_DUMMY_DATA: false,
  REFRESH_INTERVAL_MS: 3000,
};