import React, { useState, useEffect, useMemo } from 'react'
import { 
  Clock, 
  User, 
  Shield, 
  Monitor,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { loginHistoryAPI } from '../../services/api'
import { formatNepaliDateTime, formatNepaliDate } from '../../utils/dateUtils'

interface LoginRecord {
  _id: string
  userId: string
  userName: string
  userRole: 'owner' | 'manager' | 'staff'
  loginTime: string
  nepaliTime: string
  userAgent?: string
  loginMethod: 'credentials' | 'google'
  success: boolean
  createdAt: string
}

interface LoginStats {
  totalLogins: number
  failedLogins: number
  uniqueUsers: number
  loginMethods: Array<{ _id: string; count: number }>
  roleBreakdown: Array<{ _id: string; count: number }>
  period: string
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  hasNext: boolean
  hasPrev: boolean
}

const LoginHistoryTab: React.FC = () => {
  const [allLoginHistory, setAllLoginHistory] = useState<LoginRecord[]>([])
  const [stats, setStats] = useState<LoginStats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [daysFilter, setDaysFilter] = useState(30)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [browserFilter, setBrowserFilter] = useState<string>('all')
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  useEffect(() => {
    loadLoginHistory()
    loadStats()
  }, [currentPage, daysFilter])

  // Auto-filter effect - trigger when any filter changes
  useEffect(() => {
    // Reset to first page when filters change
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchTerm, roleFilter, methodFilter, statusFilter, userFilter, dateFrom, dateTo, browserFilter])

  const loadLoginHistory = async () => {
    setIsLoading(true)
    try {
      const response = await loginHistoryAPI.getAll({
        page: currentPage,
        limit: 50,
        days: daysFilter,
      })
      
      setAllLoginHistory(response.loginHistory)
      setPagination(response.pagination)
    } catch (error: any) {
      console.error('Failed to load login history:', error)
      toast.error('Failed to load login history', {
        description: error?.message || 'Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatUserAgent = (userAgent?: string) => {
    if (!userAgent) return 'Unknown'
    
    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    
    return 'Other'
  }

  // Get unique values for filters
  const uniqueUsers = useMemo(() => {
    const users = Array.from(new Set(allLoginHistory.map(record => record.userName)))
    return users.sort()
  }, [allLoginHistory])

  const uniqueBrowsers = useMemo(() => {
    const browsers = Array.from(new Set(allLoginHistory.map(record => formatUserAgent(record.userAgent))))
    return browsers.sort()
  }, [allLoginHistory])

  // Filter and sort login history
  const filteredLoginHistory = useMemo(() => {
    return allLoginHistory.filter(record => {
      // Search filter
      if (searchTerm && !record.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !record.userRole.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Role filter
      if (roleFilter !== 'all' && record.userRole !== roleFilter) {
        return false
      }

      // Method filter
      if (methodFilter !== 'all' && record.loginMethod !== methodFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'success' && !record.success) return false
        if (statusFilter === 'failed' && record.success) return false
      }

      // User filter
      if (userFilter !== 'all' && record.userName !== userFilter) {
        return false
      }

      // Browser filter
      if (browserFilter !== 'all' && formatUserAgent(record.userAgent) !== browserFilter) {
        return false
      }

      // Date range filter
      const recordDate = new Date(record.loginTime)
      if (dateFrom && recordDate < new Date(dateFrom)) {
        return false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (recordDate > toDate) {
          return false
        }
      }

      return true
    })
  }, [allLoginHistory, searchTerm, roleFilter, methodFilter, statusFilter, userFilter, browserFilter, dateFrom, dateTo])

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setMethodFilter('all')
    setStatusFilter('all')
    setUserFilter('all')
    setDateFrom('')
    setDateTo('')
    setBrowserFilter('all')
  }

  // Check if any filters are active
  const hasActiveFilters = 
    searchTerm !== '' ||
    roleFilter !== 'all' ||
    methodFilter !== 'all' ||
    statusFilter !== 'all' ||
    userFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    browserFilter !== 'all'

  const loadStats = async () => {
    try {
      const statsData = await loginHistoryAPI.getStats(daysFilter)
      setStats(statsData)
    } catch (error: any) {
      console.error('Failed to load login stats:', error)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDaysFilterChange = (days: number) => {
    setDaysFilter(days)
    setCurrentPage(1)
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'google':
        return 'bg-red-100 text-red-800'
      case 'credentials':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Login History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track all user login activities with detailed information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-gray-400" />
          <span className="text-xs text-gray-500">All times in Nepal Time (NPT)</span>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <User className="text-blue-600" size={20} />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Total Logins</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalLogins}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Shield className="text-green-600" size={20} />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Unique Users</p>
                <p className="text-2xl font-bold text-green-600">{stats.uniqueUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <Clock className="text-red-600" size={20} />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-900">Failed Attempts</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedLogins}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Calendar className="text-purple-600" size={20} />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Period</p>
                <p className="text-sm font-bold text-purple-600">{stats.period}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-5 border-b">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by username or role..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Period Filter */}
          <select
            value={daysFilter}
            onChange={(e) => handleDaysFilterChange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          {/* Filters Button */}
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-lg flex items-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              hasActiveFilters ? 'bg-teal-50 border-teal-300' : 'bg-white'
            }`}
          >
            <Filter size={18} className="mr-2" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="ml-2 bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                !
              </span>
            )}
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-gray-600 hover:text-red-600 py-2 px-3 flex items-center focus:outline-none"
              title="Clear all filters"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Expanded Filters Panel */}
        {showMoreFilters && (
          <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Advanced Filters</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* User Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">User</label>
                <select
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  <option value="all">All Users</option>
                  {uniqueUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">Login Method</label>
                <select
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  <option value="credentials">Username/Password</option>
                  <option value="google">Google Login</option>
                </select>
              </div>

              {/* Browser Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">Browser</label>
                <select
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  value={browserFilter}
                  onChange={(e) => setBrowserFilter(e.target.value)}
                >
                  <option value="all">All Browsers</option>
                  {uniqueBrowsers.map((browser) => (
                    <option key={browser} value={browser}>
                      {browser}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">Date From</label>
                <input
                  type="date"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">Date To</label>
                <input
                  type="date"
                  className="border border-gray-300 rounded-lg py-2 px-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login History Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time (NPT)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Browser
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading login history...
                  </td>
                </tr>
              ) : filteredLoginHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No login records found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredLoginHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={16} className="text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {record.userName}
                          </div>
                          <div className="text-xs">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(record.userRole)}`}>
                              {record.userRole.charAt(0).toUpperCase() + record.userRole.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatNepaliDateTime(record.loginTime, {
                          timeZone: 'Asia/Kathmandu',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.loginTime).toLocaleDateString('en-US', { 
                          timeZone: 'Asia/Kathmandu',
                          weekday: 'long' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMethodBadgeClass(record.loginMethod)}`}>
                        {record.loginMethod === 'google' ? 'Google' : 'Username/Password'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Monitor size={16} className="text-gray-400 mr-2" />
                        {formatUserAgent(record.userAgent)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        record.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNext}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                  <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalRecords} total records)
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {pagination.currentPage}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginHistoryTab