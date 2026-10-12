const path = require('node:path')

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  quiet: true,
})

const express = require('express')
const cookieParser = require('cookie-parser')
const connectDatabase = require('./config/db')

const authRoutes = require('./routes/authRoutes')
const profileRoutes = require('./routes/profileRoutes')
const boardRoutes = require('./routes/boardRoutes')
const taskRoutes = require('./routes/taskRoutes')
const shareLinkRoutes = require('./routes/shareLinkRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const exportRoutes = require('./routes/exportRoutes')

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
app.use('/api/boards', boardRoutes)
app.use('/api/boards/:boardId/tasks', taskRoutes)
app.use('/api/boards/:boardId/share-links', shareLinkRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/export', exportRoutes)

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Invalid JSON body.',
    })
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Invalid data. Check the fields you submitted.',
    })
  }

  console.error('Request failed:', error.name)

  return res.status(500).json({
    message: 'Something went wrong. Please try again.',
  })
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
    console.error(
      `Database connection failed (${error.name}). Check MONGODB_URI, credentials, and MongoDB network access.`,
    )

    process.exitCode = 1
  }
}

startServer()