const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
const JWT_SECRET = process.env.JWT_SECRET || 'troque_este_valor_no_env'

async function validateAdmin(email, password) {
  console.log('Login tentando com:', { email })
  console.log('ADMIN_EMAIL (env):', ADMIN_EMAIL)
  console.log('Tem hash?', !!ADMIN_PASSWORD_HASH)

  if (!email || !password) return false
  if (email !== ADMIN_EMAIL) return false
  if (!ADMIN_PASSWORD_HASH) return false

  return bcrypt.compare(password, ADMIN_PASSWORD_HASH)
}

function signAdminToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.admin_token
  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada' })
  }
}

module.exports = {
  validateAdmin,
  signAdminToken,
  authMiddleware,
}
