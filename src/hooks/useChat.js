import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { get1on1ChannelId } from '../lib/userCodeUtils'

const CHAT_STORAGE_PREFIX = 'privchat_msgs_'

export function useChat(partnerCode) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState([])
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef(null)
  const wsRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  // Track processed IDs to prevent duplicate display
  const processedIds = useRef(new Set())

  const myCode = currentUser?.code
  const myName = currentUser?.name || 'User'

  function getChannelId() {
    return get1on1ChannelId(myCode, partnerCode)
  }

  function persistMessages(channelId, msgs) {
    try {
      localStorage.setItem(`${CHAT_STORAGE_PREFIX}${channelId}`, JSON.stringify(msgs))
    } catch (e) { }
  }

  // Load cached messages on mount
  useEffect(() => {
    if (!partnerCode || !myCode) return
    const channelId = getChannelId()
    try {
      const raw = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${channelId}`)
      if (raw) {
        const cached = JSON.parse(raw)
        cached.forEach(m => processedIds.current.add(m.id))
        setMessages(cached.map(m => ({ ...m, isMine: m.senderCode === myCode })))
      }
    } catch (e) { }
  }, [partnerCode, myCode])

  useEffect(() => {
    if (!partnerCode || !myCode) return
    const channelId = getChannelId()

    function applyIncoming(data) {
      if (!data) return

      switch (data.type) {
        case 'history': {
          const msgs = (data.messages || []).map(m => {
            processedIds.current.add(m.id)
            return { ...m, isMine: m.senderCode === myCode }
          })
          setMessages(msgs)
          persistMessages(channelId, msgs)
          break
        }
        case 'message': {
          // Skip duplicates (we already added our own messages optimistically)
          if (processedIds.current.has(data.id)) return
          processedIds.current.add(data.id)
          const newMsg = { ...data, isMine: data.senderCode === myCode }
          setMessages(prev => {
            const updated = [...prev, newMsg]
            persistMessages(channelId, updated)
            return updated
          })
          break
        }
        case 'edit_message': {
          setMessages(prev => {
            const updated = prev.map(m =>
              m.id === data.id ? { ...m, text: data.newText, edited: true } : m
            )
            persistMessages(channelId, updated)
            return updated
          })
          break
        }
        case 'delete_message': {
          setMessages(prev => {
            const updated = prev.filter(m => m.id !== data.id)
            persistMessages(channelId, updated)
            return updated
          })
          break
        }
        case 'presence_join':
        case 'presence_ping':
        case 'room_ready': {
          if (data.senderCode && data.senderCode !== myCode) {
            setPartnerInfo(prev => ({
              code: data.senderCode,
              name: data.senderName || prev?.name || partnerCode,
              online: true,
              typing: prev?.typing || false,
            }))
          }
          break
        }
        case 'typing': {
          if (data.senderCode !== myCode) {
            setPartnerInfo(prev => ({
              code: data.senderCode || partnerCode,
              name: data.senderName || prev?.name || partnerCode,
              online: true,
              typing: Boolean(data.typing),
            }))
          }
          break
        }
        case 'presence_leave': {
          if (data.senderCode !== myCode) {
            setPartnerInfo(prev =>
              prev ? { ...prev, online: false, typing: false } : null
            )
          }
          break
        }
      }
    }

    // ── WebSocket Relay ────────────────────────────────────────
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/realtime-relay`
    let ws

    try {
      ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        ws.send(JSON.stringify({ type: 'join', channelId, senderCode: myCode, senderName: myName }))
      }

      ws.onmessage = (e) => {
        try { applyIncoming(JSON.parse(e.data)) } catch { }
      }

      ws.onclose = () => setIsConnected(false)
      ws.onerror = (e) => console.warn('[WS] error', e)
    } catch (e) {
      console.warn('[WS] init error', e)
    }

    // ── Supabase Realtime ──────────────────────────────────────
    if (isSupabaseConfigured) {
      const ch = supabase.channel(`chat-${channelId}`, {
        config: { broadcast: { self: false }, presence: { key: myCode } },
      })

      ch.on('broadcast', { event: '*' }, ({ payload }) => applyIncoming(payload))
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState()
        const partner = Object.entries(state).find(([k]) => k !== myCode)
        if (partner) {
          const presence = partner[1][partner[1].length - 1]
          setPartnerInfo({
            code: partnerCode,
            name: presence.name || partnerCode,
            online: true,
            typing: presence.typing || false,
          })
        }
      })
      ch.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          ch.track({ name: myName, typing: false })
        }
      })
      channelRef.current = ch
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'presence_leave', senderCode: myCode }))
          ws.close()
        } catch { }
      }
      wsRef.current = null
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      setIsConnected(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [partnerCode, myCode, myName])

  // ── Send ─────────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!text.trim() || !myCode) return
    const channelId = getChannelId()
    const id = crypto.randomUUID()
    processedIds.current.add(id)

    const payload = {
      type: 'message',
      id,
      text: text.trim(),
      senderCode: myCode,
      senderName: myName,
      timestamp: new Date().toISOString(),
      edited: false,
    }

    // Optimistic local add
    const myMsg = { ...payload, isMine: true }
    setMessages(prev => {
      const updated = [...prev, myMsg]
      persistMessages(channelId, updated)
      return updated
    })

    // WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }

    // Supabase
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'message', payload })
    }
  }, [myCode, myName, partnerCode])

  // ── Edit ─────────────────────────────────────────────────────
  const editMessage = useCallback((messageId, newText) => {
    if (!messageId || !newText.trim() || !myCode) return
    const channelId = getChannelId()
    const payload = { type: 'edit_message', id: messageId, newText: newText.trim(), updatedAt: new Date().toISOString() }

    setMessages(prev => {
      const updated = prev.map(m => m.id === messageId ? { ...m, text: newText.trim(), edited: true } : m)
      persistMessages(channelId, updated)
      return updated
    })

    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
    if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'edit_message', payload })
  }, [myCode, partnerCode])

  // ── Delete for everyone (broadcast) ───────────────────────────
  const deleteMessage = useCallback((messageId) => {
    if (!messageId || !myCode) return
    const channelId = getChannelId()
    const payload = { type: 'delete_message', id: messageId }

    setMessages(prev => {
      const updated = prev.filter(m => m.id !== messageId)
      persistMessages(channelId, updated)
      return updated
    })

    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
    if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'delete_message', payload })
  }, [myCode, partnerCode])

  // ── Delete for me only (local, no broadcast) ──────────────────
  const deleteForMe = useCallback((messageId) => {
    if (!messageId || !myCode) return
    const channelId = getChannelId()
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== messageId)
      persistMessages(channelId, updated)
      return updated
    })
  }, [myCode, partnerCode])

  // ── Typing ───────────────────────────────────────────────────
  const setTyping = useCallback((isTyping) => {
    if (!myCode) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    const payload = { type: 'typing', senderCode: myCode, senderName: myName, typing: Boolean(isTyping) }
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
    if (channelRef.current) channelRef.current.track({ name: myName, typing: Boolean(isTyping) })

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        const reset = { ...payload, typing: false }
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(reset))
        if (channelRef.current) channelRef.current.track({ name: myName, typing: false })
      }, 2500)
    }
  }, [myCode, myName])

  return { messages, partnerInfo, isConnected, sendMessage, editMessage, deleteMessage, deleteForMe, setTyping }
}
