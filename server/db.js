const { MongoClient } = require('mongodb')

let client
let database
let warnedEnv = false

function getMongoUri() {
  const uri = process.env.MONGODB_URI
  if (uri) return uri

  const fallback = 'mongodb://127.0.0.1:27017'

  if (!warnedEnv) {
    console.warn(
      'Variável MONGODB_URI não configurada; usando fallback local. ' +
        'Defina MONGODB_URI no .env para evitar falhas em produção.',
    )
    warnedEnv = true
  }

  return fallback
}

function getDbName() {
  return process.env.MONGODB_DB_NAME || 'noes-petshop'
}

async function connectToDatabase() {
  if (database) return database

  const uri = getMongoUri()

  client = new MongoClient(uri, {
    ignoreUndefined: true,
  })

  await client.connect()
  database = client.db(getDbName())
  return database
}

async function getCollection(name) {
  const db = await connectToDatabase()
  return db.collection(name)
}

module.exports = {
  connectToDatabase,
  getCollection,
}
