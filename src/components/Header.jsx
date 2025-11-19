import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'
import LoginModal from './LoginModal'

const categories = [
  {
    name: 'Cães',
    subcategories: ['Rações', 'Petiscos', 'Brinquedos', 'Acessórios'],
  },
  {
    name: 'Gatos',
    subcategories: ['Rações', 'Petiscos', 'Arranhadores', 'Acessórios'],
  },
  {
    name: 'Banho & Tosa',
    subcategories: ['Banho', 'Tosa', 'Higiene'],
  },
  {
    name: 'Serviços',
    subcategories: ['Consulta Veterinária', 'Vacinação', 'Taxis Pet'],
  },
]

function Header({ onGoToAdmin, onGoToHome }) {
  const { items, toggleCart } = useCart()
  const { adminUser, logout } = useAuth()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

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
              <span>Rações - Medicamentos - Aquarismo - Acessórios para Pets e Pássaros</span>
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
            {categories.map((cat) => (
              <li
                key={cat.name}
                className={
                  activeCategory === cat.name ? 'category active' : 'category'
                }
                onMouseEnter={() => setActiveCategory(cat.name)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <span>{cat.name}</span>
                {activeCategory === cat.name && (
                  <div className="dropdown">
                    {cat.subcategories.map((sub) => (
                      <button
                        type="button"
                        key={sub}
                        className="dropdown-item"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  )
}

export default Header
