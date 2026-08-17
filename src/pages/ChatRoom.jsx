import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../contexts/AuthContext'
import { findUserByCode, getActiveChatPartner, clearActiveChatPartner } from '../lib/userCodeUtils'
import ChatHeader from '../components/ChatHeader'
import MessageBubble from '../components/MessageBubble'
import TypingIndicator from '../components/TypingIndicator'
import MessageInput from '../components/MessageInput'
import '../styles/chat.css'

export default function ChatRoom() {
  const { partnerCode } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef(null)

  const [partnerProfile, setPartnerProfile] = useState(location.state?.partner || null)

  const {
    messages,
    partnerInfo,
    isConnected,
    sendMessage,
    editMessage,
    deleteMessage,
    deleteForMe,
    setTyping,
  } = useChat(partnerCode)

  // Enforce session check
  useEffect(() => {
    const activePartner = getActiveChatPartner()

    if (!activePartner || activePartner.toUpperCase() !== partnerCode?.toUpperCase()) {
      navigate('/', { replace: true })
      return
    }

    if (currentUser?.code && partnerCode && currentUser.code.toUpperCase() === partnerCode.toUpperCase()) {
      clearActiveChatPartner()
      navigate('/', { replace: true })
    }
  }, [partnerCode, currentUser, navigate])

  // Resolve partner details
  useEffect(() => {
    if (!partnerProfile && partnerCode) {
      findUserByCode(partnerCode).then((res) => {
        if (res.data) setPartnerProfile(res.data)
      })
    }
  }, [partnerCode, partnerProfile])

  // Auto-scroll on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, partnerInfo?.typing])

  function handleExit() {
    clearActiveChatPartner()
    navigate('/', { replace: true })
  }

  const displayName = partnerInfo?.name || partnerProfile?.name || partnerCode

  return (
    <div className="chat-page">
      {/* Header */}
      <ChatHeader
        partnerInfo={{
          ...partnerInfo,
          name: displayName,
          code: partnerCode,
        }}
        onExit={handleExit}
      />

      {/* Messages List */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-messages-empty">
            <div className="chat-messages-empty-icon">💬</div>
            <h3>Conversation with {displayName}</h3>
            <p>
              Messages are saved until you manually edit or delete them.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onEdit={editMessage}
              onDelete={deleteMessage}
              onDeleteForMe={deleteForMe}
            />
          ))
        )}

        {/* Typing indicator */}
        {partnerInfo?.typing && (
          <TypingIndicator username={displayName} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={setTyping}
        disabled={!isConnected}
      />
    </div>
  )
}
