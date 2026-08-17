/**
 * Generates a random 8-character alphanumeric Unified Key.
 * Uses uppercase letters and digits for readability.
 */
export function generateUnifiedKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous: 0/O, 1/I
  let key = ''
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (let i = 0; i < 8; i++) {
    key += chars[array[i] % chars.length]
  }
  return key
}

/**
 * Creates a new room in the database with the given Unified Key.
 */
export async function createRoom(supabase, unifiedKey, userId) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      unified_key: unifiedKey,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    // If key already exists, generate a new one
    if (error.code === '23505') {
      return { data: null, error: { message: 'Key already exists. Try generating a new one.' } }
    }
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Finds a room by its Unified Key.
 */
export async function findRoom(supabase, unifiedKey) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('unified_key', unifiedKey.toUpperCase().trim())
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: { message: 'Room not found. Check the key and try again.' } }
    }
    return { data: null, error }
  }

  return { data, error: null }
}
