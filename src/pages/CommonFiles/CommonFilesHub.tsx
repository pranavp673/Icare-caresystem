import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import "./CommonFilesHub.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import Modal from "../../components/Modal/Modal"
import { useAuth } from "../../auth/AuthContext"
import { useToast } from "../../components/Toast/ToastProvider"
import { PageTransition, StaggerList, StaggerItem } from "../../components/Motion"
import { FORM_CATEGORY_LABEL, FORM_CADENCE_LABEL } from "../../services/commonFiles/commonFiles.mock"
import { commonFilesService } from "../../services"
import type {
  CommonFileDoc,
  FormDefinition,
  FormEntry,
  FormFieldDefinition,
  FormFieldValue,
  FormCategory,
} from "../../services/commonFiles/commonFiles.types"

/**
 * COMMONFILES-001 — Common Files (FR-COM), rebuilt in Phase 7 against the
 * admin-configurable forms engine (`FormDefinition` + `FormEntry`, see
 * commonFiles.mock.ts). There is no fixed taxonomy any more — the tab
 * strip, the chip row within each tab, the fill-in form, and the entry
 * list are all driven off whatever `FormDefinition`s an admin has defined
 * at `/admin/forms`. This is intentionally ONE generic fill component and
 * ONE generic entry renderer instead of one per type, which is what makes
 * a new admin-authored form type work with zero code changes here.
 *
 * Unlike every other operational page, there is no route guard — every
 * role sees this page (gated only on `commonFiles.view`, which all six
 * roles hold). What differs by role is which *actions* are available:
 *   commonFiles.log  — RSW, Team Leader, Deputy Manager, Registered
 *                       Manager, System Admin can submit a form entry
 *                       (not RI — outside the operational chain, §2.2)
 *   commonFiles.edit — Registered Manager, System Admin can edit the
 *                       Statement of Purpose (unrelated to the forms
 *                       engine — that's gated by `system.forms.edit`,
 *                       System Admin only, on the /admin/forms page)
 */

type Tab = "purpose" | FormCategory

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

const formatFieldValue = (field: FormFieldDefinition, value: FormFieldValue): string => {
  if (value === undefined || value === null || value === "") return "—"
  if (field.type === "boolean") return value ? "Yes" : "No"
  if (field.type === "date") return formatDate(String(value))
  return String(value)
}

/** Initial form state for a fresh fill — every field starts unanswered
 *  (empty string) rather than defaulting booleans to a silent "No". */
const emptyValues = (fields: FormFieldDefinition[]): Record<string, FormFieldValue> =>
  Object.fromEntries(fields.map((f) => [f.key, ""]))

const CommonFilesHub: React.FC = () => {
  const { user, activeHome, can } = useAuth()
  const toast = useToast()
  const canLog = can("commonFiles.log")
  const canEdit = can("commonFiles.edit")

  const homeId = activeHome?.id ?? user.primaryHome.id

  const [tab, setTab] = useState<Tab>("purpose")
  const [purpose, setPurpose] = useState<CommonFileDoc | null>(null)
  const [definitions, setDefinitions] = useState<FormDefinition[]>([])
  const [entries, setEntries] = useState<FormEntry[]>([])
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      commonFilesService.getStatementOfPurpose(homeId),
      commonFilesService.listFormDefinitions({ activeOnly: true }),
      commonFilesService.listFormEntries(homeId),
    ]).then(([p, defs, ents]) => {
      if (cancelled) return
      setPurpose(p)
      setDefinitions(defs)
      setEntries(ents)
    })
    return () => {
      cancelled = true
    }
  }, [homeId])

  const categoriesPresent = useMemo(
    () => (Object.keys(FORM_CATEGORY_LABEL) as FormCategory[]).filter((c) => definitions.some((d) => d.category === c)),
    [definitions]
  )

  const categoryDefs = useMemo(
    () => (tab === "purpose" ? [] : definitions.filter((d) => d.category === tab)),
    [definitions, tab]
  )

  const selectedDef = useMemo(
    () => categoryDefs.find((d) => d.id === selectedDefId) ?? categoryDefs[0] ?? null,
    [categoryDefs, selectedDefId]
  )

  const selectedEntries = useMemo(
    () =>
      selectedDef ? entries.filter((e) => e.formDefinitionId === selectedDef.id) : [],
    [entries, selectedDef]
  )

  const handleTabClick = (t: Tab) => {
    setTab(t)
    setSelectedDefId(null) // resolves to categoryDefs[0] via selectedDef's fallback
  }

  // ── Modals ───────────────────────────────────────────
  const [editPurposeOpen, setEditPurposeOpen] = useState(false)
  const [fillDef, setFillDef] = useState<FormDefinition | null>(null)
  const [fillValues, setFillValues] = useState<Record<string, FormFieldValue>>({})

  const handleEditPurpose = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    void commonFilesService
      .updateStatementOfPurpose(homeId, {
        homeRegisteredType: String(form.get("homeRegisteredType") || ""),
        servicesProvided: String(form.get("servicesProvided") || ""),
      })
      .then((doc) => {
        setPurpose(doc)
        setEditPurposeOpen(false)
        toast.success("Statement of Purpose updated")
      })
  }

  const openFillModal = (def: FormDefinition) => {
    setFillValues(emptyValues(def.fields))
    setFillDef(def)
  }

  const setFieldValue = (key: string, value: FormFieldValue) => {
    setFillValues((v) => ({ ...v, [key]: value }))
  }

  const handleSubmitEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!fillDef) return
    const missing = fillDef.fields.find(
      (f) => f.required && (fillValues[f.key] === "" || fillValues[f.key] === undefined)
    )
    if (missing) {
      toast.danger(`"${missing.label}" is required`)
      return
    }
    void commonFilesService
      .submitFormEntry({ homeId, formDefinitionId: fillDef.id, values: fillValues })
      .then((entry) => {
        setEntries((list) => [entry, ...list])
        setFillDef(null)
        toast.success(`${fillDef.name} logged`)
      })
  }

  const emptyState = (label: string) => (
    <div className="common-files__empty">
      <p>{label}</p>
    </div>
  )

  const renderFillControl = (field: FormFieldDefinition) => {
    const value = fillValues[field.key] ?? ""
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            className="form-field__control"
            rows={3}
            value={String(value)}
            placeholder={field.placeholder}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
          />
        )
      case "number":
        return (
          <input
            type="number"
            className="form-field__control"
            value={value === "" ? "" : Number(value)}
            placeholder={field.placeholder}
            onChange={(e) => setFieldValue(field.key, e.target.value === "" ? "" : Number(e.target.value))}
          />
        )
      case "date":
        return (
          <input
            type="date"
            className="form-field__control"
            value={String(value)}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
          />
        )
      case "boolean":
        return (
          <select
            className="form-field__control"
            value={value === "" ? "" : value ? "yes" : "no"}
            onChange={(e) => setFieldValue(field.key, e.target.value === "" ? "" : e.target.value === "yes")}
          >
            <option value="" disabled>Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        )
      case "select":
        return (
          <select
            className="form-field__control"
            value={String(value)}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
          >
            <option value="" disabled>Select…</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )
      default:
        return (
          <input
            type="text"
            className="form-field__control"
            value={String(value)}
            placeholder={field.placeholder}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
          />
        )
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "purpose", label: "Statement of Purpose" },
    ...categoriesPresent.map((c) => ({ id: c as Tab, label: `${FORM_CATEGORY_LABEL[c]} (${definitions.filter((d) => d.category === c).length})` })),
  ]

  return (
    <PageTransition>
      <div className="common-files">
        <PageHeader
          eyebrow="COMMON FILES"
          title="Common Files"
          subtitle="Home-level compliance documents and checks — visible to everyone, regardless of role."
          actions={<HomeFilter />}
        />

        <div className="common-files__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`common-files__tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => handleTabClick(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "purpose" && (
            <motion.section
              key="purpose"
              className="card card--padded"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <header className="section-head">
                <h2 className="section-title">Statement of Purpose</h2>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setEditPurposeOpen(true)}
                  >
                    Edit
                  </button>
                )}
              </header>
              {purpose ? (
                <div className="common-files__purpose">
                  <div className="common-files__purpose-row">
                    <span className="common-files__purpose-label">Registered type</span>
                    <span className="common-files__purpose-value">{purpose.homeRegisteredType}</span>
                  </div>
                  <div className="common-files__purpose-row">
                    <span className="common-files__purpose-label">Services provided</span>
                    <p className="common-files__purpose-value">{purpose.servicesProvided}</p>
                  </div>
                  <div className="common-files__purpose-meta">
                    Last updated by {purpose.updatedBy} · {formatDate(purpose.updatedAt)}
                  </div>
                </div>
              ) : (
                emptyState("No Statement of Purpose on file for this home yet.")
              )}
            </motion.section>
          )}

          {tab !== "purpose" && (
            <motion.section
              key={tab}
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {categoryDefs.length === 0 ? (
                emptyState("No forms in this category yet.")
              ) : (
                <>
                  <div className="common-files__defs" role="tablist">
                    {categoryDefs.map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        className={`common-files__def-chip ${selectedDef?.id === d.id ? "is-active" : ""}`}
                        onClick={() => setSelectedDefId(d.id)}
                      >
                        {d.name}
                        <span className="common-files__def-chip-cadence">{FORM_CADENCE_LABEL[d.cadence]}</span>
                      </button>
                    ))}
                  </div>

                  {selectedDef && (
                    <>
                      <header className="common-files__panel-head">
                        <div>
                          <h2 className="section-title">{selectedDef.name}</h2>
                          {selectedDef.description && (
                            <p className="common-files__def-description">{selectedDef.description}</p>
                          )}
                        </div>
                        {canLog && (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => openFillModal(selectedDef)}
                          >
                            Log entry
                          </button>
                        )}
                      </header>
                      {selectedEntries.length === 0 ? (
                        emptyState("No entries logged yet.")
                      ) : (
                        <StaggerList className="common-files__entries">
                          {selectedEntries.map((entry) => (
                            <StaggerItem key={entry.id} className="common-files__entry">
                              <div className="common-files__entry-body">
                                <div className="common-files__entry-fields">
                                  {selectedDef.fields.map((f) => {
                                    const v = entry.values[f.key]
                                    if (v === undefined || v === null || v === "") return null
                                    return (
                                      <div key={f.key} className="common-files__entry-field">
                                        <span className="common-files__entry-field-label">{f.label}</span>
                                        <span className="common-files__entry-field-value">
                                          {formatFieldValue(f, v)}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              <div className="common-files__entry-meta">
                                {entry.completedBy} · {formatDateTime(entry.completedAt)}
                              </div>
                            </StaggerItem>
                          ))}
                        </StaggerList>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Edit Statement of Purpose ────────────────── */}
        <Modal
          open={editPurposeOpen}
          onClose={() => setEditPurposeOpen(false)}
          eyebrow="COMMON FILES"
          title="Edit Statement of Purpose"
          size="md"
        >
          <form onSubmit={handleEditPurpose}>
            <label className="form-field">
              <span className="form-field__label">Registered type</span>
              <input
                name="homeRegisteredType"
                className="form-field__control"
                defaultValue={purpose?.homeRegisteredType}
                placeholder="e.g. EBD home"
              />
            </label>
            <label className="form-field">
              <span className="form-field__label">Services provided</span>
              <textarea
                name="servicesProvided"
                className="form-field__control"
                defaultValue={purpose?.servicesProvided}
                rows={4}
              />
            </label>
            <div className="modal__form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditPurposeOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">Save</button>
            </div>
          </form>
        </Modal>

        {/* ── Log a form entry (generic — renders from FormDefinition.fields) ── */}
        <Modal
          open={!!fillDef}
          onClose={() => setFillDef(null)}
          eyebrow="COMMON FILES"
          title={fillDef ? `Log: ${fillDef.name}` : "Log entry"}
          size="md"
        >
          {fillDef && (
            <form onSubmit={handleSubmitEntry}>
              {fillDef.fields.map((f) => (
                <label key={f.key} className="form-field">
                  <span className="form-field__label">
                    {f.label}
                    {f.required && " *"}
                  </span>
                  {renderFillControl(f)}
                  {f.helpText && <span className="form-field__hint">{f.helpText}</span>}
                </label>
              ))}
              <div className="modal__form-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setFillDef(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">Save entry</button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </PageTransition>
  )
}

export default CommonFilesHub
