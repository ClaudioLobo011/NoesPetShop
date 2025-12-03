const { ObjectId } = require('mongodb')

const { getCollection } = require('./db')

function buildProductQuery(id) {
  const or = []
  const numericId = Number(id)

  if (Number.isFinite(numericId)) {
    or.push({ id: numericId }, { cod: numericId })
  }

  if (id !== undefined && id !== null) {
    or.push({ id }, { cod: id })
  }

  if (ObjectId.isValid(id)) {
    or.push({ _id: new ObjectId(id) })
  }

  return or.length ? { $or: or } : null
}

function serialize(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return rest
}

async function getNextCod(collection) {
  const [last] = await collection.find().sort({ cod: -1 }).limit(1).toArray()
  return last ? Number(last.cod || last.id || 0) + 1 : 1
}

async function getProducts() {
  const collection = await getCollection('products')
  const products = await collection.find().sort({ cod: 1 }).toArray()
  return products.map(serialize)
}

async function addProduct(product) {
  const collection = await getCollection('products')
  const nextCod = await getNextCod(collection)

  const newProduct = {
    id: nextCod,
    cod: nextCod,
    codBarras: product.codBarras || '',
    name: product.name,
    description: product.description || '',
    price: Number(product.price) || 0,
    costPrice:
      product.costPrice !== undefined && product.costPrice !== null
        ? Number(product.costPrice) || 0
        : null,
    category: product.category || '',
    subcategory: product.subcategory || '',
    featured: product.featured !== false,
    createdAt: new Date().toISOString(),
  }

  await collection.insertOne(newProduct)
  return serialize(newProduct)
}

async function updateProduct(id, updates) {
  const collection = await getCollection('products')
  const query = buildProductQuery(id)

  if (!query) return null

  const updateData = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description }
      : {}),
    ...(updates.price !== undefined && updates.price !== null
      ? { price: Number(updates.price) }
      : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.subcategory !== undefined
      ? { subcategory: updates.subcategory }
      : {}),
    ...(updates.codBarras !== undefined ? { codBarras: updates.codBarras } : {}),
    ...(Object.prototype.hasOwnProperty.call(updates, 'costPrice')
      ? {
          costPrice:
            updates.costPrice !== null && updates.costPrice !== undefined
              ? Number(updates.costPrice) || 0
              : null,
        }
      : {}),
    ...(typeof updates.featured === 'boolean'
      ? { featured: updates.featured }
      : {}),
    updatedAt: new Date().toISOString(),
  }

  const result = await collection.findOneAndUpdate(query, { $set: updateData }, { returnDocument: 'after' })

  return serialize(result.value)
}

async function deleteProduct(id) {
  const collection = await getCollection('products')
  const query = buildProductQuery(id)

  if (!query) return false

  const result = await collection.deleteOne(query)
  return result.deletedCount > 0
}

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
}
