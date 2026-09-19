import React, { useEffect, useMemo, useState } from "react"
import { Pencil, Archive, Search, Lock, Plus, X, ArrowUp, ArrowDown } from "lucide-react"
import "./AdminSetup.scss"
import "./AdminFormDefinitions.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import Modal from "../../components/Modal/Modal"
import { PageTransition, FadeIn } from "../../components/Motion"
import { useToast } from "../../components/Toast/ToastProvider"
import { commonFilesService } from "../../services"
import { FORM_CATEGORY_LABEL, FORM_CADENCE_LABEL } from "../../services/commonFiles/commonFiles.mock"
import type {
  FormDefinition,
  FormFieldDefinition,
  FormFieldType,
  FormCategory,
  FormCadence,
} from "../../services/commonFiles/commonFiles.types"

/**
 * ADMIN-003 — Common Files form definitions (Phase 7 forms engine, admin
 * only — `system.forms.edit`, System Admin exclusively, distinct from
 * `commonFiles.edit` which only covers the unrelated Statement of
 * Purpose). Authors the `FormDefinition`s that drive `/common-files` —
 * an admin can add fields to an existing definition (including the 12
 * `isSystem` ones migrated from the old fixed taxonomy — their
 * name/category/cadence stay locked, but fields don't) or create a
 * brand-new form type from scratch. See commonFiles.mock.ts for the data
 * model and the Phase 7 plan for the full design rationale.
 */

const FIELD_TYPES: FormFieldType[] = ["text", "textarea", "number", "date", "select", "boolean"]
const FIELD_TYPE_LABEL: Record<FormFieldType, string> = {
  text: "Text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  select: "Choice list",
  boolean: "Yes / No",
}
const CATEGORIES = Object.keys(FORM_CATEGORY_LABEL) as FormCategory[]
const CADENCES = Object.keys(FORM_CADENCE_LABEL) as FormCadence[]

/**
 * `optionsText` is the raw, unparsed text of the options input — kept
 * separate from `options` (the parsed `string[]`) so typing doesn't
 * trigger a reformat-and-rejoin on every keystroke. Reformatting live
 * (splitting on "," and trimming, then rejoining for the controlled
 * value) silently eats a trailing space the instant it's typed, since
 * trim() strips it from the in-progress last segment before the user
 * finishes typing the next word. `options` is only derived from
 * `optionsText` once, at save time.
 */
type EditableField = FormFieldDefinition & { _rowId: string; optionsText: string }

type EditForm = {
  name: string
  category: FormCategory
  cadence: FormCadence
  description: string
  fields: EditableField[]
}

const slugify = (label: string, taken: Set<string>): string => {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  let key = base || "field"
  let n = 2
  while (taken.has(key)) {
    key = `${base}_${n}`
    n += 1
  }
  return key
}

const blankForm = (): EditForm => ({
  name: "",
  category: "check",
  cadence: "weekly",
  description: "",
  fields: [],
})

const toEditForm = (d: FormDefinition): EditForm => ({
  name: d.name,
  category: d.category,
  cadence: d.cadence,
  description: d.description ?? "",
  fields: d.fields.map((f) => ({ ...f, _rowId: f.key, optionsText: (f.options ?? []).join(", ") })),
})

const AdminFormDefinitions: React.FC = () => {
  const toast = useToast()

  const [definitions, setDefinitions] = useState<FormDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const loadDefinitions = async () => {
    setLoading(true)
    const list = await commonFilesService.listFormDefinitions()
    setDefinitions(list)
    setLoading(false)
  }

  useEffect(() => {
    void loadDefinitions()
  }, [])

  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<FormCategory | "all">("all")

  const filtered = useMemo(() => {
    return definitions.filter((d) => {
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false
      if (!query.trim()) return true
      const needle = query.toLowerCase()
      return d.name.toLowerCase().includes(needle) || (d.description ?? "").toLowerCase().includes(needle)
    })
  }, [definitions, query, categoryFilter])

  /* ── Editor modal ─────────────────────────────────── */
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)

  const editingIsSystem = editingId !== "new" && definitions.find((d) => d.id === editingId)?.isSystem === true

  const openNew = () => {
    setEditingId("new")
    setForm(blankForm())
  }

  const openEdit = (d: FormDefinition) => {
    setEditingId(d.id)
    setForm(toEditForm(d))
  }

  const closeEditor = () => {
    setEditingId(null)
    setForm(null)
  }

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const addFieldRow = () => {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        fields: [
          ...prev.fields,
          { _rowId: `draft-${Date.now()}`, key: "", label: "", type: "text", required: false, optionsText: "" },
        ],
      }
    })
  }

  const updateFieldRow = (rowId: string, patch: Partial<EditableField>) => {
    setForm((prev) => {
      if (!prev) return prev
      return { ...prev, fields: prev.fields.map((f) => (f._rowId === rowId ? { ...f, ...patch } : f)) }
    })
  }

  const relabelFieldRow = (rowId: string, label: string) => {
    setForm((prev) => {
      if (!prev) return prev
      const taken = new Set(prev.fields.filter((f) => f._rowId !== rowId).map((f) => f.key))
      const key = label.trim() ? slugify(label, taken) : ""
      return {
        ...prev,
        fields: prev.fields.map((f) => (f._rowId === rowId ? { ...f, label, key } : f)),
      }
    })
  }

  const removeFieldRow = (rowId: string) => {
    setForm((prev) => (prev ? { ...prev, fields: prev.fields.filter((f) => f._rowId !== rowId) } : prev))
  }

  const moveFieldRow = (rowId: string, dir: -1 | 1) => {
    setForm((prev) => {
      if (!prev) return prev
      const i = prev.fields.findIndex((f) => f._rowId === rowId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.fields.length) return prev
      const fields = [...prev.fields]
      ;[fields[i], fields[j]] = [fields[j], fields[i]]
      return { ...prev, fields }
    })
  }

  const handleSave = async () => {
    if (!form) return
    if (!form.name.trim()) {
      toast.danger("Name is required")
      return
    }
    if (form.fields.length === 0) {
      toast.danger("Add at least one field")
      return
    }
    const badField = form.fields.find((f) => !f.label.trim())
    if (badField) {
      toast.danger("Every field needs a label")
      return
    }
    // Options are parsed from the raw optionsText here, once, rather than
    // on every keystroke (see the EditableField comment above).
    const preparedFields = form.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      helpText: f.helpText,
      placeholder: f.placeholder,
      options:
        f.type === "select"
          ? f.optionsText.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
    }))
    const badSelect = preparedFields.find((f) => f.type === "select" && (f.options ?? []).length === 0)
    if (badSelect) {
      toast.danger(`"${badSelect.label}" needs at least one option`)
      return
    }

    setSaving(true)
    try {
      const saved = await commonFilesService.saveFormDefinition({
        id: editingId === "new" ? undefined : (editingId ?? undefined),
        name: form.name,
        category: form.category,
        cadence: form.cadence,
        description: form.description || undefined,
        fields: preparedFields,
      })
      setDefinitions((list) => {
        const exists = list.some((d) => d.id === saved.id)
        return exists ? list.map((d) => (d.id === saved.id ? saved : d)) : [...list, saved]
      })
      toast.success(editingId === "new" ? "Form definition created" : "Form definition updated")
      closeEditor()
    } catch {
      toast.danger("Failed to save form definition")
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (d: FormDefinition) => {
    const updated = await commonFilesService.archiveFormDefinition(d.id)
    setDefinitions((list) => list.map((x) => (x.id === updated.id ? updated : x)))
    toast.success(`${d.name} archived`, { description: "It will no longer appear in Common Files." })
  }

  return (
    <PageTransition>
      <div className="admin-setup">
        <PageHeader
          title="Form Definitions"
          subtitle="Configure the checks, meetings, and documents staff log in Common Files. Add fields to an existing type, or create a new one."
          actions={
            <button type="button" className="btn btn--primary" onClick={openNew}>
              <Plus size={16} aria-hidden="true" />
              New form definition
            </button>
          }
        />

        <FadeIn>
          <div className="admin-residents__toolbar">
            <label className="admin-residents__search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search form definitions..."
              />
            </label>
            <div className="admin-forms__filters">
              <button
                type="button"
                className={`admin-forms__filter-chip ${categoryFilter === "all" ? "is-active" : ""}`}
                onClick={() => setCategoryFilter("all")}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`admin-forms__filter-chip ${categoryFilter === c ? "is-active" : ""}`}
                  onClick={() => setCategoryFilter(c)}
                >
                  {FORM_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            <span className="admin-residents__count">
              {filtered.length} definition{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </FadeIn>

        {loading ? (
          <div className="admin-residents__loading">Loading form definitions...</div>
        ) : filtered.length === 0 ? (
          <div className="card card--padded" style={{ textAlign: "center" }}>
            <p>No form definitions match.</p>
          </div>
        ) : (
          <FadeIn>
            <div className="admin-residents__list">
              {filtered.map((d) => (
                <div key={d.id} className="card admin-residents__row admin-forms__row">
                  <div className="admin-residents__row-main">
                    <div className="admin-forms__row-title">
                      {d.isSystem && (
                        <span title="Built-in — identity locked">
                          <Lock size={13} aria-hidden="true" />
                        </span>
                      )}
                      <p className="admin-setup__team-name">{d.name}</p>
                      {d.archivedAt && <span className="badge badge--neutral">Archived</span>}
                    </div>
                    <p className="admin-setup__team-meta">
                      {FORM_CATEGORY_LABEL[d.category]} · {FORM_CADENCE_LABEL[d.cadence]} · {d.fields.length} field
                      {d.fields.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {d.description && <p className="admin-residents__row-summary">{d.description}</p>}
                  <div className="admin-forms__row-actions">
                    <button
                      type="button"
                      className="btn btn--ghost admin-setup__icon-btn"
                      aria-label={`Edit ${d.name}`}
                      title="Edit"
                      onClick={() => openEdit(d)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    {!d.archivedAt && (
                      <button
                        type="button"
                        className="btn btn--ghost admin-setup__icon-btn"
                        aria-label={`Archive ${d.name}`}
                        title="Archive"
                        onClick={() => void handleArchive(d)}
                      >
                        <Archive size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        )}

        {/* ── Field Editor ──────────────────────────────── */}
        <Modal
          open={!!form}
          onClose={closeEditor}
          eyebrow="ADMIN · FORM DEFINITIONS"
          title={editingId === "new" ? "New form definition" : "Edit form definition"}
          size="lg"
        >
          {form && (
            <>
              <div className="admin-setup__grid admin-setup__grid--2">
                <label className="admin-setup__field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={form.name}
                    disabled={editingIsSystem}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Fire Risk Assessment"
                  />
                </label>
                <label className="admin-setup__field">
                  <span>Category</span>
                  <select
                    value={form.category}
                    disabled={editingIsSystem}
                    onChange={(e) => setField("category", e.target.value as FormCategory)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{FORM_CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-setup__field">
                  <span>Cadence</span>
                  <select
                    value={form.cadence}
                    disabled={editingIsSystem}
                    onChange={(e) => setField("cadence", e.target.value as FormCadence)}
                  >
                    {CADENCES.map((c) => (
                      <option key={c} value={c}>{FORM_CADENCE_LABEL[c]}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-setup__field">
                  <span>Description (optional)</span>
                  <input
                    type="text"
                    value={form.description}
                    disabled={editingIsSystem}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Shown to staff above the entry list"
                  />
                </label>
              </div>
              {editingIsSystem && (
                <p className="admin-forms__lock-note">
                  <Lock size={12} aria-hidden="true" /> This is a built-in definition — name, category, and
                  cadence are locked, but you can still add, edit, or remove its fields below.
                </p>
              )}

              <h4 className="admin-setup__card-title" style={{ marginTop: "var(--space-4)" }}>Fields</h4>
              <div className="admin-forms__field-editor">
                {form.fields.length === 0 && (
                  <p className="admin-residents__loading" style={{ padding: "var(--space-3) 0" }}>
                    No fields yet — add at least one below.
                  </p>
                )}
                {form.fields.map((f, i) => (
                  <div key={f._rowId} className="admin-forms__field-row">
                    <div className="admin-forms__field-reorder">
                      <button
                        type="button"
                        className="btn btn--ghost admin-setup__icon-btn"
                        disabled={i === 0}
                        aria-label="Move field up"
                        onClick={() => moveFieldRow(f._rowId, -1)}
                      >
                        <ArrowUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost admin-setup__icon-btn"
                        disabled={i === form.fields.length - 1}
                        aria-label="Move field down"
                        onClick={() => moveFieldRow(f._rowId, 1)}
                      >
                        <ArrowDown size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="admin-forms__field-main">
                      <input
                        type="text"
                        className="admin-forms__field-label-input"
                        value={f.label}
                        onChange={(e) => relabelFieldRow(f._rowId, e.target.value)}
                        placeholder="Field label"
                      />
                      <div className="admin-forms__field-row-controls">
                        <select
                          value={f.type}
                          onChange={(e) => updateFieldRow(f._rowId, { type: e.target.value as FormFieldType })}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>
                          ))}
                        </select>
                        <label className="admin-forms__field-required">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => updateFieldRow(f._rowId, { required: e.target.checked })}
                          />
                          Required
                        </label>
                      </div>
                      {f.type === "select" && (
                        <input
                          type="text"
                          className="admin-forms__field-options-input"
                          value={f.optionsText}
                          onChange={(e) =>
                            updateFieldRow(f._rowId, {
                              optionsText: e.target.value,
                            })
                          }
                          placeholder="Options, comma-separated — e.g. Good, Fair, Poor"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost admin-setup__icon-btn"
                      aria-label="Remove field"
                      onClick={() => removeFieldRow(f._rowId)}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost admin-forms__add-field" onClick={addFieldRow}>
                  <Plus size={14} aria-hidden="true" /> Add field
                </button>
              </div>

              <div className="admin-residents__edit-footer">
                <button type="button" className="btn btn--ghost" onClick={closeEditor}>Cancel</button>
                <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </PageTransition>
  )
}

export default AdminFormDefinitions
