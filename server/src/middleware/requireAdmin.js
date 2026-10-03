// Só administradores (role "admin" no token) passam. Usar depois do `auth`.
module.exports = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Só administradores podem fazer isso' })
  next()
}
