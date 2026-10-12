const mongoose = require('mongoose')
let connectionPromise

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required')
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (!connectionPromise) connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'morrow',
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 5,
  }).catch((error) => {
    connectionPromise = undefined
    throw error
  })
  return connectionPromise
}

module.exports = connectDatabase
