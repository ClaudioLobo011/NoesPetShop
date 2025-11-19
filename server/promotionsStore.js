const fs = require('fs').promises
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const PROMOTIONS_FILE = path.join(DATA_DIR, 'promotions.json')

async function ensureFile() {
  try {
    await fs.access(PROMOTIONS_FILE)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(PROMOTIONS_FILE, '[]', 'utf8')
  }
}

async function getPromotions() {
  await ensureFile()
  const data = await fs.readFile(PROMOTIONS_FILE, 'utf8')
  try {
    const parsed = JSON.parse(data)
    return Array.isArray(parsed)
      ? parsed.map((p) => ({
          ...p,
          productId:
            p.productId !== undefined && p.productId !== null
              ? Number(p.productId)
              : null,
        }))
      : []
  } catch {
    return []
  }
}

async function savePromotions(promotions) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(
    PROMOTIONS_FILE,
    JSON.stringify(promotions, null, 2),
    'utf8',
  )
}

async function addPromotion(promo) {
  const promotions = await getPromotions()

  const nextCod =
    promotions.length > 0
      ? Math.max(
          ...promotions.map((p) => Number(p.cod || p.id) || 0),
        ) + 1
      : 1

  const newPromotion = {
    id: nextCod,
    cod: nextCod,
    productId: Number(promo.productId),
    type: promo.type, // 'percentage' | 'takepay' | 'above'
    percent:
      promo.percent !== undefined && promo.percent !== null
        ? Number(promo.percent)
        : null,
    takeQty:
      promo.takeQty !== undefined && promo.takeQty !== null
        ? Number(promo.takeQty)
        : null,
    payQty:
      promo.payQty !== undefined && promo.payQty !== null
        ? Number(promo.payQty)
        : null,
    minQty:
      promo.minQty !== undefined && promo.minQty !== null
        ? Number(promo.minQty)
        : null,
    active: promo.active !== false,
    createdAt: new Date().toISOString(),
  }

  promotions.push(newPromotion)
  await savePromotions(promotions)
  return newPromotion
}

async function updatePromotion(id, updates) {
  const promotions = await getPromotions()
  const numericId = Number(id)

  const index = promotions.findIndex(
    (p) => Number(p.id) === numericId || Number(p.cod) === numericId,
  )

  if (index === -1) return null

  const current = promotions[index]

  const updated = {
    ...current,
    productId:
      updates.productId !== undefined && updates.productId !== null
        ? Number(updates.productId)
        : current.productId,
    type: updates.type ?? current.type,
    percent:
      updates.percent !== undefined && updates.percent !== null
        ? Number(updates.percent)
        : current.percent,
    takeQty:
      updates.takeQty !== undefined && updates.takeQty !== null
        ? Number(updates.takeQty)
        : current.takeQty,
    payQty:
      updates.payQty !== undefined && updates.payQty !== null
        ? Number(updates.payQty)
        : current.payQty,
    minQty:
      updates.minQty !== undefined && updates.minQty !== null
        ? Number(updates.minQty)
        : current.minQty,
    active:
      typeof updates.active === 'boolean' ? updates.active : current.active,
    updatedAt: new Date().toISOString(),
  }

  promotions[index] = updated
  await savePromotions(promotions)
  return updated
}

async function deletePromotion(id) {
  const promotions = await getPromotions()
  const numericId = Number(id)

  const remaining = promotions.filter(
    (p) => Number(p.id) !== numericId && Number(p.cod) !== numericId,
  )

  if (remaining.length === promotions.length) return false

  await savePromotions(remaining)
  return true
}

module.exports = {
  getPromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
}
