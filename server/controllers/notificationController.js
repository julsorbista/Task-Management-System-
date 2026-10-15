
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const repairLegacyNotifications = require('../utils/repairLegacyNotifications')
const { deliverTaskReminders } = require('../utils/taskReminders')

async function getNotifications(req, res, next) {
  try {
    await deliverTaskReminders(req.user.id)
    const notifications = await Notification.find({
      user: req.user.id,
    }).sort({ createdAt: -1 })
    await repairLegacyNotifications(notifications, req.user.id)

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

async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      {
        user: req.user.id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      },
      {
        runValidators: true,
      },
    )

    res.status(200).json({
      message: 'Notifications marked as read.',
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    next(error)
  }
}

async function clearReadNotifications(req, res, next) {
  try {
    const result = await Notification.deleteMany({
      user: req.user.id,
      isRead: true,
    })

    res.status(200).json({
      message: 'Read notifications cleared.',
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  clearReadNotifications,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
}
