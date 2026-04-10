require("dotenv").config();

// ─── Prevent Baileys / third-party crashes from killing the server ───────────
process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught Exception (non-fatal):", err.message);
});
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error("[Server] Unhandled Rejection (non-fatal):", msg);
});
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const routes = require("./routes");
const config = require("./config/env");

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors({
  origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map(s => s.trim()),
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../", config.uploadDir)));

// API Routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
