import { useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateUnifiedKey, createRoom, findRoom } from '../lib/roomUtils'
import { useAuth } from '../contexts/AuthContext'

/**
 * Custom hook for room creation and joining.
 */
export function useRoom() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Generate a new Unified Key and create a room in the database.
   * Returns the key on success.
   */
  const generateRoom = useCallback(async () => {
    if (!user) return { key: null, error: 'Not authenticated' }

    setLoading(true)
    setError(null)

    const key = generateUnifiedKey()

    if (!isSupabaseConfigured) {
      setLoading(false)
      return { key, error: null }
    }

    const { data, error: createError } = await createRoom(supabase, key, user.id)

    setLoading(false)

    if (createError) {
      setError(createError.message)
      return { key: null, error: createError.message }
    }

    return { key, error: null }
  }, [user])

  /**
   * Join an existing room by Unified Key.
   * Returns the room data on success.
   */
  const joinRoom = useCallback(async (key) => {
    if (!user) return { room: null, error: 'Not authenticated' }
    if (!key || !key.trim()) return { room: null, error: 'Please enter a Unified Key' }

    setLoading(true)
    setError(null)

    const normalizedKey = key.toUpperCase().trim()

    if (!isSupabaseConfigured) {
      setLoading(false)
      return { room: { unified_key: normalizedKey }, error: null }
    }

    const { data, error: findError } = await findRoom(supabase, normalizedKey)

    setLoading(false)

    if (findError) {
      setError(findError.message)
      return { room: null, error: findError.message }
    }

    return { room: data, error: null }
  }, [user])

  const clearError = useCallback(() => setError(null), [])

  return {
    loading,
    error,
    generateRoom,
    joinRoom,
    clearError,
  }
}
