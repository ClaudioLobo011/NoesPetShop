const { getCollection } = require('./db')

function serialize(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return rest
}

async function getNextCod(collection) {
  const [last] = await collection.find().sort({ cod: -1 }).limit(1).toArray()
  return last ? Number(last.cod || last.id || 0) + 1 : 1
}

async function getCategories() {
  const collection = await getCollection('categories')
  const categories = await collection.find().sort({ cod: 1 }).toArray()

  return categories.map((c) =>
    serialize({
      ...c,
      parentId:
        c.parentId === undefined || c.parentId === null
          ? null
          : Number(c.parentId),
    }),
  )
}

async function addCategory(category) {
  const collection = await getCollection('categories')
  const nextCod = await getNextCod(collection)

  const parentId =
    category.parentId !== undefined &&
    category.parentId !== null &&
    category.parentId !== ''
      ? Number(category.parentId)
      : null

  const newCategory = {
    id: nextCod,
    cod: nextCod,
    name: category.name,
    description: category.description || '',
    parentId,
    createdAt: new Date().toISOString(),
  }

  await collection.insertOne(newCategory)
  return serialize(newCategory)
}

async function updateCategory(id, updates) {
  const collection = await getCollection('categories')
  const numericId = Number(id)

  let parentId
  if (Object.prototype.hasOwnProperty.call(updates, 'parentId')) {
    parentId =
      updates.parentId !== undefined &&
      updates.parentId !== null &&
      updates.parentId !== ''
        ? Number(updates.parentId)
        : null
  }

  const updateData = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description }
      : {}),
    ...(parentId !== undefined ? { parentId } : {}),
    updatedAt: new Date().toISOString(),
  }

  const result = await collection.findOneAndUpdate(
    { $or: [{ id: numericId }, { cod: numericId }] },
    { $set: updateData },
    { returnDocument: 'after' },
  )

  return serialize(result.value)
}

async function deleteCategory(id) {
  const collection = await getCollection('categories')
  const numericId = Number(id)

  const deleteResult = await collection.deleteMany({
    $or: [{ id: numericId }, { cod: numericId }, { parentId: numericId }],
  })

  return deleteResult.deletedCount > 0
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
}
