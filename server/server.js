const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const multer = require('multer')
const fs = require('fs').promises
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')
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
const productImageBaseUrl = r2PublicBaseUrl || `${CLIENT_URL}/product-image`

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

function getImageExtension(mimetype, originalname = '') {
  const mimeToExt = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
  }

  if (mimetype && mimeToExt[mimetype]) {
    return mimeToExt[mimetype]
  }

  const extFromName = path.extname(originalname || '').replace(/^\./, '')
  if (extFromName) return extFromName.toLowerCase()

  return 'png'
}

function getProductImageKey(codBarras, extension = 'png') {
  const cleanCode = String(codBarras ?? '')
    .trim()
    .replace(/\s+/g, '')

  return `products/${cleanCode}.${extension}`
}

function sendPlaceholder(res) {
  res.type('image/svg+xml')
  return res.send(placeholderSvg)
}

function attachProductImage(product) {
  if (!product) return product

  const hasCodBarras = product.codBarras !== undefined && product.codBarras !== null
  const imageUrl =
    product.imageUrl || (hasCodBarras ? `${productImageBaseUrl}/${product.codBarras}` : null)

  return imageUrl ? { ...product, imageUrl } : product
}

function normalizeNumber(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value

  const parsed = Number(String(value).replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function pickField(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key]
    }
  }
  return ''
}

async function parseXlsxWithPython(buffer) {
  const tmpPath = path.join(
    os.tmpdir(),
    `import-${Date.now()}-${Math.random().toString(16).slice(2)}.xlsx`,
  )

  await fs.writeFile(tmpPath, buffer)

  const pythonCode = `
import sys, json, zipfile, re
from xml.etree import ElementTree as ET

path = sys.argv[1]

try:
    zf = zipfile.ZipFile(path)
except Exception as exc:
    sys.stderr.write(str(exc))
    sys.exit(1)

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
shared = []

if "xl/sharedStrings.xml" in zf.namelist():
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    for si in root.findall(f".//{NS}si"):
        texts = [(t.text or "") for t in si.findall(f".//{NS}t")]
        shared.append("".join(texts))

sheet_name = None
for name in zf.namelist():
    if name.startswith("xl/worksheets/sheet"):
        sheet_name = name
        break

if not sheet_name:
    print("[]")
    sys.exit(0)

sheet_root = ET.fromstring(zf.read(sheet_name))
rows_output = []

for row in sheet_root.findall(f".//{NS}row"):
    row_data = {}
    for c in row.findall(f"{NS}c"):
        ref = c.attrib.get("r", "")
        col_match = re.match(r"([A-Z]+)", ref)
        col = col_match.group(1) if col_match else ""
        cell_type = c.attrib.get("t")
        value = ""

        if cell_type == "inlineStr":
            t_elem = c.find(f"{NS}is/{NS}t")
            if t_elem is not None and t_elem.text is not None:
                value = t_elem.text

        v_elem = c.find(f"{NS}v")
        if value == "" and v_elem is not None and v_elem.text is not None:
            if cell_type == "s":
                try:
                    idx = int(v_elem.text)
                    value = shared[idx] if idx < len(shared) else ""
                except Exception:
                    value = ""
            else:
                value = v_elem.text

        if value == "" and cell_type is None:
            f_elem = c.find(f"{NS}f")
            if f_elem is not None and f_elem.text:
                value = f_elem.text

        if col:
            row_data[col] = value

    if row_data:
        rows_output.append(row_data)

print(json.dumps(rows_output))
`

  const result = spawnSync('python3', ['-c', pythonCode, tmpPath], {
    encoding: 'utf8',
  })

  await fs.unlink(tmpPath).catch(() => {})

  if (result.status !== 0) {
    const stderr = result.stderr?.trim()
    throw new Error(stderr || 'Falha ao ler a planilha Excel.')
  }

  try {
    return JSON.parse(result.stdout || '[]')
  } catch (err) {
    throw new Error('Não foi possível converter a planilha para JSON.')
  }
}

function parseCsvContent(buffer) {
  const content = buffer.toString('utf8')
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter = lines[0].includes(';') ? ';' : ','

  return lines.map((line) => {
    const values = line
      .split(delimiter)
      .map((part) => part.replace(/^"|"$/g, '').trim())

    const row = {}
    values.forEach((value, idx) => {
      row[String.fromCharCode(65 + idx)] = value
    })
    return row
  })
}

async function parseImportFile(file) {
  if (!file || !file.buffer) return []

  const mimetype = file.mimetype || ''
  if (mimetype.includes('csv') || mimetype.includes('text/plain')) {
    return parseCsvContent(file.buffer)
  }

  return parseXlsxWithPython(file.buffer)
}

function convertRowsToObjects(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('A planilha não possui dados para importar.')
  }

  const headerRow = rawRows[0]
  const headerMap = {}

  Object.entries(headerRow).forEach(([col, value]) => {
    const header = normalizeText(value)
    if (header) headerMap[col] = header
  })

  if (Object.keys(headerMap).length === 0) {
    throw new Error('Não foi possível identificar o cabeçalho da planilha.')
  }

  const dataRows = rawRows.slice(1)

  return dataRows
    .map((row) => {
      const obj = {}
      Object.entries(row).forEach(([col, value]) => {
        const header = headerMap[col]
        if (header) obj[header] = value
      })
      return obj
    })
    .filter((row) => Object.keys(row).length > 0)
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
const { connectToDatabase } = require('./db')

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

const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ]

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error('Envie uma planilha Excel (.xlsx/.xls) ou arquivo CSV.'),
      )
    }

    cb(null, true)
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

connectToDatabase()
  .then(() => {
    console.log('Conectado ao MongoDB.')
  })
  .catch((err) => {
    console.error('Falha ao conectar ao MongoDB:', err)
    process.exit(1)
  })

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
    const { featured } = req.query
    const featuredOnly = typeof featured === 'string' && ['true', '1'].includes(featured)

    const products = await getProducts({ featuredOnly })
    const productsWithImages = products.map(attachProductImage)
    return res.json(productsWithImages)
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

    return res.status(201).json(attachProductImage(newProduct))
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

    return res.json(attachProductImage(updated))
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

app.post(
  '/api/products/import',
  authMiddleware,
  excelUpload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Envie o arquivo da planilha.' })
    }

    try {
      const rawRows = await parseImportFile(req.file)
      const parsedRows = convertRowsToObjects(rawRows)

      if (!parsedRows.length) {
        return res
          .status(400)
          .json({ message: 'Nenhuma linha de dados foi encontrada.' })
      }

      const products = await getProducts()
      const categories = await getCategories()

      const createdCategories = new Set()
      const createdSubcategories = new Set()
      const createdProducts = []
      const updatedProducts = []
      const errors = []
      const seenBarcodes = new Map()

      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i]
        const rowNumber = i + 2 // +1 cabeçalho, +1 índice zero

        const name = normalizeText(
          pickField(row, [
            'Descrição',
            'Descricao',
            'DESCRIÇÃO',
            'Produto',
            'Nome',
          ]),
        )

        const salePrice = normalizeNumber(
          pickField(row, [
            'Preço de Venda',
            'Preco de Venda',
            'PREÇO DE VENDA',
            'Preco Venda',
            'Preço',
            'Valor',
          ]),
        )

        const costPrice = normalizeNumber(
          pickField(row, ['Preço de Custo', 'Preco de Custo', 'PREÇO DE CUSTO']),
        )

        const codBarras = normalizeText(
          pickField(row, [
            'CodBarras',
            'CODBARRAS',
            'Código de Barras',
            'Cod Barras',
            'codigo de barras',
          ]),
        )

        const categoryName = normalizeText(
          pickField(row, ['Categoria', 'CATEGORIA']),
        )

        const subcategoryName = normalizeText(
          pickField(row, ['SubCategoria', 'Subcategoria', 'SUBCATEGORIA']),
        )

        const featuredRaw = normalizeText(pickField(row, ['Destaque', 'DESTAQUE']))
        const featured =
          featuredRaw === ''
            ? null
            : ['sim', 's', 'true', '1', 'yes'].includes(
                featuredRaw.toLowerCase(),
              )

        if (!name || salePrice === null) {
          errors.push({
            row: rowNumber,
            mensagem: 'Descrição e Preço de Venda são obrigatórios.',
          })
          continue
        }

        if (subcategoryName && !categoryName) {
          errors.push({
            row: rowNumber,
            mensagem:
              'Informe a Categoria para vincular a SubCategoria informada.',
          })
          continue
        }

        let resolvedCategory = categoryName
        let resolvedCategoryId = null

        if (categoryName) {
          const existingCategory = categories.find(
            (c) =>
              (c.name || '').toLowerCase() === categoryName.toLowerCase() &&
              (c.parentId === null || c.parentId === undefined),
          )

          if (existingCategory) {
            resolvedCategory = existingCategory.name
            const existingCategoryId = Number(
              existingCategory.id || existingCategory.cod,
            )
            resolvedCategoryId = Number.isFinite(existingCategoryId)
              ? existingCategoryId
              : null
          } else {
            const newCategory = await addCategory({
              name: categoryName,
              description: '',
              parentId: null,
            })
            categories.push(newCategory)
            createdCategories.add(newCategory.name)
            resolvedCategory = newCategory.name
            const newCategoryId = Number(newCategory.id || newCategory.cod)
            resolvedCategoryId = Number.isFinite(newCategoryId)
              ? newCategoryId
              : null
          }
        }

        let resolvedSubcategory = ''

        if (subcategoryName) {
          const existingSubcategory = categories.find((c) => {
            const parentId = (() => {
              const parsed = Number(c.parentId)
              return Number.isFinite(parsed) ? parsed : null
            })()
            return (
              (c.name || '').toLowerCase() === subcategoryName.toLowerCase() &&
              parentId !== null &&
              resolvedCategoryId !== null &&
              parentId === resolvedCategoryId
            )
          })

          if (existingSubcategory) {
            resolvedSubcategory = existingSubcategory.name
          } else {
            if (!Number.isFinite(resolvedCategoryId)) {
              errors.push({
                row: rowNumber,
                mensagem:
                  'Não foi possível vincular a SubCategoria à Categoria informada.',
              })
              continue
            }

            const newSubcategory = await addCategory({
              name: subcategoryName,
              description: '',
              parentId: resolvedCategoryId,
            })
            categories.push(newSubcategory)
            createdSubcategories.add(newSubcategory.name)
            resolvedSubcategory = newSubcategory.name
          }
        }

        const existingProduct = products.find((p) => {
          if (codBarras) {
            return String(p.codBarras || '').trim() === codBarras
          }
          return (p.name || '').toLowerCase() === name.toLowerCase()
        })

        if (codBarras) {
          const seenRow = seenBarcodes.get(codBarras)
          if (seenRow) {
            errors.push({
              row: rowNumber,
              mensagem: `Código de barras repetido (já informado na linha ${seenRow}).`,
            })
            continue
          }
          seenBarcodes.set(codBarras, rowNumber)
        }

        const descriptionDetailed = normalizeText(
          pickField(row, ['Descrição Detalhada', 'Descricao Detalhada']),
        )

        const payload = {
          name,
          description: descriptionDetailed || name,
          price: salePrice,
          category: resolvedCategory,
          subcategory: resolvedSubcategory,
          featured:
            featured !== null
              ? featured
              : existingProduct?.featured ?? false,
          codBarras,
          costPrice,
        }

        try {
          if (existingProduct) {
            const updated = await updateProduct(existingProduct.id, payload)
            if (!updated) {
              errors.push({
                row: rowNumber,
                mensagem: 'Não foi possível atualizar o produto existente.',
              })
            } else {
              updatedProducts.push(updated)
            }
          } else {
            const created = await addProduct(payload)
            createdProducts.push(created)
            products.push(created)
          }
        } catch (err) {
          errors.push({
            row: rowNumber,
            mensagem: err.message || 'Falha ao salvar o produto.',
          })
        }
      }

        return res.json({
          message: 'Importação concluída.',
          totalLinhas: parsedRows.length,
          produtosCriados: createdProducts.length,
          produtosAtualizados: updatedProducts.length,
          categoriasCriadas: Array.from(createdCategories),
          subcategoriasCriadas: Array.from(createdSubcategories),
          erros: errors,
        })
    } catch (err) {
      console.error('Erro ao importar planilha:', err)
      return res
        .status(400)
        .json({ message: err.message || 'Não foi possível importar a planilha.' })
    }
  },
)

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

    const imageExtension = getImageExtension(
      req.file.mimetype,
      req.file.originalname,
    )
    const imageKey = getProductImageKey(codBarras, imageExtension)

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: imageKey,
          Body: req.file.buffer,
          ContentType:
            req.file.mimetype ||
            `image/${imageExtension === 'jpg' ? 'jpeg' : imageExtension}` ||
            'image/png',
        }),
      )

      const imageUrl = r2PublicBaseUrl
        ? `${r2PublicBaseUrl}/${imageKey}`
        : `${CLIENT_URL}/product-image/${codBarras}`

      const updated = await updateProduct(id, { imageUrl })
      if (!updated) {
        return res.status(404).json({ message: 'Produto não encontrado.' })
      }

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

  if (!codBarras) {
    return sendPlaceholder(res)
  }

  if (!r2Configured || !r2Client) {
    return sendPlaceholder(res)
  }

  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif']

  for (const ext of imageExtensions) {
    const imageKey = getProductImageKey(codBarras, ext)

    try {
      const response = await r2Client.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: imageKey }),
      )

      if (!response || !response.Body) {
        continue
      }

      res.setHeader(
        'Content-Type',
        response.ContentType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      )
      response.Body.pipe(res)
      response.Body.on('error', (streamErr) => {
        console.error('Erro ao transmitir imagem do R2:', streamErr)
        if (!res.headersSent) {
          sendPlaceholder(res)
        }
      })
      return
    } catch (err) {
      if (err?.Code === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
        continue
      }

      console.error('Erro ao buscar imagem no Cloudflare R2:', err)
      break
    }
  }

  return sendPlaceholder(res)
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
