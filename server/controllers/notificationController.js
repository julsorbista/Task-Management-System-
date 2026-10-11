
const mongoose = require('mongoose')
const Notification = require('../models/Notification')

async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
    }).sort({ createdAt: -1 })

    res.status(200).json({
      notifications,
    })
  } catch (error) {
    next(error)
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.notificationId)) {
      return res.status(400).json({
        message: 'Invalid notification ID.',
      })
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        user: req.user.id,
      },
      {
        $set: { isRead: true },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found.',
      })
    }

    res.status(200).json({
      message: 'Notification marked as read.',
      notification,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
}
