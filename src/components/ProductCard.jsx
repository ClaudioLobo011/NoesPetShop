import React, { useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'
import { API_URL } from '../config/apiConfig'

function describePromotionShort(promo) {
  if (!promo) return ''
  switch (promo.type) {
    case 'percentage':
      return `${promo.percent}% de desconto`
    case 'takepay':
      return `Leve ${promo.takeQty} e pague ${promo.payQty}`
    case 'above':
      return `Acima de ${promo.minQty} un., ${promo.percent}% de desconto`
    default:
      return 'Promoção'
  }
}

function getBestPromotionForProduct(product, promotions) {
  if (!promotions || !promotions.length || !product) return null

  // promoções ativas desse produto
  const active = promotions.filter(
    (p) => p.active !== false && p.productId === product.id,
  )

  if (!active.length) return null

  // prioridade: 1) desconto % 2) acima de qtd 3) leve e pague
  const typePriority = { percentage: 1, above: 2, takepay: 3 }

  active.sort((a, b) => {
    const pa = typePriority[a.type] || 99
    const pb = typePriority[b.type] || 99
    return pa - pb
  })

  return active[0]
}

function ProductCard({ product }) {
  const { addToCart, promotions } = useCart()
  const [imgError, setImgError] = useState(false)

  if (!product) return null

  const imageUrl =
    product.codBarras && !imgError
      ? `${API_URL}/product-image/${product.codBarras}`
      : null

  const promotion = useMemo(
    () => getBestPromotionForProduct(product, promotions),
    [product.id, promotions],
  )

  const basePrice = Number(product.price) || 0
  const hasPercentagePromo =
    promotion && promotion.type === 'percentage' && promotion.percent

  const finalPrice = hasPercentagePromo
    ? basePrice * (1 - Number(promotion.percent) / 100)
    : basePrice

  return (
    <div className="product-card">
      <div className="product-image-placeholder">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <span>Imagem do produto</span>
        )}

        {promotion && (
          <span className="product-badge">
            {promotion.type === 'percentage'
              ? `-${promotion.percent}%`
              : 'Promoção'}
          </span>
        )}
      </div>

      <h3>{product.name}</h3>

      {product.description && (
        <p className="product-description">{product.description}</p>
      )}

      <div className="product-price-wrapper">
        {hasPercentagePromo ? (
          <>
            <span className="product-price-original">
              {basePrice.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
            <span className="product-price">
              {finalPrice.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </>
        ) : (
          <span className="product-price">
            {basePrice.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        )}
      </div>

      {promotion && promotion.type !== 'percentage' && (
        <p className="product-promo-text">
          {describePromotionShort(promotion)}
        </p>
      )}

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
