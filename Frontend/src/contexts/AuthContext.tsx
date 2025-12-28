import React,
{
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { usersAPI, tokenManager } from '../services/api'

// =====================
// TYPES
// =====================
export type UserRole = 'owner' | 'manager' | 'staff'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface StaffMember extends User {
  username: string
  password?: string
  active: boolean
  dateAdded: string
}

interface AuthContextType {
  user: User | null
  staffMembers: StaffMember[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  googleLogin: (credential: string) => Promise<boolean>
  logout: () => void
  addStaffMember: (staff: Omit<StaffMember, 'id'>) => Promise<StaffMember>
  toggleStaffStatus: (id: string) => Promise<void>
}

// =====================
// CONTEXT DEFAULT
// =====================
const AuthContext = createContext<AuthContextType>({
  user: null,
  staffMembers: [],
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  googleLogin: async () => false,
  logout: () => {},
  addStaffMember: async () => ({ id: '', name: '', email: '', username: '', role: 'staff', active: true, dateAdded: '' }),
  toggleStaffStatus: async () => {},
})

// =====================
// MOCK DATA
// =====================
const mockOwner: User = {
  id: 'owner-1',
  name: 'John Doe',
  email: 'john@biztrack.com',
  role: 'owner',
}

const mockStaffMembers: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Sarah Johnson',
    email: 'sarah@biztrack.com',
    username: 'sarah',
    role: 'staff',
    active: true,
    dateAdded: '2023-04-15',
  },
  {
    id: 'staff-2',
    name: 'Mike Wilson',
    email: 'mike@biztrack.com',
    username: 'mike',
    role: 'manager',
    active: true,
    dateAdded: '2023-05-20',
  },
  {
    id: 'staff-3',
    name: 'Emily Clark',
    email: 'emily@biztrack.com',
    username: 'emily',
    role: 'staff',
    active: false,
    dateAdded: '2023-06-10',
  },
]

const mockCredentials = {
  owner: { username: 'admin', password: 'admin123' },
  manager: { username: 'mike', password: 'mike123' },
  staff: { username: 'sarah', password: 'sarah123' },
}

// =====================
// PROVIDER
// =====================
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const authChecked = useRef(false)
  const navigate = useNavigate()

  // =====================
  // INITIAL LOAD
  // =====================
  useEffect(() => {
    if (authChecked.current) return

    const checkAuth = async () => {
      try {
        // Check for saved user session
        const savedUser = localStorage.getItem('biztrack_user')
        if (savedUser) {
          setUser(JSON.parse(savedUser))
          setIsAuthenticated(true)
        }

        // Fetch staff members from API
        try {
          const staff = await usersAPI.getAll()
          // Convert MongoDB _id to id and format dateAdded
          const formattedStaff: StaffMember[] = staff.map((s: any) => ({
            id: s._id || s.id,
            name: s.name,
            email: s.email,
            username: s.username,
            role: s.role,
            active: s.active,
            dateAdded: s.dateAdded 
              ? new Date(s.dateAdded).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
          }))
          setStaffMembers(formattedStaff)
        } catch (error) {
          console.error('Failed to fetch staff members:', error)
          // If API fails, keep empty array
          setStaffMembers([])
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('biztrack_user')
      } finally {
        setIsLoading(false)
        authChecked.current = true
      }
    }

    checkAuth()
  }, [])

  // =====================
  // NORMAL LOGIN
  // =====================
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        // Try to login via API
        const response = await usersAPI.login(username, password)
        
        // Extract user and token from response
        const loggedInUser = response.user || response
        const token = response.token

        // Store token if provided
        if (token) {
          tokenManager.setToken(token)
        }
        
        // Convert MongoDB _id to id
        const userObj: User = {
          id: loggedInUser._id || loggedInUser.id,
          name: loggedInUser.name,
          email: loggedInUser.email,
          role: loggedInUser.role,
          avatar: loggedInUser.avatar,
        }

        setUser(userObj)
        setIsAuthenticated(true)
        localStorage.setItem('biztrack_user', JSON.stringify(userObj))
        
        // Refresh staff list after successful login
        try {
          const staff = await usersAPI.getAll()
          const formattedStaff: StaffMember[] = staff.map((s: any) => ({
            id: s._id || s.id,
            name: s.name,
            email: s.email,
            username: s.username,
            role: s.role,
            active: s.active,
            dateAdded: s.dateAdded 
              ? new Date(s.dateAdded).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
          }))
          setStaffMembers(formattedStaff)
        } catch (error) {
          console.error('Failed to refresh staff list:', error)
        }

        return true
      } catch (error: any) {
        console.error('Login failed:', error)
        return false
      }
    },
    [],
  )

  // =====================
  // GOOGLE LOGIN
  // =====================
  const googleLogin = useCallback(
    async (credential: string): Promise<boolean> => {
      try {
        // Send credential to backend for verification
        const response = await usersAPI.googleLogin(credential)
        
        // Extract user and token from response
        const loggedInUser = response.user || response
        const token = response.token

        // Store token if provided
        if (token) {
          tokenManager.setToken(token)
        }
        
        // Convert MongoDB _id to id
        const userObj: User = {
          id: loggedInUser._id || loggedInUser.id,
          name: loggedInUser.name,
          email: loggedInUser.email,
          role: loggedInUser.role,
          avatar: loggedInUser.avatar,
        }

        setUser(userObj)
        setIsAuthenticated(true)
        localStorage.setItem('biztrack_user', JSON.stringify(userObj))
        
        // Refresh staff list after successful login
        try {
          const staff = await usersAPI.getAll()
          const formattedStaff: StaffMember[] = staff.map((s: any) => ({
            id: s._id || s.id,
            name: s.name,
            email: s.email,
            username: s.username,
            role: s.role,
            active: s.active,
            dateAdded: s.dateAdded 
              ? new Date(s.dateAdded).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
          }))
          setStaffMembers(formattedStaff)
        } catch (error) {
          console.error('Failed to refresh staff list:', error)
        }

        navigate('/', { replace: true })
        return true
      } catch (error: any) {
        console.error('Google login failed:', error)
        return false
      }
    },
    [navigate],
  )

  // =====================
  // LOGOUT
  // =====================
  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('biztrack_user')
    tokenManager.removeToken()
    navigate('/login', { replace: true })
  }, [navigate])

  // =====================
  // ADD STAFF
  // =====================
  const addStaffMember = useCallback(async (staff: Omit<StaffMember, 'id'>) => {
    try {
      // Create staff member via API
      const newStaff = await usersAPI.create({
        name: staff.name,
        email: staff.email,
        username: staff.username,
        password: staff.password,
        role: staff.role,
        active: staff.active !== undefined ? staff.active : true,
      })

      // Convert MongoDB _id to id and format dateAdded
      const formattedStaff: StaffMember = {
        id: newStaff._id || newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        username: newStaff.username,
        role: newStaff.role,
        active: newStaff.active,
        dateAdded: newStaff.dateAdded 
          ? new Date(newStaff.dateAdded).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      }

      // Update local state
      setStaffMembers((prev) => [...prev, formattedStaff])
      
      return formattedStaff
    } catch (error: any) {
      console.error('Failed to add staff member:', error)
      throw error
    }
  }, [])

  // =====================
  // TOGGLE STAFF
  // =====================
  const toggleStaffStatus = useCallback(async (id: string) => {
    try {
      // Find current staff member to get current status
      const currentStaff = staffMembers.find((s) => s.id === id)
      if (!currentStaff) {
        console.error('Staff member not found')
        return
      }

      const newStatus = !currentStaff.active

      // Update status via API
      const updatedStaff = await usersAPI.updateStatus(id, newStatus)

      // Convert MongoDB _id to id and format dateAdded
      const formattedStaff: StaffMember = {
        id: updatedStaff._id || updatedStaff.id,
        name: updatedStaff.name,
        email: updatedStaff.email,
        username: updatedStaff.username,
        role: updatedStaff.role,
        active: updatedStaff.active,
        dateAdded: updatedStaff.dateAdded 
          ? new Date(updatedStaff.dateAdded).toISOString().split('T')[0]
          : currentStaff.dateAdded,
      }

      // Update local state
      setStaffMembers((prev) =>
        prev.map((s) => (s.id === id ? formattedStaff : s))
      )
    } catch (error: any) {
      console.error('Failed to toggle staff status:', error)
      throw error
    }
  }, [staffMembers])

  // =====================
  // CONTEXT VALUE
  // =====================
  const value = useMemo(
    () => ({
      user,
      staffMembers,
      isAuthenticated,
      isLoading,
      login,
      googleLogin,
      logout,
      addStaffMember,
      toggleStaffStatus,
    }),
    [
      user,
      staffMembers,
      isAuthenticated,
      isLoading,
      login,
      googleLogin,
      logout,
      addStaffMember,
      toggleStaffStatus,
    ],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
