import React,{
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'React'

import {useNavigate} from 'react-router-dom'

export type UserRole='owner'|'manager'|'staff'

export interface User{
  id:string
  name:string
  email:string
  role:UserRole
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
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

export const AuthProvider:ReactFC <{childer:React.Reactnode}>=({
  children,
})=>{
  const [user,setUser]=useStae<User|null>(null)>
  const[isAuthenticated,setIsAutthenticated]=useState(false)
  const[isLoading,setIsLoading] =useState(true)
  const authChecked = useRef(false)
  const navigate = useNavigate()  

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

}

