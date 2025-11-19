import React, { createContext, useContext, useEffect, useState } from 'react'
import { API_URL } from '../config/apiConfig'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // verifica se já existe sessão ativa (cookie HTTP-only)
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${API_URL}/api/admin/me`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setAdminUser({ email: data.email })
        } else {
          setAdminUser(null)
        }
      } catch (err) {
        console.error('Erro ao verificar sessão admin:', err)
        setAdminUser(null)
      } finally {
        setChecking(false)
      }
    }

    checkSession()
  }, [])

  async function login(email, password) {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Erro ao fazer login')
    }

    setAdminUser({ email })
    return true
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    } finally {
      setAdminUser(null)
    }
  }

  const value = {
    adminUser,
    checking,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
