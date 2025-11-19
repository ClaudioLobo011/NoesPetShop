import React from 'react'
import { useCart } from '../context/CartContext'

function ProductCard({ product }) {
  const { addToCart } = useCart()

  return (
    <div className="product-card">
      <div className="product-image-placeholder">
        <span>Imagem do produto</span>
      </div>
      <h3>{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <p className="product-price">
        {product.price.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </p>
      <button
        type="button"
        className="primary-button full"
        onClick={() => addToCart(product)}
      >
        Adicionar ao carrinho
      </button>
    </div>
  )
}

export default ProductCard