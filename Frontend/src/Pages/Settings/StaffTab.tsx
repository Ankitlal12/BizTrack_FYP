import React, { useState } from 'react'

type StaffMember = {
  id: string
  name: string
  email: string
  username: string
  role: string
  dateAdded: string
  active: boolean
}

type NewStaff = {
  name: string
  email: string
  username: string
  password: string
  confirmPassword: string
  role: string
}

type StaffTabProps = {
  staffMembers: StaffMember[]
  toggleStaffStatus: (id: string) => Promise<void>
  addStaffMember: (member: any) => Promise<any>
}

const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  toggleStaffStatus,
  addStaffMember,
}) => {
  const [newStaff, setNewStaff] = useState<NewStaff>({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const getRoleBadgeClass = (role: string) => {
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

  const handleLinkClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
  }

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)

    const errors: Record<string, string> = {}
    if (!newStaff.name) errors.name = 'Name is required'
    if (!newStaff.email) errors.email = 'Email is required'
    if (!newStaff.username) errors.username = 'Username is required'
    if (!newStaff.password) errors.password = 'Password is required'
    if (newStaff.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    if (newStaff.password !== newStaff.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      await addStaffMember({
        name: newStaff.name,
        email: newStaff.email,
        username: newStaff.username,
        password: newStaff.password,
        role: newStaff.role,
        active: true,
        dateAdded: new Date().toISOString().split('T')[0],
      })

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

      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.error ||
        'Failed to add staff member. Please try again.'
      setSubmitError(errorMessage)

      if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        setFormErrors({ email: 'This email is already in use' })
      } else if (
        errorMessage.includes('username') ||
        errorMessage.includes('Username')
      ) {
        setFormErrors({ username: 'This username is already taken' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-800">Staff Management</h2>
        <button
          onClick={() =>
            document.getElementById('add-staff-form')?.scrollIntoView({
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
                  <div className="font-medium text-gray-900">{staff.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{staff.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{staff.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(
                      staff.role,
                    )}`}
                  >
                    {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{staff.dateAdded}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      staff.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
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
                    className={`mr-3 ${
                      staff.active
                        ? 'text-red-600 hover:text-red-900'
                        : 'text-green-600 hover:text-green-900'
                    }`}
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
        <h3 className="text-lg font-medium text-gray-800 mb-6">Add New User</h3>

        {submitSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            Staff member added successfully! They can now log in with their
            credentials.
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
                className={`w-full border ${
                  formErrors.name ? 'border-red-500' : 'border-gray-300'
                } rounded-lg py-2 px-4`}
                value={newStaff.name}
                onChange={(e) =>
                  setNewStaff({
                    ...newStaff,
                    name: e.target.value,
                  })
                }
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className={`w-full border ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                } rounded-lg py-2 px-4`}
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff({
                    ...newStaff,
                    email: e.target.value,
                  })
                }
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
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
                className={`w-full border ${
                  formErrors.username ? 'border-red-500' : 'border-gray-300'
                } rounded-lg py-2 px-4`}
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
                className={`w-full border ${
                  formErrors.password ? 'border-red-500' : 'border-gray-300'
                } rounded-lg py-2 px-4`}
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
                className={`w-full border ${
                  formErrors.confirmPassword
                    ? 'border-red-500'
                    : 'border-gray-300'
                } rounded-lg py-2 px-4`}
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
  )
}

export default StaffTab

