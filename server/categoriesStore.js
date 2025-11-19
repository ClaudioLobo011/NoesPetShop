// server/categoriesStore.js
const fs = require('fs').promises
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json')

async function ensureFile() {
  try {
    await fs.access(CATEGORIES_FILE)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(CATEGORIES_FILE, '[]', 'utf8')
  }
}

async function getCategories() {
  await ensureFile()
  const data = await fs.readFile(CATEGORIES_FILE, 'utf8')
  try {
    const parsed = JSON.parse(data)
    // garante parentId nulo se não existir (dados antigos)
    return Array.isArray(parsed)
      ? parsed.map((c) => ({
          ...c,
          parentId:
            c.parentId === undefined || c.parentId === null
              ? null
              : Number(c.parentId),
        }))
      : []
  } catch {
    return []
  }
}

async function saveCategories(categories) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(
    CATEGORIES_FILE,
    JSON.stringify(categories, null, 2),
    'utf8',
  )
}

async function addCategory(category) {
  const categories = await getCategories()

  const nextCod =
    categories.length > 0
      ? Math.max(...categories.map((c) => Number(c.cod || c.id) || 0)) + 1
      : 1

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
    parentId, // null = categoria principal, número = subcategoria
    createdAt: new Date().toISOString(),
  }

  categories.push(newCategory)
  await saveCategories(categories)
  return newCategory
}

async function updateCategory(id, updates) {
  const categories = await getCategories()
  const numericId = Number(id)

  const index = categories.findIndex(
    (c) => Number(c.id) === numericId || Number(c.cod) === numericId,
  )

  if (index === -1) return null

  const current = categories[index]

  let parentId = current.parentId
  if (Object.prototype.hasOwnProperty.call(updates, 'parentId')) {
    parentId =
      updates.parentId !== undefined &&
      updates.parentId !== null &&
      updates.parentId !== ''
        ? Number(updates.parentId)
        : null
  }

  const updated = {
    ...current,
    name: updates.name ?? current.name,
    description: updates.description ?? current.description,
    parentId,
    updatedAt: new Date().toISOString(),
  }

  categories[index] = updated
  await saveCategories(categories)
  return updated
}

async function deleteCategory(id) {
  const categories = await getCategories()
  const numericId = Number(id)

  // remove a categoria e todas as subcategorias com parentId = id
  const remaining = categories.filter(
    (c) =>
      Number(c.id) !== numericId &&
      Number(c.cod) !== numericId &&
      Number(c.parentId || 0) !== numericId,
  )

  if (remaining.length === categories.length) return false

  await saveCategories(remaining)
  return true
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
}
