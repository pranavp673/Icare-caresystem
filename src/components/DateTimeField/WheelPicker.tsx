import React, { useCallback, useEffect, useRef } from "react"

/**
 * WheelPicker — a single-column iOS-style scroll-snap drum picker.
 *
 * Each column is a vertically scrollable list with CSS `scroll-snap-type`
 * so items lock to the center slot on release. A translucent overlay
 * with a highlight band draws attention to the selected row, exactly
 * like the iOS UIPickerView.
 *
 * Touch behaviour:
 *   • Momentum scrolling (`-webkit-overflow-scrolling: touch`) for flick.
 *   • `scroll-snap-type: y mandatory` for detent/locking.
 *   • Padding at top/bottom (½ visible height) so the first and last
 *     items can land in the center slot.
 *
 * The component is fully controlled: `value` + `onChange`.
 */

export type WheelPickerProps = {
  items: string[]
  value: string
  onChange: (value: string) => void
  /** Width of this column (default: 44px). */
  width?: number
  /** Label shown above the wheel (sr-only). */
  label?: string
}

const ITEM_HEIGHT = 32
const VISIBLE_ITEMS = 5
const VISIBLE_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  value,
  onChange,
  width = 44,
  label,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScroll = useRef(true)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll to the selected item on mount and when value changes externally.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const idx = items.indexOf(value)
    if (idx < 0) return
    const targetTop = idx * ITEM_HEIGHT
    isUserScroll.current = false
    el.scrollTo({ top: targetTop, behavior: "smooth" })
    // Re-enable user scroll detection after animation settles.
    const id = setTimeout(() => { isUserScroll.current = true }, 200)
    return () => clearTimeout(id)
  }, [value, items])

  // On scroll, figure out which item is closest to center and fire onChange.
  const handleScroll = useCallback(() => {
    if (!isUserScroll.current) return
    const el = scrollRef.current
    if (!el) return

    // Debounce — wait for scroll to settle (snap finishes).
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      const scrollTop = el.scrollTop
      const idx = Math.round(scrollTop / ITEM_HEIGHT)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      if (items[clamped] !== value) {
        onChange(items[clamped])
      }
    }, 60)
  }, [items, value, onChange])

  // Cleanup timeout on unmount.
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [])

  // Half the visible area as top/bottom padding so first/last items
  // can reach the center highlight band.
  const padHeight = (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2

  return (
    <div
      className="wheel-picker"
      style={{ width, height: VISIBLE_HEIGHT }}
      role="listbox"
      aria-label={label}
    >
      {/* Highlight band — the center slot */}
      <div className="wheel-picker__highlight" aria-hidden="true" />
      {/* Fade overlays top + bottom */}
      <div className="wheel-picker__fade wheel-picker__fade--top" aria-hidden="true" />
      <div className="wheel-picker__fade wheel-picker__fade--bottom" aria-hidden="true" />

      <div
        ref={scrollRef}
        className="wheel-picker__scroll"
        onScroll={handleScroll}
      >
        {/* Top spacer */}
        <div style={{ height: padHeight, flexShrink: 0 }} />
        {items.map((item) => {
          const isSelected = item === value
          return (
            <div
              key={item}
              className={`wheel-picker__item ${isSelected ? "is-selected" : ""}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => onChange(item)}
            >
              {item}
            </div>
          )
        })}
        {/* Bottom spacer */}
        <div style={{ height: padHeight, flexShrink: 0 }} />
      </div>
    </div>
  )
}

export default WheelPicker
