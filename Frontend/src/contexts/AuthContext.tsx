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
  googleLogin: (googleUser: any) => void
  logout: () => void
  addStaffMember: (staff: Omit<StaffMember, 'id'>) => void
  toggleStaffStatus: (id: string) => void
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
  googleLogin: () => {},
  logout: () => {},
  addStaffMember: () => {},
  toggleStaffStatus: () => {},
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

    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('biztrack_user')
        const savedStaff = localStorage.getItem('biztrack_staff')

        if (savedUser) {
          setUser(JSON.parse(savedUser))
          setIsAuthenticated(true)
        }

        if (savedStaff) {
          setStaffMembers(JSON.parse(savedStaff))
        } else {
          const initialStaff = mockStaffMembers.map((s) => ({
            ...s,
            password: s.username === 'mike' ? 'mike123' : 'sarah123',
          }))

          setStaffMembers(initialStaff)
          localStorage.setItem('biztrack_staff', JSON.stringify(initialStaff))
        }
      } catch {
        localStorage.removeItem('biztrack_user')
        localStorage.removeItem('biztrack_staff')
      } finally {
        setIsLoading(false)
        authChecked.current = true
      }
    }

    setTimeout(checkAuth, 300)
  }, [])

  // =====================
  // NORMAL LOGIN
  // =====================
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 600))

      // Owner
      if (
        username === mockCredentials.owner.username &&
        password === mockCredentials.owner.password
      ) {
        setUser(mockOwner)
        setIsAuthenticated(true)
        localStorage.setItem('biztrack_user', JSON.stringify(mockOwner))
        return true
      }

      // Dynamic staff login
      const staff = staffMembers.find(
        (s) => s.username === username && s.password === password && s.active,
      )

      if (staff) {
        const userObj: User = {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          avatar: staff.avatar,
        }

        setUser(userObj)
        setIsAuthenticated(true)
        localStorage.setItem('biztrack_user', JSON.stringify(userObj))
        return true
      }

      return false
    },
    [staffMembers],
  )

  // =====================
  // GOOGLE LOGIN
  // =====================
  const googleLogin = useCallback(
    (googleUser: any) => {
      const loggedInUser: User = {
        id: googleUser.sub,
        name: googleUser.name,
        email: googleUser.email,
        role: 'owner',
        avatar: googleUser.picture,
      }

      setUser(loggedInUser)
      setIsAuthenticated(true)
      localStorage.setItem('biztrack_user', JSON.stringify(loggedInUser))

      navigate('/', { replace: true })
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
    navigate('/login', { replace: true })
  }, [navigate])

  // =====================
  // ADD STAFF
  // =====================
  const addStaffMember = useCallback((staff: Omit<StaffMember, 'id'>) => {
    const newStaff = { ...staff, id: `staff-${Date.now()}` }

    setStaffMembers((prev) => {
      const updated = [...prev, newStaff]
      localStorage.setItem('biztrack_staff', JSON.stringify(updated))
      return updated
    })
  }, [])

  // =====================
  // TOGGLE STAFF
  // =====================
  const toggleStaffStatus = useCallback((id: string) => {
    setStaffMembers((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s,
      )
      localStorage.setItem('biztrack_staff', JSON.stringify(updated))
      return updated
    })
  }, [])

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
