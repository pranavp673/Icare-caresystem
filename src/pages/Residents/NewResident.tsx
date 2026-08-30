import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Residents.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import { PageTransition, FadeIn } from "../../components/Motion"
import { useToast } from "../../components/Toast/ToastProvider"
import { residentsService } from "../../services"
import type { CreateResidentRequest } from "../../services/residents/residents.types"

/**
 * RESIDENT-003 — New Resident admission form.
 *
 * Data entry point for adding a new resident into the care system.
 * Collects demographics, home assignment, room, keyworker, primary
 * contact, and an initial summary note.
 *
 * On submit, calls `residentsService.createResident` (currently mocked)
 * and redirects to the residents list with a success toast.
 *
 * TODO(integration): POST /api/residents body=CreateResidentRequest
 */

const HOMES = ["Willow House", "Oakmoor House", "Rowan Lodge"]
const KEYWORKERS = ["Priya A.", "Daniel T.", "Amira O.", "Tomas R.", "Clara F."]

const EMPTY_FORM: CreateResidentRequest = {
  name: "",
  dateOfBirth: "",
  home: HOMES[0],
  roomNumber: "",
  keyworker: KEYWORKERS[0],
  primaryContactName: "",
  primaryContactRelation: "",
  primaryContactPhone: "",
  summary: "",
}

const NewResident: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<CreateResidentRequest>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateResidentRequest, string>>>({})

  const set = <K extends keyof CreateResidentRequest>(
    key: K,
    value: CreateResidentRequest[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = "Full name is required"
    if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required"
    if (!form.roomNumber.trim()) e.roomNumber = "Room number is required"
    if (!form.primaryContactName.trim()) e.primaryContactName = "Contact name is required"
    if (!form.primaryContactRelation.trim()) e.primaryContactRelation = "Relation is required"
    if (!form.primaryContactPhone.trim()) e.primaryContactPhone = "Phone number is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await residentsService.createResident(form)
      toast.success("Resident admitted", {
        description: `${form.name} has been added to ${form.home}.`,
      })
      navigate("/residents")
    } catch {
      toast.warning("Failed to create resident", {
        description: "Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageTransition>
      <div className="residents">
        <PageHeader
          title="New Resident"
          subtitle="Admit a new resident into the care system."
          actions={
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate("/residents")}
            >
              &larr; Cancel
            </button>
          }
        />

        <FadeIn>
          <form
            className="residents__form card"
            onSubmit={(e) => void handleSubmit(e)}
            noValidate
          >
            {/* -- Personal details -- */}
            <fieldset className="residents__fieldset">
              <legend className="residents__legend">Personal details</legend>

              <div className="residents__field">
                <label htmlFor="nr-name">Full name *</label>
                <input
                  id="nr-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Margaret H."
                  autoFocus
                />
                {errors.name && <span className="residents__error">{errors.name}</span>}
              </div>

              <div className="residents__field">
                <label htmlFor="nr-dob">Date of birth *</label>
                <input
                  id="nr-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
                {errors.dateOfBirth && <span className="residents__error">{errors.dateOfBirth}</span>}
              </div>
            </fieldset>

            {/* -- Placement -- */}
            <fieldset className="residents__fieldset">
              <legend className="residents__legend">Placement</legend>

              <div className="residents__field">
                <label htmlFor="nr-home">Home *</label>
                <select
                  id="nr-home"
                  value={form.home}
                  onChange={(e) => set("home", e.target.value)}
                >
                  {HOMES.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="residents__field">
                <label htmlFor="nr-room">Room number *</label>
                <input
                  id="nr-room"
                  type="text"
                  value={form.roomNumber}
                  onChange={(e) => set("roomNumber", e.target.value)}
                  placeholder="e.g. W-301"
                />
                {errors.roomNumber && <span className="residents__error">{errors.roomNumber}</span>}
              </div>

              <div className="residents__field">
                <label htmlFor="nr-keyworker">Keyworker *</label>
                <select
                  id="nr-keyworker"
                  value={form.keyworker}
                  onChange={(e) => set("keyworker", e.target.value)}
                >
                  {KEYWORKERS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* -- Primary contact -- */}
            <fieldset className="residents__fieldset">
              <legend className="residents__legend">Primary contact</legend>

              <div className="residents__field">
                <label htmlFor="nr-contact-name">Contact name *</label>
                <input
                  id="nr-contact-name"
                  type="text"
                  value={form.primaryContactName}
                  onChange={(e) => set("primaryContactName", e.target.value)}
                  placeholder="e.g. Sarah H."
                />
                {errors.primaryContactName && <span className="residents__error">{errors.primaryContactName}</span>}
              </div>

              <div className="residents__field">
                <label htmlFor="nr-contact-relation">Relation *</label>
                <input
                  id="nr-contact-relation"
                  type="text"
                  value={form.primaryContactRelation}
                  onChange={(e) => set("primaryContactRelation", e.target.value)}
                  placeholder="e.g. Daughter"
                />
                {errors.primaryContactRelation && <span className="residents__error">{errors.primaryContactRelation}</span>}
              </div>

              <div className="residents__field">
                <label htmlFor="nr-contact-phone">Phone *</label>
                <input
                  id="nr-contact-phone"
                  type="tel"
                  value={form.primaryContactPhone}
                  onChange={(e) => set("primaryContactPhone", e.target.value)}
                  placeholder="e.g. +44 7700 900000"
                />
                {errors.primaryContactPhone && <span className="residents__error">{errors.primaryContactPhone}</span>}
              </div>
            </fieldset>

            {/* -- Notes -- */}
            <fieldset className="residents__fieldset">
              <legend className="residents__legend">Initial notes</legend>

              <div className="residents__field">
                <label htmlFor="nr-summary">Summary</label>
                <textarea
                  id="nr-summary"
                  rows={4}
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  placeholder="Brief summary of the resident's condition, needs, and care preferences..."
                />
              </div>
            </fieldset>

            {/* -- Actions -- */}
            <div className="residents__form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate("/residents")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? "Admitting..." : "Admit Resident"}
              </button>
            </div>
          </form>
        </FadeIn>
      </div>
    </PageTransition>
  )
}

export default NewResident
