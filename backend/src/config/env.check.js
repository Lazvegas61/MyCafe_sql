const requiredEnv = [
  "APP_PORT",
  "APP_SECRET",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD"
];

function checkEnv() {
  const missing = requiredEnv.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing environment variables:");
    missing.forEach(m => console.error(" - " + m));
    process.exit(1);
  }
}

module.exports = checkEnv;
