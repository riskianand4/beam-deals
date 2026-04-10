const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");
const PositionAccess = require("../models/PositionAccess");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Token tidak ditemukan" });

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: "User tidak ditemukan" });

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    res.status(401).json({ error: "Token tidak valid" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak. Hanya admin." });
  }
  next();
};

const adminOrAccess = (menuKey) => {
  return async (req, res, next) => {
    if (req.user.role === "admin") return next();
    
    const position = req.user.position || "";
    if (!position) {
      return res.status(403).json({ error: "Akses ditolak. Anda tidak memiliki hak akses." });
    }

    try {
      const pa = await PositionAccess.findOne({ position });
      if (pa && pa.menus && pa.menus[menuKey] === true) {
        return next();
      }
    } catch (err) {
      // fall through to 403
    }

    return res.status(403).json({ error: "Akses ditolak. Anda tidak memiliki hak akses." });
  };
};

module.exports = { auth, adminOnly, adminOrAccess };
