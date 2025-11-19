import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import logo from '../assets/logo.png'

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

function Header() {
  const { items, toggleCart } = useCart()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <header className="header">
      <div className="header-top">
        <div className="logo-area">
          <img src={logo} alt="Noe's PetShop" className="logo" />
          <div className="logo-text">
            <h1>Noe&apos;s PetShop</h1>
            <span>O melhor para o seu pet</span>
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
          <button type="button" className="link-button">
            Login
          </button>
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
  )
}

export default Header
