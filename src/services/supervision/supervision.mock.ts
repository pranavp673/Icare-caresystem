/**
 * SupervisionSvc mock — source of truth for `SupervisionRecord` and seed
 * data (FR-SUP, §3.6.1). One-on-one supervision meeting records —
 * confidential by default, visible only per the upward-cascading chain
 * resolved by `services/team/staffScope.ts`.
 *
 * Supervision chain: RI supervises Registered Manager; Registered
 * Manager supervises Deputy Manager; Registered Manager AND Deputy
 * Manager supervise Team Leader; Team Leader supervises their own team.
 *
 * `supervisorId`/`superviseeId` reference either a `TeamMember.id`
 * (team.mock.ts) or, for RI — who has no TeamMember row — a `MockUser.id`
 * (auth/user.ts). Both id spaces are disjoint (`tm-*` vs `u-*`), so a
 * single string field can hold either safely.
 */

export type SupervisionRecord = {
  id: string
  supervisorId: string
  superviseeId: string
  homeId: string
  date: string
  notes: string
}

export const SUPERVISION_RECORDS: SupervisionRecord[] = [
  {
    id: "sup-1",
    supervisorId: "tm-2", // Daniel T. (Team Leader)
    superviseeId: "tm-1", // Amira O. (RSW)
    homeId: "home-willow",
    date: "2026-06-05",
    notes: "Discussed caseload for Ashanti K., confidence with de-escalation techniques. No concerns raised.",
  },
  {
    id: "sup-2",
    supervisorId: "tm-2", // Daniel T.
    superviseeId: "tm-4", // Tomás R.
    homeId: "home-willow",
    date: "2026-05-29",
    notes: "Reviewed progress toward Senior RSW competencies. On track for review in Q3.",
  },
  {
    id: "sup-3",
    supervisorId: "tm-5", // Priya A. (Registered Manager)
    superviseeId: "tm-2", // Daniel T. (Team Leader)
    homeId: "home-willow",
    date: "2026-06-01",
    notes: "Reviewed team wellbeing following recent safeguarding incident. Agreed additional debrief time for the team.",
  },
  {
    id: "sup-4",
    supervisorId: "u-sm", // Raj Kapoor (RI) — no TeamMember row
    superviseeId: "tm-5", // Priya A. (Registered Manager)
    homeId: "home-willow",
    date: "2026-05-20",
    notes: "Quarterly RI supervision — reviewed home's Ofsted action plan and staffing pressures.",
  },
]
