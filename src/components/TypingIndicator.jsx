/**
 * TypingIndicator — WhatsApp-style animated dots
 */
export default function TypingIndicator({ username }) {
  return (
    <div className="typing-indicator-wrapper">
      <div className="typing-indicator">
        <div className="typing-dots">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  )
}
