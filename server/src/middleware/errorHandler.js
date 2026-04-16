export function notFoundHandler(req, res) {
  return res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  if (res.headersSent) return next(err);
  return res.status(status).json({ error: message });
}
