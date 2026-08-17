import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { findUserByCode, setActiveChatPartner } from '../lib/userCodeUtils'
import AdminModal from '../components/AdminModal'
import '../styles/home.css'

export default function HomePage() {
  const { currentUser, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const [searchCode, setSearchCode] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [copiedMyCode, setCopiedMyCode] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    setSearchError(null)
    setSearchResult(null)

    const trimmed = searchCode.trim().toUpperCase()
    if (!trimmed) {
      setSearchError('Please enter a CODE to search')
      return
    }

    if (trimmed === currentUser?.code) {
      setSearchError('That is your own CODE! Search another user’s CODE to chat.')
      return
    }

    setSearching(true)
    const res = await findUserByCode(trimmed)
    setSearching(false)

    if (res.error || !res.data) {
      setSearchError(res.error?.message || `No contact found for CODE: ${trimmed}`)
    } else {
      setSearchResult(res.data)
    }
  }

  function handleStartChat(partner) {
    setActiveChatPartner(partner.code)
    navigate(`/chat/${partner.code}`, {
      state: { partner },
    })
  }

  async function handleCopyMyCode() {
    if (!currentUser?.code) return
    try {
      await navigator.clipboard.writeText(currentUser.code)
      setCopiedMyCode(true)
      setTimeout(() => setCopiedMyCode(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="home-page">
      <div className="animated-bg" />

      {/* Top Bar (Mobile-Optimized) */}
      <header className="home-topbar">
        <div className="home-topbar-left">
          <div className="home-topbar-logo">👻</div>
          <div className="home-brand-text">
            <h2 className="text-gradient home-brand-name">PrivChat</h2>
            <span className="text-muted text-xs home-tagline">Ghost Network</span>
          </div>
        </div>

        <div className="home-topbar-right">
          {/* User's assigned CODE pill */}
          <button
            className="my-code-chip"
            onClick={handleCopyMyCode}
            title="Click to copy your CODE"
          >
            <span className="my-code-label">My CODE:</span>
            <code>{currentUser?.code}</code>
            <span className="copy-icon">{copiedMyCode ? '✓' : '📋'}</span>
          </button>

          {isAdmin && (
            <button
              className="btn btn-secondary btn-sm admin-top-btn"
              onClick={() => setIsAdminModalOpen(true)}
              title="Admin CODE Manager"
            >
              🛡️ <span className="btn-text-desktop">Admin</span>
            </button>
          )}

          <div className="home-user-badge">
            <div className="home-user-avatar">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <span className="user-display-name">{currentUser?.name}</span>
          </div>

          <button className="btn btn-ghost btn-sm logout-top-btn" onClick={logout} title="Logout">
            <span className="logout-icon">🚪</span>
            <span className="btn-text-desktop">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-content">
        {/* Search Bar Section */}
        <div className="search-section glass-card">
          <div className="search-header">
            <h3>🔍 Connect with Contact</h3>
            <p className="text-secondary text-sm">
              Enter any person's unique CODE to start an encrypted 1:1 chat.
            </p>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="input search-input"
              placeholder="ENTER CONTACT CODE..."
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value.toUpperCase())
                setSearchError(null)
              }}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary search-submit-btn"
              disabled={searching || !searchCode.trim()}
            >
              {searching ? 'Searching...' : 'Find Contact →'}
            </button>
          </form>

          {searchError && (
            <div className="alert alert-error" style={{ marginTop: 'var(--space-3)' }}>
              {searchError}
            </div>
          )}

          {/* Search Result Contact Card */}
          {searchResult && (
            <div className="contact-result-card animate-scale-in">
              <div className="contact-info-left">
                <div className="contact-avatar">
                  {searchResult.name.charAt(0)}
                </div>
                <div className="contact-meta-wrapper">
                  <h4 className="contact-name">{searchResult.name}</h4>
                  <div className="contact-code-meta">
                    <code>{searchResult.code}</code>
                    <span className="status-indicator online">
                      <span className="status-dot online" /> Active
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary chat-now-btn"
                onClick={() => handleStartChat(searchResult)}
              >
                Start Ghost Chat 💬
              </button>
            </div>
          )}
        </div>

        {/* Empty State / Privacy Info */}
        {!searchResult && (
          <div className="home-empty-state">
            <div className="home-empty-icon">🛡️</div>
            <h2>Zero Contact List & Zero Logs</h2>
            <p>
              Your home screen never displays saved contacts or past history.
              Search a contact's CODE above to start talking.
            </p>
          </div>
        )}

        {/* Privacy Badge */}
        <div className="privacy-badge">
          Admin-Issued CODEs · Realtime WebSocket · History Purge
        </div>
      </main>

      {/* Admin Code Manager Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  )
}
