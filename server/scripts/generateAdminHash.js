const bcrypt = require('bcryptjs')

const password = process.argv[2]

if (!password) {
  console.error('Use: node scripts/generateAdminHash.js SUA_SENHA')
  process.exit(1)
}

bcrypt
  .hash(password, 10)
  .then((hash) => {
    console.log('Hash da senha:')
    console.log(hash)
  })
  .catch((err) => {
    console.error('Erro ao gerar hash:', err)
  })
