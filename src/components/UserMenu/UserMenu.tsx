import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sun, Moon, Settings, LogOut, ChevronDown, Users } from "lucide-react"
import { useAuth } from "../../auth/AuthContext"
import { identityService } from "../../services"
import "./UserMenu.scss"

type ThemeMode = "light" | "dark" | "system"

type Props = {
  theme: "light" | "dark"
  themeMode: ThemeMode
  onToggleTheme: () => void
}

const demoUsers = identityService.listDemoUsers()

const UserMenu: React.FC<Props> = ({ theme, themeMode, onToggleTheme }) => {
  const { user, switchDemoUser, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])

  const themeLabel =
    themeMode === "system"
      ? "System"
      : themeMode === "light"
        ? "Light"
        : "Dark"

  const close = useCallback(() => {
    setOpen(false)
    setShowSwitcher(false)
    btnRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, close])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, close])

  // Arrow key navigation within menu
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = itemsRef.current.filter(Boolean) as HTMLButtonElement[]
    const idx = items.indexOf(e.target as HTMLButtonElement)
    if (e.key === "ArrowDown") {
      e.preventDefault()
      items[(idx + 1) % items.length]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      items[(idx - 1 + items.length) % items.length]?.focus()
    }
  }

  // Focus first item when menu opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        const first = itemsRef.current.find(Boolean)
        first?.focus()
      })
    }
  }, [open])

  const handleLogout = async () => {
    close()
    await logout()
    navigate("/login")
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        ref={btnRef}
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {user.initials}
        </span>
        <span className="user-menu__trigger-name">{user.name.split(" ")[0]}</span>
        <span className={`user-menu__caret${open ? " user-menu__caret--open" : ""}`} aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div
          className="user-menu__dropdown"
          role="menu"
          aria-label="User menu"
          onKeyDown={handleMenuKeyDown}
        >
          <div className="user-menu__header">
            <div className="user-menu__header-name">{user.name}</div>
            <div className="user-menu__header-role">{user.roleLabel}</div>
            <div className="user-menu__header-home">{user.primaryHome.name}</div>
          </div>

          <div className="user-menu__divider" role="separator" />

          <button
            ref={(el) => { itemsRef.current[0] = el }}
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              onToggleTheme()
            }}
          >
            <span className="user-menu__item-icon" aria-hidden="true">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </span>
            <span>Theme: {themeLabel}</span>
          </button>

          <button
            ref={(el) => { itemsRef.current[1] = el }}
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              close()
              navigate("/settings")
            }}
          >
            <span className="user-menu__item-icon" aria-hidden="true">
              <Settings size={16} />
            </span>
            <span>Settings</span>
          </button>

          <button
            ref={(el) => { itemsRef.current[2] = el }}
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => setShowSwitcher((v) => !v)}
          >
            <span className="user-menu__item-icon" aria-hidden="true">
              <Users size={16} />
            </span>
            <span>Switch user</span>
          </button>

          {showSwitcher && (
            <div className="user-menu__switcher">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`user-menu__switcher-item ${u.id === user.id ? "is-current" : ""}`}
                  disabled={u.id === user.id}
                  onClick={() => {
                    close()
                    void switchDemoUser(u.id).then(() => {
                      // Full page reload so every component re-renders with new permissions
                      window.location.href = "/"
                    })
                  }}
                >
                  <span className="user-menu__switcher-name">{u.name}</span>
                  <span className="user-menu__switcher-role">{u.roleLabel}</span>
                  {u.id === user.id && <span className="user-menu__switcher-badge">Current</span>}
                </button>
              ))}
            </div>
          )}

          <div className="user-menu__divider" role="separator" />

          <button
            ref={(el) => { itemsRef.current[3] = el }}
            type="button"
            role="menuitem"
            className="user-menu__item user-menu__item--danger"
            onClick={() => void handleLogout()}
          >
            <span className="user-menu__item-icon" aria-hidden="true">
              <LogOut size={16} />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
