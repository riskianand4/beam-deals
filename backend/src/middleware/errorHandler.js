const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validasi gagal", details: errors });
  }

  if (err.code === 11000) {
    return res.status(400).json({ error: "Data sudah ada (duplikat)" });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || "Terjadi kesalahan server",
  });
};

module.exports = errorHandler;
