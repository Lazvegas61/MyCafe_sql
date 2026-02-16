require("dotenv").config();

const checkEnv = require("./config/env.check");
const logger = require("./utils/logger");
const app = require("./app");

// Ayarları doğrula
checkEnv();

const PORT = process.env.APP_PORT || 5000;

// Sunucuyu başlat
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
