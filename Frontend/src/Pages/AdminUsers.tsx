import React, { useEffect, useMemo, useState } from 'react'
import { Eye, X, Trash2, Zap, CheckCircle, RotateCw } from 'lucide-react'
import Layout from '../layout/Layout'
import { saasAPI } from '../services/api'

const ADMIN_EMAIL = 'admin@gmail.com'

type UserRow = {
  _id?: string
  id?: string
  name: string
  email: string
  username: string
  role: string
  active: boolean
  dateAdded?: string
  lastLoginAt?: string | null
  accountStatus?: 'active' | 'frozen' | 'deleted'
  subscriptionExpiresAt?: string
  subscriptionExpired?: boolean
  daysRemaining?: number | null
  staffCount?: number
}

const toId = (u: UserRow) => u._id || u.id || ''

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')
    try {
      const allUsers = await saasAPI.getClients()
      const saasClients = (allUsers || []).filter((user: UserRow) => user.email !== ADMIN_EMAIL)
      setUsers(saasClients)
    } catch (err: any) {
      setError(err?.message || 'Failed to load users.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const roleCounts = useMemo(() => {
    const total = users.length
    const active = users.filter((user) => user.active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [users])

  const handleFreezeToggle = async (user: UserRow) => {
    const id = toId(user)
    if (!id) return
    try {
      const currentlyFrozen = user.accountStatus === 'frozen'
      await saasAPI.freezeClient(id, !currentlyFrozen)
      await loadUsers()
    } catch (err: any) {
      setError(err?.message || 'Failed to update client freeze status.')
    }
  }

  const handleDeleteClient = async (user: UserRow) => {
    const id = toId(user)
    if (!id) return

    const confirmed = window.confirm(`Delete client ${user.email}? This will disable the entire workspace.`)
    if (!confirmed) return

    try {
      await saasAPI.deleteClient(id)
      await loadUsers()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete client.')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Tracker</h1>
            <p className="text-sm text-gray-600 mt-1">Each row is one SaaS customer account (owner + their staff team).</p>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            title="Refresh users"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total SaaS Clients</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{roleCounts.total}</p>
          </div>
          <div className="rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active Clients</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{roleCounts.active}</p>
          </div>
          <div className="rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Inactive Clients</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{roleCounts.inactive}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Owner Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Owner Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Days Left</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!isLoading && users.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>No SaaS clients found.</td>
                </tr>
              )}
              {users.map((user) => {
                const daysLeft = user.daysRemaining ?? null;
                const isExpiringSoon = daysLeft !== null && daysLeft < 2 && daysLeft >= 0;
                const isExpired = user.subscriptionExpired || (daysLeft !== null && daysLeft < 0);
                
                return (
                <tr key={toId(user) || user.email} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.staffCount ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {daysLeft === null ? (
                      <span className="text-gray-400">-</span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                        Expired {Math.abs(daysLeft)} days ago
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                      </span>
                    ) : (
                      <span className="text-gray-600">{daysLeft} days</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      user.accountStatus === 'frozen' 
                        ? 'bg-yellow-100 text-yellow-700' 
                        : user.accountStatus === 'deleted' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {user.accountStatus || (user.active ? 'active' : 'inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setSelectedUser(user)}
                        title="View user details"
                        className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleFreezeToggle(user)}
                        title={user.accountStatus === 'frozen' ? 'Unfreeze client' : 'Freeze client'}
                        className="inline-flex items-center justify-center p-2 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        {user.accountStatus === 'frozen' ? <CheckCircle size={16} /> : <Zap size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteClient(user)}
                        title="Delete client"
                        className="inline-flex items-center justify-center p-2 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700"
                title="Close user details"
                aria-label="Close user details"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm">
              <p><span className="font-semibold">Name:</span> {selectedUser.name}</p>
              <p><span className="font-semibold">Email:</span> {selectedUser.email}</p>
              <p><span className="font-semibold">Last Login:</span> {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : '-'}</p>
              <p><span className="font-semibold">Role:</span> SaaS Owner</p>
              <p><span className="font-semibold">Status:</span> {selectedUser.active ? 'Active' : 'Inactive'}</p>
              <p><span className="font-semibold">Date Added:</span> {selectedUser.dateAdded ? new Date(selectedUser.dateAdded).toLocaleDateString() : '-'}</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AdminUsers
