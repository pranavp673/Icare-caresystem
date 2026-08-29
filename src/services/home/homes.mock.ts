/**
 * HomeSvc homes mock — source of truth for `Home`, `HomeActivity`, and
 * the `HOMES` / `HOME_ACTIVITY` seed data. Lives inside the services
 * tree so `homeService` can own its dependencies without reaching back
 * into `src/pages/Homes/*`.
 *
 * The legacy `pages/Homes/homes.mock.ts` keeps the `RATING_LABEL` UI
 * constant (used only by `HomesList.tsx` for card rendering) and now
 * imports the `Home` type from `services/home/home.types`.
 */
export type Home = {
  id: string
  name: string
  /** Short city-level location, not a full street address. */
  location: string
  /** Capacity = licensed beds, not current headcount. */
  capacity: number
  residents: number
  staffOnShift: number
  staffRequired: number
  /** Current coverage percent for the week. */
  coverage: number
  /** High-level care type mix. */
  careTypes: string[]
  /** Last Ofsted-style rating — for quick reassurance on the card. */
  rating: "outstanding" | "good" | "requires_improvement" | "inadequate"
  /** Headline metric that updates daily. */
  highlight: string
}

export const HOMES: Home[] = [
  {
    id: "home-willow",
    name: "Willow House",
    location: "Bristol · BS1",
    capacity: 8,
    residents: 6,
    staffOnShift: 5,
    staffRequired: 6,
    coverage: 90,
    careTypes: ["Residential", "EBD"],
    rating: "good",
    highlight: "1 unfilled waking night slot this week",
  },
  {
    id: "home-oakmoor",
    name: "Oakmoor House",
    location: "Bath · BA2",
    capacity: 6,
    residents: 5,
    staffOnShift: 4,
    staffRequired: 4,
    coverage: 92,
    careTypes: ["Residential", "Assessment"],
    rating: "outstanding",
    highlight: "Fully compliant on last Ofsted visit",
  },
  {
    id: "home-rowan",
    name: "Rowan Lodge",
    location: "Bristol · BS7",
    capacity: 10,
    residents: 8,
    staffOnShift: 5,
    staffRequired: 6,
    coverage: 82,
    careTypes: ["Therapeutic", "Solo placement"],
    rating: "good",
    highlight: "1 senior worker on annual leave",
  },
]

export type HomeActivity = {
  id: string
  homeId: string
  when: string
  kind: "incident" | "admission" | "discharge" | "audit" | "note"
  summary: string
}

export const HOME_ACTIVITY: HomeActivity[] = [
  {
    id: "ha-1",
    homeId: "home-willow",
    when: "Today · 08:14",
    kind: "incident",
    summary: "Minor altercation between two young people in Maple Unit — de-escalated, no injuries, logged by Priya A.",
  },
  {
    id: "ha-2",
    homeId: "home-willow",
    when: "Yesterday",
    kind: "admission",
    summary: "New young person placed — bedroom 4, Maple Unit (EBD support pathway).",
  },
  {
    id: "ha-3",
    homeId: "home-oakmoor",
    when: "2d ago",
    kind: "audit",
    summary: "Reg 44 monthly visit completed — 0 actions required.",
  },
  {
    id: "ha-4",
    homeId: "home-rowan",
    when: "3d ago",
    kind: "note",
    summary: "LAC review meeting scheduled for young person in bedroom 7 — social worker confirmed.",
  },
]
