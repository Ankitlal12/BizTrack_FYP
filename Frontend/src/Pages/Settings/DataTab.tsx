import React from 'react'

const DataTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-800 mb-6">Data & Backup</h2>
      <div className="space-y-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Database Backup
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create a backup of your entire database including inventory, sales,
            and customer data.
          </p>
          <button className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-6 rounded-lg">
            Create Backup
          </button>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Export Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Export your data in various formats for external use.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50">
              Export as CSV
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50">
              Export as Excel
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50">
              Export as PDF
            </button>
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Data Cleanup
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Remove old or unnecessary data to optimize system performance.
          </p>
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50">
            Clean Old Data
          </button>
        </div>
      </div>
    </div>
  )
}

export default DataTab

