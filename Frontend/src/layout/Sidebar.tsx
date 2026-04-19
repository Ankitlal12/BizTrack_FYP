// ==================== IMPORTS ====================
import React, { useCallback, useMemo, useState, memo, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { FaHistory } from 'react-icons/fa'
import { TbLayoutDashboard } from 'react-icons/tb'
import { FiPackage, FiShoppingCart, FiFileText, FiMenu } from 'react-icons/fi'
import { CiDeliveryTruck, CiSettings } from 'react-icons/ci'
import { LuShoppingBag } from 'react-icons/lu'
import { IoBarChartSharp } from 'react-icons/io5'
import { RxCross2 } from 'react-icons/rx'
import { AlertTriangle, Users, ChevronDown, ChevronRight, Calendar, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { reorderAPI } from '../services/api'

// ==================== TYPES ====================

interface NavItem  { name: string; path: string; icon: React.ReactNode; badge?: number; badgeColor?: string }
interface NavGroup { name: string; icon: React.ReactNode; items: NavItem[] }
type NavEntry = NavItem | NavGroup

const isGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry

// ==================== NAV STRUCTURE BUILDERS ====================

const stockControlGroup = (role: string): NavGroup => ({
  name: 'Stock Control',
  icon: <AlertTriangle size={20} />,
  items: [
    ...(role === 'owner' ? [{ name: 'Stock List', path: '/stock-list', icon: <FiFileText size={18} /> }] : []),
    { name: 'Incoming Stock',    path: '/upcoming-products',  icon: <Truck size={18} /> },
    { name: 'Low Stock',         path: '/low-stock',          icon: <AlertTriangle size={18} /> },
    { name: 'Expiry Management', path: '/expiry-management',  icon: <Calendar size={18} /> },
  ],
})

const contactsGroup: NavGroup = {
  name: 'Contacts',
  icon: <Users size={20} />,
  items: [
    { name: 'Suppliers', path: '/suppliers', icon: <Users size={18} /> },
    { name: 'Customers', path: '/customers', icon: <Users size={18} /> },
  ],
}

const reportsGroup: NavGroup = {
  name: 'Reports',
  icon: <IoBarChartSharp size={20} />,
  items: [
    { name: 'Sales Report',   path: '/reports',          icon: <IoBarChartSharp size={18} /> },
    { name: 'Stock Report',   path: '/stock-report',     icon: <FiPackage size={18} /> },
    { name: 'Staff Analytics',path: '/staff-analytics',  icon: <Users size={18} /> },
  ],
}

/** Build the full nav structure based on user role */
const buildNavStructure = (role: string): NavEntry[] => {
  if (role === 'admin') {
    return [
      { name: 'Admin Overview', path: '/admin', icon: <TbLayoutDashboard size={20} /> },
      { name: 'SaaS Clients', path: '/admin/users', icon: <Users size={20} /> },
    ]
  }

  if (role === 'owner') {
    return [
      { name: 'Dashboard',           path: '/',             icon: <TbLayoutDashboard size={20} /> },
      { name: 'Inventory',           path: '/inventory',    icon: <FiPackage size={20} /> },
      stockControlGroup('owner'),
      { name: 'Sales',               path: '/sales',        icon: <FiShoppingCart size={20} /> },
      { name: 'Purchases',           path: '/purchases',    icon: <CiDeliveryTruck size={20} /> },
      { name: 'Invoices',            path: '/invoices',     icon: <FiFileText size={20} /> },
      contactsGroup,
      { name: 'Transaction History', path: '/transactions', icon: <FaHistory size={20} /> },
      reportsGroup,
      { name: 'Settings',            path: '/settings',     icon: <CiSettings size={20} /> },
    ]
  }

  if (role === 'manager') {
    return [
      { name: 'Inventory',  path: '/inventory',  icon: <FiPackage size={20} /> },
      stockControlGroup('manager'),
      { name: 'Purchases',  path: '/purchases',  icon: <CiDeliveryTruck size={20} /> },
      contactsGroup,
      { name: 'Billing',    path: '/billing',    icon: <LuShoppingBag size={20} /> },
    ]
  }

  // Staff
  return [{ name: 'Billing', path: '/billing', icon: <LuShoppingBag size={20} /> }]
}

// ==================== COMPONENT ====================

const Sidebar = memo(() => {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [hoveredGroups, setHoveredGroups] = useState<string[]>([])

  // ==================== LOW STOCK BADGE ====================

  useEffect(() => {
    if (user?.role !== 'owner' && user?.role !== 'manager') return
    const load = async () => {
      try {
        const stats = await reorderAPI.getStats()
        setLowStockCount(stats.data?.lowStockItems || 0)
      } catch { /* silent */ }
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.role])

  // ==================== GROUP OPEN STATE ====================

  const toggleGroup = (name: string) =>
    setOpenGroups(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])

  const isGroupOpen = (name: string) => openGroups.includes(name) || hoveredGroups.includes(name)

  const handleGroupHover = (name: string, entering: boolean) =>
    setHoveredGroups(prev => entering ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter(g => g !== name))

  // ==================== NAV STRUCTURE ====================

  const navStructure = useMemo(() => buildNavStructure(user?.role ?? ''), [user?.role])

  const toggleSidebar = useCallback(() => setCollapsed(v => !v), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // ==================== RENDER ====================

  return (
    <>
      {/* Mobile toggle */}
      <button className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-teal-500 text-white" onClick={() => setMobileOpen(v => !v)}>
        {mobileOpen ? <RxCross2 size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-gray-800 bg-opacity-50 z-30" onClick={closeMobile} />}

      <aside className={`bg-white shadow-lg z-30 ${mobileOpen ? 'fixed inset-y-0 left-0' : 'hidden md:block'} ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out`}>
        <div className="h-full flex flex-col">

          {/* Logo / collapse toggle */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-4 border-b`}>
            {!collapsed && <h2 className="text-xl font-bold text-teal-600">BizTrack</h2>}
            <button onClick={toggleSidebar} className="hidden md:block p-1 rounded-md hover:bg-gray-100">
              {collapsed ? <FiMenu size={20} /> : <RxCross2 size={20} />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 pt-4 overflow-y-auto">
            <ul className="space-y-1">
              {navStructure.map((entry, index) => {
                if (isGroup(entry)) {
                  const open = isGroupOpen(entry.name)
                  return (
                    <li key={entry.name}>
                      <button
                        onClick={() => toggleGroup(entry.name)}
                        onMouseEnter={() => handleGroupHover(entry.name, true)}
                        onMouseLeave={() => handleGroupHover(entry.name, false)}
                        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'px-6'} py-3 text-gray-600 hover:bg-gray-100 transition-colors`}
                      >
                        <span className="inline-flex">{entry.icon}</span>
                        {!collapsed && (
                          <div className="ml-3 flex items-center justify-between w-full">
                            <span>{entry.name}</span>
                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        )}
                      </button>

                      {!collapsed && open && (
                        <ul className="bg-gray-50" onMouseEnter={() => handleGroupHover(entry.name, true)} onMouseLeave={() => handleGroupHover(entry.name, false)}>
                          {entry.items.map(sub => (
                            <li key={sub.path}>
                              <NavLink
                                to={sub.path}
                                className={({ isActive }) =>
                                  `flex items-center pl-12 pr-6 py-2.5 transition-colors ${isActive ? 'bg-teal-50 text-teal-600 border-r-4 border-teal-500' : 'text-gray-600 hover:bg-gray-100'}`
                                }
                                onClick={closeMobile}
                              >
                                <span className="inline-flex">{sub.icon}</span>
                                <span className="ml-3 text-sm">{sub.name}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                }

                // Regular item
                return (
                  <li key={entry.path}>
                    <NavLink
                      to={entry.path}
                      end
                      className={({ isActive }) =>
                        `flex items-center ${collapsed ? 'justify-center' : 'px-6'} py-3 transition-colors ${isActive ? 'bg-teal-50 text-teal-600 border-r-4 border-teal-500' : 'text-gray-600 hover:bg-gray-100'}`
                      }
                      onClick={closeMobile}
                    >
                      <span className="inline-flex">{entry.icon}</span>
                      {!collapsed && (
                        <div className="ml-3 flex items-center justify-between w-full">
                          <span>{entry.name}</span>
                          {entry.badge && (
                            <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${entry.badgeColor || 'bg-teal-500'}`}>
                              {entry.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className={`p-4 border-t ${collapsed ? 'text-center' : ''}`}>
            <p className="text-xs text-gray-500">{collapsed ? 'v1.0' : 'BizTrack v1.0'}</p>
          </div>
        </div>
      </aside>
    </>
  )
})

Sidebar.displayName = 'Sidebar'
export default Sidebar
