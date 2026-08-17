import { supabase, isSupabaseConfigured } from './supabase'

const LOCAL_STORAGE_KEY = 'privchat_user_codes'

/**
 * Get all user codes stored locally
 */
export function getLocalUserCodes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.error('Failed to parse local user codes', e)
  }

  // Initial clean state with primary Admin only
  const initial = [
    {
      code: 'ADMIN',
      name: 'Admin',
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
    },
  ]
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial))
  return initial
}

/**
 * Save user code to local storage and sync to Supabase if configured
 */
export async function createNewUserCode({ name, code, role = 'user' }) {
  if (!code || !code.trim()) {
    return { data: null, error: { message: 'Please enter a CODE for the user' } }
  }

  const finalCode = code.toUpperCase().trim()
  const newUser = {
    code: finalCode,
    name: name.trim(),
    role,
    createdAt: new Date().toISOString(),
    status: 'active',
  }

  // 1. Update local storage
  const existing = getLocalUserCodes()
  const duplicate = existing.find((u) => u.code === finalCode)
  if (duplicate) {
    return { data: null, error: { message: `Code "${finalCode}" already exists!` } }
  }

  const updated = [newUser, ...existing]
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))

  // Broadcast code creation event across local tabs
  try {
    const syncChannel = new BroadcastChannel('privchat_user_sync')
    syncChannel.postMessage({ type: 'user_created', user: newUser })
    syncChannel.close()
  } catch (e) {}

  // 2. Sync to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from('user_codes').insert({
        code: finalCode,
        display_name: name.trim(),
        role,
      })
    } catch (err) {
      console.warn('Supabase sync error (non-fatal):', err)
    }
  }

  return { data: newUser, error: null }
}

/**
 * Update an existing user's details (Name, CODE, Role)
 */
export async function updateUserCode(originalCode, { newName, newCode, newRole }) {
  const targetOriginal = originalCode.toUpperCase().trim()
  const targetNewCode = (newCode || originalCode).toUpperCase().trim()
  const existing = getLocalUserCodes()

  // Check if new code conflicts with a DIFFERENT user
  if (targetNewCode !== targetOriginal && existing.some((u) => u.code === targetNewCode)) {
    return { data: null, error: { message: `CODE "${targetNewCode}" is already in use by another user!` } }
  }

  let updatedUser = null
  const updatedList = existing.map((u) => {
    if (u.code === targetOriginal) {
      updatedUser = {
        ...u,
        name: newName ? newName.trim() : u.name,
        code: targetNewCode,
        role: newRole || u.role,
        updatedAt: new Date().toISOString(),
      }
      return updatedUser
    }
    return u
  })

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList))

  try {
    const syncChannel = new BroadcastChannel('privchat_user_sync')
    syncChannel.postMessage({ type: 'user_updated', user: updatedUser, originalCode: targetOriginal })
    syncChannel.close()
  } catch (e) {}

  if (isSupabaseConfigured && updatedUser) {
    try {
      await supabase
        .from('user_codes')
        .update({
          code: targetNewCode,
          display_name: updatedUser.name,
          role: updatedUser.role,
        })
        .eq('code', targetOriginal)
    } catch (err) {
      console.warn('Supabase update error:', err)
    }
  }

  return { data: updatedUser, error: null }
}

/**
 * Delete / Revoke a user CODE
 */
export async function deleteUserCode(codeToDelete) {
  const target = codeToDelete.toUpperCase().trim()
  const existing = getLocalUserCodes()
  const updated = existing.filter((u) => u.code !== target)

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))

  try {
    const syncChannel = new BroadcastChannel('privchat_user_sync')
    syncChannel.postMessage({ type: 'user_deleted', code: target })
    syncChannel.close()
  } catch (e) {}

  if (isSupabaseConfigured) {
    try {
      await supabase.from('user_codes').delete().eq('code', target)
    } catch (err) {
      console.warn('Supabase delete error:', err)
    }
  }

  return { success: true }
}

/**
 * Find user by CODE (from local storage or Supabase)
 */
export async function findUserByCode(code) {
  if (!code) return { data: null, error: { message: 'Code is required' } }
  const searchCode = code.toUpperCase().trim()

  // 1. Check local storage
  const localList = getLocalUserCodes()
  const localUser = localList.find((u) => u.code === searchCode)

  if (localUser) {
    return { data: localUser, error: null }
  }

  // 2. Check Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_codes')
        .select('*')
        .eq('code', searchCode)
        .single()

      if (data && !error) {
        return {
          data: {
            code: data.code,
            name: data.display_name,
            role: data.role || 'user',
          },
          error: null,
        }
      }
    } catch (err) {
      console.error('Supabase lookup failed:', err)
    }
  }

  return { data: null, error: { message: `No contact found for CODE: ${searchCode}` } }
}

/**
 * Deterministic channel ID for a 1:1 conversation between two user codes
 */
export function get1on1ChannelId(codeA, codeB) {
  const sorted = [codeA.toUpperCase().trim(), codeB.toUpperCase().trim()].sort()
  return `pvt_${sorted[0]}_${sorted[1]}`
}

// ── In-Memory Active Chat Session ──────────────────────────
let activeChatPartnerCode = null

export function setActiveChatPartner(partnerCode) {
  activeChatPartnerCode = partnerCode ? partnerCode.toUpperCase().trim() : null
}

export function getActiveChatPartner() {
  return activeChatPartnerCode
}

export function clearActiveChatPartner() {
  activeChatPartnerCode = null
}
