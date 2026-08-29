import React, { useMemo, useCallback } from "react"
import WheelPicker from "./WheelPicker"
import "./WheelTimePicker.scss"

/**
 * WheelTimePicker — iOS-style three-drum time picker.
 *
 * Three side-by-side scroll wheels: Hour (1–12) · Minute (00–55 in
 * `step`-minute intervals) · AM/PM. The component emits 24-hour "HH:mm"
 * strings so the rest of the app stays in 24h internally.
 *
 * Visual design cues taken from iOS UIDatePicker:
 *   • Center highlight band with rounded corners
 *   • Gradient fades at top and bottom
 *   • Large, touch-friendly text
 *   • Haptic-like scroll-snap locking
 */

type Props = {
  /** 24-hour "HH:mm" value. */
  value: string
  onChange: (hhmm: string) => void
  /** Minute step (default: 5). */
  step?: number
}

// ── Helpers ────────────────────────────────────────────

const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i === 0 ? 12 : i).padStart(2, "0")
)

const buildMinutes = (step: number) =>
  Array.from({ length: Math.floor(60 / step) }, (_, i) =>
    String(i * step).padStart(2, "0")
  )

const PERIODS = ["AM", "PM"]

/** Parse "HH:mm" (24h) → { h12, minute, period }. */
const parse24 = (
  hhmm: string
): { h12: string; minute: string; period: string } => {
  const [hStr, mStr] = hhmm.split(":")
  let h = parseInt(hStr, 10) || 0
  const minute = (mStr ?? "00").padStart(2, "0")
  const period = h >= 12 ? "PM" : "AM"
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return { h12: String(h).padStart(2, "0"), minute, period }
}

/** Convert h12 + period → 24h hour number. */
const to24 = (h12: string, period: string): number => {
  let h = parseInt(h12, 10)
  if (period === "AM") {
    if (h === 12) h = 0
  } else {
    if (h !== 12) h += 12
  }
  return h
}

const WheelTimePicker: React.FC<Props> = ({ value, onChange, step = 5 }) => {
  const minuteItems = useMemo(() => buildMinutes(step), [step])
  const { h12, minute, period } = useMemo(() => parse24(value), [value])

  const setHour = useCallback(
    (newH: string) => {
      const h24 = to24(newH, period)
      onChange(`${String(h24).padStart(2, "0")}:${minute}`)
    },
    [period, minute, onChange]
  )

  const setMinute = useCallback(
    (newM: string) => {
      const h24 = to24(h12, period)
      onChange(`${String(h24).padStart(2, "0")}:${newM}`)
    },
    [h12, period, onChange]
  )

  const setPeriod = useCallback(
    (newP: string) => {
      const h24 = to24(h12, newP)
      onChange(`${String(h24).padStart(2, "0")}:${minute}`)
    },
    [h12, minute, onChange]
  )

  return (
    <div className="wheel-time-picker">
      <WheelPicker
        items={HOURS_12}
        value={h12}
        onChange={setHour}
        width={52}
        label="Hour"
      />
      <span className="wheel-time-picker__colon" aria-hidden="true">:</span>
      <WheelPicker
        items={minuteItems}
        value={minute}
        onChange={setMinute}
        width={52}
        label="Minute"
      />
      <WheelPicker
        items={PERIODS}
        value={period}
        onChange={setPeriod}
        width={52}
        label="AM or PM"
      />
    </div>
  )
}

export default WheelTimePicker
