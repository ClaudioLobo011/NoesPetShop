import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import CheckoutForm from './CheckoutForm'

function Cart() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    total,
    clearCart,
    isCartOpen,
    closeCart,
  } = useCart()

  const [showCheckout, setShowCheckout] = useState(false)

  const hasItems = items.length > 0

  if (!isCartOpen) return null

  return (
    <div
      className="cart-drawer-overlay"
      onClick={() => {
        if (!showCheckout) closeCart()
      }}
    >
      <div
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cart-drawer-header">
          <h2>Seu carrinho</h2>
          <button
            type="button"
            className="link-button"
            onClick={closeCart}
          >
            Fechar
          </button>
        </header>

        <section className="cart-section">
          {!hasItems && <p>Seu carrinho está vazio.</p>}

          {hasItems && (
            <>
              <ul className="cart-list">
                {items.map((item) => (
                  <li key={item.id} className="cart-item">
                    <div>
                      <strong>{item.name}</strong>
                      <p>
                        {item.price.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                    <div className="cart-actions">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.id, Number(e.target.value))
                        }
                      />
                      <button
                        type="button"
                        className="link-button small"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="cart-summary">
                <p>
                  Total:{' '}
                  <strong>
                    {total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>
                </p>
                <div className="cart-summary-actions">
                  <button
                    type="button"
                    className="link-button"
                    onClick={clearCart}
                  >
                    Limpar carrinho
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setShowCheckout(true)}
                  >
                    Finalizar pedido
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {showCheckout && hasItems && (
          <CheckoutForm onClose={() => setShowCheckout(false)} />
        )}
      </div>
    </div>
  )
}

export default Cart
