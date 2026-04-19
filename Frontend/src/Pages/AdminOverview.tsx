import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react'
import Layout from '../layout/Layout'
import { loginHistoryAPI, usersAPI } from '../services/api'

const ADMIN_EMAIL = 'admin@gmail.com'

type TrackedUser = {
  _id?: string
  id?: string
  name: string
  email: string
  username: string
  role: string
  active: boolean
  dateAdded?: string
}

const AdminOverview = () => {
  const [users, setUsers] = useState<TrackedUser[]>([])
  const [failedLogins, setFailedLogins] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOverview = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [allUsers, loginStats] = await Promise.all([
          usersAPI.getAll(),
          loginHistoryAPI.getStats(30),
        ])

        setUsers(allUsers || [])
        setFailedLogins(loginStats.failedLogins || 0)
      } catch (err: any) {
        setError(err?.message || 'Failed to load admin overview data.')
      } finally {
        setIsLoading(false)
      }
    }

    loadOverview()
  }, [])

  const metrics = useMemo(() => {
    const saasClients = users.filter((u) => u.role === 'owner' && u.email !== ADMIN_EMAIL)
    const total = saasClients.length
    const active = saasClients.filter((u) => u.active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [users])

  const recentUsers = useMemo(() => {
    return users
      .filter((u) => u.role === 'owner' && u.email !== ADMIN_EMAIL)
      .slice()
      .sort((a, b) => {
        const aDate = a.dateAdded ? new Date(a.dateAdded).getTime() : 0
        const bDate = b.dateAdded ? new Date(b.dateAdded).getTime() : 0
        return bDate - aDate
      })
      .slice(0, 5)
  }, [users])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
            <p className="text-sm text-gray-600 mt-1">Each owner account is treated as one SaaS customer account.</p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <ShieldCheck size={16} />
            Open SaaS Clients
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Users</p>
              <Users className="text-teal-600" size={18} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.total}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Active Users</p>
              <UserCheck className="text-green-600" size={18} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.active}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Inactive Users</p>
              <UserX className="text-orange-600" size={18} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.inactive}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Failed Logins (30d)</p>
              <Activity className="text-red-600" size={18} />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '...' : failedLogins}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800">Recently Added SaaS Clients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Owner Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Owner Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentUsers.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500" colSpan={3}>No SaaS clients found.</td>
                  </tr>
                )}
                {recentUsers.map((user) => (
                  <tr key={user._id || user.id || user.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminOverview
