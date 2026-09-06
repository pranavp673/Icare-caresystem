/**
 * HomeSvc residents mock — source of truth for `SubjectRow` and the
 * `SUBJECTS` seed list. Consumed by `homeService.listResidents` and by
 * `clientsService` (which layers per-client detail onto the same rows).
 */
export type SubjectRow = {
  id: string
  code: string
  name: string
  initials: string
  home: string
  keyworker: string
  /** Lead/manager who owns the placement plan. */
  primaryOwnerId: string
  /** Staff/professional assigned day-to-day care. */
  assignedOwnerId: string
  lastReviewDays: number
  status: "stable" | "needs-review" | "new" | "transitioning"
}

export const SUBJECTS: SubjectRow[] = [
  { id: "s1", code: "A-1142", name: "Ashanti K.", initials: "AK", home: "Willow House", keyworker: "Priya A.", primaryOwnerId: "u-hm", assignedOwnerId: "u-pro", lastReviewDays: 2, status: "stable" },
  { id: "s2", code: "A-1139", name: "Beatrice M.", initials: "BM", home: "Willow House", keyworker: "Daniel T.", primaryOwnerId: "u-hm", assignedOwnerId: "u-tl", lastReviewDays: 14, status: "needs-review" },
  { id: "s3", code: "A-1138", name: "Chen Wei", initials: "CW", home: "Willow House", keyworker: "Amira O.", primaryOwnerId: "u-tl", assignedOwnerId: "u-pro", lastReviewDays: 1, status: "stable" },
  { id: "s4", code: "A-1137", name: "Daria P.", initials: "DP", home: "Willow House", keyworker: "Priya A.", primaryOwnerId: "u-hm", assignedOwnerId: "u-pro", lastReviewDays: 21, status: "needs-review" },
  { id: "s5", code: "A-1136", name: "Elena R.", initials: "ER", home: "Oakmoor House", keyworker: "Tomás R.", primaryOwnerId: "u-hm", assignedOwnerId: "u-ad", lastReviewDays: 3, status: "stable" },
  { id: "s6", code: "A-1135", name: "Finn O.", initials: "FO", home: "Oakmoor House", keyworker: "Clara F.", primaryOwnerId: "u-ad", assignedOwnerId: "u-ad", lastReviewDays: 0, status: "new" },
  { id: "s7", code: "A-1134", name: "Grace I.", initials: "GI", home: "Willow House", keyworker: "Daniel T.", primaryOwnerId: "u-hm", assignedOwnerId: "u-tl", lastReviewDays: 7, status: "transitioning" },
  { id: "s8", code: "A-1133", name: "Hiroki T.", initials: "HT", home: "Willow House", keyworker: "Amira O.", primaryOwnerId: "u-tl", assignedOwnerId: "u-pro", lastReviewDays: 5, status: "stable" },
  // No Registered/Deputy Manager persona is seeded for Rowan Lodge yet
  // (capacity 10, homes.mock.ts) — ownership falls to System Admin as the
  // top-level control point (§2.1) rather than inventing an unseeded home
  // persona. Resident data is universally visible regardless (§2.2).
  { id: "s9", code: "A-1132", name: "Ivy L.", initials: "IL", home: "Rowan Lodge", keyworker: "Jordan M.", primaryOwnerId: "u-sys", assignedOwnerId: "u-sys", lastReviewDays: 10, status: "stable" },
  { id: "s10", code: "A-1131", name: "Kai B.", initials: "KB", home: "Rowan Lodge", keyworker: "Jordan M.", primaryOwnerId: "u-sys", assignedOwnerId: "u-sys", lastReviewDays: 0, status: "new" },
]
