const express = require("express");

const app = express();

// JSON okuyabilsin
app.use(express.json());

// Sağlık kontrol endpointi
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
