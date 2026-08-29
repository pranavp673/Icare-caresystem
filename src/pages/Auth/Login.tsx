import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "./Login.scss"
import { STRINGS } from "../../i18n/strings"
import { identityService } from "../../services"
import { setAuthToken } from "../../services/gateway/tokenStore"
import { MOCK_USERS } from "../../auth/user"
import type { MockUser } from "../../auth/user"

/**
 * AUTH-001 — Sign in.
 *
 * In the mock phase the Login page doubles as a demo user picker: the
 * six tiered mock users are shown as clickable cards so reviewers can
 * experience the system from RSW through System Admin without
 * remembering credentials. Clicking a card writes the chosen user id
 * into localStorage (`icare.user`) and navigates to the app shell,
 * which bootstraps AuthContext from the stored identity.
 *
 * The original email / password form is preserved below the demo cards
 * for future integration with the real IdSvc.
 */

/** Short human-readable summaries of what each tier can do. */
const TIER_LABELS: Record<string, { tier: string; color: string; summary: string }> = {
  "u-pro": {
    tier: "Tier 5",
    color: "#22c55e",
    summary: "Own schedule, timesheets, read residents, write comments",
  },
  "u-tl": {
    tier: "Tier 4",
    color: "#3b82f6",
    summary: "Team schedules, rota view, manage hub, residents",
  },
  "u-ad": {
    tier: "Tier 3",
    color: "#a855f7",
    summary: "Mon–Fri 9–5 · Home dashboard, approve variances, audit log",
  },
  "u-hm": {
    tier: "Tier 3",
    color: "#f59e0b",
    summary: "Mon–Fri 9–5 · Full authority for Willow House — dashboard, teams, audit",
  },
  "u-sm": {
    tier: "Tier 2",
    color: "#e11d48",
    summary: "All homes — view & audit oversight, no write or approval access",
  },
  "u-sys": {
    tier: "Tier 1",
    color: "#ef4444",
    summary: "Everything — all homes, all operations, plus system config",
  },
}

const Login: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null)
  const navigate = useNavigate()

  /** Standard email / password login (for future real-backend use). */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    void identityService
      .login({ email, password })
      .then((res) => {
        setAuthToken(res.token)
        navigate("/")
      })
      .catch((err: unknown) => {
        setBusy(false)
        setError(
          err instanceof Error && err.message
            ? err.message
            : "We couldn't sign you in — please try again."
        )
      })
  }

  /** Demo card click — persist user id, set token, enter app. */
  const handleDemoLogin = (user: MockUser) => {
    setLoggingInAs(user.id)
    try {
      window.localStorage.setItem("icare.user", user.id)
    } catch {
      /* storage denied */
    }
    void identityService
      .login({ email: user.name, password: "demo" })
      .then((res) => {
        setAuthToken(res.token)
        // Full page load so AuthContext re-bootstraps with the new user
        window.location.href = "/"
      })
      .catch(() => {
        setLoggingInAs(null)
      })
  }

  return (
    <div className="login">
      <div className="login__backdrop" aria-hidden="true" />
      <div className="login__card-wrap login__card-wrap--wide">
        <div className="login__brand">
          <div className="login__logo" aria-hidden="true">I</div>
          <div>
            <div className="login__brand-name">{STRINGS.app.name}</div>
            <div className="login__brand-tag">{STRINGS.app.tagline}</div>
          </div>
        </div>

        {/* ── Demo User Picker ── */}
        <div className="login__demo-section">
          <div className="login__demo-header">
            <h2>Choose a demo account</h2>
            <p>Each role sees a different set of pages and actions — click a card to sign in.</p>
          </div>

          <div className="login__demo-grid">
            {MOCK_USERS.map((u) => {
              const meta = TIER_LABELS[u.id] ?? { tier: "?", color: "#888", summary: "" }
              const isLoading = loggingInAs === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`login__demo-card ${isLoading ? "is-loading" : ""}`}
                  onClick={() => handleDemoLogin(u)}
                  disabled={!!loggingInAs}
                  style={{ "--card-accent": meta.color } as React.CSSProperties}
                >
                  <span className="login__demo-avatar" aria-hidden="true">
                    {u.initials}
                  </span>
                  <span className="login__demo-info">
                    <span className="login__demo-name">{u.name}</span>
                    <span className="login__demo-role">{u.roleLabel}</span>
                    <span className="login__demo-summary">{meta.summary}</span>
                  </span>
                  <span className="login__demo-tier">{meta.tier}</span>
                  {isLoading && <span className="login__demo-spinner" />}
                </button>
              )
            })}
          </div>

          <div className="login__demo-legend">
            <p>
              <strong>Permissions, not roles</strong> — the sidebar, buttons, and pages you see
              are controlled by a flat permission list. Higher tiers accumulate more permissions;
              System Admin holds every permission in the system.
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="login__divider" aria-hidden="true">
          <span>or sign in with credentials</span>
        </div>

        {/* ── Traditional Login Form ── */}
        <form className="login__card" onSubmit={onSubmit} noValidate>
          <label className="login__field">
            <span className="login__label">{STRINGS.auth.login.emailLabel}</span>
            <input
              type="email"
              autoComplete="username"
              required
              placeholder={STRINGS.auth.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="login__field">
            <span className="login__label-row">
              <span className="login__label">{STRINGS.auth.login.passwordLabel}</span>
              <a className="login__forgot" href="#forgot">
                {STRINGS.auth.login.forgot}
              </a>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder={STRINGS.auth.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <div role="alert" className="login__error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary login__submit"
            disabled={busy}
          >
            {busy ? STRINGS.common.loading : STRINGS.auth.login.submit}
          </button>
        </form>

        <p className="login__footer">
          {STRINGS.auth.login.helpFooter}{" "}
          <Link to="/">Skip to demo →</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
