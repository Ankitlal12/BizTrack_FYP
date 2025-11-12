import React, {memo} from 'react'
import Sidebar from './Sidebar'
import { FaBell } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps{
 children:React.ReactNode
}

const Layout : React.FC<LayoutProps>=memo(({children})=>{
    const {user,logout}=useAuth()
    const getInitials=(name:string)=>{
        return name.split(' ')
        .map((part)=>part.charAt(0))
        .join('')
        .toUpperCase()
    }
     return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">BizTrack</h1>
            <div className="flex items-center gap-4">
              {user?.role === 'owner' && (
                <div className="relative">
                  <FaBell className="h-6 w-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full ${user?.role === 'owner' ? 'bg-teal-500' : 'bg-blue-500'} flex items-center justify-center text-white font-medium`}
                >
                  {user ? getInitials(user.name) : 'JD'}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || 'John Doe'}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {user?.role || 'User'}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1 rounded-full hover:bg-gray-100"
                title="Logout"
              >
                <FiLogOut className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
})
Layout.displayName = 'Layout'
export default Layout
