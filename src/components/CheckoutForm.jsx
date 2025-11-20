import React, { useEffect, useRef, useState } from 'react'
import IMask from 'imask'
import { useCart } from '../context/CartContext'
import { STORE_WHATSAPP_NUMBER } from '../config/whatsappConfig'

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function describePromotionShort(promo) {
  if (!promo) return ''
  switch (promo.type) {
    case 'percentage':
      return `${promo.percent}% de desconto`
    case 'takepay':
      return `Leve ${promo.takeQty} e pague ${promo.payQty}`
    case 'above':
      return `Acima de ${promo.minQty} un., ${promo.percent}% off`
    default:
      return 'Promoção'
  }
}

function CheckoutForm({ onClose }) {
  const { cartItemsWithPromotions, totals, clearCart } = useCart()

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
  })

  const cpfRef = useRef(null)
  const phoneRef = useRef(null)
  const cepRef = useRef(null)
  const numberRef = useRef(null)

  useEffect(() => {
    if (cpfRef.current) {
      IMask(cpfRef.current, { mask: '000.000.000-00' })
    }
    if (phoneRef.current) {
      IMask(phoneRef.current, { mask: '(00) 00000-0000' })
    }
    if (cepRef.current) {
      IMask(cepRef.current, { mask: '00000-000' })
    }
    if (numberRef.current) {
      IMask(numberRef.current, { mask: Number })
    }
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    const items = cartItemsWithPromotions || []

    if (!items.length) {
      alert('Seu carrinho está vazio.')
      return
    }

    if (!form.name || !form.cpf || !form.phone || !form.cep || !form.street) {
      alert('Preencha pelo menos nome, CPF, telefone, CEP e rua.')
      return
    }

    const productsText = items
      .map((item) => {
        const product = item.product || item
        const quantity = item.quantity || 1
        const unitPrice = Number(product.price) || 0
        const lineTotal =
          item.pricing && typeof item.pricing.finalTotal === 'number'
            ? item.pricing.finalTotal
            : unitPrice * quantity

        const promoText =
          item.pricing && item.pricing.appliedPromotion
            ? ` (${describePromotionShort(item.pricing.appliedPromotion)})`
            : ''

        return `- ${quantity}x ${product.name} = ${formatCurrency(
          lineTotal,
        )}${promoText}`
      })
      .join('\n')

    const totalValue =
      totals && typeof totals.total === 'number' ? totals.total : 0
    const totalText = formatCurrency(totalValue)

    const message = `
Noe's PetShop - Novo pedido

Produtos:
${productsText}

Total: ${totalText}

Dados do cliente:
Nome: ${form.name}
CPF: ${form.cpf}
Telefone: ${form.phone}
E-mail: ${form.email}

Endereço:
CEP: ${form.cep}
Rua: ${form.street}, Nº: ${form.number}
Complemento: ${form.complement}
Bairro: ${form.neighborhood}
Cidade: ${form.city} - ${form.state}

Observações:
${form.notes || '-'}
`

    const phone = STORE_WHATSAPP_NUMBER
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')

    clearCart()
    if (onClose) onClose()
  }

  return (
    <div className="checkout-modal">
      <div className="checkout-content">
        <div className="checkout-header">
          <h3>Dados para finalização</h3>
          <button type="button" className="link-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              Nome completo*
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-row two-columns">
            <label>
              CPF*
              <input
                type="text"
                name="cpf"
                ref={cpfRef}
                value={form.cpf}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Telefone/WhatsApp*
              <input
                type="text"
                name="phone"
                ref={phoneRef}
                value={form.phone}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              E-mail
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="form-row two-columns">
            <label>
              CEP*
              <input
                type="text"
                name="cep"
                ref={cepRef}
                value={form.cep}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Número*
              <input
                type="text"
                name="number"
                ref={numberRef}
                value={form.number}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Rua*
              <input
                type="text"
                name="street"
                value={form.street}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-row two-columns">
            <label>
              Bairro
              <input
                type="text"
                name="neighborhood"
                value={form.neighborhood}
                onChange={handleChange}
              />
            </label>
            <label>
              Cidade
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="form-row two-columns">
            <label>
              Estado (UF)
              <input
                type="text"
                name="state"
                maxLength={2}
                value={form.state}
                onChange={handleChange}
              />
            </label>
            <label>
              Complemento
              <input
                type="text"
                name="complement"
                value={form.complement}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Observações
              <textarea
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="form-row form-actions">
            <button type="button" className="link-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              Enviar pedido pelo WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CheckoutForm
