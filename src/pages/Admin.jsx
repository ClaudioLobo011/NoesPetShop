// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/apiConfig'

function AdminPage() {
  const { adminUser, checking, logout } = useAuth()

  const [activeSection, setActiveSection] = useState('products') // 'products' | 'import' | 'categories' | 'promotions' | 'bulkEdit'

  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  // ---- PRODUTOS ----
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [savingProduct, setSavingProduct] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    featured: true,
    codBarras: '',
  })

  // ---- ALTERAÇÃO EM MASSA ----
  const [bulkRows, setBulkRows] = useState([])
  const [bulkSavingIds, setBulkSavingIds] = useState(() => new Set())
  const [bulkNameFilter, setBulkNameFilter] = useState('')
  const [bulkSortOrder, setBulkSortOrder] = useState('asc')

  // ---- CATEGORIAS ----
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    type: 'category', // 'category' | 'subcategory'
    parentId: '',
  })

  // ---- PROMOÇÕES ----
  const [promotions, setPromotions] = useState([])
  const [loadingPromotions, setLoadingPromotions] = useState(true)
  const [savingPromotion, setSavingPromotion] = useState(false)
  const [editingPromotionId, setEditingPromotionId] = useState(null)
  const [promotionForm, setPromotionForm] = useState({
    productId: '',
    type: 'percentage', // 'percentage' | 'takepay' | 'above'
    percent: '',
    takeQty: '',
    payQty: '',
    minQty: '',
    active: true,
  })

  // busca de produto para promoções
  const [promotionProductSearch, setPromotionProductSearch] = useState('')
  const [selectedPromotionProduct, setSelectedPromotionProduct] =
    useState(null)
  const [productSearchModalOpen, setProductSearchModalOpen] = useState(false)
  const [productNameQuery, setProductNameQuery] = useState('')
  const [productNameResults, setProductNameResults] = useState([])

  // ---- MENSAGENS GERAIS ----
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!adminUser) {
      setLoadingProducts(false)
      setLoadingCategories(false)
      setLoadingPromotions(false)
      return
    }
    fetchProducts()
    fetchCategories()
    fetchPromotions()
  }, [adminUser])

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function fetchProducts() {
    setLoadingProducts(true)
    clearMessages()
    try {
      const res = await fetch(`${API_URL}/api/products`)
      if (!res.ok) throw new Error('Erro ao buscar produtos')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar produtos.')
    } finally {
      setLoadingProducts(false)
    }
  }

  async function fetchCategories() {
    setLoadingCategories(true)
    clearMessages()
    try {
      const res = await fetch(`${API_URL}/api/categories`)
      if (!res.ok) throw new Error('Erro ao buscar categorias')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar categorias.')
    } finally {
      setLoadingCategories(false)
    }
  }

  async function fetchPromotions() {
    setLoadingPromotions(true)
    clearMessages()
    try {
      const res = await fetch(`${API_URL}/api/promotions`)
      if (!res.ok) throw new Error('Erro ao buscar promoções')
      const data = await res.json()
      setPromotions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar promoções.')
    } finally {
      setLoadingPromotions(false)
    }
  }

  function handlePromotionChange(e) {
    const { name, value, type, checked } = e.target
    setPromotionForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function resetPromotionForm() {
    setPromotionForm({
      productId: '',
      type: 'percentage',
      percent: '',
      takeQty: '',
      payQty: '',
      minQty: '',
      active: true,
    })
    setEditingPromotionId(null)
    setSelectedPromotionProduct(null)
    setPromotionProductSearch('')
  }

  function validatePromotionForm() {
    if (!promotionForm.productId) {
      setError('Selecione um produto.')
      return false
    }

    if (promotionForm.type === 'percentage') {
      if (!promotionForm.percent) {
        setError('Informe o percentual de desconto.')
        return false
      }
    }

    if (promotionForm.type === 'takepay') {
      if (!promotionForm.takeQty || !promotionForm.payQty) {
        setError('Informe quantos leva e quantos paga.')
        return false
      }
    }

    if (promotionForm.type === 'above') {
      if (!promotionForm.minQty || !promotionForm.percent) {
        setError('Informe a quantidade mínima e o percentual de desconto.')
        return false
      }
    }

    return true
  }

  async function handlePromotionSubmit(e) {
    e.preventDefault()
    clearMessages()

    if (!validatePromotionForm()) return

    const body = {
      productId: Number(promotionForm.productId),
      type: promotionForm.type,
      active: promotionForm.active,
    }

    if (promotionForm.type === 'percentage') {
      body.percent = Number(promotionForm.percent)
    }

    if (promotionForm.type === 'takepay') {
      body.takeQty = Number(promotionForm.takeQty)
      body.payQty = Number(promotionForm.payQty)
    }

    if (promotionForm.type === 'above') {
      body.minQty = Number(promotionForm.minQty)
      body.percent = Number(promotionForm.percent)
    }

    setSavingPromotion(true)
    try {
      if (editingPromotionId === null) {
        const res = await fetch(`${API_URL}/api/promotions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao salvar promoção.')
        }

        setPromotions((prev) => [...prev, data])
        resetPromotionForm()
        setSuccess('Promoção criada com sucesso.')
      } else {
        const res = await fetch(
          `${API_URL}/api/promotions/${editingPromotionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          },
        )

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao atualizar promoção.')
        }

        setPromotions((prev) =>
          prev.map((p) => (p.id === data.id ? data : p)),
        )
        resetPromotionForm()
        setSuccess('Promoção atualizada com sucesso.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSavingPromotion(false)
    }
  }

  function handleEditPromotion(promo) {
    setEditingPromotionId(promo.id)
    setPromotionForm({
      productId: promo.productId ? String(promo.productId) : '',
      type: promo.type || 'percentage',
      percent:
        promo.percent !== undefined && promo.percent !== null
          ? String(promo.percent)
          : '',
      takeQty:
        promo.takeQty !== undefined && promo.takeQty !== null
          ? String(promo.takeQty)
          : '',
      payQty:
        promo.payQty !== undefined && promo.payQty !== null
          ? String(promo.payQty)
          : '',
      minQty:
        promo.minQty !== undefined && promo.minQty !== null
          ? String(promo.minQty)
          : '',
      active: promo.active !== false,
    })

    const product = products.find((p) => p.id === promo.productId)
    setSelectedPromotionProduct(product || null)
    setPromotionProductSearch('')
    clearMessages()
  }

  async function handleDeletePromotion(id) {
    const ok = window.confirm('Tem certeza que deseja excluir esta promoção?')
    if (!ok) return

    clearMessages()
    try {
      const res = await fetch(`${API_URL}/api/promotions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao excluir promoção.')
      }

      setPromotions((prev) => prev.filter((p) => p.id !== id))
      if (editingPromotionId === id) resetPromotionForm()
      setSuccess('Promoção excluída com sucesso.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  function describePromotion(promo) {
    if (promo.type === 'percentage') {
      return `${promo.percent}% de desconto`
    }
    if (promo.type === 'takepay') {
      return `Leve ${promo.takeQty} pague ${promo.payQty}`
    }
    if (promo.type === 'above') {
      return `Acima de ${promo.minQty} unidades, ${promo.percent}% de desconto`
    }
    return 'Promoção'
  }

  function runPromotionProductSearch() {
    const term = promotionProductSearch.trim()
    if (!term) {
      setError('Digite um código, código de barras ou nome do produto.')
      return
    }

    const firstChar = term[0]

    // 👉 Começou com número: busca por Cod ou CodBarras
    if (/[0-9]/.test(firstChar)) {
      const matches = products.filter((p) => {
        const codStr = String(p.cod ?? p.id ?? '')
        const codBarrasStr = (p.codBarras || '').toString()
        return codStr === term || codBarrasStr === term
      })

      if (matches.length === 0) {
        setSelectedPromotionProduct(null)
        setError('Nenhum produto encontrado para esse código / código de barras.')
        return
      }

      const product = matches[0] // se tiver mais de um pega o primeiro
      selectPromotionProduct(product)
      return
    }

    // 👉 Começou com letra: abre modal de busca por nome
    const lower = term.toLowerCase()
    const results = products.filter((p) =>
      (p.name || '').toLowerCase().includes(lower),
    )

    setProductNameQuery(term)
    setProductNameResults(results)
    setProductSearchModalOpen(true)
  }

  function handlePromotionProductKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      runPromotionProductSearch()
    }
  }

  function selectPromotionProduct(product) {
    if (!product) return

    setSelectedPromotionProduct(product)
    setPromotionForm((prev) => ({
      ...prev,
      productId: product.id ? String(product.id) : '',
    }))
    setProductSearchModalOpen(false)
    setPromotionProductSearch('')
    setError('')
  }

  function handleProductNameQueryChange(e) {
    const value = e.target.value
    setProductNameQuery(value)

    const lower = value.toLowerCase()
    const results = products.filter((p) =>
      (p.name || '').toLowerCase().includes(lower),
    )
    setProductNameResults(results)
  }

  function closeProductSearchModal() {
    setProductSearchModalOpen(false)
  }

  // ===== IMPORTAÇÃO =====

  function handleImportFileChange(e) {
    setImportFile(e.target.files?.[0] || null)
    setImportResult(null)
  }

  async function handleImportSubmit(e) {
    e.preventDefault()
    clearMessages()
    setImportResult(null)

    if (!importFile) {
      setError('Selecione um arquivo Excel ou CSV para importar.')
      return
    }

    const formData = new FormData()
    formData.append('file', importFile)

    setImporting(true)
    try {
      const res = await fetch(`${API_URL}/api/products/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao importar a planilha.')
      }

      setImportResult(data)
      setSuccess(data.message || 'Importação concluída.')
      await fetchProducts()
      await fetchCategories()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // ===== PRODUTOS =====

  function handleProductChange(e) {
    const { name, value, type, checked } = e.target
    setProductForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function resetProductForm() {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: '',
      subcategory: '',
      featured: true,
      codBarras: '',
    })
    setEditingProductId(null)
  }

  async function handleProductSubmit(e) {
    e.preventDefault()
    clearMessages()

    if (!productForm.name || !productForm.price) {
      setError('Nome e preço são obrigatórios.')
      return
    }

    setSavingProduct(true)
    try {
      if (editingProductId === null) {
        const res = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...productForm,
            price: Number(productForm.price),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao salvar produto.')
        }

        setProducts((prev) => [...prev, data])
        resetProductForm()
        setSuccess('Produto criado com sucesso.')
      } else {
        const res = await fetch(
          `${API_URL}/api/products/${editingProductId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ...productForm,
              price: Number(productForm.price),
            }),
          },
        )

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao atualizar produto.')
        }

        setProducts((prev) =>
          prev.map((p) => (p.id === data.id ? data : p)),
        )
        resetProductForm()
        setSuccess('Produto atualizado com sucesso.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSavingProduct(false)
    }
  }

  function handleEditProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price:
        typeof product.price === 'number'
          ? product.price.toString().replace(',', '.')
          : product.price || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      featured: product.featured !== false,
      codBarras: product.codBarras || '',
    })
    clearMessages()
  }

  async function handleDeleteProduct(id) {
    const ok = window.confirm('Tem certeza que deseja excluir este produto?')
    if (!ok) return

    clearMessages()
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
      if (editingProductId === id) resetProductForm()
      setSuccess('Produto excluído com sucesso.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  async function handleUploadImage(product, file, onUploaded) {
    if (!file) return

    if (!product.codBarras) {
      setError('Defina um Código de barras no produto antes de enviar a imagem.')
      return
    }

    const formData = new FormData()
    formData.append('codBarras', product.codBarras)
    formData.append('image', file)

    try {
      clearMessages()
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
      if (typeof onUploaded === 'function') {
        onUploaded(data.imageUrl)
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

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

  function mapProductToBulkRow(product) {
    return {
      id: product.id,
      cod: product.cod,
      name: product.name || '',
      description: product.description || '',
      costPrice:
        product.costPrice !== undefined && product.costPrice !== null
          ? String(product.costPrice).replace(',', '.')
          : '',
      price:
        typeof product.price === 'number'
          ? product.price.toString().replace(',', '.')
          : product.price || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      featured: product.featured !== false,
      codBarras: product.codBarras || '',
      hasImage: Boolean(product.imageUrl),
    }
  }

  useEffect(() => {
    setBulkRows(products.map(mapProductToBulkRow))
  }, [products])

  const filteredBulkRows = useMemo(() => {
    const term = bulkNameFilter.trim().toLowerCase()
    const rows = term
      ? bulkRows.filter((row) => (row.name || '').toLowerCase().includes(term))
      : bulkRows

    const sorted = [...rows].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()

      if (nameA === nameB) return 0
      if (bulkSortOrder === 'desc') {
        return nameA < nameB ? 1 : -1
      }
      return nameA > nameB ? 1 : -1
    })

    return sorted
  }, [bulkRows, bulkNameFilter, bulkSortOrder])

  function handleBulkChange(id, field, value) {
    setBulkRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === 'featured' ? value : value,
            }
          : row,
      ),
    )
  }

  function toggleBulkSaving(id, saving) {
    setBulkSavingIds((prev) => {
      const next = new Set(prev)
      if (saving) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  async function handleBulkSave(row) {
    clearMessages()

    const parsedPrice = Number(String(row.price).replace(',', '.'))
    const parsedCost =
      row.costPrice === '' || row.costPrice === null
        ? null
        : Number(String(row.costPrice).replace(',', '.'))

    if (!row.name) {
      setError('Nome é obrigatório na alteração em massa.')
      return
    }

    if (!Number.isFinite(parsedPrice)) {
      setError('Informe um preço válido para salvar a linha.')
      return
    }

    if (row.costPrice !== '' && row.costPrice !== null && !Number.isFinite(parsedCost)) {
      setError('Informe um custo válido ou deixe em branco.')
      return
    }

    toggleBulkSaving(row.id, true)

    try {
      const res = await fetch(`${API_URL}/api/products/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: row.name,
          description: row.description,
          price: parsedPrice,
          category: row.category,
          subcategory: row.subcategory,
          costPrice: parsedCost,
          featured: !!row.featured,
          codBarras: row.codBarras,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao salvar alterações em massa.')
      }

      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)))
      setBulkRows((prev) =>
        prev.map((r) => (r.id === data.id ? mapProductToBulkRow(data) : r)),
      )
      setSuccess('Linha atualizada com sucesso.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      toggleBulkSaving(row.id, false)
    }
  }

  // ===== CATEGORIAS =====

  const parentOptions = useMemo(
    () => categories.filter((c) => !c.parentId), // só categorias principais
    [categories],
  )

  function handleCategoryChange(e) {
    const { name, value } = e.target
    setCategoryForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function resetCategoryForm() {
    setCategoryForm({
      name: '',
      description: '',
      type: 'category',
      parentId: '',
    })
    setEditingCategoryId(null)
  }

  async function handleCategorySubmit(e) {
    e.preventDefault()
    clearMessages()

    if (!categoryForm.name) {
      setError('Nome da categoria é obrigatório.')
      return
    }

    if (categoryForm.type === 'subcategory' && !categoryForm.parentId) {
      setError('Selecione a categoria pai para a subcategoria.')
      return
    }

    const body = {
      name: categoryForm.name,
      description: categoryForm.description,
      parentId:
        categoryForm.type === 'subcategory' ? categoryForm.parentId : null,
    }

    setSavingCategory(true)
    try {
      if (editingCategoryId === null) {
        const res = await fetch(`${API_URL}/api/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao salvar categoria.')
        }

        setCategories((prev) => [...prev, data])
        resetCategoryForm()
        setSuccess('Categoria criada com sucesso.')
      } else {
        const res = await fetch(
          `${API_URL}/api/categories/${editingCategoryId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          },
        )

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || 'Erro ao atualizar categoria.')
        }

        setCategories((prev) =>
          prev.map((c) => (c.id === data.id ? data : c)),
        )
        resetCategoryForm()
        setSuccess('Categoria atualizada com sucesso.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSavingCategory(false)
    }
  }

  async function handleDeleteCategory(id) {
    const ok = window.confirm(
      'Tem certeza que deseja excluir esta categoria e suas subcategorias?',
    )
    if (!ok) return

    clearMessages()
    try {
      const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao excluir categoria.')
      }

      setCategories((prev) =>
        prev.filter(
          (c) =>
            c.id !== id &&
            c.parentId !== id &&
            c.cod !== id, // só por garantia
        ),
      )
      if (editingCategoryId === id) resetCategoryForm()
      setSuccess('Categoria excluída com sucesso.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  function handleEditCategory(cat) {
    setEditingCategoryId(cat.id)
    setCategoryForm({
      name: cat.name || '',
      description: cat.description || '',
      type: cat.parentId ? 'subcategory' : 'category',
      parentId: cat.parentId ? String(cat.parentId) : '',
    })
    clearMessages()
  }

  function getCategoryParentName(cat) {
    if (!cat.parentId) return null
    const parent = categories.find((c) => c.id === cat.parentId)
    return parent?.name || null
  }

  // ===== RENDER =====

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

      <div className="admin-main">
        <aside className="admin-sidebar">
          <button
            type="button"
            className={
              activeSection === 'products'
                ? 'admin-sidebar-btn active'
                : 'admin-sidebar-btn'
            }
            onClick={() => {
              setActiveSection('products')
              clearMessages()
            }}
          >
            Cadastro de Produtos
          </button>

          <button
            type="button"
            className={
              activeSection === 'import'
                ? 'admin-sidebar-btn active'
                : 'admin-sidebar-btn'
            }
            onClick={() => {
              setActiveSection('import')
              setImportResult(null)
              clearMessages()
            }}
          >
            Importar Produtos
          </button>

          <button
            type="button"
            className={
              activeSection === 'bulkEdit'
                ? 'admin-sidebar-btn active'
                : 'admin-sidebar-btn'
            }
            onClick={() => {
              setActiveSection('bulkEdit')
              clearMessages()
            }}
          >
            Alteração em Massa
          </button>

          <button
            type="button"
            className={
              activeSection === 'categories'
                ? 'admin-sidebar-btn active'
                : 'admin-sidebar-btn'
            }
            onClick={() => {
              setActiveSection('categories')
              clearMessages()
            }}
          >
            Cadastro de Categorias
          </button>

          <button
            type="button"
            className={
              activeSection === 'promotions'
                ? 'admin-sidebar-btn active'
                : 'admin-sidebar-btn'
            }
            onClick={() => {
              setActiveSection('promotions')
              clearMessages()
            }}
          >
            Promoções
          </button>
        </aside>

        <div className="admin-content">
          {error && <p className="modal-error">{error}</p>}
          {success && <p className="admin-success">{success}</p>}

          {activeSection === 'products' && (
            <div className="admin-layout">
              {/* FORM PRODUTOS */}
              <form className="admin-form" onSubmit={handleProductSubmit}>
                <h3>
                  {editingProductId === null
                    ? 'Novo produto'
                    : `Editar produto #${editingProductId}`}
                </h3>

                <label>
                  Nome*
                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleProductChange}
                    required
                  />
                </label>

                <label>
                  Descrição
                  <textarea
                    name="description"
                    rows={3}
                    value={productForm.description}
                    onChange={handleProductChange}
                  />
                </label>

                <label>
                  Preço (R$)*
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={productForm.price}
                    onChange={handleProductChange}
                    required
                  />
                </label>

                <div className="form-row two-columns">
                  <label>
                    Categoria
                    <input
                      type="text"
                      name="category"
                      value={productForm.category}
                      onChange={handleProductChange}
                    />
                  </label>
                  <label>
                    Subcategoria
                    <input
                      type="text"
                      name="subcategory"
                      value={productForm.subcategory}
                      onChange={handleProductChange}
                    />
                  </label>
                </div>

                <label>
                  Código de barras
                  <input
                    type="text"
                    name="codBarras"
                    value={productForm.codBarras}
                    onChange={handleProductChange}
                    placeholder="Ex: 7891234567890"
                  />
                </label>

                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={productForm.featured}
                    onChange={handleProductChange}
                  />
                  Mostrar em &quot;Produtos em destaque&quot;
                </label>

                <div className="form-row form-actions">
                  {editingProductId !== null && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={resetProductForm}
                    >
                      Cancelar edição
                    </button>
                  )}
                  <button
                    type="submit"
                    className="primary-button full"
                    disabled={savingProduct}
                  >
                    {savingProduct
                      ? editingProductId === null
                        ? 'Salvando...'
                        : 'Atualizando...'
                      : editingProductId === null
                      ? 'Salvar produto'
                      : 'Salvar alterações'}
                  </button>
                </div>
              </form>

              {/* LISTA PRODUTOS */}
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

                {loadingProducts ? (
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
                              {p.codBarras && <span> • CodBarras: {p.codBarras}</span>}
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
                                e.target.value = ''
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            className="link-button small"
                            onClick={() => handleEditProduct(p)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="link-button small danger"
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            Excluir
                          </button>
                          {p.featured && (
                            <span className="admin-badge">Destaque</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeSection === 'import' && (
            <div className="admin-categories">
              <div className="admin-categories-layout">
                <form className="admin-form" onSubmit={handleImportSubmit}>
                  <h3>Importar Produtos</h3>

                  <p className="admin-helper-text">
                    Envie uma planilha Excel (.xlsx/.xls) ou CSV com as colunas
                    abaixo. O código é gerado automaticamente. Se a categoria
                    não existir, criaremos uma nova.
                  </p>

                  <ul className="admin-helper-list">
                    <li>CodBarras (opcional)</li>
                    <li>Descrição</li>
                    <li>Preço de Custo</li>
                    <li>Preço de Venda</li>
                    <li>Categoria</li>
                    <li>SubCategoria (opcional, vinculada à Categoria)</li>
                  </ul>

                  <label>
                    Arquivo da planilha
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportFileChange}
                      required
                    />
                  </label>

                  {importResult && (
                    <div className="import-summary">
                      <p>
                        <strong>Linhas processadas:</strong>{' '}
                        {importResult.totalLinhas || 0}
                      </p>
                      <p>
                        <strong>Produtos criados:</strong>{' '}
                        {importResult.produtosCriados || 0}
                      </p>
                      <p>
                        <strong>Produtos atualizados:</strong>{' '}
                        {importResult.produtosAtualizados || 0}
                      </p>
                      {importResult.subcategoriasCriadas &&
                        importResult.subcategoriasCriadas.length > 0 && (
                          <div>
                            <strong>Subcategorias criadas:</strong>
                            <ul>
                              {importResult.subcategoriasCriadas.map((sub) => (
                                <li key={sub}>{sub}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {importResult.categoriasCriadas &&
                        importResult.categoriasCriadas.length > 0 && (
                          <div>
                            <strong>Categorias criadas:</strong>
                            <ul>
                              {importResult.categoriasCriadas.map((cat) => (
                                <li key={cat}>{cat}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {importResult.erros && importResult.erros.length > 0 && (
                        <div className="import-errors">
                          <p>
                            Foram encontrados {importResult.erros.length} erros
                            na planilha:
                          </p>
                          <ul>
                            {importResult.erros.map((err) => (
                              <li key={`${err.row}-${err.mensagem}`}>
                                <strong>Linha {err.row}:</strong> {err.mensagem}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-row form-actions">
                    <button
                      type="submit"
                      className="primary-button full"
                      disabled={importing}
                    >
                      {importing ? 'Importando...' : 'Importar planilha'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'categories' && (
            <div className="admin-categories">
              <div className="admin-categories-layout">
                {/* FORM CATEGORIAS */}
                <form
                  className="admin-form admin-category-form"
                  onSubmit={handleCategorySubmit}
                >
                  <h3>
                    {editingCategoryId === null
                      ? 'Nova categoria'
                      : `Editar categoria #${editingCategoryId}`}
                  </h3>

                  <label>
                    Nome*
                    <input
                      type="text"
                      name="name"
                      value={categoryForm.name}
                      onChange={handleCategoryChange}
                      required
                    />
                  </label>

                  <label>
                    Tipo
                    <select
                      name="type"
                      value={categoryForm.type}
                      onChange={handleCategoryChange}
                    >
                      <option value="category">Categoria principal</option>
                      <option value="subcategory">Subcategoria</option>
                    </select>
                  </label>

                  {categoryForm.type === 'subcategory' && (
                    <label>
                      Categoria pai*
                      <select
                        name="parentId"
                        value={categoryForm.parentId}
                        onChange={handleCategoryChange}
                      >
                        <option value="">Selecione...</option>
                        {parentOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Cod {c.cod || c.id})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label>
                    Descrição
                    <textarea
                      name="description"
                      rows={3}
                      value={categoryForm.description}
                      onChange={handleCategoryChange}
                    />
                  </label>

                  <div className="form-row form-actions">
                    {editingCategoryId !== null && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={resetCategoryForm}
                      >
                        Cancelar edição
                      </button>
                    )}
                    <button
                      type="submit"
                      className="primary-button full"
                      disabled={savingCategory}
                    >
                      {savingCategory
                        ? editingCategoryId === null
                          ? 'Salvando...'
                          : 'Atualizando...'
                        : editingCategoryId === null
                        ? 'Salvar categoria'
                        : 'Salvar alterações'}
                    </button>
                  </div>
                </form>

                {/* LISTA CATEGORIAS */}
                <div className="admin-list admin-category-list-wrapper">
                  <h3>Categorias cadastradas</h3>
                  {loadingCategories ? (
                    <p>Carregando categorias...</p>
                  ) : categories.length === 0 ? (
                    <p>Nenhuma categoria cadastrada.</p>
                  ) : (
                    <ul className="admin-category-list">
                      {categories.map((c) => {
                        const parentName = getCategoryParentName(c)
                        const isSub = !!c.parentId
                        return (
                          <li key={c.id} className="admin-category-item">
                            <div>
                              <strong>{c.name}</strong>
                              <p className="admin-category-desc">
                                {isSub
                                  ? parentName
                                    ? `Subcategoria de ${parentName}`
                                    : 'Subcategoria'
                                  : 'Categoria principal'}
                              </p>
                              {c.description && (
                                <p className="admin-category-desc">
                                  {c.description}
                                </p>
                              )}
                              <small>Cod: {c.cod || c.id}</small>
                            </div>
                            <div className="admin-item-actions">
                              <button
                                type="button"
                                className="link-button small"
                                onClick={() => handleEditCategory(c)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="link-button small danger"
                                onClick={() => handleDeleteCategory(c.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'bulkEdit' && (
            <div className="admin-bulk">
              <div className="bulk-edit-wrapper">
                <div className="admin-form bulk-edit-intro">
                  <h3>Alteração em Massa</h3>
                  <p className="admin-helper-text">
                    Edite vários produtos de uma vez seguindo o layout em tabela.
                    Use o botão Salvar em cada linha para aplicar as mudanças sem
                    sair da tela.
                  </p>
                </div>

                <div className="admin-list bulk-edit-card">
                  <div className="bulk-filters">
                    <label className="bulk-filter-input">
                      <span>Nome</span>
                      <input
                        type="text"
                        placeholder="Filtrar por nome"
                        value={bulkNameFilter}
                        onChange={(e) => setBulkNameFilter(e.target.value)}
                      />
                    </label>

                    <div className="bulk-sort-group">
                      <span>Ordenação</span>
                      <div className="bulk-sort-actions">
                        <button
                          type="button"
                          className={
                            bulkSortOrder === 'asc'
                              ? 'secondary-button small active'
                              : 'secondary-button small'
                          }
                          onClick={() => setBulkSortOrder('asc')}
                        >
                          Crescente
                        </button>
                        <button
                          type="button"
                          className={
                            bulkSortOrder === 'desc'
                              ? 'secondary-button small active'
                              : 'secondary-button small'
                          }
                          onClick={() => setBulkSortOrder('desc')}
                        >
                          Decrescente
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bulk-edit-scroll">
                    <div className="bulk-edit-table">
                      <div className="bulk-edit-row bulk-edit-header">
                        <span>Nome</span>
                        <span>Descrição</span>
                        <span>Custo</span>
                        <span>Preço</span>
                        <span>Categoria</span>
                        <span>SubCategoria</span>
                        <span>Imagem</span>
                        <span>Destaque</span>
                        <span>Ações</span>
                      </div>

                      {loadingProducts ? (
                        <p className="admin-helper-text">Carregando produtos...</p>
                      ) : filteredBulkRows.length === 0 ? (
                        <p className="admin-helper-text">
                          Nenhum produto encontrado com os filtros.
                        </p>
                      ) : (
                        <div className="bulk-edit-body">
                          {filteredBulkRows.map((row) => {
                            const saving = bulkSavingIds.has(row.id)
                            return (
                              <div key={row.id} className="bulk-edit-row">
                                <div className="bulk-edit-cell">
                                  <input
                                    type="text"
                                    value={row.name}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'name',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Nome do produto"
                                  />
                                  <small className="bulk-row-hint">
                                    Cod: {row.cod || row.id}
                                    {row.codBarras && ` • CodBarras: ${row.codBarras}`}
                                  </small>
                                </div>

                                <div className="bulk-edit-cell">
                                  <textarea
                                    value={row.description}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'description',
                                        e.target.value,
                                      )
                                    }
                                    rows={2}
                                    placeholder="Descrição"
                                  />
                                </div>

                                <div className="bulk-edit-cell small">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.costPrice}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'costPrice',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0,00"
                                  />
                                </div>

                                <div className="bulk-edit-cell small">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.price}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'price',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0,00"
                                    required
                                  />
                                </div>

                                <div className="bulk-edit-cell">
                                  <input
                                    type="text"
                                    value={row.category}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'category',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Categoria"
                                  />
                                </div>

                                <div className="bulk-edit-cell">
                                  <input
                                    type="text"
                                    value={row.subcategory}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'subcategory',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Subcategoria"
                                  />
                                </div>

                                <div className="bulk-edit-cell image-cell">
                                  {row.hasImage ? (
                                    <span className="bulk-image-flag">Sim</span>
                                  ) : row.codBarras ? (
                                    <label className="bulk-image-upload">
                                      Enviar PNG
                                      <input
                                        type="file"
                                        accept="image/png"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) {
                                            handleUploadImage(row, file, () => {
                                              setBulkRows((prev) =>
                                                prev.map((r) =>
                                                  r.id === row.id
                                                    ? { ...r, hasImage: true }
                                                    : r,
                                                ),
                                              )
                                            })
                                          }
                                          e.target.value = ''
                                        }}
                                      />
                                    </label>
                                  ) : (
                                    <small className="bulk-row-hint">
                                      Defina o Código de barras para enviar a imagem.
                                    </small>
                                  )}
                                </div>

                                <div className="bulk-edit-cell checkbox-cell">
                                  <input
                                    type="checkbox"
                                    checked={row.featured}
                                    onChange={(e) =>
                                      handleBulkChange(
                                        row.id,
                                        'featured',
                                        e.target.checked,
                                      )
                                    }
                                  />
                                </div>

                                <div className="bulk-edit-cell action-cell">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => handleBulkSave(row)}
                                    disabled={saving}
                                  >
                                    {saving ? 'Salvando...' : 'Salvar'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'promotions' && (
            <div className="admin-categories">
              <div className="admin-categories-layout">
                {/* FORM PROMOÇÕES */}
                <form
                  className="admin-form admin-promo-form"
                  onSubmit={handlePromotionSubmit}
                >
                  <h3>
                    {editingPromotionId === null
                      ? 'Nova promoção'
                      : `Editar promoção #${editingPromotionId}`}
                  </h3>

                  <label>
                    Produto*
                    <div className="product-search-inline">
                      <input
                        type="text"
                        placeholder="Digite Cod/CodBarras ou nome..."
                        value={promotionProductSearch}
                        onChange={(e) =>
                          setPromotionProductSearch(e.target.value)
                        }
                        onKeyDown={handlePromotionProductKeyDown}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={runPromotionProductSearch}
                      >
                        Buscar
                      </button>
                    </div>
                    {selectedPromotionProduct && (
                      <small className="selected-product-hint">
                        Selecionado:{' '}
                        <strong>{selectedPromotionProduct.name}</strong>{' '}
                        {selectedPromotionProduct.cod && (
                          <> (Cod {selectedPromotionProduct.cod})</>
                        )}
                        {selectedPromotionProduct.codBarras && (
                          <> • CodBarras {selectedPromotionProduct.codBarras}</>
                        )}
                      </small>
                    )}
                  </label>

                  <label>
                    Tipo de promoção
                    <select
                      name="type"
                      value={promotionForm.type}
                      onChange={handlePromotionChange}
                    >
                      <option value="percentage">Desconto (%)</option>
                      <option value="takepay">Leve e Pague</option>
                      <option value="above">
                        Acima de quantidade
                      </option>
                    </select>
                  </label>

                  {promotionForm.type === 'percentage' && (
                    <label>
                      Percentual de desconto (%)
                      <input
                        type="number"
                        name="percent"
                        min="0"
                        step="0.01"
                        value={promotionForm.percent}
                        onChange={handlePromotionChange}
                      />
                    </label>
                  )}

                  {promotionForm.type === 'takepay' && (
                    <div className="form-row two-columns">
                      <label>
                        Leva
                        <input
                          type="number"
                          name="takeQty"
                          min="1"
                          step="1"
                          value={promotionForm.takeQty}
                          onChange={handlePromotionChange}
                        />
                      </label>
                      <label>
                        Paga
                        <input
                          type="number"
                          name="payQty"
                          min="1"
                          step="1"
                          value={promotionForm.payQty}
                          onChange={handlePromotionChange}
                        />
                      </label>
                    </div>
                  )}

                  {promotionForm.type === 'above' && (
                    <>
                      <label>
                        Quantidade mínima
                        <input
                          type="number"
                          name="minQty"
                          min="1"
                          step="1"
                          value={promotionForm.minQty}
                          onChange={handlePromotionChange}
                        />
                      </label>
                      <label>
                        Percentual de desconto (%)
                        <input
                          type="number"
                          name="percent"
                          min="0"
                          step="0.01"
                          value={promotionForm.percent}
                          onChange={handlePromotionChange}
                        />
                      </label>
                    </>
                  )}

                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      name="active"
                      checked={promotionForm.active}
                      onChange={handlePromotionChange}
                    />
                    Promoção ativa
                  </label>

                  <div className="form-row form-actions">
                    {editingPromotionId !== null && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={resetPromotionForm}
                      >
                        Cancelar edição
                      </button>
                    )}
                    <button
                      type="submit"
                      className="primary-button full"
                      disabled={savingPromotion}
                    >
                      {savingPromotion
                        ? editingPromotionId === null
                          ? 'Salvando...'
                          : 'Atualizando...'
                        : editingPromotionId === null
                        ? 'Salvar promoção'
                        : 'Salvar alterações'}
                    </button>
                  </div>
                </form>

                {/* LISTA DE PROMOÇÕES */}
                <div className="admin-list admin-category-list-wrapper">
                  <h3>Promoções cadastradas</h3>
                  {loadingPromotions ? (
                    <p>Carregando promoções...</p>
                  ) : promotions.length === 0 ? (
                    <p>Nenhuma promoção cadastrada.</p>
                  ) : (
                    <ul className="admin-category-list">
                      {promotions.map((promo) => {
                        const product = products.find(
                          (p) => p.id === promo.productId,
                        )
                        return (
                          <li
                            key={promo.id}
                            className="admin-category-item"
                          >
                            <div>
                              <strong>
                                {product?.name || 'Produto removido'}
                              </strong>
                              <p className="admin-category-desc">
                                {describePromotion(promo)}
                              </p>
                              <small>
                                Cod promoção: {promo.cod || promo.id} •{' '}
                                {promo.active ? 'Ativa' : 'Inativa'}
                              </small>
                            </div>
                            <div className="admin-item-actions">
                              <button
                                type="button"
                                className="link-button small"
                                onClick={() =>
                                  handleEditPromotion(promo)
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="link-button small danger"
                                onClick={() =>
                                  handleDeletePromotion(promo.id)
                                }
                              >
                                Excluir
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          {productSearchModalOpen && (
            <div className="modal-overlay">
              <div className="modal promo-product-modal">
                <div className="modal-header">
                  <h3>Buscar produto</h3>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={closeProductSearchModal}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <input
                    type="text"
                    className="promo-product-search-input"
                    placeholder="Digite parte do nome do produto"
                    value={productNameQuery}
                    onChange={handleProductNameQueryChange}
                  />
                  <div className="promo-product-results">
                    {productNameResults.length === 0 ? (
                      <p>Nenhum produto encontrado.</p>
                    ) : (
                      <ul className="promo-product-list">
                        {productNameResults.map((p) => (
                          <li
                            key={p.id}
                            className="promo-product-item"
                            onClick={() => selectPromotionProduct(p)}
                          >
                            <strong>{p.name}</strong>
                            <div className="promo-product-meta">
                              <span>Cod: {p.cod || p.id}</span>
                              {p.codBarras && (
                                <span> • CodBarras: {p.codBarras}</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
