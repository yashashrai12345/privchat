import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/auth.css'

export default function AuthPage() {
  const { loginWithCode, loginAsAdmin } = useAuth()
  const [code, setCode] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleCodeLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await loginWithCode(code)
    if (res.error) {
      setError(res.error.message)
    }
    setLoading(false)
  }

  async function handleAdminLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await loginAsAdmin(adminPin)
    if (res.error) {
      setError(res.error.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="animated-bg" />

      <div className="auth-card glass-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">👻</div>
          <h1 className="text-gradient">PrivChat</h1>
          <p>Ghost Chat — Enter your Admin-issued CODE</p>
        </div>

        {error && (
          <div className="alert alert-error auth-error" role="alert">
            {error}
          </div>
        )}

        {!isAdminMode ? (
          <form className="auth-form" onSubmit={handleCodeLogin}>
            <div className="input-group">
              <label className="input-label" htmlFor="auth-code">
                Personal User CODE
              </label>
              <input
                id="auth-code"
                className="input code-input"
                type="text"
                placeholder="ENTER YOUR CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || !code.trim()}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Enter Ghost Chat →'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleAdminLogin}>
            <div className="input-group">
              <label className="input-label" htmlFor="admin-pin">
                Admin Secret PIN
              </label>
              <input
                id="admin-pin"
                className="input"
                type="password"
                placeholder="Enter Admin PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || !adminPin.trim()}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Login to Admin Portal 🛡️'}
            </button>
          </form>
        )}

        <div className="auth-toggle">
          {isAdminMode ? (
            <button onClick={() => { setIsAdminMode(false); setError(null); }}>
              ← Back to User CODE Login
            </button>
          ) : (
            <button onClick={() => { setIsAdminMode(true); setError(null); }}>
              🛡️ Admin Access
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
