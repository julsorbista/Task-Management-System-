const mongoose = require('mongoose')

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required')
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'morrow',
    serverSelectionTimeoutMS: 10000,
  })
}

module.exports = connectDatabase