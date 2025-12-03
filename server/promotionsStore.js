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

async function getPromotions() {
  const collection = await getCollection('promotions')
  const promotions = await collection.find().sort({ cod: 1 }).toArray()

  return promotions.map((p) =>
    serialize({
      ...p,
      productId:
        p.productId !== undefined && p.productId !== null
          ? Number(p.productId)
          : null,
    }),
  )
}

async function addPromotion(promo) {
  const collection = await getCollection('promotions')
  const nextCod = await getNextCod(collection)

  const newPromotion = {
    id: nextCod,
    cod: nextCod,
    productId: Number(promo.productId),
    type: promo.type,
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

  await collection.insertOne(newPromotion)
  return serialize(newPromotion)
}

async function updatePromotion(id, updates) {
  const collection = await getCollection('promotions')
  const numericId = Number(id)

  const updateData = {
    ...(updates.productId !== undefined && updates.productId !== null
      ? { productId: Number(updates.productId) }
      : {}),
    ...(updates.type !== undefined ? { type: updates.type } : {}),
    ...(updates.percent !== undefined && updates.percent !== null
      ? { percent: Number(updates.percent) }
      : {}),
    ...(updates.takeQty !== undefined && updates.takeQty !== null
      ? { takeQty: Number(updates.takeQty) }
      : {}),
    ...(updates.payQty !== undefined && updates.payQty !== null
      ? { payQty: Number(updates.payQty) }
      : {}),
    ...(updates.minQty !== undefined && updates.minQty !== null
      ? { minQty: Number(updates.minQty) }
      : {}),
    ...(typeof updates.active === 'boolean' ? { active: updates.active } : {}),
    updatedAt: new Date().toISOString(),
  }

  const result = await collection.findOneAndUpdate(
    { $or: [{ id: numericId }, { cod: numericId }] },
    { $set: updateData },
    { returnDocument: 'after' },
  )

  return serialize(result.value)
}

async function deletePromotion(id) {
  const collection = await getCollection('promotions')
  const numericId = Number(id)

  const result = await collection.deleteOne({
    $or: [{ id: numericId }, { cod: numericId }],
  })

  return result.deletedCount > 0
}

module.exports = {
  getPromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
}
