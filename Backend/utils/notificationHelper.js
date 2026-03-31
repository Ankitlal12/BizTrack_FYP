// ==================== IMPORTS ====================
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const NotificationArchive = require("../models/NotificationArchive");

// ==================== NOTIFICATION LIFECYCLE ====================

/**
 * Create a notification in both temporary (layout bar) and permanent (archive) storage.
 * Both records share the same _id so read-state stays in sync.
 * @param {Object} notificationData
 * @returns {Promise<{ temp: Object, archive: Object }>}
 */
const createNotification = async (notificationData) => {
  try {
    const sharedId = new mongoose.Types.ObjectId();

    const [tempNotification, archiveNotification] = await Promise.all([
      Notification.create({ ...notificationData, _id: sharedId }),
      NotificationArchive.create({ ...notificationData, _id: sharedId }),
    ]);

    console.log(`✅ Notification created: ${notificationData.type} - ${notificationData.title} (ID: ${sharedId})`);
    return { temp: tempNotification, archive: archiveNotification };
  } catch (error) {
    console.error("❌ Failed to create notification:", error);
    throw error;
  }
};

/**
 * Dismiss a notification from the layout bar.
 * Deletes from temporary storage and marks as dismissed in the archive.
 * @param {string} notificationId
 */
const dismissFromLayoutBar = async (notificationId) => {
  try {
    await Notification.findByIdAndDelete(notificationId);
    await NotificationArchive.findByIdAndUpdate(notificationId, { dismissedFromLayoutBar: true });
    console.log(`✅ Notification dismissed from layout bar: ${notificationId}`);
  } catch (error) {
    console.error("❌ Failed to dismiss notification:", error);
    throw error;
  }
};

/**
 * Permanently delete a notification from both storages (Settings page action).
 * @param {string} notificationId
 */
const permanentlyDeleteNotification = async (notificationId) => {
  try {
    await Promise.all([
      Notification.findByIdAndDelete(notificationId),
      NotificationArchive.findByIdAndDelete(notificationId),
    ]);
    console.log(`✅ Notification permanently deleted: ${notificationId}`);
  } catch (error) {
    console.error("❌ Failed to permanently delete notification:", error);
    throw error;
  }
};

module.exports = {
  createNotification,
  dismissFromLayoutBar,
  permanentlyDeleteNotification,
};
