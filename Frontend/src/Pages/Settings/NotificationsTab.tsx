import React from 'react'

const NotificationsTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-800 mb-6">
        Notification Settings
      </h2>
      <div className="space-y-6">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Low Stock Alerts</h3>
            <p className="text-sm text-gray-500">
              Get notified when inventory items fall below threshold
            </p>
          </div>
          <div className="flex items-center">
            <input
              id="low-stock-alerts"
              name="low-stock-alerts"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <h3 className="text-sm font-medium text-gray-900">New Sales</h3>
            <p className="text-sm text-gray-500">
              Get notified when a new sale is completed
            </p>
          </div>
          <div className="flex items-center">
            <input
              id="new-sales"
              name="new-sales"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Staff Activity</h3>
            <p className="text-sm text-gray-500">
              Get notified about staff logins and important actions
            </p>
          </div>
          <div className="flex items-center">
            <input
              id="staff-activity"
              name="staff-activity"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <h3 className="text-sm font-medium text-gray-900">System Updates</h3>
            <p className="text-sm text-gray-500">
              Get notified about system updates and maintenance
            </p>
          </div>
          <div className="flex items-center">
            <input
              id="system-updates"
              name="system-updates"
              type="checkbox"
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="pt-4">
          <button className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-6 rounded-lg">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationsTab

