import { useState, useRef, useCallback } from 'react'

/**
 * MessageInput — WhatsApp-style input bar with send button.
 * - Enter sends, Shift+Enter newline
 * - Shows mic icon when empty, send arrow when text exists (like WhatsApp)
 * - Triggers typing indicator on keystroke (debounced)
 */
export default function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const typingDebounceRef = useRef(null)

  const handleChange = useCallback((e) => {
    setText(e.target.value)
    if (onTyping) {
      onTyping(true)
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
      typingDebounceRef.current = setTimeout(() => onTyping(false), 2000)
    }
  }, [onTyping])

  function handleSend() {
    if (!text.trim() || disabled) return
    onSend(text)
    setText('')
    if (onTyping) {
      onTyping(false)
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput(e) {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const hasText = text.trim().length > 0

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Message"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          rows={1}
          id="chat-message-input"
        />
      </div>
      <button
        className="btn chat-send-btn"
        onClick={handleSend}
        disabled={!hasText || disabled}
        title={hasText ? 'Send message' : 'Voice message'}
        id="chat-send-btn"
        aria-label="Send"
      >
        {hasText ? (
          // Paper plane / send arrow
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        ) : (
          // Mic icon (like WhatsApp)
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.41 2.72 6.23 6 6.72V21h2v-2.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
