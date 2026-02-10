const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const NotificationArchive = require("../models/NotificationArchive");

/**
 * Create notification in both temporary (layout bar) and permanent (archive) storage
 * Both notifications share the same ID for synchronized read state
 * 
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notifications
 */
const createNotification = async (notificationData) => {
  try {
    // Generate a shared ID for both notifications
    const sharedId = new mongoose.Types.ObjectId();
    
    // Create in temporary storage (Notification - for layout bar)
    const tempNotification = await Notification.create({
      ...notificationData,
      _id: sharedId
    });
    
    // Create in permanent storage (NotificationArchive - for settings page) with same ID
    const archiveNotification = await NotificationArchive.create({
      ...notificationData,
      _id: sharedId
    });
    
    console.log(`✅ Notification created: ${notificationData.type} - ${notificationData.title} (ID: ${sharedId})`);
    
    return {
      temp: tempNotification,
      archive: archiveNotification,
    };
  } catch (error) {
    console.error("❌ Failed to create notification:", error);
    throw error;
  }
};

/**
 * Dismiss notification from layout bar (marks as dismissed in archive, deletes from temp)
 * 
 * @param {String} notificationId - Notification ID
 * @returns {Promise<void>}
 */
const dismissFromLayoutBar = async (notificationId) => {
  try {
    // Delete from temporary storage
    await Notification.findByIdAndDelete(notificationId);
    
    // Mark as dismissed in archive (but keep it)
    await NotificationArchive.findByIdAndUpdate(
      notificationId,
      { dismissedFromLayoutBar: true },
      { new: true }
    );
    
    console.log(`✅ Notification dismissed from layout bar: ${notificationId}`);
  } catch (error) {
    console.error("❌ Failed to dismiss notification:", error);
    throw error;
  }
};

/**
 * Permanently delete notification from archive (Settings page only)
 * 
 * @param {String} notificationId - Notification ID
 * @returns {Promise<void>}
 */
const permanentlyDeleteNotification = async (notificationId) => {
  try {
    // Delete from both storages
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
