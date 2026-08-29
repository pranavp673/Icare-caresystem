"""
Generate ICare data template Excel workbook.
Each sheet corresponds to a mock data source used in the app.
Includes sample rows and dropdown validations where applicable.
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUTPUT = "/Users/pranavpathak/workspace/Icare-caresystem/ICare_Data_Template.xlsx"

# ── Styles ──────────────────────────────────────────────
HEADER_FONT = Font(name="Arial", bold=True, size=11, color="FFFFFF")
HEADER_FILL = PatternFill(start_color="2B579A", end_color="2B579A", fill_type="solid")
HEADER_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)
DATA_FONT = Font(name="Arial", size=10)
EXAMPLE_FILL = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
LEGEND_FONT = Font(name="Arial", size=9, italic=True, color="666666")
THIN_BORDER = Border(
    left=Side(style="thin", color="D9D9D9"),
    right=Side(style="thin", color="D9D9D9"),
    top=Side(style="thin", color="D9D9D9"),
    bottom=Side(style="thin", color="D9D9D9"),
)


def style_header(ws, row, num_cols):
    for c in range(1, num_cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = HEADER_ALIGN
        cell.border = THIN_BORDER


def style_example(ws, row, num_cols):
    for c in range(1, num_cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = EXAMPLE_FILL
        cell.font = DATA_FONT
        cell.border = THIN_BORDER


def auto_width(ws, num_cols, header_row=2):
    for c in range(1, num_cols + 1):
        max_len = 0
        col_letter = get_column_letter(c)
        for row in ws.iter_rows(min_row=header_row, max_row=ws.max_row, min_col=c, max_col=c):
            for cell in row:
                if cell.value:
                    max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)


def add_validation(ws, col_letter, start_row, end_row, options):
    dv = DataValidation(type="list", formula1=f'"{",".join(options)}"', allow_blank=True)
    dv.error = "Please select from the dropdown"
    dv.errorTitle = "Invalid value"
    ws.add_data_validation(dv)
    dv.add(f"{col_letter}{start_row}:{col_letter}{end_row}")


def add_legend(ws, row, text):
    ws.cell(row=row, column=1, value=text).font = LEGEND_FONT


def build_sheet(ws, title_text, headers, examples, validations=None, legend=None):
    """Build a standard sheet with title, legend, headers, example row."""
    ws.cell(row=1, column=1, value=title_text).font = Font(name="Arial", bold=True, size=13, color="2B579A")
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))

    legend_text = legend or "Yellow row = example data (replace with real values). Add more rows below."
    add_legend(ws, 2, legend_text)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))

    header_row = 3
    for c, h in enumerate(headers, 1):
        ws.cell(row=header_row, column=c, value=h)
    style_header(ws, header_row, len(headers))

    example_row = 4
    for c, val in enumerate(examples, 1):
        ws.cell(row=example_row, column=c, value=val)
    style_example(ws, example_row, len(headers))

    if validations:
        for col_letter, options in validations.items():
            add_validation(ws, col_letter, example_row, example_row + 50, options)

    auto_width(ws, len(headers), header_row)
    ws.freeze_panes = f"A{header_row + 1}"


# ── Create workbook ─────────────────────────────────────
wb = openpyxl.Workbook()

# ── 1. Homes ────────────────────────────────────────────
ws = wb.active
ws.title = "Homes"
build_sheet(ws, "Care Homes",
    ["Home ID", "Name", "Location", "Capacity", "Current Residents", "Staff On Shift",
     "Staff Required", "Coverage %", "Care Types", "Ofsted Rating", "Highlight"],
    ["home-willow", "Willow House", "Bristol · BS1", 8, 6, 5, 6, 90,
     "Residential, EBD", "good", "1 unfilled waking night slot this week"],
    validations={"J": ["outstanding", "good", "requires_improvement", "inadequate"]},
)

# ── 2. Residents / Young People ─────────────────────────
ws = wb.create_sheet("Young People")
build_sheet(ws, "Young People (Residents)",
    ["ID", "Code", "Name", "Initials", "Home", "Date of Birth", "Age",
     "Keyworker", "Room Number", "Admission Date",
     "Primary Contact Name", "Contact Relation", "Contact Phone",
     "Status", "Summary"],
    ["s1", "A-1142", "Ashanti K.", "AK", "Willow House", "2012-03-18", 14,
     "Priya A.", "W-102", "2024-09-14",
     "Karen Langford", "Social Worker", "+44 7700 900018",
     "stable", "Settled well into placement. Regular PEP meetings on track."],
    validations={"N": ["stable", "needs-review", "new", "transitioning"]},
)

# ── 3. Staff / Team Members ─────────────────────────────
ws = wb.create_sheet("Staff")
build_sheet(ws, "Staff / Team Members",
    ["Staff ID", "Full Name", "Initials", "Role", "Home", "Team ID",
     "Hours This Week", "Hours Required", "Leaves Pending", "Swaps Pending",
     "Status", "Start Date"],
    ["tm-1", "Amira O.", "AO", "Residential Care Worker · 3y", "Willow House",
     "team-willow-day", 24, 40, 0, 1, "on_shift", "2023-04-01"],
    validations={"K": ["on_shift", "off", "on_leave"]},
)

# ── 4. Approvals (Leave / Overtime) ─────────────────────
ws = wb.create_sheet("Approvals")
build_sheet(ws, "Leave & Overtime Approvals",
    ["ID", "Type", "Requester ID", "Requester Name", "Requester Initials",
     "Requester Role", "Requester Home", "Summary", "When Submitted",
     "Priority", "Status"],
    ["ap-1", "leave", "tm-4", "Tomás R.", "TR",
     "Senior RCW", "Willow House", "Annual leave · 2–4 May (3 days)",
     "Submitted yesterday", "normal", "pending"],
    validations={
        "B": ["leave", "overtime"],
        "J": ["low", "normal", "high"],
        "K": ["pending", "approved", "declined"],
    },
)

# ── 5. Swap Requests ────────────────────────────────────
ws = wb.create_sheet("Swap Requests")
build_sheet(ws, "Shift Swap Requests",
    ["ID", "Requester ID", "Requester Name", "Requester Initials",
     "Requester Role", "Requester Home",
     "Counterparty ID", "Counterparty Name", "Counterparty Initials",
     "Counterparty Home",
     "From Shift Start", "To Shift Start", "Summary", "When", "Status"],
    ["sw-1", "tm-1", "Amira O.", "AO", "RCW", "Willow House",
     "tm-2", "Daniel T.", "DT", "Willow House",
     "2026-04-14T07:00", "2026-04-16T07:00",
     "Mon 14 Apr 07:00 → Wed 16 Apr 07:00", "Sent 2h ago", "awaiting_teammate"],
    validations={"O": ["awaiting_teammate", "accepted", "declined", "cancelled"]},
)

# ── 6. Overrides ────────────────────────────────────────
ws = wb.create_sheet("Overrides")
build_sheet(ws, "Shift Overrides",
    ["ID", "Start", "End", "Home", "Slot", "Original Staff",
     "Replacement", "Reason", "Status"],
    ["ov-1", "2026-04-11T14:00", "2026-04-11T22:00", "Willow House",
     "Oak Unit · Senior RCW", "Hiroki T.", "Daniel T.", "sickness", "ready"],
    validations={
        "H": ["sickness", "no_show", "holiday", "training"],
        "I": ["draft", "ready"],
    },
)

# ── 7. Rota / Shifts ───────────────────────────────────
ws = wb.create_sheet("Rota Shifts")
build_sheet(ws, "Rota / Shift Entries",
    ["Entry ID", "Date", "Start Time", "End Time", "Type",
     "Staff ID", "Staff Name", "Staff Role",
     "Team ID", "Team Name", "Note"],
    ["e-1", "2026-04-14", "06:30", "14:30", "shift",
     "s-amira", "Amira O.", "RCW",
     "team-alpha", "Team Alpha", ""],
    validations={"E": ["shift", "overtime", "leave", "swap"]},
    legend="Each row is one shift entry for a staff member on a given day.",
)

# ── 8. Calendar Events ─────────────────────────────────
ws = wb.create_sheet("Calendar Events")
build_sheet(ws, "Calendar Events",
    ["ID", "Date", "Kind", "Title", "Start Time", "End Time",
     "Person", "Ward/Unit", "Status", "Is Mine"],
    ["e1", "2026-04-07", "shift", "Willow · Maple Unit",
     "07:00", "15:00", "Amira O.", "Willow M.", "approved", "Yes"],
    validations={
        "C": ["shift", "swap", "overtime", "leave", "unfilled"],
        "I": ["pending", "approved", "declined", "awaiting_teammate"],
    },
)

# ── 9. Home Activity ───────────────────────────────────
ws = wb.create_sheet("Home Activity")
build_sheet(ws, "Home Activity Log",
    ["ID", "Home ID", "When", "Kind", "Summary"],
    ["ha-1", "home-willow", "Today · 08:14", "incident",
     "Minor altercation between two young people in Maple Unit — de-escalated, no injuries."],
    validations={"D": ["incident", "admission", "discharge", "audit", "note"]},
)

# ── 10. Escalations ────────────────────────────────────
ws = wb.create_sheet("Escalations")
build_sheet(ws, "Escalations",
    ["ID", "Home ID", "Home Name", "Title", "Severity",
     "Raised By", "Raised At", "Category"],
    ["esc-1", "home-willow", "Willow House",
     "Young person missing from placement — Jayden K., age 14",
     "major", "Daniel T.", "2026-06-12T07:15:00", "incident"],
    validations={
        "E": ["minor", "moderate", "major", "critical"],
        "H": ["incident", "staffing", "compliance", "complaint"],
    },
)

# ── 11. Pending Items ──────────────────────────────────
ws = wb.create_sheet("Pending Items")
build_sheet(ws, "Pending Items (SM Dashboard)",
    ["ID", "Home ID", "Home Name", "Type", "Summary",
     "Requested By", "Requested At"],
    ["pnd-1", "home-willow", "Willow House", "leave",
     "Annual leave — 16–20 Jun (5 days)", "Amira O.", "2026-06-10T09:00:00"],
    validations={"D": ["leave", "overtime", "swap", "variance"]},
)

# ── 12. Staff On Duty ──────────────────────────────────
ws = wb.create_sheet("Staff On Duty")
build_sheet(ws, "Staff On Duty (Today)",
    ["Staff ID", "Name", "Initials", "Role", "Home ID",
     "Shift Times", "Status"],
    ["tm-1", "Amira O.", "AO", "RCW", "home-willow",
     "07:00 – 15:00", "on_shift"],
    validations={"G": ["on_shift", "on_break", "arriving", "on_leave"]},
)

# ── 13. Today's Schedule ───────────────────────────────
ws = wb.create_sheet("Today Schedule")
build_sheet(ws, "Today's Schedule",
    ["ID", "Home ID", "Time", "Title", "Category"],
    ["td-1", "home-willow", "09:00",
     "Team Huddle — Maple & Oak Units", "meeting"],
    validations={"E": ["meeting", "visit", "review", "admin"]},
)

# ── 14. Audit Events ───────────────────────────────────
ws = wb.create_sheet("Audit Log")
build_sheet(ws, "Audit Events",
    ["ID", "Timestamp", "Actor ID", "Actor Name", "Actor Role",
     "Action", "Target", "Home", "Domain", "Channel", "Severity"],
    ["e1", "2026-04-11 07:02", "tm-1", "Amira O.",
     "Residential Care Worker", "Clocked in", "Shift #W-8821",
     "Willow House", "professional", "rota", "info"],
    validations={
        "I": ["home", "team", "people", "professional"],
        "J": ["auth", "rota", "care", "permissions"],
        "K": ["info", "notice", "warning", "critical"],
    },
)

# ── 15. Permissions ─────────────────────────────────────
ws = wb.create_sheet("Permissions")
build_sheet(ws, "Staff Permissions",
    ["ID", "Name", "Initials", "Access Level", "Scope", "Last Changed"],
    ["pm-1", "Daniel T.", "DT", "team_lead",
     "Willow · Maple Unit", "12 Mar 2026 by Priya A."],
    validations={"D": ["professional", "team_lead", "home_manager", "admin"]},
)

# ── 16. Young Person Comments ──────────────────────────
ws = wb.create_sheet("YP Comments")
build_sheet(ws, "Young Person Comments / Notes",
    ["Comment ID", "Young Person ID", "Author ID", "Author Name",
     "Author Role", "Timestamp", "Comment", "Reply To (Comment ID)"],
    ["cc-1", "s1", "tm-5", "Priya A.", "Home Manager",
     "2026-04-10 16:40",
     "Ashanti had a difficult afternoon — triggered by a phone call.",
     ""],
    legend="Reply To = leave blank for top-level comments, or put parent Comment ID for replies.",
)

# ── 17. Service History ─────────────────────────────────
ws = wb.create_sheet("Service History")
build_sheet(ws, "Young Person Service History",
    ["Event ID", "Young Person ID", "Date", "Kind", "Summary", "By"],
    ["se-1", "s1", "2024-09-14", "admission",
     "Placed at Willow House · Maple Unit", "Priya A."],
    validations={"D": ["admission", "placement_plan", "health_review",
                       "incident", "appointment", "note"]},
)

# ── 18. Company Info ────────────────────────────────────
ws = wb.create_sheet("Company")
build_sheet(ws, "Company Information",
    ["Company ID", "Legal Name", "Corporate Address",
     "Companies House Number", "Main Contact Email"],
    ["company-brightpath", "BrightPath Children's Services Ltd",
     "Unit 4, Riverside Business Park, Bristol, BS1 4DY",
     "09812345", "admin@brightpathchildren.co.uk"],
    legend="Single row — your organisation details.",
)

# ── Save ────────────────────────────────────────────────
wb.save(OUTPUT)
print(f"Template saved to {OUTPUT}")
