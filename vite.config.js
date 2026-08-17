import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { WebSocketServer, WebSocket } from 'ws'

// In-memory store that persists for the lifetime of the dev server
const rooms = new Map()        // channelId -> Set of {ws, code, name}
const messageHistory = new Map() // channelId -> Array of message objects

function realtimeRelayPlugin() {
  return {
    name: 'privchat-realtime-relay',
    configureServer(server) {
      if (!server.httpServer) return

      const wss = new WebSocketServer({ noServer: true })

      server.httpServer.on('upgrade', (req, socket, head) => {
        if (req.url && req.url.startsWith('/realtime-relay')) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req)
          })
        }
      })

      wss.on('connection', (ws) => {
        let currentChannel = null
        let myCode = null
        let myName = null

        function broadcast(data, excludeSelf = true) {
          if (!currentChannel || !rooms.has(currentChannel)) return
          const msg = typeof data === 'string' ? data : JSON.stringify(data)
          for (const client of rooms.get(currentChannel)) {
            if (excludeSelf && client.ws === ws) continue
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(msg)
            }
          }
        }

        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString())

            // ── JOIN ────────────────────────────────────────────────
            if (data.type === 'join') {
              currentChannel = data.channelId
              myCode = data.senderCode
              myName = data.senderName || myCode

              if (!rooms.has(currentChannel)) {
                rooms.set(currentChannel, new Set())
              }
              rooms.get(currentChannel).add({ ws, code: myCode, name: myName })

              // Send full history to new joiner
              const history = messageHistory.get(currentChannel) || []
              ws.send(JSON.stringify({ type: 'history', messages: history }))

              // Notify others I joined
              broadcast({ type: 'presence_join', senderCode: myCode, senderName: myName })

              // Tell me if someone else is already here
              const others = [...rooms.get(currentChannel)].filter(c => c.ws !== ws)
              if (others.length > 0) {
                ws.send(JSON.stringify({ type: 'room_ready', participantCount: rooms.get(currentChannel).size }))
              }

            // ── MESSAGE ─────────────────────────────────────────────
            } else if (data.type === 'message') {
              if (!currentChannel) return
              if (!messageHistory.has(currentChannel)) messageHistory.set(currentChannel, [])
              const history = messageHistory.get(currentChannel)
              if (!history.find(m => m.id === data.id)) {
                history.push(data)
              }
              // Broadcast to ALL clients including sender confirmation
              broadcast(data, false)

            // ── EDIT MESSAGE ────────────────────────────────────────
            } else if (data.type === 'edit_message') {
              if (!currentChannel || !messageHistory.has(currentChannel)) return
              const history = messageHistory.get(currentChannel)
              const msg = history.find(m => m.id === data.id)
              if (msg) {
                msg.text = data.newText
                msg.edited = true
                msg.updatedAt = data.updatedAt
              }
              broadcast(data, false)

            // ── DELETE MESSAGE ──────────────────────────────────────
            } else if (data.type === 'delete_message') {
              if (!currentChannel) return
              if (messageHistory.has(currentChannel)) {
                const filtered = messageHistory.get(currentChannel).filter(m => m.id !== data.id)
                messageHistory.set(currentChannel, filtered)
              }
              broadcast(data, false)

            // ── TYPING / PRESENCE ───────────────────────────────────
            } else if (currentChannel) {
              broadcast(data)
            }
          } catch (err) {
            console.error('[Relay] Error:', err)
          }
        })

        ws.on('close', () => {
          if (currentChannel && rooms.has(currentChannel)) {
            const room = rooms.get(currentChannel)
            for (const client of room) {
              if (client.ws === ws) { room.delete(client); break }
            }
            if (room.size === 0) {
              rooms.delete(currentChannel)
            } else {
              broadcast({ type: 'presence_leave', senderCode: myCode }, false)
            }
          }
        })
      })

      console.log('[PrivChat] Realtime relay started on /realtime-relay')
    },
  }
}

export default defineConfig({
  plugins: [react(), realtimeRelayPlugin()],
  server: {
    port: 5173,
    open: true,
  },
})
