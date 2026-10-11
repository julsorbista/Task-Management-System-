const express = require('express')
const authenticate = require('../middleware/authenticate')
const { getDashboard } = require('../controllers/dashboardController')

const router = express.Router()
router.get('/', authenticate, getDashboard)

module.exports = router
