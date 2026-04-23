import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, AlertCircle, CheckCircle, CreditCard } from 'lucide-react'
import { saasAPI } from '../../services/api'

type ProfileTabProps = {
  user?: {
    name?: string
    email?: string
    role?: string
    subscriptionExpiresAt?: string
    accountStatus?: string
    isSaasCustomer?: boolean
  } | null
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user }) => {
  const navigate = useNavigate()
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : ''

  // Calculate subscription info
  const getSubscriptionInfo = () => {
    if (!user?.subscriptionExpiresAt) return null
    
    const expiryDate = new Date(user.subscriptionExpiresAt)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const isExpired = expiryDate < now
    
    return {
      expiryDate,
      daysRemaining,
      isExpired,
      formattedDate: expiryDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  const subscriptionInfo = getSubscriptionInfo()

  React.useEffect(() => {
    const loadHistory = async () => {
      if (user?.role !== 'owner') return
      setIsLoadingHistory(true)
      try {
        const response = await saasAPI.getMyPaymentHistory()
        setSubscriptionHistory(response?.payments || [])
      } catch {
        setSubscriptionHistory([])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [user?.role])

  const getStatusColor = () => {
    if (!subscriptionInfo) return 'gray'
    if (subscriptionInfo.isExpired) return 'red'
    if (subscriptionInfo.daysRemaining < 2) return 'yellow'
    return 'green'
  }

  const getStatusMessage = () => {
    if (!subscriptionInfo) return 'No subscription information'
    if (subscriptionInfo.isExpired) {
      return `Expired ${Math.abs(subscriptionInfo.daysRemaining)} days ago`
    }
    if (subscriptionInfo.daysRemaining < 2) {
      return `Expires in ${subscriptionInfo.daysRemaining} day${subscriptionInfo.daysRemaining === 1 ? '' : 's'}!`
    }
    return `${subscriptionInfo.daysRemaining} days remaining`
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-medium text-gray-800 mb-6">
        Profile Information
      </h2>

      {/* Subscription Status - Only for SaaS Customers (Owners) */}
      {user?.role === 'owner' && user?.isSaasCustomer && subscriptionInfo && (
        <div className={`mb-6 rounded-xl border ${
          getStatusColor() === 'red' ? 'border-red-200 bg-red-50' :
          getStatusColor() === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
          'border-green-200 bg-green-50'
        } p-5 shadow-sm`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {getStatusColor() === 'red' ? (
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
              ) : getStatusColor() === 'yellow' ? (
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
              ) : (
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
              )}
              <div className="flex-1">
                <h3 className={`text-sm font-semibold mb-1 ${
                  getStatusColor() === 'red' ? 'text-red-900' :
                  getStatusColor() === 'yellow' ? 'text-yellow-900' :
                  'text-green-900'
                }`}>
                  Subscription Status
                </h3>
                <p className={`text-sm mb-2 ${
                  getStatusColor() === 'red' ? 'text-red-700' :
                  getStatusColor() === 'yellow' ? 'text-yellow-700' :
                  'text-green-700'
                }`}>
                  {getStatusMessage()}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar size={16} />
                  <span>Expires: {subscriptionInfo.formattedDate}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/renew')}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <CreditCard size={16} />
              Renew Now
            </button>
          </div>
          {subscriptionInfo.isExpired && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs text-red-700">
                Your account is frozen. Renew now to regain access to all features.
              </p>
            </div>
          )}
          {!subscriptionInfo.isExpired && subscriptionInfo.daysRemaining < 2 && (
            <div className="mt-3 pt-3 border-t border-yellow-200">
              <p className="text-xs text-yellow-700">
                Renew early to extend your subscription by 10 days from your current expiry date.
              </p>
            </div>
          )}
        </div>
      )}

      {user?.role === 'owner' && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">SaaS Subscription History</h3>
            <span className="text-xs text-gray-500">Recent payments</span>
          </div>

          {isLoadingHistory ? (
            <p className="text-sm text-gray-500">Loading subscription history...</p>
          ) : subscriptionHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No subscription payments found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Coverage</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptionHistory.slice(0, 5).map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700 capitalize">{payment.paymentType || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">NPR {Number(payment.amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {payment.subscriptionStartDate ? new Date(payment.subscriptionStartDate).toLocaleDateString() : '-'}
                        {' - '}
                        {payment.subscriptionEndDate ? new Date(payment.subscriptionEndDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${payment.isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {payment.isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start mb-8 gap-4">
        <div className="h-20 w-20 rounded-full bg-teal-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="sm:ml-2 text-center sm:text-left">
          <h3 className="text-xl font-medium text-gray-800">{user?.name}</h3>
          <p className="text-gray-500">{user?.email}</p>
          <p className="mt-1 text-sm text-gray-500 capitalize">Role: {user?.role}</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              title="Full Name"
              placeholder="Enter full name"
              className="w-full border border-gray-300 rounded-lg py-2 px-4"
              defaultValue={user?.name}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              title="Email"
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded-lg py-2 px-4"
              defaultValue={user?.email}
            />
          </div>
        </div>
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            id="phoneNumber"
            type="text"
            title="Phone Number"
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
  )
}

export default ProfileTab

