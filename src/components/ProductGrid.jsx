import React, { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import { API_URL } from '../config/apiConfig'

function ProductGrid() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_URL}/api/products`)
        if (!res.ok) throw new Error('Erro ao buscar produtos')
        let data = await res.json()
        if (!Array.isArray(data)) data = []

        // se tiver campo "featured", mostra só destacados; senão mostra tudo
        const featured = data.filter((p) => p.featured !== false)
        setProducts(featured.length ? featured : data)
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar os produtos.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <section className="products-section">
      <div className="section-header">
        <h2>Produtos em destaque</h2>
        <button type="button" className="link-button">
          Ver todos os produtos
        </button>
      </div>

      {loading && <p>Carregando produtos...</p>}
      {error && <p className="modal-error">{error}</p>}

      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <p>Nenhum produto cadastrado ainda.</p>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default ProductGrid
