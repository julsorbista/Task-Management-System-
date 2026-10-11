const express = require('express')
const authenticate = require('../middleware/authenticate')
const { exportTasks } = require('../controllers/exportController')

const router = express.Router()

router.get('/', authenticate, exportTasks)

module.exports = router
