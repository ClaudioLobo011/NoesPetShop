const { MongoClient } = require('mongodb')

const { MONGODB_URI, MONGODB_DB_NAME } = process.env

let client
let database

async function connectToDatabase() {
  if (database) return database

  if (!MONGODB_URI) {
    throw new Error('Variável MONGODB_URI não configurada.')
  }

  client = new MongoClient(MONGODB_URI, {
    ignoreUndefined: true,
  })

  await client.connect()
  database = client.db(MONGODB_DB_NAME || 'noes-petshop')
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
