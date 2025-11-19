import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      onClose()
    } catch (err) {
      setError(err.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Login administrativo</h3>
          <button
            type="button"
            className="link-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              placeholder="admin@noespetshop.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              placeholder="Senha de administrador"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <button
            type="submit"
            className="primary-button full"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginModal
