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
    return Array.isArray(parsed) ? parsed : []
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
      ? Math.max(
          ...categories.map((c) => Number(c.cod || c.id) || 0),
        ) + 1
      : 1

  const newCategory = {
    id: nextCod,
    cod: nextCod,
    name: category.name,
    description: category.description || '',
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

  const updated = {
    ...current,
    name: updates.name ?? current.name,
    description: updates.description ?? current.description,
    updatedAt: new Date().toISOString(),
  }

  categories[index] = updated
  await saveCategories(categories)
  return updated
}

async function deleteCategory(id) {
  const categories = await getCategories()
  const numericId = Number(id)

  const index = categories.findIndex(
    (c) => Number(c.id) === numericId || Number(c.cod) === numericId,
  )

  if (index === -1) return false

  categories.splice(index, 1)
  await saveCategories(categories)
  return true
}

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
}
