import React, { useEffect, useMemo, useState } from "react"
import { ChevronRight, Pencil, Plus, Check, Info, ArrowRight } from "lucide-react"
import "./AdminSetup.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import { PageTransition, FadeIn } from "../../components/Motion"
import { useToast } from "../../components/Toast/ToastProvider"
import { adminService } from "../../services"
import { useAuth } from "../../auth/AuthContext"
import type {
  Company,
  Home,
  Person,
  RotaConfig,
  ShiftBlock,
  Team,
} from "../../services/admin/admin.types"

/**
 * ADMIN-001 — System administrator setup wizard.
 *
 * Walks an administrator through the configuration hierarchy confirmed
 * in the data model: Company → Home → Teams → Rota pattern. Each step
 * is its own card; the bottom bar advances the stepper. Data is read
 * from / written to `adminService` (mock phase — same client surface a
 * real AdminSvc integration will fill in).
 *
 * Rota pattern step enforces the confirmed rules:
 *   • rotation is strictly sequential (A → B → C → A), not irregular
 *   • shift blocks must tile the full 24 hours with no gaps/overlaps
 *     (validated live via `adminService.validateShiftBlockCoverage`)
 */

const STEPS = ["Company", "Home", "Teams", "Rota pattern"] as const
type Step = (typeof STEPS)[number]

const HOME_ID = "home-oakfield"

const AdminSetup: React.FC = () => {
  const toast = useToast()
  const { can } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)

  // Resolve which steps this user can access.
  // Admin holds system.company.edit → all 4 steps.
  // Managers (teams.edit, rota.config.edit) see only steps 3 & 4 if they
  // somehow reach this page (route guard already blocks them, but defensive).
  const visibleSteps = STEPS.filter((s) => {
    if (s === "Company") return can("system.company.edit")
    if (s === "Home") return can("system.home.edit")
    return true // Teams and Rota pattern visible to anyone who reached this page
  })
  const step: Step = visibleSteps[stepIndex] ?? visibleSteps[0]

  /* ── Loaded reference data ─────────────────────────── */
  const [company, setCompany] = useState<Company | null>(null)
  const [home, setHome] = useState<Home | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [rotaConfig, setRotaConfig] = useState<RotaConfig | null>(null)
  const [shiftBlocks, setShiftBlocks] = useState<ShiftBlock[]>([])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      adminService.getCompany(),
      adminService.getHome(HOME_ID),
      adminService.listTeams(HOME_ID),
      adminService.listPeople(HOME_ID),
      adminService.getRotaConfig({ homeId: HOME_ID }),
    ]).then(([c, h, t, p, rc]) => {
      if (cancelled) return
      setCompany(c)
      setHome(h)
      setTeams(t)
      setPeople(p)
      setRotaConfig(rc)
      if (rc) {
        void adminService.listShiftBlocks(rc.id).then((blocks) => {
          if (!cancelled) setShiftBlocks(blocks)
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const goNext = () => setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  return (
    <PageTransition>
      <div className="admin-setup">
        <PageHeader
          title="System setup"
          subtitle="Configure your company, homes, teams, and rota pattern. Changes here drive the generated rota calendar."
        />

        <h2 className="sr-only">
          Step {stepIndex + 1} of {visibleSteps.length}: {step}
        </h2>

        <ol className="admin-setup__stepper" aria-label="Setup steps">
          {visibleSteps.map((label, idx) => (
            <li
              key={label}
              className={[
                "admin-setup__step",
                idx === stepIndex && "is-active",
                idx < stepIndex && "is-done",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button type="button" onClick={() => setStepIndex(idx)} aria-current={idx === stepIndex ? "step" : undefined}>
                <span className="admin-setup__step-index">{idx < stepIndex ? <Check size={14} aria-hidden="true" /> : idx + 1}</span>
                {label}
              </button>
              {idx < visibleSteps.length - 1 && <ChevronRight size={16} aria-hidden="true" className="admin-setup__step-sep" />}
            </li>
          ))}
        </ol>

        <FadeIn key={step}>
          {step === "Company" && company && (
            <CompanyStep
              company={company}
              onSaved={(c) => {
                setCompany(c)
                toast.success("Company details saved")
                goNext()
              }}
            />
          )}

          {step === "Home" && home && (
            <HomeStep
              home={home}
              people={people}
              onBack={goBack}
              onSaved={(h) => {
                setHome(h)
                toast.success("Home details saved")
                goNext()
              }}
            />
          )}

          {step === "Teams" && (
            <TeamsStep
              homeId={HOME_ID}
              teams={teams}
              people={people}
              onBack={goBack}
              onContinue={(updated) => {
                setTeams(updated)
                goNext()
              }}
            />
          )}

          {step === "Rota pattern" && rotaConfig && (
            <RotaPatternStep
              homeId={HOME_ID}
              teams={teams}
              rotaConfig={rotaConfig}
              shiftBlocks={shiftBlocks}
              onBack={goBack}
              onSaved={(rc, blocks) => {
                setRotaConfig(rc)
                setShiftBlocks(blocks)
                toast.success("Rota pattern saved")
              }}
            />
          )}
        </FadeIn>
      </div>
    </PageTransition>
  )
}

export default AdminSetup

/* ════════════════════════════════════════════════════
 * Step 1 — Company
 * ════════════════════════════════════════════════════ */

const CompanyStep: React.FC<{
  company: Company
  onSaved: (c: Company) => void
}> = ({ company, onSaved }) => {
  const [legalName, setLegalName] = useState(company.legalName)
  const [corporateAddress, setCorporateAddress] = useState(company.corporateAddress)
  const [companiesHouseNumber, setCompaniesHouseNumber] = useState(company.companiesHouseNumber ?? "")
  const [mainContactEmail, setMainContactEmail] = useState(company.mainContactEmail ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await adminService.saveCompany({
        legalName,
        corporateAddress,
        companiesHouseNumber: companiesHouseNumber || undefined,
        mainContactEmail: mainContactEmail || undefined,
      })
      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h3 className="admin-setup__section-title">Company details</h3>
      <p className="admin-setup__section-desc">
        This is the top-level organisation. Every home you register sits under this company.
      </p>
      <div className="card card--padded admin-setup__card">
        <div className="admin-setup__grid admin-setup__grid--2">
          <label className="admin-setup__field admin-setup__field--span2">
            <span>Legal company name</span>
            <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </label>
          <label className="admin-setup__field admin-setup__field--span2">
            <span>Corporate address</span>
            <textarea rows={2} value={corporateAddress} onChange={(e) => setCorporateAddress(e.target.value)} />
          </label>
          <label className="admin-setup__field">
            <span>Companies House number</span>
            <input type="text" value={companiesHouseNumber} onChange={(e) => setCompaniesHouseNumber(e.target.value)} />
          </label>
          <label className="admin-setup__field">
            <span>Main contact email</span>
            <input type="email" value={mainContactEmail} onChange={(e) => setMainContactEmail(e.target.value)} />
          </label>
        </div>
      </div>
      <div className="admin-setup__actions admin-setup__actions--end">
        <button type="button" className="btn btn--primary" onClick={() => void handleSave()} disabled={saving || !legalName.trim()}>
          Save and continue <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
 * Step 2 — Home
 * ════════════════════════════════════════════════════ */

const HomeStep: React.FC<{
  home: Home
  people: Person[]
  onBack: () => void
  onSaved: (h: Home) => void
}> = ({ home, people, onBack, onSaved }) => {
  const [homeName, setHomeName] = useState(home.homeName)
  const [registeredAddress, setRegisteredAddress] = useState(home.registeredAddress)
  const [registrationNumber, setRegistrationNumber] = useState(home.registrationNumber)
  const [registeredManagerId, setRegisteredManagerId] = useState(home.registeredManagerId ?? "")
  const [deputyManagerId, setDeputyManagerId] = useState(home.deputyManagerId ?? "")
  const [saving, setSaving] = useState(false)

  const fixedHoursCandidates = useMemo(
    () => people.filter((p) => p.scheduleType === "fixed_hours" || p.role === "registered_manager" || p.role === "deputy_manager"),
    [people]
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await adminService.saveHome(home.id, {
        homeName,
        registeredAddress,
        registrationNumber,
        registeredManagerId: registeredManagerId || null,
        deputyManagerId: deputyManagerId || null,
      })
      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h3 className="admin-setup__section-title">Register a home</h3>
      <p className="admin-setup__section-desc">
        Add the registered care home site and the manager responsible for it. You can add more homes later.
      </p>
      <div className="card card--padded admin-setup__card">
        <div className="admin-setup__grid admin-setup__grid--2">
          <label className="admin-setup__field">
            <span>Home name</span>
            <input type="text" value={homeName} onChange={(e) => setHomeName(e.target.value)} />
          </label>
          <label className="admin-setup__field">
            <span>Ofsted registration number</span>
            <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
          </label>
          <label className="admin-setup__field admin-setup__field--span2">
            <span>Registered address</span>
            <textarea rows={2} value={registeredAddress} onChange={(e) => setRegisteredAddress(e.target.value)} />
          </label>
          <label className="admin-setup__field">
            <span>Registered manager</span>
            <select value={registeredManagerId} onChange={(e) => setRegisteredManagerId(e.target.value)}>
              <option value="">— Select —</option>
              {fixedHoursCandidates.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </label>
          <label className="admin-setup__field">
            <span>Deputy manager</span>
            <select value={deputyManagerId} onChange={(e) => setDeputyManagerId(e.target.value)}>
              <option value="">— Select —</option>
              {fixedHoursCandidates.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-setup__notice admin-setup__notice--info">
          <Info size={16} aria-hidden="true" />
          <span>Manager and deputy manager work fixed hours (e.g. Mon–Fri, 9am–5pm) and are not part of the rota rotation.</span>
        </div>
      </div>
      <div className="admin-setup__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn btn--primary" onClick={() => void handleSave()} disabled={saving || !homeName.trim()}>
          Save and continue <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
 * Step 3 — Teams
 * ════════════════════════════════════════════════════ */

const TEAM_LETTERS = ["A", "B", "C", "D", "E", "F"]

const TeamsStep: React.FC<{
  homeId: string
  teams: Team[]
  people: Person[]
  onBack: () => void
  onContinue: (teams: Team[]) => void
}> = ({ homeId, teams, people, onBack, onContinue }) => {
  const [rows, setRows] = useState<Team[]>(teams)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => setRows(teams), [teams])

  const leaderName = (id: string | null) => people.find((p) => p.id === id)?.fullName ?? "— not yet assigned"

  const handleAddTeam = () => {
    const position = rows.length
    const draft: Team = {
      id: `draft-${Date.now()}`,
      homeId,
      teamName: `Team ${TEAM_LETTERS[position] ?? position + 1}`,
      teamLeaderId: null,
      configuredSize: 5,
      rotationPosition: position,
    }
    setRows((r) => [...r, draft])
    setEditingId(draft.id)
  }

  const updateRow = (id: string, patch: Partial<Team>) =>
    setRows((r) => r.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const handleContinue = async () => {
    setSaving(true)
    try {
      const saved: Team[] = []
      for (const row of rows) {
        const isDraft = row.id.startsWith("draft-")
        const result = await adminService.saveTeam(homeId, {
          id: isDraft ? undefined : row.id,
          teamName: row.teamName,
          teamLeaderId: row.teamLeaderId,
          configuredSize: row.configuredSize,
          rotationPosition: row.rotationPosition,
        })
        saved.push(result)
      }
      onContinue(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h3 className="admin-setup__section-title">Teams — {homeId === HOME_ID ? "Willow House" : "Home"}</h3>
      <p className="admin-setup__section-desc">
        Set up the rotating teams. Each team has a fixed target size — the rota pattern (next step) decides how they take turns.
      </p>

      <div className="admin-setup__team-list">
        {rows.map((team, idx) => (
          <div key={team.id} className="card admin-setup__team-row">
            <div className="admin-setup__team-info">
              <span className="admin-setup__team-badge">{TEAM_LETTERS[idx] ?? idx + 1}</span>
              {editingId === team.id ? (
                <div className="admin-setup__team-edit">
                  <input
                    type="text"
                    value={team.teamName}
                    onChange={(e) => updateRow(team.id, { teamName: e.target.value })}
                    aria-label="Team name"
                  />
                  <select
                    value={team.teamLeaderId ?? ""}
                    onChange={(e) => updateRow(team.id, { teamLeaderId: e.target.value || null })}
                    aria-label="Team leader"
                  >
                    <option value="">— No leader assigned —</option>
                    {people.filter((p) => p.scheduleType === "rota").map((p) => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                  <label className="admin-setup__inline-number">
                    <span>Target size</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={team.configuredSize}
                      onChange={(e) => updateRow(team.id, { configuredSize: Number(e.target.value) || 1 })}
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <p className="admin-setup__team-name">{team.teamName}</p>
                  <p className="admin-setup__team-meta">Leader: {leaderName(team.teamLeaderId)} · {team.configuredSize} members (target)</p>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn--ghost admin-setup__icon-btn"
              aria-label={editingId === team.id ? `Done editing ${team.teamName}` : `Edit ${team.teamName}`}
              onClick={() => setEditingId((cur) => (cur === team.id ? null : team.id))}
            >
              {editingId === team.id ? <Check size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--secondary admin-setup__add-btn" onClick={handleAddTeam}>
        <Plus size={16} aria-hidden="true" /> Add team
      </button>

      <div className="admin-setup__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn btn--primary" onClick={() => void handleContinue()} disabled={saving || rows.length === 0}>
          Save and continue <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
 * Step 4 — Rota pattern
 * ════════════════════════════════════════════════════ */

const RotaPatternStep: React.FC<{
  homeId: string
  teams: Team[]
  rotaConfig: RotaConfig
  shiftBlocks: ShiftBlock[]
  onBack: () => void
  onSaved: (rc: RotaConfig, blocks: ShiftBlock[]) => void
}> = ({ homeId, teams, rotaConfig, shiftBlocks, onBack, onSaved }) => {
  const [dutyLengthDays, setDutyLengthDays] = useState(rotaConfig.dutyLengthDays)
  const [daysOffBetweenDuties, setDaysOffBetweenDuties] = useState(rotaConfig.daysOffBetweenDuties)
  const [saving, setSaving] = useState(false)

  const orderedTeams = useMemo(() => {
    const byId = new Map(teams.map((t) => [t.id, t]))
    return rotaConfig.rotationOrder.map((id) => byId.get(id)).filter((t): t is Team => Boolean(t))
  }, [teams, rotaConfig.rotationOrder])

  const validation = useMemo(
    () => adminService.validateShiftBlockCoverage(shiftBlocks),
    [shiftBlocks]
  )

  const totalSpan = (b: ShiftBlock) => {
    const [sh, sm] = b.startTime.split(":").map(Number)
    const [eh, em] = b.endTime.split(":").map(Number)
    let mins = eh * 60 + em - (sh * 60 + sm)
    if (mins <= 0) mins += 24 * 60
    return mins
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const [rc] = await Promise.all([
        adminService.saveRotaConfig(homeId, {
          rotationOrder: rotaConfig.rotationOrder,
          cadence: rotaConfig.cadence,
          dutyLengthDays,
          daysOffBetweenDuties,
        }),
      ])
      onSaved(rc, shiftBlocks)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h3 className="admin-setup__section-title">Rota pattern — {homeId === HOME_ID ? "Willow House" : "Home"}</h3>
      <p className="admin-setup__section-desc">
        Set how teams rotate on duty, then define the time blocks within each duty period and how many staff each one needs.
      </p>

      <div className="card card--padded admin-setup__card">
        <h4 className="admin-setup__card-title">Rotation setup</h4>
        <div className="admin-setup__grid admin-setup__grid--3">
          <label className="admin-setup__field">
            <span>Number of teams</span>
            <input type="number" value={orderedTeams.length} readOnly aria-readonly="true" />
          </label>
          <label className="admin-setup__field">
            <span>Each team on duty for</span>
            <select value={dutyLengthDays} onChange={(e) => setDutyLengthDays(Number(e.target.value))}>
              <option value={1}>1 day (24 hours)</option>
              <option value={2}>2 days</option>
              <option value={7}>1 week</option>
            </select>
          </label>
          <label className="admin-setup__field">
            <span>Days off before next duty</span>
            <input
              type="number"
              min={0}
              max={14}
              value={daysOffBetweenDuties}
              onChange={(e) => setDaysOffBetweenDuties(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <div className="admin-setup__rotation-order">
          <span className="admin-setup__field-label">Rotation order</span>
          <div className="admin-setup__chips">
            {orderedTeams.map((team, idx) => (
              <React.Fragment key={team.id}>
                <span className="admin-setup__chip">{team.teamName}</span>
                {idx < orderedTeams.length - 1 && <ArrowRight size={16} aria-hidden="true" className="admin-setup__chip-arrow" />}
              </React.Fragment>
            ))}
            <span className="admin-setup__chip-note">then back to {orderedTeams[0]?.teamName ?? "the first team"}</span>
          </div>
          <p className="admin-setup__hint">Rotation is strictly sequential — each team hands over to the next in this order, then loops back to the start.</p>
        </div>
      </div>

      <div className="card card--padded admin-setup__card">
        <h4 className="admin-setup__card-title">Shift blocks within each duty period</h4>
        <p className="admin-setup__section-desc">
          Blocks must cover all 24 hours with no gaps or overlaps. Each block sets its own minimum staffing.
        </p>

        <div className="admin-setup__timeline" role="img" aria-label={shiftBlocks.map((b) => `${b.blockName} ${b.startTime} to ${b.endTime}`).join(", ")}>
          {shiftBlocks.map((b, idx) => (
            <div
              key={b.id}
              className={`admin-setup__timeline-seg admin-setup__timeline-seg--${idx % 2 === 0 ? "a" : "b"}`}
              style={{ flexGrow: totalSpan(b) }}
            >
              {b.blockName} · {b.startTime}–{b.endTime}
            </div>
          ))}
        </div>

        <div className="admin-setup__block-list">
          {shiftBlocks.map((b) => (
            <div key={b.id} className="admin-setup__block-row">
              <div>
                <p className="admin-setup__team-name">{b.blockName}</p>
                <p className="admin-setup__team-meta">{b.startTime} – {b.endTime} · {Math.round(totalSpan(b) / 60 * 10) / 10} hours</p>
              </div>
              <div className="admin-setup__block-meta">
                <div>
                  <p className="admin-setup__block-meta-label">Min. staff</p>
                  <p className="admin-setup__block-meta-value">{b.staffRequirement.minStaffCount}</p>
                </div>
                <div>
                  <p className="admin-setup__block-meta-label">Must include</p>
                  <p className="admin-setup__block-meta-value">{b.staffRequirement.requiredRoles.map((r) => r.replace(/_/g, " ")).join(", ") || "—"}</p>
                </div>
                <button type="button" className="btn btn--ghost admin-setup__icon-btn" aria-label={`Edit ${b.blockName} block`}>
                  <Pencil size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn--secondary admin-setup__add-btn">
          <Plus size={16} aria-hidden="true" /> Add shift block
        </button>

        <div className={`admin-setup__notice ${validation.ok ? "admin-setup__notice--success" : "admin-setup__notice--warning"}`}>
          {validation.ok ? <Check size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
          <span>{validation.message}</span>
        </div>
      </div>

      <div className="admin-setup__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn btn--primary" onClick={() => void handleSave()} disabled={saving || !validation.ok}>
          Save rota pattern <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
