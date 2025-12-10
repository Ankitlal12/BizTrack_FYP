import React, { useState } from 'react'
import {
  UserIcon,
  UsersIcon,
  BellIcon,
  ShieldIcon,
  DatabaseIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../layout/Layout'
const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, staffMembers, toggleStaffStatus, addStaffMember } = useAuth()
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleAddStaff = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)
    
    const errors = {}
    if (!newStaff.name) errors.name = 'Name is required'
    if (!newStaff.email) errors.email = 'Email is required'
    if (!newStaff.username) errors.username = 'Username is required'
    if (!newStaff.password) errors.password = 'Password is required'
    if (newStaff.password.length < 6) errors.password = 'Password must be at least 6 characters'
    if (newStaff.password !== newStaff.confirmPassword)
      errors.confirmPassword = 'Passwords do not match'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      // Add staff member via API
      await addStaffMember({
        name: newStaff.name,
        email: newStaff.email,
        username: newStaff.username,
        password: newStaff.password,
        role: newStaff.role,
        active: true,
        dateAdded: new Date().toISOString().split('T')[0],
      })
      
      // Reset form on success
      setNewStaff({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
      })
      setFormErrors({})
      setSubmitSuccess(true)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error: any) {
      console.error('Error adding staff member:', error)
      const errorMessage = error?.message || error?.error || 'Failed to add staff member. Please try again.'
      setSubmitError(errorMessage)
      
      // Set specific field errors if available
      if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        setFormErrors({ email: 'This email is already in use' })
      } else if (errorMessage.includes('username') || errorMessage.includes('Username')) {
        setFormErrors({ username: 'This username is already taken' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon size={18} />,
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: <UsersIcon size={18} />,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <BellIcon size={18} />,
    },
    {
      id: 'security',
      label: 'Security',
      icon: <ShieldIcon size={18} />,
    },
    {
      id: 'data',
      label: 'Data & Backup',
      icon: <DatabaseIcon size={18} />,
    },
  ]
  const getRoleBadgeClass = (role:string) => {
    switch (role) {
      case 'owner':
        return 'bg-teal-100 text-teal-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  const handleLinkClick = (e) => {
    e.preventDefault()
    // Handle the click without page reload
  }
  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 flex items-center text-sm font-medium border-b-2 ${activeTab === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-medium text-gray-800 mb-6">
                Profile Information
              </h2>
              <div className="flex items-center mb-8">
                <div className="h-20 w-20 rounded-full bg-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-medium text-gray-800">
                    {user?.name}
                  </h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <p className="mt-1 text-sm text-gray-500 capitalize">
                    Role: {user?.role}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg py-2 px-4"
                      defaultValue={user?.name}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg py-2 px-4"
                      defaultValue={user?.email}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg py-2 px-4"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="border-t pt-6">
                  <button className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-6 rounded-lg">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'staff' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-800">
                  Staff Management
                </h2>
                <button
                  onClick={() =>
                    document.getElementById('add-staff-form').scrollIntoView({
                      behavior: 'smooth',
                    })
                  }
                  className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg text-sm"
                >
                  Add New User
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffMembers.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {staff.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {staff.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {staff.username}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(staff.role)}`}
                          >
                            {staff.role.charAt(0).toUpperCase() +
                              staff.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {staff.dateAdded}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${staff.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {staff.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={async () => {
                              try {
                                await toggleStaffStatus(staff.id)
                              } catch (error) {
                                alert('Failed to update staff status. Please try again.')
                              }
                            }}
                            className={`mr-3 ${staff.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                          >
                            {staff.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={handleLinkClick}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div id="add-staff-form" className="mt-12 border-t pt-8">
                <h3 className="text-lg font-medium text-gray-800 mb-6">
                  Add New User
                </h3>
                
                {submitSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
                    Staff member added successfully! They can now log in with their credentials.
                  </div>
                )}
                
                {submitError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                    {submitError}
                  </div>
                )}
                
                <form onSubmit={handleAddStaff} className="max-w-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className={`w-full border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 px-4`}
                        value={newStaff.name}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            name: e.target.value,
                          })
                        }
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className={`w-full border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 px-4`}
                        value={newStaff.email}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            email: e.target.value,
                          })
                        }
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        className={`w-full border ${formErrors.username ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 px-4`}
                        value={newStaff.username}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            username: e.target.value,
                          })
                        }
                      />
                      {formErrors.username && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.username}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg py-2 px-4"
                        value={newStaff.role}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            role: e.target.value,
                          })
                        }
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        className={`w-full border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 px-4`}
                        value={newStaff.password}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            password: e.target.value,
                          })
                        }
                      />
                      {formErrors.password && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.password}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        className={`w-full border ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg py-2 px-4`}
                        value={newStaff.confirmPassword}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                      {formErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="send-credentials"
                      name="send-credentials"
                      type="checkbox"
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="send-credentials"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Send login credentials via email
                    </label>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg"
                    >
                      {isSubmitting ? 'Adding...' : 'Add User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-6">
                Notification Settings
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Low Stock Alerts
                    </h3>
                    <p className="text-sm text-gray-500">
                      Get notified when inventory items fall below threshold
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="low-stock-alerts"
                      name="low-stock-alerts"
                      type="checkbox"
                      defaultChecked={true}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      New Sales
                    </h3>
                    <p className="text-sm text-gray-500">
                      Get notified when a new sale is completed
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="new-sales"
                      name="new-sales"
                      type="checkbox"
                      defaultChecked={true}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Staff Activity
                    </h3>
                    <p className="text-sm text-gray-500">
                      Get notified about staff logins and important actions
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="staff-activity"
                      name="staff-activity"
                      type="checkbox"
                      defaultChecked={true}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      System Updates
                    </h3>
                    <p className="text-sm text-gray-500">
                      Get notified about system updates and maintenance
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="system-updates"
                      name="system-updates"
                      type="checkbox"
                      defaultChecked={false}
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
          )}
          {activeTab === 'security' && (
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
          )}
          {activeTab === 'data' && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-6">
                Data & Backup
              </h2>
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-md font-medium text-gray-800 mb-2">
                    Database Backup
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create a backup of your entire database including inventory,
                    sales, and customer data.
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
                    Remove old or unnecessary data to optimize system
                    performance.
                  </p>
                  <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50">
                    Clean Old Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>      
  )
}
export default Settings
