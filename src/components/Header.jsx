import React, { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config/apiConfig'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'
import LoginModal from './LoginModal'

function Header({ onGoToAdmin, onGoToHome }) {
  const { items, toggleCart } = useCart()
  const { adminUser, logout } = useAuth()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

  // Buscar categorias do backend
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_URL}/api/categories`)
        if (!res.ok) throw new Error('Erro ao buscar categorias')
        const data = await res.json()
        setCategories(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erro ao carregar categorias do cabeçalho:', err)
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  // Agrupar categorias principais + subcategorias
  const groupedCategories = useMemo(() => {
    if (!categories.length) return []

    const main = categories.filter((c) => !c.parentId) // categoria principal
    const subsByParent = categories.reduce((acc, c) => {
      if (c.parentId) {
        if (!acc[c.parentId]) acc[c.parentId] = []
        acc[c.parentId].push(c)
      }
      return acc
    }, {})

    return main
      .map((cat) => ({
        ...cat,
        subcategories: (subsByParent[cat.id] || []).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'pt-BR'),
        ),
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
  }, [categories])

  return (
    <>
      <header className="header">
        <div className="header-top">
          <div
            className="logo-area"
            onClick={onGoToHome}
            style={{ cursor: 'pointer' }}
          >
            <img src={logo} alt="Noe's PetShop" className="logo" />
            <div className="logo-text">
              <h1>Noe&apos;s PetShop</h1>
              <span>
                Rações - Medicamentos - Aquarismo - Acessórios para Pets e
                Pássaros
              </span>
            </div>
          </div>

          <div className="search-area">
            <input
              type="text"
              placeholder="Buscar produtos, rações, serviços..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button">Buscar</button>
          </div>

          <div className="user-actions">
            {!adminUser && (
              <button
                type="button"
                className="link-button"
                onClick={() => setShowLogin(true)}
              >
                Login
              </button>
            )}

            {adminUser && (
              <>
                <button
                  type="button"
                  className="icon-button"
                  title="Painel Administrativo"
                  onClick={onGoToAdmin}
                >
                  ⚙️
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={logout}
                >
                  Sair
                </button>
              </>
            )}

            <button type="button" className="primary-button">
              Registrar
            </button>

            <button
              type="button"
              className="cart-button"
              onClick={toggleCart}
            >
              <span>Carrinho</span>
              <span className="cart-count">{totalItems}</span>
            </button>
          </div>
        </div>

        <nav className="nav-categories">
          <ul>
            {loadingCategories ? (
              <li className="category">
                <span>Carregando categorias...</span>
              </li>
            ) : groupedCategories.length === 0 ? (
              <li className="category">
                <span>Nenhuma categoria cadastrada</span>
              </li>
            ) : (
              groupedCategories.map((cat) => (
                <li
                  key={cat.id}
                  className={
                    activeCategory === cat.id ? 'category active' : 'category'
                  }
                  onMouseEnter={() => setActiveCategory(cat.id)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <span>{cat.name}</span>

                  {activeCategory === cat.id && cat.subcategories.length > 0 && (
                    <div className="dropdown">
                      {cat.subcategories.map((sub) => (
                        <button
                          type="button"
                          key={sub.id}
                          className="dropdown-item"
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </nav>
      </header>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  )
}

export default Header
