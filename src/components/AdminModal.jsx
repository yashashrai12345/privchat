import { useState, useEffect } from 'react'
import { getLocalUserCodes, createNewUserCode, updateUserCode, deleteUserCode } from '../lib/userCodeUtils'

export default function AdminModal({ isOpen, onClose }) {
  const [codesList, setCodesList] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [roleInput, setRoleInput] = useState('user')
  const [editingCode, setEditingCode] = useState(null) // null if creating, originalCode if editing
  const [searchFilter, setSearchFilter] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const [copiedInvite, setCopiedInvite] = useState(null)
  const [statusMsg, setStatusMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  function loadCodes() {
    setCodesList(getLocalUserCodes())
  }

  useEffect(() => {
    if (isOpen) {
      loadCodes()
      resetForm()
      setStatusMsg(null)
      setErrorMsg(null)
    }
  }, [isOpen])

  function resetForm() {
    setNameInput('')
    setCodeInput('')
    setRoleInput('user')
    setEditingCode(null)
    setErrorMsg(null)
  }

  if (!isOpen) return null

  function handleStartEdit(user) {
    setEditingCode(user.code)
    setNameInput(user.name)
    setCodeInput(user.code)
    setRoleInput(user.role || 'user')
    setStatusMsg(null)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)

    if (!nameInput.trim()) {
      setErrorMsg('Please enter a display name for the user')
      return
    }

    if (!codeInput.trim()) {
      setErrorMsg('Please enter a unique CODE for the user (e.g. USER-01, VIP-7)')
      return
    }

    if (editingCode) {
      // ── Edit Mode ──────────────────────────────────────────
      const res = await updateUserCode(editingCode, {
        newName: nameInput.trim(),
        newCode: codeInput.trim(),
        newRole: roleInput,
      })

      if (res.error) {
        setErrorMsg(res.error.message)
        return
      }

      setStatusMsg(`✓ Updated user "${res.data.name}" (${res.data.code}) successfully!`)
      resetForm()
      loadCodes()
    } else {
      // ── Create Mode ────────────────────────────────────────
      const res = await createNewUserCode({
        name: nameInput.trim(),
        code: codeInput.trim(),
        role: roleInput,
      })

      if (res.error) {
        setErrorMsg(res.error.message)
        return
      }

      setStatusMsg(`✓ User "${res.data.name}" created with CODE: ${res.data.code}`)
      resetForm()
      loadCodes()
    }
  }

  async function handleDelete(code, name) {
    if (code === 'ADMIN') {
      setErrorMsg('Cannot delete primary Admin account')
      return
    }
    if (window.confirm(`Are you sure you want to revoke CODE "${code}" for "${name}"?`)) {
      await deleteUserCode(code)
      if (editingCode === code) resetForm()
      loadCodes()
      setStatusMsg(`Revoked CODE ${code}`)
    }
  }

  async function handleCopy(code) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCopyInviteCard(user) {
    const inviteText = `👻 Welcome to PrivChat!\n👤 User: ${user.name}\n🔑 Your Access CODE: ${user.code}\n🌐 Link: ${window.location.origin}\n\n👉 Instructions: Open the link, enter your CODE, and search your friend's CODE to start a private ghost chat!`
    try {
      await navigator.clipboard.writeText(inviteText)
      setCopiedInvite(user.code)
      setTimeout(() => setCopiedInvite(null), 2500)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredList = codesList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.code.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const adminCount = codesList.filter((u) => u.role === 'admin').length
  const userCount = codesList.filter((u) => u.role !== 'admin').length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card admin-modal-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🛡️</span>
            <div>
              <h3>Admin User & CODE Manager</h3>
              <p className="text-muted text-xs">Create, edit, and assign unique CODEs directly to users</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Stats Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <span className="stat-num">{codesList.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-num">{userCount}</span>
            <span className="stat-label">Standard Users</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-num">{adminCount}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>

        {statusMsg && <div className="alert alert-success" style={{ marginBottom: 14 }}>{statusMsg}</div>}
        {errorMsg && <div className="alert alert-error" style={{ marginBottom: 14 }}>{errorMsg}</div>}

        {/* Create / Edit User Form */}
        <div className="admin-section-box" style={{ borderColor: editingCode ? 'var(--accent-start)' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 className="admin-section-title" style={{ margin: 0 }}>
              {editingCode ? `✏️ Edit User (Editing: ${editingCode})` : '➕ Create New User & Assign CODE'}
            </h4>
            {editingCode && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={resetForm}
                style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}
              >
                Cancel Edit ✕
              </button>
            )}
          </div>

          <form className="admin-gen-form" onSubmit={handleSubmit}>
            <div className="admin-input-grid">
              <div className="input-group">
                <label className="input-label">User Display Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter User Name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Admin-Assigned CODE</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ENTER CUSTOM CODE"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Role</label>
                <select
                  className="input"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                >
                  <option value="user">Regular User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingCode ? '💾 Save Changes' : '➕ Create & Issue User CODE'}
              </button>
              {editingCode && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Issued Codes Management List */}
        <div className="admin-section-box" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 className="admin-section-title" style={{ margin: 0 }}>
              📋 Users & Assigned CODEs ({filteredList.length})
            </h4>
            <input
              type="text"
              className="input input-sm"
              placeholder="Search user or code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{ width: 180, fontSize: 'var(--font-xs)', padding: '4px 8px' }}
            />
          </div>

          <div className="admin-codes-list">
            {filteredList.map((item) => (
              <div
                key={item.code}
                className="admin-code-item"
                style={{
                  borderLeft: editingCode === item.code ? '3px solid var(--accent-start)' : undefined,
                  background: editingCode === item.code ? 'var(--bg-elevated)' : undefined,
                }}
              >
                <div className="admin-code-info">
                  <div className="admin-avatar-small">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="admin-code-name">
                      {item.name}
                      {item.role === 'admin' && <span className="admin-badge">Admin</span>}
                    </div>
                    <code className="admin-code-pill">{item.code}</code>
                  </div>
                </div>

                <div className="admin-item-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleStartEdit(item)}
                    title="Edit User Name, CODE, or Role"
                    style={{ color: 'var(--accent-start)' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm copy-btn"
                    onClick={() => handleCopy(item.code)}
                    title="Copy CODE"
                  >
                    {copiedCode === item.code ? '✓ Copied' : '📋 Code'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyInviteCard(item)}
                    title="Copy full invite message with instructions"
                    style={{ color: 'var(--accent-end)' }}
                  >
                    {copiedInvite === item.code ? '✓ Invite Copied!' : '🎁 Invite'}
                  </button>
                  {item.code !== 'ADMIN' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(item.code, item.name)}
                      title="Revoke CODE"
                      style={{ color: 'var(--error)' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
