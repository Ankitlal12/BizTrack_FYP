import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Layout from '../layout/Layout';
import { staffAnalyticsAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Users, TrendingUp, Clock, Award, ShieldCheck, UserCheck, UserX,
  RefreshCw, Crown, Timer, BarChart2, Activity, Star, CheckCircle, XCircle, Calendar
} from 'lucide-react';
import DatePresets from '../components/DatePresets';

const ROLE_COLORS: Record<string, string> = {
  owner: '#6366f1',
  manager: '#f59e0b',
  staff: '#10b981',
};

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(amount || 0);

const getRoleBadge = (role: string) => {
  const styles: Record<string, string> = {
    owner: 'bg-indigo-100 text-indigo-700',
    manager: 'bg-amber-100 text-amber-700',
    staff: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
};

const toLocalDate = (d: Date) => d.toLocaleDateString('en-CA');

const StaffAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const defaultTo = toLocalDate(new Date());
  const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return toLocalDate(d); })();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const [data, setData] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'revenue' | 'sales' | 'sessions' | 'duration'>('revenue');
  const [filterRole, setFilterRole] = useState<'all' | 'owner' | 'manager' | 'staff'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await staffAnalyticsAPI.getAnalytics({ dateFrom, dateTo });
      setData(res);
    } catch (err: any) {
      toast.error('Failed to load staff analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  const { overview, staffPerformance, loginActivity, dailySalesByStaff } = data;

  // Filtered + sorted staff
  const filteredStaff = (staffPerformance || [])
    .filter((s: any) => filterRole === 'all' || s.role === filterRole)
    .sort((a: any, b: any) => {
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'sales') return b.totalSales - a.totalSales;
      if (sortBy === 'sessions') return b.totalSessions - a.totalSessions;
      if (sortBy === 'duration') return b.totalSessionDuration - a.totalSessionDuration;
      return 0;
    });

  // Chart data - top 8 staff by revenue for bar chart
  const revenueChartData = [...(staffPerformance || [])]
    .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
    .slice(0, 8)
    .map((s: any) => ({
      name: s.name.split(' ')[0],
      Revenue: Math.round(s.totalRevenue),
      Sales: s.totalSales,
    }));

  // Session duration chart - top 8
  const sessionChartData = [...(staffPerformance || [])]
    .sort((a: any, b: any) => b.totalSessionDuration - a.totalSessionDuration)
    .slice(0, 8)
    .map((s: any) => ({
      name: s.name.split(' ')[0],
      'Hours Spent': Math.round((s.totalSessionDuration || 0) / 3600 * 10) / 10,
      Sessions: s.totalSessions,
    }));

  // Pie chart - role distribution
  const roleData = [
    { name: 'Owner', value: overview.byRole?.owner || 0, color: '#6366f1' },
    { name: 'Manager', value: overview.byRole?.manager || 0, color: '#f59e0b' },
    { name: 'Staff', value: overview.byRole?.staff || 0, color: '#10b981' },
  ].filter(r => r.value > 0);

  // Daily sales trend chart
  const trendData = (dailySalesByStaff || []).map((d: any) => ({
    date: d._id?.date?.slice(5) || '',
    Revenue: Math.round(d.totalRevenue),
    Orders: d.orderCount,
  }));

  // Login activity aggregated by date
  const activityByDate = new Map<string, number>();
  (loginActivity || []).forEach((a: any) => {
    const date = a._id?.date || '';
    activityByDate.set(date, (activityByDate.get(date) || 0) + a.sessions);
  });
  const activityData = Array.from(activityByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, logins]) => ({ date: date.slice(5), logins }));

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff Analytics</h2>
            <p className="text-gray-500 text-sm mt-0.5">Performance overview for all team members</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => setDateFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={toLocalDate(new Date())}
                onChange={e => setDateTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
            <DatePresets onSelect={(from, to) => { setDateFrom(from); setDateTo(to); }} />
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Staff</span>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Users size={18} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{overview.totalStaff}</p>
            <p className="text-xs text-gray-400 mt-1">{overview.activeStaff} active · {overview.inactiveStaff} inactive</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Top Seller</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Crown size={18} className="text-emerald-600" />
              </div>
            </div>
            {overview.topSeller ? (
              <>
                <p className="text-base font-bold text-gray-800 truncate">{overview.topSeller.name}</p>
                <p className="text-xs text-gray-400 mt-1">{formatCurrency(overview.topSeller.revenue)} · {overview.topSeller.sales} sales</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No sales yet</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Most Time Spent</span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Timer size={18} className="text-amber-600" />
              </div>
            </div>
            {overview.mostTimeSpent ? (
              <>
                <p className="text-base font-bold text-gray-800 truncate">{overview.mostTimeSpent.name}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDuration(overview.mostTimeSpent.duration)} total · {overview.mostTimeSpent.sessions} sessions</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No session data</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Most Active</span>
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                <Activity size={18} className="text-teal-600" />
              </div>
            </div>
            {overview.mostSessions ? (
              <>
                <p className="text-base font-bold text-gray-800 truncate">{overview.mostSessions.name}</p>
                <p className="text-xs text-gray-400 mt-1">{overview.mostSessions.sessions} logins recorded</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No login data</p>
            )}
          </div>
        </div>

        {/* Role Breakdown + Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Role Distribution Pie */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500" /> Role Distribution
            </h3>
            {roleData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {roleData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} members`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-2">
                  {roleData.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                        <span className="text-gray-600 capitalize">{r.name}</span>
                      </div>
                      <span className="font-semibold text-gray-700">{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No staff data</p>
            )}
          </div>

          {/* Active vs Inactive */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-500" /> Status Overview
            </h3>
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <CheckCircle size={24} className="text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{overview.activeStaff}</p>
                  <p className="text-sm text-emerald-600">Active Members</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <XCircle size={24} className="text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-500">{overview.inactiveStaff}</p>
                  <p className="text-sm text-red-400">Inactive Members</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Active Rate</span>
                  <span>{overview.totalStaff > 0 ? Math.round((overview.activeStaff / overview.totalStaff) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${overview.totalStaff > 0 ? (overview.activeStaff / overview.totalStaff) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Login Activity Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-teal-500" /> Login Activity
            </h3>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={activityData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="logins" stroke="#14b8a6" strokeWidth={2} dot={false} name="Logins" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                No login activity data
              </div>
            )}
          </div>
        </div>

        {/* Revenue per Staff + Session Duration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Revenue by Staff (Top 8)
            </h3>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any, name?: string) => name === 'Revenue' ? [formatCurrency(v), name] : [v, name ?? '']} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
                No sales data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> Hours Spent by Staff (Top 8)
            </h3>
            {sessionChartData.some((d: any) => d['Hours Spent'] > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sessionChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Hours Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
                No session data available
              </div>
            )}
          </div>
        </div>

        {/* Sales Trend Over Period */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-teal-500" /> Team Sales Trend ({dateFrom} – {dateTo})
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, name?: string) => name === 'Revenue' ? [formatCurrency(v), name] : [v, name ?? '']} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Orders" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Staff Performance Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Star size={16} className="text-amber-500" /> Staff Performance —{' '}
              <span className="text-teal-600">{dateFrom} – {dateTo}</span>
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                aria-label="Filter by role"
                onChange={e => setFilterRole(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
              <select
                value={sortBy}
                aria-label="Sort by"
                onChange={e => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="revenue">Sort: Revenue</option>
                <option value="sales">Sort: Sales Count</option>
                <option value="sessions">Sort: Sessions</option>
                <option value="duration">Sort: Time Spent</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Avg Order</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Time Spent</th>
                  <th className="px-4 py-3 text-right">Last Login</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-400">No staff members found</td>
                  </tr>
                ) : (
                  filteredStaff.map((staff: any, idx: number) => (
                    <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: ROLE_COLORS[staff.role] || '#6b7280' }}>
                            {staff.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{staff.name}</p>
                            <p className="text-xs text-gray-400">{staff.username || staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(staff.role)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-700">{staff.totalSales}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-700">{formatCurrency(staff.totalRevenue)}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(staff.avgOrderValue)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-700">{staff.totalSessions}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-700">{formatDuration(staff.totalSessionDuration)}</span>
                        {staff.avgSessionDuration > 0 && (
                          <span className="block text-xs text-gray-400">avg {formatDuration(staff.avgSessionDuration)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {staff.lastLogin
                          ? new Date(staff.lastLogin).toLocaleDateString('en-NP', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${staff.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {staff.active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {staff.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          {filteredStaff.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Total: <strong className="text-gray-700">{filteredStaff.length} members</strong></span>
              <span>Combined Revenue: <strong className="text-gray-700">{formatCurrency(filteredStaff.reduce((s: number, st: any) => s + (st.totalRevenue || 0), 0))}</strong></span>
              <span>Total Sales: <strong className="text-gray-700">{filteredStaff.reduce((s: number, st: any) => s + (st.totalSales || 0), 0)}</strong></span>
              <span>Total Time: <strong className="text-gray-700">{formatDuration(filteredStaff.reduce((s: number, st: any) => s + (st.totalSessionDuration || 0), 0))}</strong></span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StaffAnalytics;
