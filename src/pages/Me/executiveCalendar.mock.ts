/**
 * Mock meeting / calendar data for the RI's personal view.
 *
 * In production: GET /api/me/calendar?from=&to= → CalendarSvc
 *
 * Categories:
 *   homes-catchup   — monthly all-homes review with all Registered Managers
 *   home-meeting     — 1:1 with a specific Registered Manager (monthly)
 *   home-visit       — scheduled walk-around / inspection at a home
 *   board            — board / governance meetings
 *   hr               — HR, recruitment, disciplinary
 *   personal         — 1:1s, mentoring, personal
 *   leave            — annual / sick leave blocks
 */

export type MeetingCategory =
  | "homes-catchup"
  | "home-meeting"
  | "home-visit"
  | "board"
  | "hr"
  | "personal"
  | "leave"

export type CalendarEvent = {
  id: string
  title: string
  category: MeetingCategory
  date: string       // yyyy-mm-dd
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  location?: string
  attendees?: string[]
  recurring?: string // e.g. "Monthly", "Weekly", "Fortnightly"
  notes?: string
}

export const CATEGORY_META: Record<
  MeetingCategory,
  { label: string; color: string; icon: string }
> = {
  "homes-catchup": {
    label: "All Homes Catchup",
    color: "#6366f1", // indigo
    icon: "\u{1F3E0}", // 🏠
  },
  "home-meeting": {
    label: "Home Meeting",
    color: "#3b82f6", // blue
    icon: "\u{1F465}", // 👥
  },
  "home-visit": {
    label: "Home Visit",
    color: "#10b981", // emerald
    icon: "\u{1F6B6}", // 🚶
  },
  board: {
    label: "Board / Governance",
    color: "#8b5cf6", // violet
    icon: "\u{1F4CA}", // 📊
  },
  hr: {
    label: "HR / Recruitment",
    color: "#f59e0b", // amber
    icon: "\u{1F4CB}", // 📋
  },
  personal: {
    label: "Personal / 1:1",
    color: "#64748b", // slate
    icon: "\u{1F464}", // 👤
  },
  leave: {
    label: "Leave",
    color: "#ef4444", // red
    icon: "\u{2708}️",  // ✈️
  },
}

// ── This week: 9–13 Jun 2026 (Mon–Fri) ────────────────

export const RI_CALENDAR_EVENTS: CalendarEvent[] = [
  // Monday 9 Jun
  {
    id: "ev-1",
    title: "All Homes Monthly Catchup",
    category: "homes-catchup",
    date: "2026-06-09",
    startTime: "09:30",
    endTime: "10:30",
    location: "Head Office · Board Room",
    attendees: ["Priya Amari", "Sam Ortega", "Clara Nguyen"],
    recurring: "Monthly (2nd Monday)",
    notes: "Review KPIs, incidents, staffing, Ofsted readiness across all homes",
  },
  {
    id: "ev-2",
    title: "HR — Recruitment Pipeline",
    category: "hr",
    date: "2026-06-09",
    startTime: "11:00",
    endTime: "11:45",
    location: "Head Office",
    attendees: ["Jen Morris (HR)"],
    recurring: "Fortnightly",
  },
  {
    id: "ev-3",
    title: "1:1 with Priya (Willow House)",
    category: "home-meeting",
    date: "2026-06-09",
    startTime: "14:00",
    endTime: "14:45",
    location: "Head Office",
    attendees: ["Priya Amari"],
    recurring: "Monthly",
    notes: "Staffing gaps, Ofsted action plan follow-up, LAC review prep",
  },

  // Tuesday 10 Jun
  {
    id: "ev-4",
    title: "Willow House Visit",
    category: "home-visit",
    date: "2026-06-10",
    startTime: "10:00",
    endTime: "12:00",
    location: "Willow House",
    attendees: ["Priya Amari", "Daniel T."],
    notes: "Walk-around + team huddle. Check young people's key-worker sessions",
  },
  {
    id: "ev-5",
    title: "1:1 with Sam (Deputy, Willow)",
    category: "personal",
    date: "2026-06-10",
    startTime: "14:00",
    endTime: "14:30",
    location: "Head Office",
    attendees: ["Sam Ortega"],
    recurring: "Monthly",
  },

  // Wednesday 11 Jun
  {
    id: "ev-6",
    title: "Board Governance Meeting",
    category: "board",
    date: "2026-06-11",
    startTime: "10:00",
    endTime: "12:00",
    location: "Head Office · Board Room",
    attendees: ["Board members", "CFO"],
    recurring: "Monthly (2nd Wed)",
    notes: "Q2 budget review, expansion proposal",
  },
  {
    id: "ev-7",
    title: "1:1 with Clara (Rowan Lodge)",
    category: "home-meeting",
    date: "2026-06-11",
    startTime: "14:00",
    endTime: "14:45",
    location: "Teams call",
    attendees: ["Clara Nguyen"],
    recurring: "Monthly",
    notes: "Ofsted Reg 44 overdue — escalation follow-up, safeguarding review",
  },

  // Thursday 12 Jun (today)
  {
    id: "ev-8",
    title: "Rowan Lodge Visit",
    category: "home-visit",
    date: "2026-06-12",
    startTime: "09:30",
    endTime: "12:00",
    location: "Rowan Lodge",
    attendees: ["Clara Nguyen", "Finn Wallace"],
    notes: "Urgent — safeguarding disclosure follow-up + Ofsted action review",
  },
  {
    id: "ev-9",
    title: "Oakmoor House — Monthly Check-in",
    category: "home-meeting",
    date: "2026-06-12",
    startTime: "14:00",
    endTime: "14:45",
    location: "Teams call",
    attendees: ["Oakmoor Manager"],
    recurring: "Monthly",
  },
  {
    id: "ev-10",
    title: "Safeguarding Review — Disclosure Follow-up",
    category: "hr",
    date: "2026-06-12",
    startTime: "15:30",
    endTime: "16:30",
    location: "Head Office",
    attendees: ["Jen Morris (HR)", "Clara Nguyen"],
    notes: "Formal review of Rowan Lodge safeguarding disclosure with LADO",
  },

  // Friday 13 Jun
  {
    id: "ev-11",
    title: "Oakmoor House Visit",
    category: "home-visit",
    date: "2026-06-13",
    startTime: "10:00",
    endTime: "12:00",
    location: "Oakmoor House",
    attendees: ["Oakmoor Manager"],
    notes: "Routine visit — young people's welfare checks, education progress",
  },
  {
    id: "ev-12",
    title: "Week Review & Planning",
    category: "personal",
    date: "2026-06-13",
    startTime: "14:00",
    endTime: "15:00",
    location: "Head Office",
    notes: "Review action items, plan next week priorities",
    recurring: "Weekly (Friday)",
  },

  // Next week preview
  {
    id: "ev-13",
    title: "All Homes Monthly Catchup",
    category: "homes-catchup",
    date: "2026-06-16",
    startTime: "09:30",
    endTime: "10:30",
    location: "Head Office · Board Room",
    attendees: ["Priya Amari", "Sam Ortega", "Clara Nguyen"],
    recurring: "Monthly (2nd Monday)",
  },
  {
    id: "ev-14",
    title: "Annual Leave",
    category: "leave",
    date: "2026-06-23",
    startTime: "09:00",
    endTime: "17:00",
    location: "",
    notes: "Annual leave — 23–27 Jun",
  },
  {
    id: "ev-15",
    title: "Annual Leave",
    category: "leave",
    date: "2026-06-24",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "ev-16",
    title: "Annual Leave",
    category: "leave",
    date: "2026-06-25",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "ev-17",
    title: "Annual Leave",
    category: "leave",
    date: "2026-06-26",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "ev-18",
    title: "Annual Leave",
    category: "leave",
    date: "2026-06-27",
    startTime: "09:00",
    endTime: "17:00",
  },
]

// ── Registered Manager events (Priya — Willow House) ────

export const MANAGER_CALENDAR_EVENTS: CalendarEvent[] = [
  // Monday 9 Jun
  {
    id: "hm-1",
    title: "Team Huddle — Maple & Oak Units",
    category: "home-meeting",
    date: "2026-06-09",
    startTime: "09:00",
    endTime: "09:30",
    location: "Willow House · Lounge",
    attendees: ["Daniel T.", "Amira O.", "Hiroki T."],
    recurring: "Daily (Mon–Fri)",
    notes: "Morning handover and priorities for the day",
  },
  {
    id: "hm-2",
    title: "Key-Worker Session Review",
    category: "home-meeting",
    date: "2026-06-09",
    startTime: "10:00",
    endTime: "11:00",
    location: "Willow House · Office",
    attendees: ["Amira O."],
    notes: "Review progress on Ashanti K. and Beatrice M. behaviour plans",
  },
  {
    id: "hm-3",
    title: "1:1 with RI",
    category: "personal",
    date: "2026-06-09",
    startTime: "14:00",
    endTime: "14:45",
    location: "Head Office",
    attendees: ["Raj Kapoor"],
    recurring: "Monthly",
    notes: "Staffing gaps, Ofsted action plan follow-up, LAC review prep",
  },

  // Tuesday 10 Jun
  {
    id: "hm-4",
    title: "Team Huddle — Maple & Oak Units",
    category: "home-meeting",
    date: "2026-06-10",
    startTime: "09:00",
    endTime: "09:30",
    location: "Willow House · Lounge",
    attendees: ["Daniel T.", "Amira O."],
    recurring: "Daily (Mon–Fri)",
  },
  {
    id: "hm-5",
    title: "Social Worker Visit — Ashanti K.",
    category: "home-visit",
    date: "2026-06-10",
    startTime: "10:30",
    endTime: "12:00",
    location: "Willow House",
    attendees: ["Karen Langford (SW)", "Amira O."],
    notes: "Quarterly placement review — PEP and behaviour plan update",
  },
  {
    id: "hm-6",
    title: "Rota Planning — Next Fortnight",
    category: "hr",
    date: "2026-06-10",
    startTime: "14:00",
    endTime: "15:00",
    location: "Willow House · Office",
    attendees: ["Sam Ortega"],
    recurring: "Fortnightly",
  },

  // Wednesday 11 Jun
  {
    id: "hm-7",
    title: "Team Huddle — Maple & Oak Units",
    category: "home-meeting",
    date: "2026-06-11",
    startTime: "09:00",
    endTime: "09:30",
    location: "Willow House · Lounge",
    attendees: ["Daniel T.", "Beatrice M."],
    recurring: "Daily (Mon–Fri)",
  },
  {
    id: "hm-8",
    title: "All Homes Monthly Catchup",
    category: "homes-catchup",
    date: "2026-06-11",
    startTime: "10:00",
    endTime: "11:00",
    location: "Head Office · Board Room",
    attendees: ["Raj Kapoor", "Sam Ortega", "Clara Nguyen"],
    recurring: "Monthly (2nd Wed)",
    notes: "Review KPIs, incidents, staffing, Ofsted readiness across all homes",
  },
  {
    id: "hm-9",
    title: "Safeguarding Supervision",
    category: "personal",
    date: "2026-06-11",
    startTime: "14:00",
    endTime: "15:00",
    location: "Willow House · Office",
    attendees: ["External Safeguarding Lead"],
    recurring: "Monthly",
    notes: "Review safeguarding log, any open referrals, LADO updates",
  },

  // Thursday 12 Jun (today)
  {
    id: "hm-10",
    title: "Team Huddle — Maple & Oak Units",
    category: "home-meeting",
    date: "2026-06-12",
    startTime: "09:00",
    endTime: "09:30",
    location: "Willow House · Lounge",
    attendees: ["Daniel T.", "Amira O.", "Tomás R."],
    recurring: "Daily (Mon–Fri)",
  },
  {
    id: "hm-11",
    title: "LAC Review — Daria P.",
    category: "home-visit",
    date: "2026-06-12",
    startTime: "10:00",
    endTime: "12:00",
    location: "Willow House",
    attendees: ["Fiona Marsh (SW)", "Daniel T.", "Daria P."],
    notes: "Pathway plan review — semi-independent living prep, college progress",
  },
  {
    id: "hm-12",
    title: "Reg 44 Visit Preparation",
    category: "hr",
    date: "2026-06-12",
    startTime: "14:00",
    endTime: "15:00",
    location: "Willow House · Office",
    notes: "Prepare documentation for upcoming Reg 44 monthly visit",
  },

  // Friday 13 Jun
  {
    id: "hm-13",
    title: "Team Huddle — Maple & Oak Units",
    category: "home-meeting",
    date: "2026-06-13",
    startTime: "09:00",
    endTime: "09:30",
    location: "Willow House · Lounge",
    attendees: ["Hiroki T.", "Beatrice M."],
    recurring: "Daily (Mon–Fri)",
  },
  {
    id: "hm-14",
    title: "Week Review & Planning",
    category: "personal",
    date: "2026-06-13",
    startTime: "14:00",
    endTime: "15:00",
    location: "Willow House · Office",
    notes: "Review weekly incidents, behaviour logs, plan next week priorities",
    recurring: "Weekly (Friday)",
  },
  {
    id: "hm-15",
    title: "1:1 with Deputy Manager",
    category: "personal",
    date: "2026-06-13",
    startTime: "15:30",
    endTime: "16:00",
    location: "Willow House · Office",
    attendees: ["Sam Ortega"],
    recurring: "Weekly",
  },

  // Next week preview
  {
    id: "hm-16",
    title: "Reg 44 Monthly Visit",
    category: "home-visit",
    date: "2026-06-18",
    startTime: "10:00",
    endTime: "16:00",
    location: "Willow House",
    attendees: ["Independent Visitor"],
    notes: "Monthly regulatory visit — ensure all records, logs, and plans are current",
  },
  {
    id: "hm-17",
    title: "Annual Leave",
    category: "leave",
    date: "2026-06-30",
    startTime: "09:00",
    endTime: "17:00",
    notes: "Annual leave — 30 Jun – 4 Jul",
  },
  {
    id: "hm-18",
    title: "Annual Leave",
    category: "leave",
    date: "2026-07-01",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "hm-19",
    title: "Annual Leave",
    category: "leave",
    date: "2026-07-02",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "hm-20",
    title: "Annual Leave",
    category: "leave",
    date: "2026-07-03",
    startTime: "09:00",
    endTime: "17:00",
  },
  {
    id: "hm-21",
    title: "Annual Leave",
    category: "leave",
    date: "2026-07-04",
    startTime: "09:00",
    endTime: "17:00",
  },
]
