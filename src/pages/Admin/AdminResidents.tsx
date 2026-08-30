import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, X, Check, Search } from "lucide-react"
import "./AdminSetup.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import { PageTransition, FadeIn } from "../../components/Motion"
import { useToast } from "../../components/Toast/ToastProvider"
import { residentsService } from "../../services"
import type {
  ResidentProfile,
  ResidentStatus,
  UpdateResidentRequest,
} from "../../services/residents/residents.types"

/**
 * ADMIN-002 — Resident records management (admin only).
 *
 * Master data editing surface for resident records. The normal Residents
 * page (`/residents`) is for day-to-day care staff — once a resident is
 * admitted, staff cannot change demographics or placement. This admin
 * page allows managers / system administrators to correct or update any
 * field on a resident record.
 *
 * Changes here are audited. Each save calls `residentsService.updateResident`
 * which will POST to the gateway with full audit context.
 *
 * TODO(integration): PATCH /api/admin/residents/:id body=UpdateResidentRequest
 */

const HOMES = ["Willow House", "Oakmoor House", "Rowan Lodge"]
const KEYWORKERS = ["Priya A.", "Daniel T.", "Amira O.", "Tomas R.", "Clara F."]
const STATUSES: ResidentStatus[] = ["stable", "needs-review", "new", "transitioning"]

const statusLabel: Record<ResidentStatus, string> = {
  stable: "Stable",
  "needs-review": "Needs review",
  new: "New admission",
  transitioning: "Transitioning",
}
const statusTone: Record<ResidentStatus, string> = {
  stable: "success",
  "needs-review": "warning",
  new: "info",
  transitioning: "neutral",
}

type EditForm = {
  name: string
  dateOfBirth: string
  home: string
  roomNumber: string
  keyworker: string
  status: ResidentStatus
  primaryContactName: string
  primaryContactRelation: string
  primaryContactPhone: string
  summary: string
}

const toForm = (r: ResidentProfile): EditForm => ({
  name: r.name,
  dateOfBirth: r.dateOfBirth,
  home: r.home,
  roomNumber: r.roomNumber,
  keyworker: r.keyworker,
  status: r.status,
  primaryContactName: r.primaryContact.name,
  primaryContactRelation: r.primaryContact.relation,
  primaryContactPhone: r.primaryContact.phone,
  summary: r.summary,
})

const AdminResidents: React.FC = () => {
  const toast = useToast()

  /* ── Data ──────────────────────────────────────────── */
  const [residents, setResidents] = useState<ResidentProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadResidents = useCallback(async () => {
    setLoading(true)
    const list = await residentsService.listResidents()
    setResidents(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadResidents()
  }, [loadResidents])

  /* ── Search / filter ──────────────────────────────── */
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return residents
    const needle = query.toLowerCase()
    return residents.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.code.toLowerCase().includes(needle) ||
        r.home.toLowerCase().includes(needle) ||
        r.roomNumber.toLowerCase().includes(needle)
    )
  }, [residents, query])

  /* ── Edit state ───────────────────────────────────── */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (r: ResidentProfile) => {
    setEditingId(r.id)
    setForm(toForm(r))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(null)
  }

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!editingId || !form) return
    setSaving(true)
    try {
      const req: UpdateResidentRequest = {
        name: form.name,
        dateOfBirth: form.dateOfBirth,
        home: form.home,
        roomNumber: form.roomNumber,
        keyworker: form.keyworker,
        status: form.status,
        primaryContactName: form.primaryContactName,
        primaryContactRelation: form.primaryContactRelation,
        primaryContactPhone: form.primaryContactPhone,
        summary: form.summary,
      }
      const updated = await residentsService.updateResident(editingId, req)
      setResidents((list) =>
        list.map((r) => (r.id === editingId ? updated : r))
      )
      toast.success("Resident record updated", {
        description: `${updated.name}'s master data has been saved.`,
      })
      cancelEdit()
    } catch {
      toast.warning("Failed to update resident", {
        description: "Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageTransition>
      <div className="admin-setup">
        <PageHeader
          title="Manage Residents"
          subtitle="Edit master data for resident records. Changes here are audited and apply system-wide."
        />

        {/* ── Search bar ────────────────────────────────── */}
        <FadeIn>
          <div className="admin-residents__toolbar">
            <label className="admin-residents__search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, code, home, or room..."
              />
            </label>
            <span className="admin-residents__count">
              {filtered.length} resident{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </FadeIn>

        {/* ── Residents table ───────────────────────────── */}
        {loading ? (
          <div className="admin-residents__loading">Loading residents...</div>
        ) : filtered.length === 0 ? (
          <div className="card card--padded" style={{ textAlign: "center" }}>
            <p>No residents match your search.</p>
          </div>
        ) : (
          <FadeIn>
            <div className="admin-residents__list">
              {filtered.map((r) =>
                editingId === r.id && form ? (
                  /* ── Edit mode ──────────────────────────── */
                  <div key={r.id} className="card admin-residents__edit-card">
                    <div className="admin-residents__edit-header">
                      <div className="admin-residents__avatar" aria-hidden="true">{r.initials}</div>
                      <div>
                        <p className="admin-setup__team-name">Editing: {r.name}</p>
                        <p className="admin-setup__team-meta">Code: {r.code} · Admitted: {r.admissionDate}</p>
                      </div>
                      <div className="admin-residents__edit-actions">
                        <button type="button" className="btn btn--ghost admin-setup__icon-btn" onClick={cancelEdit} aria-label="Cancel editing" title="Cancel">
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="admin-setup__grid admin-setup__grid--2">
                      <label className="admin-setup__field">
                        <span>Full name</span>
                        <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} />
                      </label>
                      <label className="admin-setup__field">
                        <span>Date of birth</span>
                        <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
                      </label>
                      <label className="admin-setup__field">
                        <span>Home</span>
                        <select value={form.home} onChange={(e) => set("home", e.target.value)}>
                          {HOMES.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </label>
                      <label className="admin-setup__field">
                        <span>Room number</span>
                        <input type="text" value={form.roomNumber} onChange={(e) => set("roomNumber", e.target.value)} />
                      </label>
                      <label className="admin-setup__field">
                        <span>Keyworker</span>
                        <select value={form.keyworker} onChange={(e) => set("keyworker", e.target.value)}>
                          {KEYWORKERS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </label>
                      <label className="admin-setup__field">
                        <span>Status</span>
                        <select value={form.status} onChange={(e) => set("status", e.target.value as ResidentStatus)}>
                          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                        </select>
                      </label>
                    </div>

                    <h4 className="admin-setup__card-title" style={{ marginTop: "var(--space-3)" }}>Primary contact</h4>
                    <div className="admin-setup__grid admin-setup__grid--3">
                      <label className="admin-setup__field">
                        <span>Contact name</span>
                        <input type="text" value={form.primaryContactName} onChange={(e) => set("primaryContactName", e.target.value)} />
                      </label>
                      <label className="admin-setup__field">
                        <span>Relation</span>
                        <input type="text" value={form.primaryContactRelation} onChange={(e) => set("primaryContactRelation", e.target.value)} />
                      </label>
                      <label className="admin-setup__field">
                        <span>Phone</span>
                        <input type="tel" value={form.primaryContactPhone} onChange={(e) => set("primaryContactPhone", e.target.value)} />
                      </label>
                    </div>

                    <label className="admin-setup__field" style={{ marginTop: "var(--space-2)" }}>
                      <span>Summary</span>
                      <textarea rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
                    </label>

                    <div className="admin-residents__edit-footer">
                      <button type="button" className="btn btn--ghost" onClick={cancelEdit}>Cancel</button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        disabled={saving || !form.name.trim()}
                        onClick={() => void handleSave()}
                      >
                        <Check size={16} aria-hidden="true" />
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only row ─────────────────────── */
                  <div key={r.id} className="card admin-residents__row">
                    <div className="admin-residents__row-main">
                      <div className="admin-residents__avatar" aria-hidden="true">{r.initials}</div>
                      <div className="admin-residents__row-info">
                        <p className="admin-setup__team-name">{r.name}</p>
                        <p className="admin-setup__team-meta">
                          {r.code} · {r.home} · Room {r.roomNumber} · Keyworker: {r.keyworker}
                        </p>
                      </div>
                      <span className={`badge badge--${statusTone[r.status]}`}>
                        {statusLabel[r.status]}
                      </span>
                    </div>
                    <div className="admin-residents__row-details">
                      <div>
                        <span className="admin-residents__detail-label">DOB</span>
                        <span className="admin-residents__detail-value">{r.dateOfBirth}</span>
                      </div>
                      <div>
                        <span className="admin-residents__detail-label">Age</span>
                        <span className="admin-residents__detail-value">{r.age}</span>
                      </div>
                      <div>
                        <span className="admin-residents__detail-label">Contact</span>
                        <span className="admin-residents__detail-value">{r.primaryContact.name} ({r.primaryContact.relation})</span>
                      </div>
                      <div>
                        <span className="admin-residents__detail-label">Admitted</span>
                        <span className="admin-residents__detail-value">{r.admissionDate}</span>
                      </div>
                    </div>
                    {r.summary && (
                      <p className="admin-residents__row-summary">{r.summary}</p>
                    )}
                    <button
                      type="button"
                      className="btn btn--ghost admin-setup__icon-btn admin-residents__edit-btn"
                      aria-label={`Edit ${r.name}`}
                      title={`Edit ${r.name}`}
                      onClick={() => startEdit(r)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  </div>
                )
              )}
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  )
}

export default AdminResidents
