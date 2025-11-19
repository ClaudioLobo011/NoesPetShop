import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/apiConfig'

function AdminPage() {
  const { adminUser, checking, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null) // <- ID em edição

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    featured: true,
    codBarras: '',
  })

  useEffect(() => {
    if (!adminUser) {
      setLoading(false)
      return
    }
    fetchProducts()
  }, [adminUser])

  async function fetchProducts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/products`)
      if (!res.ok) throw new Error('Erro ao buscar produtos')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function resetForm() {
    setForm({
      name: '',
      description: '',
      price: '',
      category: '',
      subcategory: '',
      featured: true,
      codBarras: '',
    })
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name || !form.price) {
      setError('Nome e preço são obrigatórios.')
      return
    }

    setSaving(true)
    try {
      if (editingId === null) {
        // CRIAR
        const res = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...form,
            price: Number(form.price),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao salvar produto.')
        }

        setProducts((prev) => [...prev, data])
        resetForm()
        setSuccess('Produto criado com sucesso.')
      } else {
        // EDITAR
        const res = await fetch(`${API_URL}/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...form,
            price: Number(form.price),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao atualizar produto.')
        }

        setProducts((prev) =>
          prev.map((p) => (p.id === data.id ? data : p)),
        )
        resetForm()
        setSuccess('Produto atualizado com sucesso.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name || '',
      description: product.description || '',
      price:
        typeof product.price === 'number'
          ? product.price.toString().replace('.', ',').replace(',', '.')
          : product.price || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      featured: product.featured !== false,
      codBarras: product.codBarras || '',
    })
    setSuccess('')
    setError('')
  }

  async function handleUploadImage(product, file) {
    if (!file) return

    if (!product.codBarras) {
      setError('Defina um Código de barras no produto antes de enviar a imagem.')
      return
    }

    const formData = new FormData()
    formData.append('codBarras', product.codBarras) // 🚨 ordem importa aqui
    formData.append('image', file)

    try {
      setError('')
      setSuccess('')
      const res = await fetch(
        `${API_URL}/api/products/${product.id}/image`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        },
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao enviar imagem.')
      }

      setSuccess('Imagem enviada com sucesso.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir este produto?',
    )
    if (!confirmDelete) return

    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao excluir produto.')
      }

      setProducts((prev) => prev.filter((p) => p.id !== id))
      if (editingId === id) resetForm()
      setSuccess('Produto excluído com sucesso.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  // FILTRO NA GRID (painel admin)
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return products

    return products.filter((p) => {
      const cod = String(p.cod ?? p.id ?? '').toLowerCase()
      const codBarras = (p.codBarras || '').toLowerCase()
      const name = (p.name || '').toLowerCase()

      return (
        cod.includes(term) ||
        codBarras.includes(term) ||
        name.includes(term)
      )
    })
  }, [products, searchTerm])

  if (checking) {
    return <p>Verificando permissão...</p>
  }

  if (!adminUser) {
    return <p>Acesso restrito. Faça login como administrador.</p>
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Painel Administrativo</h2>
        <div className="admin-actions">
          <span>{adminUser.email}</span>
          <button type="button" className="link-button" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      <div className="admin-layout">
        {/* FORM CADASTRO / EDIÇÃO */}
        <form className="admin-form" onSubmit={handleSubmit}>
          <h3>
            {editingId === null
              ? 'Novo produto'
              : `Editar produto #${editingId}`}
          </h3>

          <label>
            Nome*
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Descrição
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
            />
          </label>

          <label>
            Preço (R$)*
            <input
              type="number"
              step="0.01"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
            />
          </label>

          <div className="form-row two-columns">
            <label>
              Categoria
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
              />
            </label>
            <label>
              Subcategoria
              <input
                type="text"
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            Código de barras
            <input
              type="text"
              name="codBarras"
              value={form.codBarras}
              onChange={handleChange}
              placeholder="Ex: 7891234567890"
            />
          </label>

          <label className="checkbox-inline">
            <input
              type="checkbox"
              name="featured"
              checked={form.featured}
              onChange={handleChange}
            />
            Mostrar em &quot;Produtos em destaque&quot;
          </label>

          {error && <p className="modal-error">{error}</p>}
          {success && <p className="admin-success">{success}</p>}

          <div className="form-row form-actions">
            {editingId !== null && (
              <button
                type="button"
                className="link-button"
                onClick={resetForm}
              >
                Cancelar edição
              </button>
            )}
            <button
              type="submit"
              className="primary-button full"
              disabled={saving}
            >
              {saving
                ? editingId === null
                  ? 'Salvando...'
                  : 'Atualizando...'
                : editingId === null
                ? 'Salvar produto'
                : 'Salvar alterações'}
            </button>
          </div>
        </form>

        {/* LISTAGEM + BUSCA + AÇÕES */}
        <div className="admin-list">
          <div className="admin-list-header">
            <h3>Produtos cadastrados</h3>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Buscar por Cod, CodBarras ou Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <p>Carregando produtos...</p>
          ) : filteredProducts.length === 0 ? (
            <p>Nenhum produto encontrado.</p>
          ) : (
            <ul className="admin-products-list">
              {filteredProducts.map((p) => (
                <li key={p.id} className="admin-product-item">
                  <div>
                    <strong>{p.name}</strong>
                    <p>
                      {p.price?.toLocaleString?.('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }) || `R$ ${p.price}`}
                    </p>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        marginTop: '0.25rem',
                        color: 'var(--color-muted)',
                      }}
                    >
                      <span>Cod: {p.cod || p.id}</span>
                      {p.codBarras && (
                        <span> • CodBarras: {p.codBarras}</span>
                      )}
                    </div>

                    {p.category && (
                      <small>
                        {p.category}
                        {p.subcategory ? ` • ${p.subcategory}` : ''}
                      </small>
                    )}
                  </div>

                  <div className="admin-item-actions">
                    <label className="link-button small">
                      Imagem
                      <input
                        type="file"
                        accept="image/png"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadImage(p, file)
                          }
                          // permite escolher o mesmo arquivo novamente se quiser
                          e.target.value = ''
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="link-button small"
                      onClick={() => handleEdit(p)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="link-button small danger"
                      onClick={() => handleDelete(p.id)}
                    >
                      Excluir
                    </button>

                    {p.featured && <span className="admin-badge">Destaque</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
