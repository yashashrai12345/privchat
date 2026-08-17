/**
 * ChatHeader — WhatsApp-like header with avatar, name, status, and exit button
 */
export default function ChatHeader({ partnerInfo, onExit }) {
  const name = partnerInfo?.name || partnerInfo?.code || 'Chat'
  const online = Boolean(partnerInfo?.online)
  const typing = Boolean(partnerInfo?.typing)

  // Generate initials avatar letter(s)
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Status text
  const statusText = typing ? 'typing...' : online ? 'online' : 'tap to view contact'

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        {/* Back button */}
        <button
          className="chat-back-btn"
          onClick={onExit}
          aria-label="Back"
        >
          ‹
        </button>

        {/* Avatar */}
        <div className="chat-partner-avatar">
          {initials || '?'}
        </div>

        {/* Name + status */}
        <div className="chat-partner-info">
          <span className="chat-partner-name">{name}</span>
          <span className={`chat-partner-status ${online ? 'online' : 'offline'}`}>
            {typing ? (
              <span style={{ color: 'var(--wa-green)', fontStyle: 'italic' }}>typing...</span>
            ) : (
              <>
                <span className={`status-dot ${online ? 'online' : 'offline'}`} />
                {online ? 'online' : 'away'}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Right side: code badge */}
      <div className="chat-header-right">
        {partnerInfo?.code && (
          <div
            className="chat-key-badge"
            title={`Partner code: ${partnerInfo.code}`}
          >
            🔑 {partnerInfo.code.toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
