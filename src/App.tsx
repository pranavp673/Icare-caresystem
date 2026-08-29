import { Routes, Route, Navigate, useParams } from "react-router-dom"
import AppShell from "./app/AppShell"
import RequirePermission from "./auth/RequirePermission"
import Login from "./pages/Auth/Login"
import MyDashboard from "./pages/Me/MyDashboard"
import ExecutiveDashboard from "./pages/Executive/ExecutiveDashboard"
import ExecutivePersonal from "./pages/Me/ExecutivePersonal"
import { useAuth } from "./auth/AuthContext"
import CalendarView from "./pages/Calendar/CalendarView"
import TeamOverview from "./pages/Team/TeamOverview"
import HomesList from "./pages/Homes/HomesList"
import ResidentsList from "./pages/Residents/ResidentsList"
import ResidentDetail from "./pages/Residents/ResidentDetail"
import NewResident from "./pages/Residents/NewResident"
import ManageHub from "./pages/Manage/ManageHub"
import CommonFilesHub from "./pages/CommonFiles/CommonFilesHub"
import TimeSheetHub from "./pages/TimeSheet/TimeSheetHub"
import AuditLog from "./pages/Audit/AuditLog"
import MetricsView from "./pages/Metrics/MetricsView"
import RotaView from "./pages/Rota/RotaView"
import SettingsPage from "./pages/Settings/SettingsPage"
import AdminSetup from "./pages/Admin/AdminSetup"
import AdminResidents from "./pages/Admin/AdminResidents"

/**
 * Route tree with permission guards.
 *
 * Routes are wrapped in <RequirePermission> where access should be
 * restricted by role. The guard redirects unauthorised users to /me
 * (their personal dashboard — always accessible).
 *
 * The sidebar (AppShell) hides nav items the user cannot access, so
 * they should never reach a guarded route organically. The guards here
 * are a belt-and-suspenders defence against direct URL navigation.
 *
 * Permission → Role mapping:
 *   system.company.edit   → System Admin only
 *   home.analytics.view   → Registered Manager, Deputy Manager, RI, System Admin
 *   home.view             → Registered Manager, Deputy Manager, RI, System Admin
 *   manage.view           → Registered Manager, Deputy Manager, RI, System Admin, Team Leader
 *   audit.view            → Registered Manager, Deputy Manager, RI, System Admin
 *   residents.view        → Registered Manager, Deputy Manager, Team Leader, RSW (+ RI, System Admin)
 *   team.analytics.view   → Team Leader, Registered Manager, Deputy Manager, RI, System Admin (Rota page)
 *   commonFiles.view      → all six roles (Common Files page — no route guard, same as /calendar and /team)
 *   (Time Sheet page — no permission guard either; everyone sees at least
 *    their own data via the staff-scope cascade, services/team/staffScope.ts)
 */

/** Preserves :id when redirecting /subjects/:id → /residents/:id */
const SubjectRedirect = () => {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/residents/${id}`} replace />
}

/**
 * Smart dashboard: Manager-tier users (Deputy Manager, Registered Manager,
 * RI, System Admin) see the executive overview; shift workers see the
 * personal dashboard.
 *
 * `home.view` is the dividing permission — Deputy Manager and above have
 * it, Team Leader and RSW don't.
 */
const DashboardRouter = () => {
  const { can } = useAuth()
  if (can("home.view")) {
    return <ExecutiveDashboard />
  }
  return <MyDashboard />
}

/**
 * Personal page: Manager-tier users get calendar view;
 * shift workers get the standard MyDashboard.
 */
const PersonalRouter = () => {
  const { can } = useAuth()
  if (can("home.view")) {
    return <ExecutivePersonal />
  }
  return <MyDashboard />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/me" replace />} />

        {/* ── Personal (everyone) ── */}
        <Route path="/me" element={<DashboardRouter />} />
        <Route path="/me/personal" element={<PersonalRouter />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* ── Team (RSW and above) ── */}
        <Route path="/team" element={<TeamOverview />} />

        {/* ── Common Files (all roles — FR-COM) ── */}
        <Route path="/common-files" element={<CommonFilesHub />} />

        {/* ── Time Sheet + Supervision (all roles — FR-TS / FR-SUP) ── */}
        <Route path="/timesheet" element={<TimeSheetHub />} />

        {/* ── Rota (Team Leader and above) ── */}
        <Route
          path="/rota"
          element={
            <RequirePermission anyOf={["team.analytics.view"]}>
              <RotaView />
            </RequirePermission>
          }
        />

        {/* ── Metrics (Registered Manager and Deputy Manager, + RI/System Admin) ── */}
        <Route
          path="/metrics"
          element={
            <RequirePermission anyOf={["home.analytics.view"]}>
              <MetricsView />
            </RequirePermission>
          }
        />

        {/* ── Homes (Registered Manager and Deputy Manager, + RI/System Admin) ── */}
        <Route
          path="/homes"
          element={
            <RequirePermission anyOf={["home.view"]}>
              <HomesList />
            </RequirePermission>
          }
        />

        {/* ── Residents (Registered Manager, Deputy Manager, Team Leader, RSW) ── */}
        <Route
          path="/residents"
          element={
            <RequirePermission anyOf={["residents.view"]}>
              <ResidentsList />
            </RequirePermission>
          }
        />
        <Route
          path="/residents/new"
          element={
            <RequirePermission anyOf={["residents.edit"]}>
              <NewResident />
            </RequirePermission>
          }
        />
        <Route
          path="/residents/:id"
          element={
            <RequirePermission anyOf={["residents.view"]}>
              <ResidentDetail />
            </RequirePermission>
          }
        />

        {/* ── Manage hub (Team Leader and above) ── */}
        <Route
          path="/manage"
          element={
            <RequirePermission anyOf={["manage.view"]}>
              <ManageHub />
            </RequirePermission>
          }
        />

        {/* ── Audit (Registered Manager and Deputy Manager, + RI/System Admin) ── */}
        <Route
          path="/audit"
          element={
            <RequirePermission anyOf={["audit.view"]}>
              <AuditLog />
            </RequirePermission>
          }
        />

        {/* ── Admin system setup (system admin only) ── */}
        <Route
          path="/admin/setup"
          element={
            <RequirePermission anyOf={["system.company.edit"]}>
              <AdminSetup />
            </RequirePermission>
          }
        />
        <Route
          path="/admin/residents"
          element={
            <RequirePermission anyOf={["system.home.edit"]}>
              <AdminResidents />
            </RequirePermission>
          }
        />

        {/* ── Legacy aliases ── */}
        <Route path="/clients" element={<Navigate to="/residents" replace />} />
        <Route path="/clients/:id" element={<Navigate to="/residents" replace />} />
        <Route path="/rota/me" element={<Navigate to="/me" replace />} />
        <Route path="/rota/employee" element={<Navigate to="/me" replace />} />
        <Route path="/rota/manager" element={<Navigate to="/team" replace />} />
        <Route path="/professional/today" element={<Navigate to="/me" replace />} />
        <Route path="/approvals" element={<Navigate to="/manage" replace />} />
        <Route path="/subjects" element={<Navigate to="/residents" replace />} />
        <Route path="/subjects/:id" element={<SubjectRedirect />} />
        <Route path="/child/profile" element={<Navigate to="/residents" replace />} />

        <Route path="*" element={<Navigate to="/me" replace />} />
      </Route>
    </Routes>
  )
}

export default App
