const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })
const express = require('express')
const cookieParser = require('cookie-parser')
const connectDatabase = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const profileRoutes = require('./routes/profileRoutes')

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Server is running')
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)

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
