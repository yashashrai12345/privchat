import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { findUserByCode, getLocalUserCodes } from '../lib/userCodeUtils'

const AuthContext = createContext(null)
const SESSION_STORAGE_KEY = 'privchat_active_session'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null) // { code, name, role }
  const [loading, setLoading] = useState(true)

  // Initialize on mount from tab-specific sessionStorage
  useEffect(() => {
    // 1. Check if user is logged in locally in this tab
    try {
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (savedSession) {
        const parsed = JSON.parse(savedSession)
        setCurrentUser(parsed)
        setLoading(false)
        return
      }
    } catch (e) {
      console.error('Failed to parse active session', e)
    }

    // 2. Check Supabase auth if configured
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u = {
            id: session.user.id,
            code: session.user.user_metadata?.code || 'PRIV-USER',
            name: session.user.user_metadata?.username || session.user.email?.split('@')[0],
            role: session.user.user_metadata?.role || 'user',
          }
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(u))
          setCurrentUser(u)
        }
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u = {
            id: session.user.id,
            code: session.user.user_metadata?.code || 'PRIV-USER',
            name: session.user.user_metadata?.username || session.user.email?.split('@')[0],
            role: session.user.user_metadata?.role || 'user',
          }
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(u))
          setCurrentUser(u)
        }
      })

      return () => subscription?.unsubscribe()
    }

    setLoading(false)
  }, [])

  /**
   * Log in using an Admin-generated CODE (isolated per tab)
   */
  async function loginWithCode(code) {
    if (!code || !code.trim()) {
      return { error: { message: 'Please enter a valid CODE' } }
    }

    const { data: user, error } = await findUserByCode(code)
    if (error || !user) {
      return { error: error || { message: 'Invalid CODE. Ask your admin for access.' } }
    }

    const sessionData = {
      code: user.code,
      name: user.name,
      role: user.role || 'user',
    }

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData))
    setCurrentUser(sessionData)
    return { data: sessionData, error: null }
  }

  /**
   * Admin login with PIN
   */
  async function loginAsAdmin(pin) {
    if (pin === 'admin123' || pin === 'admin') {
      const adminUser = {
        code: 'ADMIN',
        name: 'Admin',
        role: 'admin',
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(adminUser))
      setCurrentUser(adminUser)
      return { data: adminUser, error: null }
    }
    return { error: { message: 'Invalid Admin PIN' } }
  }

  /**
   * Logout
   */
  async function logout() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Supabase signout err', err)
      }
    }
    setCurrentUser(null)
  }

  const value = {
    currentUser,
    user: currentUser, // alias
    isAdmin: currentUser?.role === 'admin',
    loading,
    isSupabaseConfigured,
    loginWithCode,
    loginAsAdmin,
    logout,
    signOut: logout, // alias
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
