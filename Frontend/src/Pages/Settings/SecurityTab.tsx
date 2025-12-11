import React from 'react'

const SecurityTab: React.FC = () => {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-medium text-gray-800 mb-6">
        Security Settings
      </h2>
      <div className="space-y-8">
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-4">
            Change Password
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg py-2 px-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg py-2 px-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg py-2 px-4"
              />
            </div>
            <div>
              <button className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-6 rounded-lg">
                Update Password
              </button>
            </div>
          </div>
        </div>
        <div className="border-t pt-6">
          <h3 className="text-md font-medium text-gray-800 mb-4">
            Login Sessions
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Current Session
                </p>
                <p className="text-xs text-gray-500">
                  Started: {new Date().toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">IP: 192.168.1.1</p>
              </div>
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityTab

