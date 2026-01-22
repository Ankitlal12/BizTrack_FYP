import React, { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { userAPI } from '../../services/api'
import { formatNepaliDateTime } from '../../utils/dateUtils'

const SecurityTab: React.FC = () => {
  const { user } = useAuth()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({})

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validatePasswordForm = () => {
    const errors: {[key: string]: string} = {}

    if (!passwordForm.username) {
      errors.username = 'Username is required'
    }

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters long'
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (passwordForm.currentPassword && passwordForm.newPassword && 
        passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) {
      return
    }

    setIsChangingPassword(true)

    try {
      // First verify current password by attempting login
      // This also returns the user data including their ID
      const loginResponse = await userAPI.login({
        username: passwordForm.username,
        password: passwordForm.currentPassword
      })

      // Get the user ID from the login response
      const userId = loginResponse.user?._id || loginResponse.user?.id

      if (!userId) {
        throw new Error('Could not retrieve user information')
      }

      // If login successful, update password using the user ID from the login response
      await userAPI.updateUser(userId, {
        password: passwordForm.newPassword
      })

      toast.success('Password changed successfully', {
        description: 'Your password has been updated. Please use your new password for future logins.'
      })

      // Clear form
      setPasswordForm({
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Password change error:', error)
      
      if (error.message?.includes('Invalid username or password')) {
        setPasswordErrors({ 
          currentPassword: 'Current password is incorrect',
          username: 'Please verify your username is correct'
        })
      } else {
        toast.error('Failed to change password', {
          description: error.message || 'Please try again later.'
        })
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-medium text-gray-800 mb-6">
        Security Settings
      </h2>
      <div className="space-y-8">
        {/* Change Password Section */}
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-4">
            Change Password
          </h3>
          <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                className={`w-full border rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  passwordErrors.username ? 'border-red-300' : 'border-gray-300'
                }`}
                value={passwordForm.username}
                onChange={(e) => handlePasswordChange('username', e.target.value)}
                disabled={isChangingPassword}
                placeholder="Enter your username"
              />
              {passwordErrors.username && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                className={`w-full border rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                disabled={isChangingPassword}
              />
              {passwordErrors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                className={`w-full border rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                value={passwordForm.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                disabled={isChangingPassword}
              />
              {passwordErrors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Password must be at least 6 characters long
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                className={`w-full border rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                value={passwordForm.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                disabled={isChangingPassword}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            
            <div>
              <button 
                type="submit"
                disabled={isChangingPassword}
                className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg transition-colors"
              >
                {isChangingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Current Session Info */}
        <div className="border-t pt-6">
          <h3 className="text-md font-medium text-gray-800 mb-4">
            Current Session
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Logged in as: {user?.name} ({user?.email})
                  </p>
                  <p className="text-xs text-gray-500">
                    Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    Session started: {formatNepaliDateTime(new Date().toISOString(), {
                      timeZone: 'Asia/Kathmandu',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })} (NPT)
                  </p>
                </div>
              </div>
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Active
              </div>
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="border-t pt-6">
          <h3 className="text-md font-medium text-gray-800 mb-4">
            Security Tips
          </h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Use a strong password with at least 6 characters</li>
              <li>• Don't share your login credentials with others</li>
              <li>• Log out when using shared computers</li>
              <li>• Change your password regularly</li>
              <li>• Contact your administrator if you notice suspicious activity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityTab

