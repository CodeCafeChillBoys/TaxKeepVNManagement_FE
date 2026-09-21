import { createContext, useState, useEffect, useCallback } from 'react'
import { authService } from '@/services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser())
  const [token, setToken] = useState(() => authService.getToken())
  const [isLoading, setIsLoading] = useState(true)

  // Khởi tạo và xác thực session khi app mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = authService.getToken()
      const savedUser = authService.getUser()

      if (savedToken && !authService.isTokenExpired(savedToken) && savedUser) {
        setUser(savedUser)
        setToken(savedToken)
      } else {
        authService.clearAuth()
        setUser(null)
        setToken(null)
      }
      setIsLoading(false)
    }

    initAuth()

    // Lắng nghe sự kiện token bị thu hồi hoặc hết hạn từ apiClient
    const handleUnauthorized = () => {
      authService.clearAuth()
      setUser(null)
      setToken(null)
    }

    window.addEventListener('taxkeep:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('taxkeep:unauthorized', handleUnauthorized)
    }
  }, [])

  const login = useCallback(async ({ citizenId, password, rememberMe = false }) => {
    const authData = await authService.login({ citizenId, password, rememberMe })
    setUser(authData)
    setToken(authData.token)
    return authData
  }, [])

  const register = useCallback(async (registerData) => {
    const response = await authService.register(registerData)
    return response
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setToken(null)
  }, [])

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...updatedFields }
      const isRemembered = Boolean(localStorage.getItem('taxkeep_token'))
      authService.saveAuthData(updated.token || token, updated, isRemembered)
      return updated
    })
  }, [token])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && !authService.isTokenExpired(token)),
    isLoading,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
