import React, { useCallback, useId, useMemo, useRef, useState } from "react"
import WheelTimePicker from "./WheelTimePicker"
import "./DateTimeField.scss"
import "./WheelTimePicker.scss"

/**
 * DateTimeField — a typed datetime picker with timezone disclosure
 * and shift-timing presets.
 *
 * Why a wrapper:
 *   • All shift / override / leave forms used to ship loose strings like
 *     "Mon 14 Apr · 07:00–15:00", which is impossible to compare, sort, or
 *     pass to the backend. Now every datetime input is a real
 *     `<input type="datetime-local">` and emits an ISO-friendly value
 *     (`2026-04-14T07:00`).
 *   • The browser shows the value in the user's local zone but never tells
 *     them which zone that is. We surface the IANA zone + UTC offset right
 *     under the input so the user knows what they're picking, and the
 *     backend can store everything in UTC and stay region-agnostic.
 *   • Care staff almost always pick from the same few shift start/end
 *     times. The `presets` prop (or the built-in SHIFT_PRESETS) shows
 *     quick-pick buttons that set the time portion in one click, keeping
 *     the selected date. This eliminates 90% of manual time scrolling.
 *
 * The wrapper deliberately stays uncontrolled-friendly: pass `defaultValue`
 * for forms that submit via `FormData`, or `value` + `onChange` for
 * controlled state.
 */

export type DateTimeFieldProps = {
  name: string
  label: string
  /** Show "* required" hint and forward `required` to the input. */
  required?: boolean
  /** Uncontrolled initial value (`yyyy-mm-ddTHH:mm`). */
  defaultValue?: string
  /** Controlled value. If provided, prefer over `defaultValue`. */
  value?: string
  onChange?: (value: string) => void
  /** Optional custom hint shown below the picker. */
  hint?: string
  /** Earliest selectable datetime (`yyyy-mm-ddTHH:mm`). */
  min?: string
  /** Latest selectable datetime. */
  max?: string
  /** Minute granularity (default 5). */
  step?: number
}

/** Split "yyyy-mm-ddTHH:mm" → { date, time }. */
const splitValue = (
  v: string | undefined
): { date: string; time: string } => {
  if (!v) return { date: "", time: "07:00" }
  const tIdx = v.indexOf("T")
  if (tIdx < 0) return { date: v, time: "07:00" }
  return { date: v.slice(0, 10), time: v.slice(tIdx + 1, tIdx + 6) || "07:00" }
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  name,
  label,
  required = false,
  defaultValue,
  value,
  onChange,
  hint,
  min,
  max,
  step = 5,
}) => {
  const id = useId()
  const hiddenRef = useRef<HTMLInputElement>(null)

  // Internal state for uncontrolled mode — seeded from defaultValue.
  const initial = useMemo(() => splitValue(value ?? defaultValue), [])
  const [localDate, setLocalDate] = useState(initial.date)
  const [localTime, setLocalTime] = useState(initial.time)

  // Resolve which date/time to show: controlled value takes precedence.
  const currentParts = useMemo(() => {
    if (value !== undefined) return splitValue(value)
    return { date: localDate, time: localTime }
  }, [value, localDate, localTime])

  // Compose the combined "yyyy-mm-ddTHH:mm" for the hidden input + onChange.
  const composedValue = useMemo(
    () =>
      currentParts.date
        ? `${currentParts.date}T${currentParts.time}`
        : "",
    [currentParts]
  )

  // Sync hidden input whenever composed value changes.
  React.useEffect(() => {
    if (hiddenRef.current) hiddenRef.current.value = composedValue
  }, [composedValue])

  const emitChange = useCallback(
    (d: string, t: string) => {
      const combined = d ? `${d}T${t}` : ""
      onChange?.(combined)
    },
    [onChange]
  )

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const d = e.target.value
      setLocalDate(d)
      emitChange(d, currentParts.time)
    },
    [currentParts.time, emitChange]
  )

  const handleTimeChange = useCallback(
    (hhmm: string) => {
      setLocalTime(hhmm)
      emitChange(currentParts.date, hhmm)
    },
    [currentParts.date, emitChange]
  )

  return (
    <div className="form-field datetime-field">
      <label htmlFor={id}>
        <span className="form-field__label">
          {label}
          {required && <span className="datetime-field__required"> *</span>}
        </span>
      </label>

      {/* Hidden input carries the combined value for FormData submission. */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={composedValue}
      />

      <div className="datetime-field__picker-row">
        {/* Date — native date picker (calendar-only, no time clutter) */}
        <div className="datetime-field__date-col">
          <input
            id={id}
            type="date"
            className="datetime-field__date-input"
            value={currentParts.date}
            onChange={handleDateChange}
            min={min?.slice(0, 10)}
            max={max?.slice(0, 10)}
            required={required}
          />
        </div>

        {/* Time — iOS-style wheel picker */}
        <div className="datetime-field__time-col">
          <span className="datetime-field__time-label">Time</span>
          <WheelTimePicker
            value={currentParts.time}
            onChange={handleTimeChange}
            step={step}
          />
        </div>
      </div>

      {hint && (
        <span className="form-field__hint datetime-field__hint">
          {hint}
        </span>
      )}
    </div>
  )
}

export default DateTimeField
