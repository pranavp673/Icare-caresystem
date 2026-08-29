/**
 * ClientsSvc mock — per-client profile, comments, and service history.
 *
 * The base client roster comes from `home/residents.mock.ts` (same rows
 * that back `homeService.listResidents`); this file *layers* detail on
 * top — date of birth, keyworker, admission date, comments timeline,
 * and a chronological service-history feed.
 *
 * On the real backend this data is the composition of two domains:
 *   • HomeSvc (who lives where, basic demographics)
 *   • CareSvc (placement plan, risk assessments, incidents, notes)
 * ClientsSvc is the gateway aggregator that returns a single merged
 * row per client so the UI doesn't have to fan out on every render.
 */
import type { SubjectRow } from "../home/residents.mock"
import { SUBJECTS } from "../home/residents.mock"

/** Where a client is in their service journey. */
export type ClientStatus = SubjectRow["status"]

export type ClientProfile = SubjectRow & {
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

export type ClientComment = {
  id: string
  clientId: string
  authorId: string
  author: string
  authorRole: string
  /** Display string ("2026-04-11 14:32" or "2 h ago"). */
  at: string
  body: string
  /** If set, this comment is a reply to the given parent comment. */
  parentId: string | null
}

export type ServiceEventKind =
  | "admission"
  | "placement_plan"
  | "health_review"
  | "incident"
  | "appointment"
  | "note"

export type ServiceEvent = {
  id: string
  clientId: string
  at: string
  kind: ServiceEventKind
  summary: string
  by: string
}

const PROFILE_DETAIL: Record<
  string,
  Omit<ClientProfile, keyof SubjectRow>
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

/** Merged list: base residents + per-client detail. */
export const CLIENTS: ClientProfile[] = SUBJECTS.map((row) => ({
  ...row,
  ...PROFILE_DETAIL[row.id],
}))

export const CLIENT_COMMENTS: ClientComment[] = [
  {
    id: "cc-1",
    clientId: "s1",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-10 16:40",
    body: "Ashanti had a difficult afternoon — got into a disagreement with a peer. Key-worker session booked for tomorrow morning.",
    parentId: null,
  },
  {
    id: "cc-1r1",
    clientId: "s1",
    authorId: "tm-1",
    author: "Amira O.",
    authorRole: "RSW",
    at: "2026-04-10 17:05",
    body: "Noted — she was calmer by tea time. I'll make sure the morning handover covers it.",
    parentId: "cc-1",
  },
  {
    id: "cc-1r2",
    clientId: "s1",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-10 17:20",
    body: "Thanks Amira. Social worker visit is Thursday — I'll flag the pattern in the review.",
    parentId: "cc-1",
  },
  {
    id: "cc-2",
    clientId: "s1",
    authorId: "tm-1",
    author: "Amira O.",
    authorRole: "RSW",
    at: "2026-04-09 09:12",
    body: "Great morning — Ashanti got ready for school independently and left on time. Positive start.",
    parentId: null,
  },
  {
    id: "cc-3",
    clientId: "s2",
    authorId: "tm-4",
    author: "Tomás R.",
    authorRole: "Senior RSW",
    at: "2026-04-11 06:50",
    body: "Quiet night. Beatrice settled by 22:00 — no waking incidents. Morning routine went smoothly.",
    parentId: null,
  },
  {
    id: "cc-4",
    clientId: "s2",
    authorId: "tm-2",
    author: "Daniel T.",
    authorRole: "RSW",
    at: "2026-04-10 22:05",
    body: "Evening routine went well — Beatrice engaged in the group activity and went to her room voluntarily at bedtime.",
    parentId: null,
  },
  {
    id: "cc-4r1",
    clientId: "s2",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-11 07:15",
    body: "Good to hear. Let's keep tracking this — three consecutive good evenings supports the updated behaviour plan.",
    parentId: "cc-4",
  },
  {
    id: "cc-5",
    clientId: "s4",
    authorId: "tm-2",
    author: "Daniel T.",
    authorRole: "RSW",
    at: "2026-04-11 03:20",
    body: "Daria was unsettled during waking night check — said she couldn't sleep. Talked briefly, settled by 03:45.",
    parentId: null,
  },
  {
    id: "cc-5r1",
    clientId: "s4",
    authorId: "tm-4",
    author: "Tomás R.",
    authorRole: "Senior RSW",
    at: "2026-04-11 06:45",
    body: "Noted — she's been anxious about her pathway plan meeting. Will check in during day shift.",
    parentId: "cc-5",
  },
  {
    id: "cc-6",
    clientId: "s5",
    authorId: "tm-5",
    author: "Priya A.",
    authorRole: "Registered Manager",
    at: "2026-04-08 11:15",
    body: "Social worker visit scheduled for next Tuesday — please ensure Elena's PEP review paperwork is ready.",
    parentId: null,
  },
  {
    id: "cc-7",
    clientId: "s6",
    authorId: "tm-3",
    author: "Clara F.",
    authorRole: "RSW",
    at: "2026-04-11 08:30",
    body: "Finn settling well — joined the group for breakfast for the first time today. Building rapport with key-worker.",
    parentId: null,
  },
]

export const CLIENT_SERVICE_HISTORY: ServiceEvent[] = [
  // s1 — Ashanti
  { id: "se-1", clientId: "s1", at: "2024-09-14", kind: "admission", summary: "Placed at Willow House · Maple Unit", by: "Priya A." },
  { id: "se-2", clientId: "s1", at: "2025-11-30", kind: "placement_plan", summary: "Placement plan review — education and behaviour goals updated", by: "Tomás R." },
  { id: "se-3", clientId: "s1", at: "2026-04-10", kind: "note", summary: "Key-worker session completed — stable progress", by: "Amira O." },
  // s2 — Beatrice
  { id: "se-4", clientId: "s2", at: "2023-06-03", kind: "admission", summary: "Placed at Willow House · Oak Unit", by: "Priya A." },
  { id: "se-5", clientId: "s2", at: "2026-03-28", kind: "health_review", summary: "Quarterly LAC health review completed", by: "Tomás R." },
  { id: "se-6", clientId: "s2", at: "2026-04-11", kind: "note", summary: "Positive evening routine — updated behaviour plan notes", by: "Daniel T." },
  // s3 — Chen Wei
  { id: "se-7", clientId: "s3", at: "2025-07-12", kind: "admission", summary: "Short-term placement for family support", by: "Priya A." },
  { id: "se-8", clientId: "s3", at: "2026-04-09", kind: "appointment", summary: "Weekly therapeutic session with CAMHS", by: "External · Therapist" },
  // s4 — Daria
  { id: "se-9", clientId: "s4", at: "2023-05-30", kind: "admission", summary: "Placed at Willow House", by: "Priya A." },
  { id: "se-10", clientId: "s4", at: "2026-04-11", kind: "incident", summary: "Unsettled during waking night — anxiety about pathway plan, supported", by: "Daniel T." },
  // s5 — Elena
  { id: "se-11", clientId: "s5", at: "2025-01-25", kind: "admission", summary: "Placed at Oakmoor House", by: "Priya A." },
  { id: "se-12", clientId: "s5", at: "2026-04-05", kind: "health_review", summary: "PEP review — good school progress noted", by: "Tomás R." },
  // s6 — Finn
  { id: "se-13", clientId: "s6", at: "2026-03-28", kind: "admission", summary: "New placement — Oakmoor House", by: "Priya A." },
  { id: "se-14", clientId: "s6", at: "2026-04-05", kind: "placement_plan", summary: "Initial placement plan drafted with social worker", by: "Priya A." },
  // s7 — Grace
  { id: "se-15", clientId: "s7", at: "2025-01-19", kind: "admission", summary: "Respite placement, Willow House", by: "Priya A." },
  { id: "se-16", clientId: "s7", at: "2026-04-07", kind: "note", summary: "Transition to full-time placement approved by placing authority", by: "Priya A." },
  // s8 — Hiroki
  { id: "se-17", clientId: "s8", at: "2024-12-07", kind: "admission", summary: "Placed at Willow House · Maple Unit", by: "Priya A." },
  { id: "se-18", clientId: "s8", at: "2026-04-10", kind: "appointment", summary: "Music therapy session attended", by: "External · Therapist" },
]
