// ==================================================
// main.jsx
// MyCafe – Application Entry (Clean Bootstrap)
// ==================================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";  // ./app/App olarak düzeltildi
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);