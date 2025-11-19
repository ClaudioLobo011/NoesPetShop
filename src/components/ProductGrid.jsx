import React from 'react'
import ProductCard from './ProductCard'
import { featuredProducts } from '../scripts/products'

function ProductGrid() {
  return (
    <section className="products-section">
      <div className="section-header">
        <h2>Produtos em destaque</h2>
        <button type="button" className="link-button">
          Ver todos os produtos
        </button>
      </div>
      <div className="products-grid">
        {featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default ProductGrid