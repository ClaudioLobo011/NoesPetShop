// src/context/CartContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { API_URL } from '../config/apiConfig'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  // ------------------ ITENS DO CARRINHO ------------------
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('noes_cart_items')
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('noes_cart_items', JSON.stringify(items))
    } catch (err) {
      console.error('Erro ao salvar carrinho no localStorage:', err)
    }
  }, [items])

  function addToCart(product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    setIsCartOpen(true)
  }

  function removeFromCart(productId) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity } : i,
        )
        .filter((i) => i.quantity > 0),
    )
  }

  function clearCart() {
    setItems([])
  }

  function openCart() {
    setIsCartOpen(true)
  }

  function closeCart() {
    setIsCartOpen(false)
  }

  function toggleCart() {
    setIsCartOpen((prev) => !prev)
  }

  // ------------------ PROMOÇÕES ------------------
  const [promotions, setPromotions] = useState([])
  const [loadingPromotions, setLoadingPromotions] = useState(true)

  useEffect(() => {
    async function fetchPromotions() {
      setLoadingPromotions(true)
      try {
        const res = await fetch(`${API_URL}/api/promotions`)
        if (!res.ok) throw new Error('Erro ao buscar promoções')
        const data = await res.json()
        setPromotions(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erro ao carregar promoções:', err)
      } finally {
        setLoadingPromotions(false)
      }
    }
    fetchPromotions()
  }, [])

  // ------------------ CÁLCULO POR ITEM ------------------

  function computeItemTotalWithPromotion(
    quantity,
    unitPrice,
    baseTotal,
    promo,
  ) {
    if (!promo || !promo.type) {
      return { finalTotal: baseTotal }
    }

    switch (promo.type) {
      case 'percentage': {
        const percent = Number(promo.percent)
        if (!percent) return { finalTotal: baseTotal }
        const finalTotal = baseTotal * (1 - percent / 100)
        return { finalTotal }
      }

      case 'takepay': {
        const takeQty = Number(promo.takeQty)
        const payQty = Number(promo.payQty)
        if (!takeQty || !payQty) return { finalTotal: baseTotal }

        const groups = Math.floor(quantity / takeQty)
        const remaining = quantity % takeQty
        const chargeableUnits = groups * payQty + remaining
        const finalTotal = chargeableUnits * unitPrice
        return { finalTotal }
      }

      case 'above': {
        const minQty = Number(promo.minQty)
        const percent = Number(promo.percent)
        if (!minQty || !percent || quantity < minQty) {
          return { finalTotal: baseTotal }
        }
        const finalTotal = baseTotal * (1 - percent / 100)
        return { finalTotal }
      }

      default:
        return { finalTotal: baseTotal }
    }
  }

  function applyBestPromotionToItem(item, allPromotions) {
    const productId = item.product.id
    const quantity = item.quantity
    const unitPrice = Number(item.product.price) || 0
    const baseTotal = unitPrice * quantity

    const activePromos = allPromotions.filter(
      (p) => p.active !== false && p.productId === productId,
    )

    if (!activePromos.length) {
      return {
        ...item,
        pricing: {
          baseTotal,
          finalTotal: baseTotal,
          discount: 0,
          appliedPromotion: null,
        },
      }
    }

    let bestFinal = baseTotal
    let bestPromo = null

    for (const promo of activePromos) {
      const { finalTotal } = computeItemTotalWithPromotion(
        quantity,
        unitPrice,
        baseTotal,
        promo,
      )

      if (finalTotal < bestFinal - 0.0001) {
        bestFinal = finalTotal
        bestPromo = promo
      }
    }

    const discount = baseTotal - bestFinal

    return {
      ...item,
      pricing: {
        baseTotal,
        finalTotal: bestFinal,
        discount,
        appliedPromotion: bestPromo,
      },
    }
  }

  // ------------------ ITENS + TOTAIS COM PROMOÇÃO ------------------

  const cartItemsWithPromotions = useMemo(() => {
    if (!items.length) return []
    return items.map((item) =>
      applyBestPromotionToItem(item, promotions),
    )
  }, [items, promotions])

  const totals = useMemo(() => {
    let baseSubtotal = 0
    let discountTotal = 0
    let total = 0

    for (const item of cartItemsWithPromotions) {
      baseSubtotal += item.pricing.baseTotal
      discountTotal += item.pricing.discount
      total += item.pricing.finalTotal
    }

    return { baseSubtotal, discountTotal, total }
  }, [cartItemsWithPromotions])

  // ------------------ CONTEXTO EXPOSTO ------------------

  const value = {
    // carrinho
    items,
    isCartOpen,
    openCart,
    closeCart,
    toggleCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,

    // promoções
    promotions,
    loadingPromotions,

    // carrinho calculado
    cartItemsWithPromotions,
    totals,

    // compat com código antigo (useCart().total)
    total: totals.total,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart deve ser usado dentro de um CartProvider')
  }
  return ctx
}
