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
  sendCredentialsEmail: boolean
}

type StaffTabProps = {
  staffMembers: StaffMember[]
  toggleStaffStatus: (id: string) => Promise<void>
  addStaffMember: (member: any) => Promise<any>
  updateStaffMember: (id: string, data: { username?: string; password?: string; role?: string }) => Promise<any>
  deleteStaffMember: (id: string) => Promise<void>
}

const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  toggleStaffStatus,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
}) => {
  const [newStaff, setNewStaff] = useState<NewStaff>({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    sendCredentialsEmail: false,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: '',
  })
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

  const validateStaffPassword = (password: string) => {
    if (!password) {
      return 'Password is required'
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }

    if (!passwordRegex.test(password)) {
      return 'Password must include at least one letter, one number, and one special character'
    }

    return ''
  }

  const validateEmail = (email: string) => {
    const normalized = email.trim().toLowerCase()

    if (!normalized) {
      return 'Email is required'
    }

    if (!emailRegex.test(normalized)) {
      return 'Enter a valid email address'
    }

    // Catch common typos such as gmail.con
    if (normalized.endsWith('.con') || normalized.endsWith('.cmo')) {
      return 'Email domain looks invalid. Did you mean .com?'
    }

    if (normalized.includes('@gmail.') && !normalized.endsWith('@gmail.com')) {
      return 'Gmail address must end with @gmail.com'
    }

    return ''
  }

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

  const handleEditClick = (staff: StaffMember) => {
    setEditingStaff(staff)
    setEditFormData({
      username: staff.username,
      password: '',
      confirmPassword: '',
      role: staff.role,
    })
    setEditFormErrors({})
    setEditError('')
    setEditSuccess(false)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingStaff(null)
    setEditFormData({
      username: '',
      password: '',
      confirmPassword: '',
      role: '',
    })
    setEditFormErrors({})
    setEditError('')
    setEditSuccess(false)
  }

  const handleUpdateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess(false)
    setEditFormErrors({})

    const errors: Record<string, string> = {}
    
    // Validate username
    if (!editFormData.username || editFormData.username.trim() === '') {
      errors.username = 'Username is required'
    }

    // Validate password if provided
    if (editFormData.password) {
      const passwordError = validateStaffPassword(editFormData.password)
      if (passwordError) errors.password = passwordError
      if (editFormData.password !== editFormData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors)
      return
    }

    if (!editingStaff) return

    setIsUpdating(true)
    try {
      const updateData: { username?: string; password?: string; role?: string } = {}
      
      if (editFormData.username !== editingStaff.username) {
        updateData.username = editFormData.username.trim()
      }
      
      if (editFormData.password) {
        updateData.password = editFormData.password
      }

      // Include role if it changed (only staff <-> manager)
      if (editFormData.role && editFormData.role !== editingStaff.role) {
        updateData.role = editFormData.role
      }

      if (Object.keys(updateData).length === 0) {
        setEditError('No changes to save')
        setIsUpdating(false)
        return
      }

      await updateStaffMember(editingStaff.id, updateData)
      
      setEditSuccess(true)
      setTimeout(() => {
        handleCloseEditModal()
      }, 1500)
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.error ||
        'Failed to update staff member. Please try again.'
      setEditError(errorMessage)

      if (errorMessage.includes('username') || errorMessage.includes('Username')) {
        setEditFormErrors({ username: 'This username is already taken' })
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!editingStaff) return

    const confirmed = window.confirm(
      `Are you sure you want to delete the user "${editingStaff.name}" (${editingStaff.username})? This action cannot be undone.`
    )

    if (!confirmed) return

    setIsDeleting(true)
    setEditError('')
    try {
      await deleteStaffMember(editingStaff.id)
      handleCloseEditModal()
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.error ||
        'Failed to delete staff member. Please try again.'
      setEditError(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)
    setFormErrors({})

    const errors: Record<string, string> = {}
    const trimmedName = newStaff.name.trim()
    const trimmedEmail = newStaff.email.trim().toLowerCase()
    const trimmedUsername = newStaff.username.trim()

    if (!trimmedName) errors.name = 'Name is required'

    const emailError = validateEmail(trimmedEmail)
    if (emailError) errors.email = emailError

    if (!trimmedUsername) errors.username = 'Username is required'
    const passwordError = validateStaffPassword(newStaff.password)
    if (passwordError) errors.password = passwordError
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
        name: trimmedName,
        email: trimmedEmail,
        username: trimmedUsername,
        password: newStaff.password,
        role: newStaff.role,
        active: true,
        dateAdded: new Date().toISOString().split('T')[0],
        sendCredentialsEmail: newStaff.sendCredentialsEmail,
      })

      setNewStaff({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
        sendCredentialsEmail: false,
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

      {/* Staff table — hidden on mobile, shown on md+ */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(staff.role)}`}>
                    {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{staff.dateAdded}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${staff.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {staff.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={async () => { try { await toggleStaffStatus(staff.id) } catch { alert('Failed to update staff status.') } }}
                    className={`mr-3 ${staff.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                  >
                    {staff.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleEditClick(staff)} className="text-blue-600 hover:text-blue-900">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staff cards — shown on mobile only */}
      <div className="md:hidden space-y-3">
        {staffMembers.map((staff) => (
          <div key={staff.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{staff.name}</p>
                <p className="text-sm text-gray-500">{staff.email}</p>
                <p className="text-xs text-gray-400">@{staff.username}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeClass(staff.role)}`}>
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                </span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${staff.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {staff.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">Added: {staff.dateAdded}</p>
            <div className="flex gap-3 pt-1 border-t border-gray-100">
              <button
                onClick={async () => { try { await toggleStaffStatus(staff.id) } catch { alert('Failed to update staff status.') } }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg border ${staff.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
              >
                {staff.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleEditClick(staff)}
                className="flex-1 py-1.5 text-sm font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
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
              <label htmlFor="staff-full-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="staff-full-name"
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
              <label htmlFor="staff-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="staff-email"
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
                onBlur={(e) => {
                  const emailError = validateEmail(e.target.value)
                  setFormErrors((prev) => ({
                    ...prev,
                    email: emailError,
                  }))
                }}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="staff-username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="staff-username"
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
              <label htmlFor="staff-role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="staff-role"
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
              <label htmlFor="staff-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="staff-password"
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
              <p className="mt-1 text-xs text-gray-500">
                Use at least 6 characters with one letter, one number, and one special character.
              </p>
            </div>
            <div>
              <label htmlFor="staff-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="staff-confirm-password"
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
              checked={newStaff.sendCredentialsEmail}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  sendCredentialsEmail: e.target.checked,
                })
              }
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

      {/* Edit Modal */}
      {isEditModalOpen && editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  Edit User: {editingStaff.name}
                </h3>
                <button
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close edit modal"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {editSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
                  User updated successfully!
                </div>
              )}

              {editError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {editError}
                </div>
              )}

              <form onSubmit={handleUpdateStaff} className="space-y-4">
                <div>
                  <label htmlFor="edit-staff-username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="edit-staff-username"
                    type="text"
                    className={`w-full border ${
                      editFormErrors.username ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg py-2 px-4`}
                    value={editFormData.username}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, username: e.target.value })
                    }
                    required
                  />
                  {editFormErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{editFormErrors.username}</p>
                  )}
                </div>

                {/* Role — only shown for non-owner accounts */}
                {editingStaff.role !== 'owner' && (
                  <div>
                    <label htmlFor="edit-staff-role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      id="edit-staff-role"
                      className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={editFormData.role}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, role: e.target.value })
                      }
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                    {editFormData.role !== editingStaff.role && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠ Changing role will affect what this user can access.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="edit-staff-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave blank to keep current password)
                  </label>
                  <input
                    id="edit-staff-password"
                    type="password"
                    className={`w-full border ${
                      editFormErrors.password ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg py-2 px-4`}
                    value={editFormData.password}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, password: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                  {editFormErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{editFormErrors.password}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Use at least 6 characters with one letter, one number, and one special character.
                  </p>
                </div>

                {editFormData.password && (
                  <div>
                    <label htmlFor="edit-staff-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      id="edit-staff-confirm-password"
                      type="password"
                      className={`w-full border ${
                        editFormErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg py-2 px-4`}
                      value={editFormData.confirmPassword}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                    />
                    {editFormErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{editFormErrors.confirmPassword}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleDeleteStaff}
                    disabled={isDeleting || isUpdating}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete User'}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      disabled={isUpdating || isDeleting}
                      className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 py-2 px-4 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating || isDeleting}
                      className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm"
                    >
                      {isUpdating ? 'Updating...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffTab

