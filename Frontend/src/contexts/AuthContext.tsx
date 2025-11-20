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

export type UserRole = 'owner' | 'manager' | 'staff'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  googleLogin: (googleUser: any) => void       
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  googleLogin: () => {},                     
  logout: () => {},
})

const mockOwner: User = {
  id: 'owner-1',
  name: 'John Doe',
  email: 'john@biztrack.com',
  role: 'owner',
}

const mockCredentials = {
  owner: { username: 'admin', password: 'admin123' },
  manager: { username: 'mike', password: 'mike123' },
  staff: { username: 'sarah', password: 'sarah123' },
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const authChecked = useRef(false)
  const navigate = useNavigate()

  // Restore session on refresh
  useEffect(() => {
    if (authChecked.current) return

    const saved = localStorage.getItem('biztrack_user')
    if (saved) {
      const parsed = JSON.parse(saved)
      setUser(parsed)
      setIsAuthenticated(true)
    }

    setIsLoading(false)
    authChecked.current = true
  }, [])

  // Normal login
  const login = useCallback(async (username: string, password: string) => {
    await new Promise((r) => setTimeout(r, 500))

    let loggedInUser: User | null = null

    if (
      username === mockCredentials.owner.username &&
      password === mockCredentials.owner.password
    ) {
      loggedInUser = mockOwner
    } else if (
      username === mockCredentials.manager.username &&
      password === mockCredentials.manager.password
    ) {
      loggedInUser = {
        id: 'mike-1',
        name: 'Mike Wilson',
        email: 'mike@biztrack.com',
        role: 'manager',
      }
    } else if (
      username === mockCredentials.staff.username &&
      password === mockCredentials.staff.password
    ) {
      loggedInUser = {
        id: 'sarah-1',
        name: 'Sarah Johnson',
        email: 'sarah@biztrack.com',
        role: 'staff',
      }
    }

    if (loggedInUser) {
      setUser(loggedInUser)
      setIsAuthenticated(true)
      localStorage.setItem('biztrack_user', JSON.stringify(loggedInUser))
      return true
    }

    return false
  }, [])

  // ⭐ GOOGLE LOGIN
  const googleLogin = useCallback((googleUser: any) => {
    // googleUser contains: name, email, picture, sub, etc.
    const loggedInUser: User = {
      id: googleUser.sub,
      name: googleUser.name,
      email: googleUser.email,
      role: "owner",        // you can adjust role if needed
    }

    setUser(loggedInUser)
    setIsAuthenticated(true)
    localStorage.setItem("biztrack_user", JSON.stringify(loggedInUser))

    navigate("/", { replace: true })   // redirect to dashboard
  }, [navigate])

  // Logout
  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('biztrack_user')
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      googleLogin,     // ⭐ INCLUDED
      logout,
    }),
    [user, isAuthenticated, isLoading, login, googleLogin, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
