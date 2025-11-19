// server/productsStore.js
const fs = require('fs').promises
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')

async function ensureFile() {
  try {
    await fs.access(PRODUCTS_FILE)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(PRODUCTS_FILE, '[]', 'utf8')
  }
}

async function getProducts() {
  await ensureFile()
  const data = await fs.readFile(PRODUCTS_FILE, 'utf8')
  try {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveProducts(products) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8')
}

async function addProduct(product) {
  const products = await getProducts()

  // próximo código sequencial
  const nextCod =
    products.length > 0
      ? Math.max(
          ...products.map((p) => Number(p.cod || p.id) || 0),
        ) + 1
      : 1

  const newProduct = {
    id: nextCod,
    cod: nextCod,
    codBarras: product.codBarras || '',
    name: product.name,
    description: product.description || '',
    price: Number(product.price) || 0,
    category: product.category || '',
    subcategory: product.subcategory || '',
    featured: product.featured !== false,
    createdAt: new Date().toISOString(),
  }

  products.push(newProduct)
  await saveProducts(products)
  return newProduct
}

async function updateProduct(id, updates) {
  const products = await getProducts()
  const numericId = Number(id)

  const index = products.findIndex(
    (p) => Number(p.id) === numericId || Number(p.cod) === numericId,
  )

  if (index === -1) return null

  const current = products[index]

  const updated = {
    ...current,
    name: updates.name ?? current.name,
    description: updates.description ?? current.description,
    price:
      updates.price !== undefined && updates.price !== null
        ? Number(updates.price)
        : current.price,
    category: updates.category ?? current.category,
    subcategory: updates.subcategory ?? current.subcategory,
    codBarras: updates.codBarras ?? current.codBarras,
    featured:
      typeof updates.featured === 'boolean'
        ? updates.featured
        : current.featured,
    updatedAt: new Date().toISOString(),
  }

  products[index] = updated
  await saveProducts(products)
  return updated
}

async function deleteProduct(id) {
  const products = await getProducts()
  const numericId = Number(id)

  const index = products.findIndex(
    (p) => Number(p.id) === numericId || Number(p.cod) === numericId,
  )

  if (index === -1) return false

  products.splice(index, 1)
  await saveProducts(products)
  return true
}

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  saveProducts,
}
