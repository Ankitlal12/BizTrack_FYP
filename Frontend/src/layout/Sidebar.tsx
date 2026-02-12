import React, { useCallback, useMemo, useState, memo, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Link } from 'react-router-dom'

import { FaHistory } from "react-icons/fa"
import { TbLayoutDashboard } from "react-icons/tb"
import { FiPackage } from "react-icons/fi"
import { FiShoppingCart } from "react-icons/fi"
import { CiDeliveryTruck } from "react-icons/ci"
import { FiFileText } from "react-icons/fi"
import { CiSettings } from "react-icons/ci"
import { LuShoppingBag } from "react-icons/lu"
import { IoBarChartSharp } from "react-icons/io5"
import { FiMenu } from "react-icons/fi"
import { RxCross2 } from "react-icons/rx"
import { AlertTriangle, Users, RotateCcw } from "lucide-react"

import { useAuth } from '../contexts/AuthContext'
import { reorderAPI } from '../services/api'

const Sidebar = memo(() => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const { user } = useAuth()

  // Load low stock count for owner and manager
  useEffect(() => {
    if (user?.role === 'owner' || user?.role === 'manager') {
      const loadLowStockCount = async () => {
        try {
          const stats = await reorderAPI.getStats()
          setLowStockCount(stats.data?.lowStockItems || 0)
        } catch (error) {
          console.error('Failed to load low stock count:', error)
        }
      }
      
      loadLowStockCount()
      // Poll every 5 minutes
      const interval = setInterval(loadLowStockCount, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user?.role])

  const navItems = useMemo(() => {
    const inventoryItems = [
      {
        name: 'Inventory',
        path: '/inventory',
        icon: <FiPackage size={20} />,
      },
    ]

    const billingItem = {
      name: 'Billing',
      path: '/billing',
      icon: <LuShoppingBag size={20} />,
    }

    const purchasesItem = {
      name: 'Purchases',
      path: '/purchases',
      icon: <CiDeliveryTruck size={20} />,
    }

    if (user?.role === 'owner') {
      return [
        {
          name: 'Dashboard',
          path: '/',  // ✅ FIXED HERE!
          icon: <TbLayoutDashboard size={20} />,
        },
        ...inventoryItems,
        {
          name: 'Low Stock',
          path: '/low-stock',
          icon: <AlertTriangle size={20} />,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: 'bg-red-500'
        },
        {
          name: 'Sales',
          path: '/sales',
          icon: <FiShoppingCart size={20} />,
        },
        purchasesItem,
        billingItem,
        {
          name: 'Invoices',
          path: '/invoices',
          icon: <FiFileText size={20} />,
        },
        {
          name: 'Suppliers',
          path: '/suppliers',
          icon: <Users size={20} />,
        },
        {
          name: 'Customers',
          path: '/customers',
          icon: <Users size={20} />,
        },
        {
          name: 'Reorder History',
          path: '/reorder-history',
          icon: <RotateCcw size={20} />,
        },
        {
          name: 'Transaction History',
          path: '/transactions',
          icon: <FaHistory size={20} />,
        },
        {
          name: 'Reports',
          path: '/reports',
          icon: <IoBarChartSharp size={20} />,
        },
        {
          name: 'Settings',
          path: '/settings',
          icon: <CiSettings size={20} />,
        },
      ]
    }

    if (user?.role === 'manager') {
      return [
        ...inventoryItems,
        {
          name: 'Low Stock',
          path: '/low-stock',
          icon: <AlertTriangle size={20} />,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: 'bg-red-500'
        },
        purchasesItem,
        {
          name: 'Suppliers',
          path: '/suppliers',
          icon: <Users size={20} />,
        },
        {
          name: 'Customers',
          path: '/customers',
          icon: <Users size={20} />,
        },
        billingItem
      ]
    }

    return [...inventoryItems, billingItem]
  }, [user?.role])

  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => !prev)
  }, [])

  const toggleMobileSidebar = useCallback(() => {
    setMobileOpen(prev => !prev)
  }, [])

  const closeMobileSidebar = useCallback(() => {
    if (mobileOpen) {
      setMobileOpen(false)
    }
  }, [mobileOpen])

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-teal-500 text-white"
        onClick={toggleMobileSidebar}
      >
        {mobileOpen ? <RxCross2 size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-gray-800 bg-opacity-50 z-30"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        className={`bg-white shadow-lg z-30 ${mobileOpen ? 'fixed inset-y-0 left-0' : 'hidden md:block'
          } ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out`}
      >
        <div className="h-full flex flex-col">
          <div
            className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'
              } p-4 border-b`}
          >
            {!collapsed && (
              <h2 className="text-xl font-bold text-teal-600">BizTrack</h2>
            )}
            <button
              onClick={toggleSidebar}
              className="hidden md:block p-1 rounded-md hover:bg-gray-100"
            >
              {collapsed ? <FiMenu size={20} /> : <RxCross2 size={20} />}
            </button>
          </div>

          <nav className="flex-1 pt-4">
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center ${collapsed ? 'justify-center' : 'px-6'} py-3
                      ${isActive
                        ? 'bg-teal-50 text-teal-600 border-r-4 border-teal-500'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                      transition-colors duration-200`
                    }
                    onClick={closeMobileSidebar}
                    end
                  >
                    <span className="inline-flex">{item.icon}</span>
                    {!collapsed && (
                      <div className="ml-3 flex items-center justify-between w-full">
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${item.badgeColor || 'bg-teal-500'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={`p-4 border-t ${collapsed ? 'text-center' : ''}`}>
            <p className="text-xs text-gray-500">
              {collapsed ? 'v1.0' : 'BizTrack v1.0'}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
})

Sidebar.displayName = 'Sidebar'
export default Sidebar
