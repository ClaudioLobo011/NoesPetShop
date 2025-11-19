// src/components/Cart.jsx
import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import CheckoutForm from './CheckoutForm'

function Cart() {
  const {
    cartItemsWithPromotions,
    totals,
    removeFromCart,
    updateQuantity,
    clearCart,
    isCartOpen,
    closeCart,
  } = useCart()

  const [showCheckout, setShowCheckout] = useState(false)

  const items = cartItemsWithPromotions
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
                {items.map((item) => {
                  const product = item.product
                  const quantity = item.quantity
                  const pricing = item.pricing || {}

                  const unitPrice =
                    Number(product.price) || 0
                  const lineTotal =
                    pricing.finalTotal ??
                    unitPrice * quantity
                  const hasDiscount =
                    (pricing.discount || 0) > 0

                  return (
                    <li
                      key={product.id}
                      className="cart-item"
                    >
                      <div>
                        <strong>{product.name}</strong>
                        <p>
                          {unitPrice.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}{' '}
                          x {quantity} ={' '}
                          {lineTotal.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                        {hasDiscount && (
                          <p className="cart-item-promo">
                            Desconto:{' '}
                            -
                            {pricing.discount.toLocaleString(
                              'pt-BR',
                              {
                                style: 'currency',
                                currency: 'BRL',
                              },
                            )}
                          </p>
                        )}
                      </div>
                      <div className="cart-actions">
                        <input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            updateQuantity(
                              product.id,
                              Number(e.target.value),
                            )
                          }
                        />
                        <button
                          type="button"
                          className="link-button small"
                          onClick={() =>
                            removeFromCart(product.id)
                          }
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="cart-summary">
                <p>
                  Subtotal:{' '}
                  <strong>
                    {totals.baseSubtotal.toLocaleString(
                      'pt-BR',
                      {
                        style: 'currency',
                        currency: 'BRL',
                      },
                    )}
                  </strong>
                </p>

                {totals.discountTotal > 0 && (
                  <p>
                    Descontos:{' '}
                    <strong>
                      -
                      {totals.discountTotal.toLocaleString(
                        'pt-BR',
                        {
                          style: 'currency',
                          currency: 'BRL',
                        },
                      )}
                    </strong>
                  </p>
                )}

                <p>
                  Total:{' '}
                  <strong>
                    {totals.total.toLocaleString('pt-BR', {
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
          <CheckoutForm
            onClose={() => setShowCheckout(false)}
          />
        )}
      </div>
    </div>
  )
}

export default Cart
