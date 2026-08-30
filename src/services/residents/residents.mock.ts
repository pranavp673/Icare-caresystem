/**
 * ResidentsSvc mock — per-resident profile and comments. The 14 §3.5.1
 * document types (plans, incident reports, health records, daily
 * records, activity) live in the sibling `residentDocuments.mock.ts`,
 * replacing what used to be a single flat service-history feed here.
 *
 * The base resident roster comes from `home/residents.mock.ts` (same rows
 * that back `homeService.listResidents`); this file *layers* detail on
 * top — date of birth, keyworker, admission date, comments timeline.
 *
 * On the real backend this data is the composition of two domains:
 *   * HomeSvc (who lives where, basic demographics)
 *   * CareSvc (placement plan, risk assessments, incidents, notes)
 * ResidentsSvc is the gateway aggregator that returns a single merged
 * row per resident so the UI doesn't have to fan out on every render.
 */
import type { SubjectRow } from "../home/residents.mock"
import { SUBJECTS } from "../home/residents.mock"

/** Where a resident is in their service journey. */
export type ResidentStatus = SubjectRow["status"]

export type ResidentProfile = SubjectRow & {
  /** ISO date — the resident's date of birth. */
  dateOfBirth: string
  /** Derived age in years. Pre-computed in the mock. */
  age: number
  primaryContact: {
    name: string
    relation: string
    phone: string
  }
  /** ISO date — first admitted into care. */
  admissionDate: string
  roomNumber: string
  summary: string
}

export type ResidentComment = {
  id: string
  residentId: string
  authorId: string
  author: string
  authorRole: string
  /** Display string ("2026-04-11 14:32" or "2 h ago"). */
  at: string
  body: string
  /** If set, this comment is a reply to the given parent comment. */
  parentId: string | null
}

const PROFILE_DETAIL: Record<
  string,
  Omit<ResidentProfile, keyof SubjectRow>
> = {
  s1: {
    dateOfBirth: "2012-03-18",
    age: 14,
    primaryContact: {
      name: "Karen Langford",
      relation: "Social Worker",
      phone: "+44 7700 900018",
    },
    admissionDate: "2024-09-14",
    roomNumber: "W-102",
    summary:
      "Settled well. Behavioural support plan in place — responding positively to key-worker sessions. Attending school regularly, Year 9.",
  },
  s2: {
    dateOfBirth: "2010-11-02",
    age: 15,
    primaryContact: {
      name: "Marcus Hale",
      relation: "Social Worker",
      phone: "+44 7700 900139",
    },
    admissionDate: "2023-06-03",
    roomNumber: "W-215",
    summary:
      "Placement plan review overdue (14 days). Emotional and behavioural difficulties (EBD); one-to-one support at transitions required. LAC review due.",
  },
  s3: {
    dateOfBirth: "2013-06-27",
    age: 12,
    primaryContact: {
      name: "Li Wei",
      relation: "Parent",
      phone: "+44 7700 900138",
    },
    admissionDate: "2025-07-12",
    roomNumber: "W-109",
    summary:
      "Short-term placement for family support. Emotional wellbeing improving. Weekly therapeutic sessions Tues + Thurs.",
  },
  s4: {
    dateOfBirth: "2009-01-12",
    age: 17,
    primaryContact: {
      name: "Fiona Marsh",
      relation: "Social Worker",
      phone: "+44 7700 900137",
    },
    admissionDate: "2023-05-30",
    roomNumber: "W-221",
    summary:
      "Pathway plan revision in progress — preparing for semi-independent living. Education: attending college, Level 2 course.",
  },
  s5: {
    dateOfBirth: "2014-09-09",
    age: 11,
    primaryContact: {
      name: "Rosa Reyes",
      relation: "Placing Authority",
      phone: "+44 7700 900136",
    },
    admissionDate: "2025-01-25",
    roomNumber: "O-104",
    summary:
      "Stable placement. Enjoys art group on Wednesdays. Good peer relationships developing. PEP review upcoming.",
  },
  s6: {
    dateOfBirth: "2016-04-22",
    age: 10,
    primaryContact: {
      name: "Siobhán O'Donnell",
      relation: "Social Worker",
      phone: "+44 7700 900135",
    },
    admissionDate: "2026-03-28",
    roomNumber: "O-210",
    summary:
      "New admission — still settling in. Building trust with key-worker. Familiarising with house routines and school.",
  },
  s7: {
    dateOfBirth: "2011-12-08",
    age: 14,
    primaryContact: {
      name: "Janet Irwin",
      relation: "Parent",
      phone: "+44 7700 900134",
    },
    admissionDate: "2025-01-19",
    roomNumber: "W-207",
    summary:
      "Transitioning from respite to full-time placement. Parent visits fortnightly; placement plan being updated for long-term support.",
  },
  s8: {
    dateOfBirth: "2013-08-15",
    age: 12,
    primaryContact: {
      name: "Yuka Tanaka",
      relation: "Parent",
      phone: "+44 7700 900133",
    },
    admissionDate: "2024-12-07",
    roomNumber: "W-118",
    summary:
      "Stable; ADHD managed with structured daily routine. Enjoys music sessions and outdoor activities. School attendance good.",
  },
}

/** Merged list: base residents + per-resident detail. */
export const RESIDENTS: ResidentProfile[] = SUBJECTS.map((row) => ({
  ...row,
  ...PROFILE_DETAIL[row.id],
}))

export const RESIDENT_COMMENTS: ResidentComment[] = [
  {
    id: "cc-1",
    residentId: "s1",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-10 16:40",
    body: "Ashanti had a difficult afternoon — got into a disagreement with a peer. Key-worker session booked for tomorrow morning.",
    parentId: null,
  },
  {
    id: "cc-1r1",
    residentId: "s1",
    authorId: "tm-1",
    author: "Amira O.",
    authorRole: "RSW",
    at: "2026-04-10 17:05",
    body: "Noted — she was calmer by tea time. I'll make sure the morning handover covers it.",
    parentId: "cc-1",
  },
  {
    id: "cc-1r2",
    residentId: "s1",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-10 17:20",
    body: "Thanks Amira. Social worker visit is Thursday — I'll flag the pattern in the review.",
    parentId: "cc-1",
  },
  {
    id: "cc-2",
    residentId: "s1",
    authorId: "tm-1",
    author: "Amira O.",
    authorRole: "RSW",
    at: "2026-04-09 09:12",
    body: "Great morning — Ashanti got ready for school independently and left on time. Positive start.",
    parentId: null,
  },
  {
    id: "cc-3",
    residentId: "s2",
    authorId: "tm-4",
    author: "Tomás R.",
    authorRole: "Senior RSW",
    at: "2026-04-11 06:50",
    body: "Quiet night. Beatrice settled by 22:00 — no waking incidents. Morning routine went smoothly.",
    parentId: null,
  },
  {
    id: "cc-4",
    residentId: "s2",
    authorId: "tm-2",
    author: "Daniel T.",
    authorRole: "RSW",
    at: "2026-04-10 22:05",
    body: "Evening routine went well — Beatrice engaged in the group activity and went to her room voluntarily at bedtime.",
    parentId: null,
  },
  {
    id: "cc-4r1",
    residentId: "s2",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-11 07:15",
    body: "Good to hear. Let's keep tracking this — three consecutive good evenings supports the updated behaviour plan.",
    parentId: "cc-4",
  },
  {
    id: "cc-5",
    residentId: "s4",
    authorId: "tm-2",
    author: "Daniel T.",
    authorRole: "RSW",
    at: "2026-04-11 03:20",
    body: "Daria was unsettled during waking night check — said she couldn't sleep. Talked briefly, settled by 03:45.",
    parentId: null,
  },
  {
    id: "cc-5r1",
    residentId: "s4",
    authorId: "tm-4",
    author: "Tomás R.",
    authorRole: "Senior RSW",
    at: "2026-04-11 06:45",
    body: "Noted — she's been anxious about her pathway plan meeting. Will check in during day shift.",
    parentId: "cc-5",
  },
  {
    id: "cc-6",
    residentId: "s5",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-08 11:15",
    body: "Social worker visit scheduled for next Tuesday — please ensure Elena's PEP review paperwork is ready.",
    parentId: null,
  },
  {
    id: "cc-7",
    residentId: "s6",
    authorId: "tm-3",
    author: "Clara F.",
    authorRole: "RSW",
    at: "2026-04-11 08:30",
    body: "Finn settling well — joined the group for breakfast for the first time today. Building rapport with key-worker.",
    parentId: null,
  },
]
