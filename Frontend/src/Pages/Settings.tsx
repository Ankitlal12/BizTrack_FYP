import React, { useState } from 'react'
import {
  UserIcon,
  UsersIcon,
  BellIcon,
  ShieldIcon,
  DatabaseIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../layout/Layout'
import ProfileTab from './Settings/ProfileTab'
import StaffTab from './Settings/StaffTab'
import NotificationsTab from './Settings/NotificationsTab'
import SecurityTab from './Settings/SecurityTab'
import DataTab from './Settings/DataTab'

type TabId = 'profile' | 'staff' | 'notifications' | 'security' | 'data'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <UserIcon size={18} /> },
  { id: 'staff', label: 'Staff Management', icon: <UsersIcon size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <BellIcon size={18} /> },
  { id: 'security', label: 'Security', icon: <ShieldIcon size={18} /> },
  { id: 'data', label: 'Data & Backup', icon: <DatabaseIcon size={18} /> },
]

const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const { user, staffMembers, toggleStaffStatus, addStaffMember } = useAuth()
  const handleAddStaff = (member: any) => addStaffMember(member)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} />
      case 'staff':
        return (
          <StaffTab
            staffMembers={staffMembers || []}
            toggleStaffStatus={toggleStaffStatus}
            addStaffMember={handleAddStaff}
          />
        )
      case 'notifications':
        return <NotificationsTab />
      case 'security':
        return <SecurityTab />
      case 'data':
        return <DataTab />
      default:
        return null
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 flex items-center text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6">{renderTabContent()}</div>
        </div>
      </div>
    </Layout>
  )
}

export default Settings
