import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import "./Residents.scss"
import PageHeader from "../../components/PageHeader/PageHeader"
import { PageTransition, FadeIn, staggerContainer, staggerItem, standardTransition } from "../../components/Motion"
import HomeFilter from "../../components/HomeFilter/HomeFilter"
import ViewToggle, { useViewMode } from "../../components/ViewToggle/ViewToggle"
import { useAuth } from "../../auth/AuthContext"
import { residentsService } from "../../services"
import type {
  ResidentProfile,
  ResidentStatus,
} from "../../services/residents/residents.types"

/**
 * RESIDENT-001 — Residents list.
 *
 * The people-in-care workspace. Each card shows the resident's code, home,
 * keyworker, and current status chip; clicking a card opens the detail
 * page (`/residents/:id`) with profile / comments / service history tabs.
 */

const statusLabel: Record<ResidentStatus, string> = {
  stable: "Stable",
  "needs-review": "Needs review",
  new: "New admission",
  transitioning: "Transitioning",
}

const statusTone: Record<ResidentStatus, "neutral" | "success" | "warning" | "info"> = {
  stable: "success",
  "needs-review": "warning",
  new: "info",
  transitioning: "neutral",
}

type StatusFilter = "all" | ResidentStatus

const STATUS_ORDER: ResidentStatus[] = [
  "stable",
  "needs-review",
  "new",
  "transitioning",
]

const ResidentsList: React.FC = () => {
  const { user, scope, can } = useAuth()
  const canSeeAll = can("people.view")

  const [residents, setResidents] = useState<ResidentProfile[]>([])
  useEffect(() => {
    let cancelled = false
    void residentsService
      .listResidents({ homes: scope.homes, ownerId: canSeeAll ? undefined : user.id })
      .then((list) => {
        if (!cancelled) setResidents(list)
      })
    return () => {
      cancelled = true
    }
  }, [scope.homes, user.id, canSeeAll])

  const [status, setStatus] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    let list = residents
    if (status !== "all") list = list.filter((c) => c.status === status)
    if (query.trim()) {
      const needle = query.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.code.toLowerCase().includes(needle) ||
          c.keyworker.toLowerCase().includes(needle)
      )
    }
    return list
  }, [residents, status, query])

  const counts = useMemo(() => {
    const m: Record<ResidentStatus, number> = {
      stable: 0,
      "needs-review": 0,
      new: 0,
      transitioning: 0,
    }
    for (const c of residents) m[c.status] += 1
    return m
  }, [residents])

  const [viewMode, setViewMode] = useViewMode("icare.residents.view")

  return (
    <PageTransition><div className="residents">
      <PageHeader
        title="Residents"
        subtitle="Profiles, care history, and notes for every resident in your home scope."
        actions={
          <>
            {can("residents.edit") && (
              <Link to="/residents/new" className="btn btn--primary">+ New Resident</Link>
            )}
            <HomeFilter />
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </>
        }
      />

      {/* -- Filter bar -- */}
      <FadeIn><div className="residents__filters">
        <div className="residents__chips" role="group" aria-label="Status">
          <button
            type="button"
            className={`residents__chip ${status === "all" ? "is-on" : ""}`}
            onClick={() => setStatus("all")}
            aria-pressed={status === "all"}
          >
            All residents
            <span className="residents__chip-count">{residents.length}</span>
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              type="button"
              key={s}
              className={`residents__chip residents__chip--${s} ${
                status === s ? "is-on" : ""
              }`}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
            >
              {statusLabel[s]}
              <span className="residents__chip-count">{counts[s]}</span>
            </button>
          ))}
        </div>
        <label className="residents__search">
          <span className="sr-only">Search residents</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, or keyworker..."
          />
        </label>
      </div></FadeIn>

      {/* -- Resident list -- */}
      {filtered.length === 0 ? (
        <div className="residents__empty card card--padded">
          <h3>No residents match</h3>
          <p>Try clearing the filter or broadening the search.</p>
        </div>
      ) : viewMode === "row" ? (
        <FadeIn className="residents__table card" as="div">
          <div className="residents__table-head" role="row">
            <span role="columnheader">Name</span>
            <span role="columnheader">Code</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Age</span>
            <span role="columnheader">Room</span>
            <span role="columnheader">Home</span>
            <span role="columnheader">Keyworker</span>
          </div>
          {filtered.map((c, index) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...standardTransition, delay: index * 0.03 }}
            >
              <Link
                to={`/residents/${c.id}`}
                className="residents__table-row"
                role="row"
              >
                <span className="residents__table-name">
                  <span className="residents__avatar residents__avatar--sm" aria-hidden="true">{c.initials}</span>
                  {c.name}
                </span>
                <span className="residents__table-code">{c.code}</span>
                <span><span className={`badge badge--${statusTone[c.status]}`}>{statusLabel[c.status]}</span></span>
                <span>{c.age}</span>
                <span>{c.roomNumber}</span>
                <span>{c.home}</span>
                <span>{c.keyworker}</span>
              </Link>
            </motion.div>
          ))}
        </FadeIn>
      ) : (
        <motion.div className="residents__grid" role="list" variants={staggerContainer} initial="initial" animate="animate">
          {filtered.map((c) => (
            <motion.div key={c.id} variants={staggerItem} transition={standardTransition} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
              <Link
                to={`/residents/${c.id}`}
                role="listitem"
                className="residents__card card"
              >
                <div className="residents__card-head">
                  <div className="residents__avatar" aria-hidden="true">
                    {c.initials}
                  </div>
                  <div className="residents__card-title">
                    <div className="residents__card-name">{c.name}</div>
                    <div className="residents__card-code">{c.code}</div>
                  </div>
                  <span className={`badge badge--${statusTone[c.status]}`}>
                    {statusLabel[c.status]}
                  </span>
                </div>

                <dl className="residents__card-stats">
                  <div>
                    <dt>Age</dt>
                    <dd>{c.age}</dd>
                  </div>
                  <div>
                    <dt>Room</dt>
                    <dd>{c.roomNumber}</dd>
                  </div>
                  <div>
                    <dt>Home</dt>
                    <dd>{c.home}</dd>
                  </div>
                </dl>

                <div className="residents__card-foot">
                  <span className="residents__card-hint">
                    Keyworker · {c.keyworker}
                  </span>
                  <span className="residents__card-arrow" aria-hidden="true">
                    ›
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div></PageTransition>
  )
}

export default ResidentsList
