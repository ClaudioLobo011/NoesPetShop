import React, { useState } from 'react'
import { useCart } from '../context/CartContext'
import { API_URL } from '../config/apiConfig'

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [imgError, setImgError] = useState(false)

  const imageUrl =
    product.codBarras && !imgError
      ? `${API_URL}/product-image/${product.codBarras}`
      : null

  return (
    <div className="product-card">
      {imageUrl ? (
        <div className="product-image-wrapper">
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="product-image-placeholder">
          <span>Imagem do produto</span>
        </div>
      )}

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
