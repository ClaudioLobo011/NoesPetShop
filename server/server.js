const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const multer = require('multer')
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3')

const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Imagem de produto não disponível"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#f3f4f6"/><stop offset="100%" stop-color="#e5e7eb"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="80" r="34" fill="#d1d5db"/><rect x="40" y="126" width="120" height="36" rx="8" fill="#d1d5db"/><path d="M70 134c8-10 16-16 30-16s22 6 30 16" stroke="#9ca3af" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`

dotenv.config()

const { validateAdmin, signAdminToken, authMiddleware } = require('./auth')

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
  R2_REGION,
} = process.env

const r2Configured =
  Boolean(R2_ACCESS_KEY_ID) &&
  Boolean(R2_SECRET_ACCESS_KEY) &&
  Boolean(R2_ACCOUNT_ID) &&
  Boolean(R2_BUCKET) &&
  Boolean(R2_REGION)

const r2PublicBaseUrl = R2_PUBLIC_BASE_URL?.replace(/\/+$/, '') || ''

const r2Client =
  r2Configured
    ? new S3Client({
        region: R2_REGION,
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null

function getProductImageKey(codBarras) {
  return `products/${codBarras}.png`
}

function sendPlaceholder(res) {
  res.type('image/svg+xml')
  return res.send(placeholderSvg)
}

const app = express()
const PORT = process.env.PORT || 4000
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173')
  .trim()
  .replace(/\/+$/, '')
const {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = require('./productsStore')
const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} = require('./categoriesStore')
const {
  getPromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
} = require('./promotionsStore')

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'image/png') {
      return cb(new Error('A imagem deve ser PNG.'))
    }
    cb(null, true)
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// LOGIN ADMIN
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Informe e-mail e senha.' })
  }

  try {
    const valid = await validateAdmin(email, password)
    if (!valid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    const token = signAdminToken({ email })

    const isProduction = process.env.NODE_ENV === 'production'

    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000,
    })

    return res.json({ message: 'Login realizado com sucesso.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro ao efetuar login.' })
  }
})

// LOGOUT
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token')
  return res.json({ message: 'Logout efetuado.' })
})

// CHECAR SE ESTÁ LOGADO
app.get('/api/admin/me', authMiddleware, (req, res) => {
  return res.json({ email: req.admin.email })
})

// LISTAR PRODUTOS (público)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts()
    return res.json(products)
  } catch (err) {
    console.error('Erro ao listar produtos:', err)
    return res.status(500).json({ message: 'Erro ao listar produtos.' })
  }
})

// CRIAR PRODUTO (somente admin)
app.post('/api/products', authMiddleware, async (req, res) => {
  const { name, description, price, category, subcategory, featured, codBarras } =
    req.body

  if (!name || price === undefined || price === null) {
    return res
      .status(400)
      .json({ message: 'Nome e preço são obrigatórios.' })
  }

  try {
    const newProduct = await addProduct({
      name,
      description,
      price,
      category,
      subcategory,
      featured,
      codBarras,
    })

    return res.status(201).json(newProduct)
  } catch (err) {
    console.error('Erro ao criar produto:', err)
    return res.status(500).json({ message: 'Erro ao criar produto.' })
  }
})

// ATUALIZAR PRODUTO (somente admin)
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { name, description, price, category, subcategory, featured, codBarras } =
    req.body

  try {
    const updated = await updateProduct(id, {
      name,
      description,
      price,
      category,
      subcategory,
      featured,
      codBarras,
    })

    if (!updated) {
      return res.status(404).json({ message: 'Produto não encontrado.' })
    }

    return res.json(updated)
  } catch (err) {
    console.error('Erro ao atualizar produto:', err)
    return res.status(500).json({ message: 'Erro ao atualizar produto.' })
  }
})

// EXCLUIR PRODUTO (somente admin)
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const removed = await deleteProduct(id)
    if (!removed) {
      return res.status(404).json({ message: 'Produto não encontrado.' })
    }

    return res.json({ message: 'Produto excluído com sucesso.' })
  } catch (err) {
    console.error('Erro ao excluir produto:', err)
    return res.status(500).json({ message: 'Erro ao excluir produto.' })
  }
})

// UPLOAD DE IMAGEM DO PRODUTO (somente admin)
app.post(
  '/api/products/:id/image',
  authMiddleware,
  upload.single('image'),
  async (req, res) => {
    const { id } = req.params
    const { codBarras } = req.body

    if (!codBarras) {
      return res
        .status(400)
        .json({ message: 'codBarras é obrigatório para upload da imagem.' })
    }

    // opcional: validar se o produto existe
    try {
      const products = await getProducts()
      const numericId = Number(id)
      const product = products.find(
        (p) => Number(p.id) === numericId || Number(p.cod) === numericId,
      )

      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado.' })
      }

      if (product.codBarras !== codBarras) {
        return res.status(400).json({
          message:
            'codBarras do formulário não confere com o codBarras do produto.',
        })
      }
    } catch (err) {
      console.error('Erro ao validar produto no upload de imagem:', err)
      return res.status(500).json({ message: 'Erro ao validar produto.' })
    }

    if (!r2Configured || !r2Client) {
      console.error('Upload falhou: credenciais do Cloudflare R2 não configuradas.')
      return res.status(500).json({
        message: 'Armazenamento de imagens não configurado. Verifique as variáveis R2.',
      })
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: 'Arquivo de imagem é obrigatório.',
      })
    }

    const imageKey = getProductImageKey(codBarras)

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: imageKey,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || 'image/png',
        }),
      )

      const imageUrl = r2PublicBaseUrl
        ? `${r2PublicBaseUrl}/${imageKey}`
        : `${CLIENT_URL}/product-image/${codBarras}`

      return res.json({
        message: 'Imagem enviada com sucesso.',
        imageUrl,
      })
    } catch (err) {
      console.error('Erro ao salvar imagem no Cloudflare R2:', err)
      return res
        .status(500)
        .json({ message: 'Erro ao salvar imagem no armazenamento.' })
    }
  },
)

// SERVIR IMAGEM DO PRODUTO POR CODBARRAS
app.get('/product-image/:codBarras', async (req, res) => {
  const { codBarras } = req.params

  if (!r2Configured || !r2Client) {
    return sendPlaceholder(res)
  }

  const imageKey = getProductImageKey(codBarras)

  try {
    const response = await r2Client.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: imageKey }),
    )

    if (!response || !response.Body) {
      return sendPlaceholder(res)
    }

    res.setHeader('Content-Type', response.ContentType || 'image/png')
    response.Body.pipe(res)
    response.Body.on('error', (streamErr) => {
      console.error('Erro ao transmitir imagem do R2:', streamErr)
      if (!res.headersSent) {
        sendPlaceholder(res)
      }
    })
  } catch (err) {
    console.error('Erro ao buscar imagem no Cloudflare R2:', err)
    return sendPlaceholder(res)
  }
})

// ================== CATEGORIAS (Categoria + Subcategoria) ==================

// LISTAR CATEGORIAS (público)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getCategories()
    return res.json(categories)
  } catch (err) {
    console.error('Erro ao listar categorias:', err)
    return res.status(500).json({ message: 'Erro ao listar categorias.' })
  }
})

// CRIAR CATEGORIA / SUBCATEGORIA (somente admin)
app.post('/api/categories', authMiddleware, async (req, res) => {
  const { name, description, parentId } = req.body

  if (!name) {
    return res.status(400).json({ message: 'Nome da categoria é obrigatório.' })
  }

  try {
    let parent = null
    let parsedParentId = null

    if (parentId !== undefined && parentId !== null && parentId !== '') {
      parsedParentId = Number(parentId)
      const categories = await getCategories()
      parent = categories.find(
        (c) =>
          Number(c.id) === parsedParentId || Number(c.cod) === parsedParentId,
      )
      if (!parent) {
        return res
          .status(400)
          .json({ message: 'Categoria pai não encontrada.' })
      }
    }

    const newCategory = await addCategory({
      name,
      description,
      parentId: parsedParentId,
    })

    return res.status(201).json(newCategory)
  } catch (err) {
    console.error('Erro ao criar categoria:', err)
    return res.status(500).json({ message: 'Erro ao criar categoria.' })
  }
})

// ATUALIZAR CATEGORIA / SUBCATEGORIA (somente admin)
app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { name, description, parentId } = req.body

  try {
    let parsedParentId = null
    if (parentId !== undefined && parentId !== null && parentId !== '') {
      parsedParentId = Number(parentId)
      const categories = await getCategories()
      const parent = categories.find(
        (c) =>
          Number(c.id) === parsedParentId || Number(c.cod) === parsedParentId,
      )
      if (!parent) {
        return res
          .status(400)
          .json({ message: 'Categoria pai não encontrada.' })
      }
    }

    const updated = await updateCategory(id, {
      name,
      description,
      parentId: parentId === '' ? null : parsedParentId,
    })

    if (!updated) {
      return res.status(404).json({ message: 'Categoria não encontrada.' })
    }

    return res.json(updated)
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err)
    return res.status(500).json({ message: 'Erro ao atualizar categoria.' })
  }
})

// EXCLUIR CATEGORIA (somente admin)
app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const removed = await deleteCategory(id)
    if (!removed) {
      return res.status(404).json({ message: 'Categoria não encontrada.' })
    }

    return res.json({ message: 'Categoria (e subcategorias) excluída.' })
  } catch (err) {
    console.error('Erro ao excluir categoria:', err)
    return res.status(500).json({ message: 'Erro ao excluir categoria.' })
  }
})

// ================== PROMOÇÕES ==================

// LISTAR PROMOÇÕES (público por enquanto)
app.get('/api/promotions', async (req, res) => {
  try {
    const promotions = await getPromotions()
    return res.json(promotions)
  } catch (err) {
    console.error('Erro ao listar promoções:', err)
    return res.status(500).json({ message: 'Erro ao listar promoções.' })
  }
})

// CRIAR PROMOÇÃO (somente admin)
app.post('/api/promotions', authMiddleware, async (req, res) => {
  const { productId, type, percent, takeQty, payQty, minQty, active } = req.body

  if (!productId || !type) {
    return res
      .status(400)
      .json({ message: 'Produto e tipo de promoção são obrigatórios.' })
  }

  const numericProductId = Number(productId)

  try {
    // valida se o produto existe
    const products = await getProducts()
    const product = products.find(
      (p) =>
        Number(p.id) === numericProductId || Number(p.cod) === numericProductId,
    )

    if (!product) {
      return res.status(400).json({ message: 'Produto não encontrado.' })
    }

    // validações por tipo
    if (type === 'percentage') {
      if (percent === undefined || percent === null || percent === '') {
        return res
          .status(400)
          .json({ message: 'Percentual de desconto é obrigatório.' })
      }
    }

    if (type === 'takepay') {
      if (!takeQty || !payQty) {
        return res.status(400).json({
          message: 'Quantidade de levar e pagar são obrigatórias.',
        })
      }
    }

    if (type === 'above') {
      if (!minQty || !percent) {
        return res.status(400).json({
          message:
            'Quantidade mínima e percentual de desconto são obrigatórios.',
        })
      }
    }

    const newPromotion = await addPromotion({
      productId: numericProductId,
      type,
      percent,
      takeQty,
      payQty,
      minQty,
      active,
    })

    return res.status(201).json(newPromotion)
  } catch (err) {
    console.error('Erro ao criar promoção:', err)
    return res.status(500).json({ message: 'Erro ao criar promoção.' })
  }
})

// ATUALIZAR PROMOÇÃO (somente admin)
app.put('/api/promotions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { productId, type, percent, takeQty, payQty, minQty, active } = req.body

  try {
    let numericProductId = null
    if (productId) {
      numericProductId = Number(productId)
      const products = await getProducts()
      const product = products.find(
        (p) =>
          Number(p.id) === numericProductId ||
          Number(p.cod) === numericProductId,
      )
      if (!product) {
        return res.status(400).json({ message: 'Produto não encontrado.' })
      }
    }

    const updated = await updatePromotion(id, {
      productId: numericProductId ?? undefined,
      type,
      percent,
      takeQty,
      payQty,
      minQty,
      active,
    })

    if (!updated) {
      return res.status(404).json({ message: 'Promoção não encontrada.' })
    }

    return res.json(updated)
  } catch (err) {
    console.error('Erro ao atualizar promoção:', err)
    return res.status(500).json({ message: 'Erro ao atualizar promoção.' })
  }
})

// EXCLUIR PROMOÇÃO (somente admin)
app.delete('/api/promotions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const removed = await deletePromotion(id)
    if (!removed) {
      return res.status(404).json({ message: 'Promoção não encontrada.' })
    }

    return res.json({ message: 'Promoção excluída com sucesso.' })
  } catch (err) {
    console.error('Erro ao excluir promoção:', err)
    return res.status(500).json({ message: 'Erro ao excluir promoção.' })
  }
})

// EXEMPLO DE ROTA PROTEGIDA
app.get('/api/admin/secret', authMiddleware, (req, res) => {
  return res.json({
    message: 'Você é admin e está vendo uma rota protegida.',
  })
})

app.listen(PORT, () => {
  console.log(`API Noe's PetShop rodando na porta ${PORT}`)
  console.log(`Frontend esperado em: ${CLIENT_URL}`)
})
