import React, { useCallback, useMemo, useState } from "react"
import "./LeaveCalendar.scss"

/**
 * LeaveCalendar — inline month calendar for date-range selection.
 *
 * Supports single-date and range modes:
 *   • Click once  → sets start date
 *   • Click again → sets end date (must be >= start)
 *   • Click a third time → resets and starts new selection
 *
 * The component highlights:
 *   • Today (ring)
 *   • Selected start/end (filled accent)
 *   • Range between start/end (light accent band)
 *   • Past dates are dimmed
 */

export type LeaveCalendarProps = {
  /** Selected start date (yyyy-mm-dd). */
  startDate: string
  /** Selected end date (yyyy-mm-dd). */
  endDate: string
  /** Fires when user picks dates. */
  onChange: (start: string, end: string) => void
  /** If true, only allow single-date selection (start === end). */
  singleDate?: boolean
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** Pad to "yyyy-mm-dd". */
const toIso = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Get today as "yyyy-mm-dd". */
const todayIso = (): string => toIso(new Date())

/** Get all calendar cells for a month (padded to start on Monday). */
const buildMonth = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1)
  // getDay() is 0=Sun, we want 0=Mon
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells: Date[] = []
  // Leading days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push(new Date(year, month, -i))
  }
  // Days of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  // Trailing days to complete the last week
  while (cells.length % 7 !== 0) {
    const next = cells.length - startOffset - daysInMonth + 1
    cells.push(new Date(year, month + 1, next))
  }
  return cells
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  startDate,
  endDate,
  onChange,
  singleDate = false,
}) => {
  const today = useMemo(todayIso, [])

  // Navigation state: which month is being viewed.
  const initialMonth = useMemo(() => {
    if (startDate) {
      const d = new Date(startDate)
      return { year: d.getFullYear(), month: d.getMonth() }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])
  const [viewYear, setViewYear] = useState(initialMonth.year)
  const [viewMonth, setViewMonth] = useState(initialMonth.month)

  // Track whether we're picking start or end.
  const [pickingEnd, setPickingEnd] = useState(false)

  const cells = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth])

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }, [])

  const handleDateClick = useCallback(
    (iso: string) => {
      if (singleDate) {
        onChange(iso, iso)
        return
      }

      if (!pickingEnd || !startDate) {
        // Start fresh selection
        onChange(iso, "")
        setPickingEnd(true)
      } else {
        // Set end date
        if (iso < startDate) {
          // Clicked before start → swap: this becomes new start
          onChange(iso, startDate)
        } else {
          onChange(startDate, iso)
        }
        setPickingEnd(false)
      }
    },
    [singleDate, pickingEnd, startDate, onChange]
  )

  return (
    <div className="leave-cal">
      {/* Month navigation */}
      <div className="leave-cal__nav">
        <button
          type="button"
          className="leave-cal__nav-btn"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="leave-cal__month-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          className="leave-cal__nav-btn"
          onClick={nextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="leave-cal__grid leave-cal__header">
        {DAY_NAMES.map((d) => (
          <div key={d} className="leave-cal__day-name">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="leave-cal__grid">
        {cells.map((date) => {
          const iso = toIso(date)
          const isCurrentMonth = date.getMonth() === viewMonth
          const isToday = iso === today
          const isStart = iso === startDate
          const isEnd = iso === endDate
          const isSelected = isStart || isEnd
          const isInRange =
            startDate && endDate && iso > startDate && iso < endDate

          let cls = "leave-cal__cell"
          if (!isCurrentMonth) cls += " leave-cal__cell--outside"
          if (isToday) cls += " leave-cal__cell--today"
          if (isSelected) cls += " leave-cal__cell--selected"
          if (isStart && endDate) cls += " leave-cal__cell--range-start"
          if (isEnd && startDate) cls += " leave-cal__cell--range-end"
          if (isInRange) cls += " leave-cal__cell--in-range"

          return (
            <button
              key={iso}
              type="button"
              className={cls}
              onClick={() => handleDateClick(iso)}
              aria-label={iso}
              aria-pressed={isSelected}
              tabIndex={isCurrentMonth ? 0 : -1}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* Selection summary */}
      {startDate && (
        <div className="leave-cal__summary">
          {endDate && endDate !== startDate ? (
            <>
              <span className="leave-cal__summary-range">
                {formatDateNice(startDate)} — {formatDateNice(endDate)}
              </span>
              <span className="leave-cal__summary-count">
                {countDays(startDate, endDate)} day{countDays(startDate, endDate) !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="leave-cal__summary-range">
              {formatDateNice(startDate)}
              {pickingEnd && !singleDate && (
                <span className="leave-cal__summary-hint"> — pick end date</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** "Mon 9 Jun 2026" */
function formatDateNice(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Count calendar days inclusive. */
function countDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / 86400000) + 1
}

export default LeaveCalendar
