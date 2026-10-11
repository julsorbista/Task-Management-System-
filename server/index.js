const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })
const express = require('express')
const cookieParser = require('cookie-parser')
const connectDatabase = require('./config/db')

const app = express()
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Server is running')
})

async function startServer() {
  try {
    await connectDatabase()
    console.log('MongoDB connected')
    const port = process.env.PORT || 3000
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`)
    })
  } catch (error) {
    // Do not print connection strings or credentials from driver errors.
    console.error(`Database connection failed (${error.name}). Check MONGODB_URI, credentials, and MongoDB network access.`)
    process.exitCode = 1
  }
}

startServer()
