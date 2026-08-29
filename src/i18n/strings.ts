/*
 * Central string catalog.
 *
 * Per docs/02-ui-ux/10-localization.md and UX principle 7
 * ("multi-language, not monolingual-first"), the UI never hard-codes
 * English strings inline — every label lands here. When we add i18next /
 * FormatJS later, we swap this file for a loader with the same shape.
 *
 * Naming: flat dot-namespaced keys, lower-camel leaves. Keep copy short,
 * warm, action-first. Button labels are verb + noun per microcopy doc.
 */

export const STRINGS = {
  app: {
    name: "ICare",
    tagline: "Children's home management, built for the people doing the work.",
  },

  nav: {
    section: {
      personal: "Personal",
      leadership: "Leadership",
    },
    me: "My Dashboard",
    calendar: "Calendar",
    team: "Team",
    homes: "Homes",
    manage: "Manage",
    audit: "Audit",
    signOut: "Sign out",
    search: "Search ICare…",
    themeToggle: "Toggle theme",
    collapseSidebar: "Collapse sidebar",
  },

  auth: {
    login: {
      title: "Sign in to ICare",
      subtitle: "Children's homes · audit · rota — one login.",
      emailLabel: "Work email",
      emailPlaceholder: "name@brightpathchildren.co.uk",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      rememberMe: "Keep me signed in on this device",
      forgot: "Forgot your password?",
      submit: "Sign in",
      ssoDivider: "or continue with",
      ssoMicrosoft: "Microsoft",
      ssoGoogle: "Google",
      helpSecurity: "Protected by multi-factor authentication.",
      helpFooter:
        "Access is audited. Sharing credentials is a safeguarding breach.",
    },
  },

  dashboard: {
    title: "Good morning, Priya",
    subtitle:
      "Here's what needs your attention at Willow House this morning.",
    stat: {
      onShift: "On shift",
      onShiftDelta: "vs planned",
      pendingApprovals: "Pending approvals",
      pendingApprovalsDelta: "needs decision",
      openIncidents: "Open incidents",
      openIncidentsDelta: "logged this week",
      rotaCoverage: "Rota coverage",
      rotaCoverageDelta: "next 7 days",
    },
    section: {
      attention: "Needs your attention",
      activity: "Recent activity",
      shortcuts: "Quick actions",
    },
    attentionEmpty:
      "Nothing urgent — enjoy the calm. New items appear here in real time.",
    shortcut: {
      publishRota: "Publish this week's rota",
      addSubject: "Add a person in care",
      logIncident: "Log an incident",
      runAudit: "Export audit pack",
    },
  },

  subjects: {
    title: "People in care",
    subtitle: "Everyone currently under Willow House's care.",
    searchPlaceholder: "Search by name or ID",
    filter: {
      all: "All",
      assigned: "Assigned to me",
      needsReview: "Needs review",
    },
    column: {
      name: "Name",
      id: "ID",
      home: "Home",
      keyworker: "Keyworker",
      lastReview: "Last review",
      status: "Status",
    },
    empty: {
      title: "No one matches your filter",
      body: "Try clearing the search, or switch to the 'All' filter to see the full list.",
    },
    addSubject: "Add a person",
  },

  audit: {
    title: "Audit log",
    subtitle:
      "Every significant action is recorded here. Append-only — entries cannot be edited.",
    filter: {
      all: "All events",
      auth: "Authentication",
      rota: "Rota",
      care: "Care events",
      permissions: "Permission changes",
    },
    column: {
      when: "When",
      actor: "Actor",
      action: "Action",
      target: "Target",
      severity: "Severity",
    },
    export: "Export evidence pack",
    empty: {
      title: "No events for this filter",
      body: "Widen the filter or pick a different time window.",
    },
  },

  approvals: {
    title: "Approvals inbox",
    subtitle:
      "Decisions that need you: swap requests, leave, and permission grants.",
    tab: {
      swaps: "Shift swaps",
      leave: "Leave",
      permissions: "Permissions",
    },
    empty: {
      title: "All caught up",
      body: "Nothing is waiting on your decision right now.",
    },
    action: {
      approve: "Approve",
      decline: "Decline",
      details: "See details",
    },
  },

  professional: {
    today: {
      title: "Today's shift",
      clockInCta: "Clock in",
      clockOutCta: "Clock out",
      notStarted: "Your shift starts at",
      onDuty: "On duty since",
      breakCta: "Start break",
      breakActive: "On break",
      logEvent: "Log a care event",
      swap: "Request a swap",
      handover: "See handover notes",
      empty: {
        title: "No shift scheduled",
        body: "You don't have a shift today. Check your rota to see what's next.",
      },
    },
  },

  common: {
    loading: "Loading…",
    retry: "Try again",
    cancel: "Cancel",
    save: "Save",
    unreachable: {
      title: "We couldn't reach that right now",
      body: "Check your connection and try again.",
    },
  },
} as const

export type Strings = typeof STRINGS
