import type {
  ApplicationStatus,
  EducationLevel,
  EmploymentLevel,
  JobStatus,
  JobType,
  NoticePeriod,
} from "@/types/database";

/**
 * Every user-facing string lives here (brief §12: no hardcoded copy).
 *
 * Flat and typed rather than a nested i18n tree: the product is single-language
 * today, and a shallow object keeps call sites readable. Swapping this for a
 * real i18n backend later means changing this file's shape, not every component.
 *
 * Status labels are the other half of the vocabulary decision in migration 014.
 * Two states were genuinely missing and were added to the enums; the rest are
 * naming differences and are mapped here, so the database keeps values that
 * policies and seeded rows already reference.
 */

export const site = {
  name: "PAC Jobs",
  domain: "jobs.pac.africa",
  owner: "PAC Africa",
  ownerFull: "Priority Activator Consulting",
} as const;

export const nav = {
  browse: "Browse Jobs",
  post: "Post a Job",
  forTalent: "For Talent",
  forEmployers: "For Employers",
  about: "About",
  getStarted: "Get Started",
  signIn: "Sign In",
  signOut: "Sign out",
  dashboard: "Dashboard",
  themeToggle: "Switch theme",
  openMenu: "Open menu",
  closeMenu: "Close menu",
} as const;

export const home = {
  // No kicker above the headline: the three-line headline is the opening
  // statement and a label over the top of it only diluted it.
  // Three lines, centred, set large. Split so one fragment can carry the accent
  // colour — at display size #E8532E clears AA on both surfaces.
  headlineLead: "African Talent.",
  headlineMid: "Pan-African",
  headlineTail: "Careers.",
  sub: "PAC Africa connects skilled professionals across the continent with employers ready to invest in African talent from Nairobi to Lagos, Accra to Cape Town and beyond.",
  searchWhat: "Job title, skill, or keyword",
  searchWhere: "Anywhere in Africa",
  searchCta: "Search roles",
  // Both lead to signup for a visitor who is not signed in, carrying where they
  // were headed so they land there afterwards (brief §7). Someone already signed
  // in goes straight to the useful page instead of being asked to register again.
  seekerCta: "Find your next opportunity",
  employerCta: "Hire top African talent",
  browseCta: "Browse roles",
  postCta: "Post a job",
  popular: "Popular",
  // Trust without exact numbers. Migration 011 deliberately took the precise
  // application count off this page (and off the API) — commercially
  // sensitive, and an exact figure also advertises exactly how much personal
  // data sits behind the site. `activityRecent`/`activityTotal` below are the
  // narrower replacement: both banded server-side (migration 034), never
  // exact, so this stays true to that decision rather than reversing it.
  trust: [
    "Every listing reviewed before it publishes",
    "Apply once, track it in one place",
    "Your CV is never public",
  ],
  activityRecent: (band: number) => `${band.toLocaleString()}+ applications this week`,
  activityTotal: (band: number) => `${band.toLocaleString()}+ since launch`,
  latest: "Latest roles",
  viewAll: "View all jobs",
  emptyTitle: "No roles are live right now",
  emptyBody:
    "Every listing is reviewed before it publishes. Nothing has cleared review yet — check back shortly, or post a role if you are hiring.",
} as const;

export const browse = {
  title: "Browse jobs",
  searchLabel: "Job title, skill or company",
  searchPlaceholder: "Job title, skill, or company",
  searchCta: "Search",
  filtersTitle: "Filters",
  filtersCta: "Filters",
  clearAll: "Clear all",
  filteredBy: "Filtered by",
  removeFilter: "Remove filter",
  keyword: "Keyword",
  location: "Location",
  anyLocation: "Anywhere in Kenya",
  category: "Category",
  anyCategory: "All categories",
  employmentType: "Employment type",
  experience: "Experience level",
  postedWithin: "Posted within",
  remoteOnly: "Remote only",
  sortBy: "Sort",
  resultCount: (n: number) => `${n.toLocaleString()} open role${n === 1 ? "" : "s"}`,
  showingRange: (from: number, to: number, total: number) =>
    `Showing ${from}–${to} of ${total.toLocaleString()}`,
  emptyTitle: "No roles match those filters",
  emptyBody: "Try a broader search term, or clear a filter to widen the results.",
  emptyEmployerNudge: "Hiring? Post a role instead.",
  prev: "Previous",
  next: "Next",
} as const;

/**
 * "Salary High to Low" went with salaries.
 *
 * "Most Relevant" is deliberately absent for now rather than present and fake:
 * ranking a full-text match means ordering by ts_rank(fts, query), which
 * PostgREST cannot express — an unordered textSearch returns rows in whatever
 * order Postgres happens to produce. Doing it properly needs a ranking RPC.
 * A sort control that quietly does nothing is worse than one option.
 */
export const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "salary", label: "Highest Pay" },
  { value: "oldest", label: "Oldest First" },
] as const;

export const postedWithinOptions = [
  { value: "1", label: "Today" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
] as const;

/**
 * No company name, no logo, no verified badge and no salary.
 *
 * The employer behind a role is admin-only information: PAC sits between the
 * applicant and the employer, and naming the employer invites candidates to
 * apply direct. Applications are made to PAC, which is what `postedVia` says on
 * the listing so the absence reads as deliberate rather than as missing data.
 */
export const job = {
  about: "About the role",
  // The column is still `requirements` — renaming it would touch policies, the
  // migrated rows and the search filters for a wording change. This is the label
  // for it, which is the part anyone reads.
  requirements: "Responsibilities",
  qualifications: "Qualifications",
  related: "Related roles",
  apply: "Apply for this role",
  applyShort: "Apply",
  share: "Share",
  shareCopied: "Link copied",
  report: "Report listing",
  save: "Save role",
  unsave: "Saved",
  postedVia: "Listed by PAC Africa",
  postedPrefix: "Posted",
  closesPrefix: "Closes",
  backToResults: "Back to results",
  allRoles: "All roles",
  notFound: "That role is no longer listed",
} as const;

/** Brief §7 — the auth gate. */
/**
 * Applicant declaration and data-consent clause shown at the bottom of the
 * apply form (migration 033). User-approved wording as of 19 September 2026
 * — combines the applicant declaration (accuracy of info, background checks)
 * with the data consent (GDPR/Kenya DPA). `version` must be bumped (e.g. to a
 * date string) any time the wording below changes — it's what
 * applications.consent_version records, so a past applicant's row always
 * reflects what they actually agreed to, not today's text relabeled.
 */
export const dataConsent = {
  version: "2026-09-19-v1",
  checkboxLabel: "I have read this and I consent.",
  scrollHint: "Scroll to the bottom to continue.",
  clauseText: `I represent that the information given in this application, and in any resume or supporting documents submitted with it, is true and complete to the best of my knowledge. I understand that any incomplete, misleading, or false statement in my application, resume, or during an interview may result in disqualification from consideration or, if I am hired, termination of my employment.

I authorize PAC Africa and the hiring employer to verify the information I have provided and to carry out any background checks reasonably necessary, including employment history, education, and reference checks, and, where applicable and permitted by law, criminal history checks, both at the time of application and, if I am hired, during my employment.

By applying, I agree that PAC Africa may collect and process the information in this application, including my CV, contact details, work history, and the fields above, to evaluate me for this role and, if I create an account, to match me with similar roles in future.

I understand that my CV and application details are shared only with the employer for the specific role I apply to, and with PAC Africa staff reviewing applications. PAC Africa does not sell my data or share it with any other third party.

I understand that my data is retained for as long as my account is active. Historical applications may be kept indefinitely as part of PAC Africa's hiring records unless I request deletion. I can request a copy of my data or ask PAC Africa to delete it at any time; details are set out in the Privacy Policy.

I give this consent under the Kenya Data Protection Act, 2019, and, where applicable, the EU General Data Protection Regulation (GDPR). I understand that I may withdraw this consent at any time by contacting hello@pac.africa, and that withdrawing consent stops further processing but does not undo an application already sent to an employer.

I have read and fully understand this declaration and consent, and I confirm that I am applying for this role on these terms. I understand that my application will only be considered complete once my employment history, education history, and all required application questions have been filled in.`,
} as const;

export const gate = {
  employerCannotApply: {
    title: "You are signed in as an employer",
    body: "Applications are for job seekers. This is how the listing looks to one.",
    action: "Back to your dashboard",
  },
  adminViewing: {
    title: "You are signed in as an administrator",
    body: "Applications are for job seekers. This is how the listing looks to one.",
    action: "Back to your dashboard",
  },
  seekerCannotPost: {
    title: "Posting a job needs an employer account",
    body: "Your account is set up for finding work. Employer accounts can publish roles, review applicants and manage a company profile.",
    learn: "Learn about employer accounts",
    dismiss: "Dismiss",
  },
  alreadyApplied: {
    title: "You have applied for this role",
    submittedOn: (date: string) => `Submitted ${date}.`,
    action: "Track your applications",
  },
  /**
   * Apply failures, keyed by code.
   *
   * The action redirects with `?apply_error=<code>`, never with a message. It
   * used to pass the sentence itself, which meant anyone could put arbitrary
   * copy inside the apply card on a real jobs.pac.africa listing URL —
   * `?apply_error=Email your CV and ID to verify@…` needs no login and no
   * interaction beyond clicking a link. React escaped it, so it was never XSS,
   * but on a site asking job seekers to upload identity documents it was a
   * usable phishing primitive. A code cannot say anything we did not write.
   */
  applyErrors: {
    invalid_request: "Something went wrong. Please try again.",
    closed: "That role is no longer open for applications.",
    signed_out: "Please sign in again and retry.",
    not_seeker: "Applications are for job seeker accounts.",
    name_required: "Please enter your name.",
    email_invalid: "Please enter a valid email address.",
    phone_invalid: "Please enter a valid phone number.",
    cv_too_large: "Your CV needs to be under 5MB.",
    cv_not_pdf: "That file is not a PDF, even though it may be named like one.",
    cv_upload_failed: "We could not upload your CV. Please try again.",
    duplicate: "You have already applied for this role.",
    rate_limited: "Too many attempts. Please wait a few minutes and try again.",
    experience_required:
      "Please fill in your years of experience and salary expectations.",
    consent_required: "Please read the data consent notice and check the box to continue.",
    failed: "Something went wrong. Please try again.",
  } as Record<string, string>,
  applyingAs: "Applying as",
  signInToApplyFaster: "Sign in to apply faster and track it.",
  noAccountNeeded:
    "No account needed to apply. We'll email you a link afterward to create one, free, so you can track it.",
  sent: {
    title: "Application sent",
    bodySignedIn:
      "It is in your dashboard, and you will hear from us by email if the employer responds.",
    bodyGuest:
      "Check your email — we've sent a link to create a free account and track this application.",
  },
} as const;

/** Labels for enum values. See migration 014 for what changed and what did not. */
export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export const jobStatusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  pending_review: "In Review",
  published: "Active",
  paused: "Paused",
  expired: "Expired",
  closed: "Closed",
};

export const employmentLevelLabels: Record<EmploymentLevel, string> = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  // The enum value stays `executive`; renaming it would touch seeded rows and
  // policy text for no gain.
  executive: "Director",
};

export const jobTypeLabels: Record<JobType, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  freelance: "Freelance",
  contract: "Contract",
  internship: "Internship",
};

/** Ascending order matches the Postgres enum (migration 033) — used for both
 *  display and building select options. */
export const educationLevelLabels: Record<EducationLevel, string> = {
  high_school: "High School",
  certificate: "Certificate",
  diploma: "Diploma",
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  doctorate: "Doctorate",
};

export const noticePeriodLabels: Record<NoticePeriod, string> = {
  immediate: "Immediate",
  two_weeks: "2 weeks",
  one_month: "1 month",
  two_months: "2 months",
  three_plus_months: "3+ months",
};

/** Brief §12: every page needs a working empty, loading and error state. */
export const states = {
  loading: "Loading…",
  errorTitle: "Something went wrong",
  errorBody: "Try again in a moment. If it keeps happening, let us know.",
  retry: "Try again",
  notFoundTitle: "Not found",
  notFoundBody: "That page does not exist, or it has moved.",
  goHome: "Back to jobs",
} as const;

export const cv = {
  open: "Open CV",
  none: "No CV attached",
  pending: "CV pending migration",
  pendingHint:
    "Held in the archive recovered from the previous site — not reachable at its old address since the domain moved.",
  expires: "expires in 5 min",
  onFile: "On file.",
  replace: "Replace CV",
  upload: "Upload CV",
  constraint: "PDF, up to 5MB.",
} as const;

export const footer = {
  rights: (year: number) =>
    `© ${year} ${site.owner}. Connecting African talent with vetted employers.`,
} as const;

/**
 * Dashboard copy — brief §8, §9, §10, and §12's "no hardcoded copy".
 *
 * Grouped by role because the three dashboards are read by three different
 * people, and the same word does not mean the same thing to each: an
 * "application" is a thing a seeker sent, a thing an employer must answer, and a
 * row in a register to an admin.
 */
export const dash = {
  common: {
    overview: "Overview",
    saved: "Saved",
    settings: "Settings",
    activity: "Recent activity",
    noActivity: "Nothing has happened yet.",
    viewAll: "View all",
    search: "Search",
    filters: "Filters",
    clear: "Clear",
    apply: "Apply",
    cancel: "Cancel",
    save: "Save changes",
    saved_: "Saved.",
    close: "Close",
    open: "Open",
    edit: "Edit",
    of: "of",
    page: "Page",
    prev: "Previous",
    next: "Next",
    showing: (from: number, to: number, total: number) =>
      `Showing ${from}–${to} of ${total.toLocaleString()}`,
    comingSoon: "Coming soon",
    invalidRequest: "That request was not valid.",
  },

  seeker: {
    title: "Your dashboard",
    greeting: (name: string) => `Hello, ${name}`,
    findRoles: "Find roles",
    statApplications: "Applications sent",
    statShortlisted: "Shortlisted",
    statSaved: "Saved roles",
    statHint: "Since you joined",
    shortlistedHint: "An employer moved you forward",
    applicationsTitle: "My applications",
    applicationsSub:
      "Every role you have applied for through PAC Africa, including anything you filed before the site moved.",
    colRole: "Role",
    colApplied: "Applied",
    colStatus: "Status",
    emptyApplications: "No applications yet",
    emptyApplicationsBody:
      "Once you apply for a role it shows up here, and you can follow what happens to it.",
    recommendedTitle: "Recommended for you",
    savedTitle: "Saved roles",
    savedSub: "Roles you kept to come back to. Nobody else can see this list.",
    emptySaved: "Nothing saved yet",
    emptySavedBody:
      "Use the bookmark on any listing to keep it here. Saved roles disappear from the list when they close.",
    unsave: "Remove",
    profileTitle: "My profile",
    profileSub:
      "This is what fills in your applications. Only employers you have applied to can see it.",
    settingsTitle: "Settings",
    settingsSub: "Your account, your data, and how to get rid of both.",
    alertsTitle: "Job alerts",
    alertsSub: "Get emailed when a new role matches what you're looking for.",
    emptyAlerts: "No alerts set up yet",
    emptyAlertsBody: "Create one below and we'll email you when a matching role is posted.",
    alertCreate: "Create alert",
    alertKeywordPlaceholder: "Keyword (optional)",
    alertAnyCategory: "Any category",
    alertAnyLocation: "Any location",
    alertAnyType: "Any job type",
    alertFrequencyDaily: "Daily digest",
    alertFrequencyWeekly: "Weekly digest",
    alertPause: "Pause",
    alertResume: "Resume",
    alertDelete: "Delete",
    alertPaused: "Paused",
    lockedFeatureNames: {
      saved: "Saved jobs",
      alerts: "Job alerts",
      applications: "Applications",
      apply: "Applying",
    } as Record<string, string>,
    lockedBanner: (feature: string) =>
      `Finish your profile below to unlock ${feature}.`,
    hiringTitle: "Experience & career details",
    hiringHint: "Helps employers judge fit, and powers the requirements filter for admin.",
    yearsExperience: "Years of experience",
    educationLevel: "Highest education level",
    industry: "Industry",
    expectedSalary: "Expected salary (KES)",
    currentSalary: "Current / last salary (KES)",
    noticePeriod: "Notice period",
    selectPlaceholder: "Not specified",
    educationTitle: "Education",
    educationEmpty: "No education entries yet.",
    educationAdd: "Add education",
    educationSchool: "School / institution",
    educationField: "Field of study",
    educationStartYear: "Start year",
    educationEndYear: "End year (leave blank if ongoing)",
    experienceTitle: "Work experience",
    experienceEmpty: "No work experience entries yet.",
    experienceAdd: "Add work experience",
    experienceCompany: "Company",
    experienceJobTitle: "Job title",
    experienceStartDate: "Start date",
    experienceEndDate: "End date (leave blank if current)",
    experienceDescription: "Description (optional)",
    entryRemove: "Remove",
    // Activity feed lines, phrased from the applicant's side.
    event: {
      pending: "Application sent",
      under_review: "Moved to under review",
      shortlisted: "Shortlisted",
      rejected: "Not taken forward",
      hired: "Offered the role",
    } satisfies Record<ApplicationStatus, string>,
  },

  employer: {
    title: "Your dashboard",
    statActive: "Live roles",
    statActiveHint: "Visible on the site now",
    statApplications: "Applications this month",
    statShortlisted: "Shortlisted",
    statHired: "Positions filled",
    recentApplications: "Latest applications",
    jobsTitle: "My jobs",
    jobsSub: "Everything you have posted, live or not.",
    newJob: "Post a job",
    colRole: "Role",
    colStatus: "Status",
    colApplications: "Applicants",
    colViews: "Views",
    colPosted: "Posted",
    colActions: "",
    pause: "Pause",
    resume: "Resume",
    closeJob: "Close",
    reopen: "Reopen",
    emptyJobs: "No roles posted yet",
    emptyJobsBody:
      "Post a role and it goes to PAC Africa for review. We check every listing before it reaches applicants.",
    pendingNotice:
      "In review by PAC Africa. It is not visible to applicants until we approve it.",
    resumeBlocked:
      "This listing changed since it was approved, so resuming it sends it back for review.",
    inboxTitle: "Applications",
    inboxSub: "Everyone who has applied, across every role you have posted.",
    filterJob: "Role",
    filterAnyJob: "All roles",
    filterStatus: "Status",
    filterAnyStatus: "Any status",
    sort: "Sort",
    searchApplicants: "Search by name or email",
    emptyInbox: "No applications yet",
    emptyInboxBody:
      "When someone applies to one of your live roles they land here, newest first.",
    messagesTitle: "Messages",
    messagesBody:
      "Direct messaging with applicants is not built yet. For now, reach candidates by email or phone from their application.",
    companyTitle: "Company profile",
    companySub:
      "Used by PAC Africa to verify you. Applicants do not see which employer a role belongs to.",
    viewsHint: "Counts every time the listing page loads, including reloads.",
  },

  admin: {
    title: "Admin",
    candidatesTitle: "Find candidates",
    candidatesSub: "Rank every seeker with skills on file against one job's requirements.",
    candidatesJobLabel: "Job",
    candidatesJobPlaceholder: "Choose a job…",
    candidatesSearch: "Search",
    candidatesEmptyTitle: "Choose a job to search",
    candidatesEmptyBody:
      "Only jobs with required skills set can be searched — add them from the job's edit page.",
    candidatesNoneTitle: "No seekers with skills on file yet",
    candidatesNoneBody: "Once seekers add skills to their profile, they'll rank here.",
    candidatesColSeeker: "Seeker",
    candidatesColHeadline: "Headline",
    candidatesColMatch: "Match",
    statLive: "Live roles",
    statPending: "Awaiting moderation",
    statPendingHint: "Nothing reaches the public until you approve it",
    statSeekers: "Job seekers",
    statEmployers: "Employers",
    statApplicationsMonth: "Applications this month",
    moderationTitle: "Moderation queue",
    moderationSub:
      "Every employer submission lands here first. Approving publishes it to the public site immediately.",
    emptyModeration: "Queue is clear",
    emptyModerationBody: "Nothing is waiting for review.",
    approve: "Approve and publish",
    reject: "Reject",
    rejectReasonLabel: "Why are you rejecting this?",
    rejectReasonHint:
      "The employer sees this on their dashboard, so write it for them rather than as an internal note.",
    rejectReasonRequired: "A reason is required when rejecting a listing.",
    confirmApproveTitle: "Publish this listing?",
    confirmApproveBody:
      "It becomes visible to everyone on the site straight away, and applications can start arriving.",
    confirmRejectTitle: "Reject this listing?",
    confirmRejectBody:
      "It goes back to the employer as a draft with your reason attached. They can fix it and resubmit.",
    jobsTitle: "All jobs",
    applicationsTitle: "All applications",
    applicationsSub:
      "Every application on record, including the archive recovered from the previous site.",
    applicationsReadOnly:
      "Read-only. Moving an application through its stages is the employer's call, not ours.",
    employersTitle: "Employers",
    employersSub: "Every employer account and the company record behind it.",
    seekersTitle: "Job seekers",
    seekersSub: "Every registered applicant.",
    colCompany: "Company",
    colJoined: "Joined",
    colPostings: "Live roles",
    colReceived: "Applications",
    colAccount: "Account",
    colName: "Name",
    colSent: "Applications",
    colProfile: "Profile",
    suspend: "Suspend",
    reinstate: "Reinstate",
    suspended: "Suspended",
    active: "Active",
    confirmSuspendTitle: "Suspend this account?",
    confirmSuspendBodyEmployer:
      "Their listings stop being public immediately. Applications already received are untouched.",
    confirmSuspendBodySeeker:
      "They keep their data but cannot sign in and apply. Applications already sent are untouched.",
    settingsTitle: "Settings",
    settingsSub: "Things that are configured outside this app, listed so nobody has to guess.",
  },

  settings: {
    accountTitle: "Account",
    email: "Email address",
    emailHint:
      "Applications are filed against this address, and it is how we match your earlier history. Contact us to change it.",
    role: "Account type",
    joined: "Member since",
    appearanceTitle: "Appearance",
    appearanceHint: "Light, dark, or match your device.",
    personalizationTitle: "Personalization",
    personalizationHint: "How your dashboard looks and where it opens.",
    personalizationChanged: "Preferences saved.",
    landingLabel: "Default landing page",
    landingHint: "Which page you land on after signing in.",
    landingDefault: "Overview (default)",
    densityLabel: "Dashboard density",
    densityHint: "Compact tightens spacing on tables and the sidebar.",
    densityComfortable: "Comfortable",
    densityCompact: "Compact",
    passwordTitle: "Password",
    passwordHint: "At least 10 characters. Longer beats complicated.",
    passwordLabel: "New password",
    passwordConfirmLabel: "Repeat it",
    passwordCta: "Update password",
    passwordMismatch: "Those two passwords are not the same.",
    passwordTooShort: "Use at least 10 characters.",
    passwordChanged: "Password updated.",
    dataTitle: "Your data",
    dataBody:
      "Under the Kenya Data Protection Act 2019 you can ask for a copy of everything we hold about you, and you can ask us to delete it.",
    dataExport: "Download my data",
    dataExportHint: "A JSON file with your profile, applications and saved roles.",
    dataDelete: "Request deletion",
    dataDeleteHint:
      "We remove your profile, your CV and your saved roles. Applications you already sent are kept where an employer needs them for their own records, with your name removed.",
    privacy: "Read the privacy policy",
    signOutTitle: "Sign out",
    signOut: "Sign out of this device",
    notificationsTitle: "Notifications",
    notificationsChanged: "Notification preferences saved.",
    notifyEmailLabel: "Email me about my applications",
    notifyEmailHintSeeker: "Status changes on applications you've sent.",
    notifyEmailHintEmployer: "New applications, and listing approvals or rejections.",
    notifyNewJobsLabel: "Email me when a new job is posted",
    notifyNewJobsHint: "Every published role, not filtered — expect volume.",
  },

  drawer: {
    appliedTo: "Applied to",
    appliedOn: "Applied",
    statusLabel: "Status",
    statusUpdated: "Status updated.",
    hiringProfile: "Hiring profile",
    coverLetter: "Cover letter",
    noCoverLetter: "No cover letter was attached.",
    notesLabel: "Internal notes",
    notesHint: "Only your team sees this. The applicant never does.",
    notesSave: "Save note",
    activityLabel: "History",
    contact: "Contact",
    closeLabel: "Close panel",
    viewListing: "View the listing",
    roleNotRecorded: "Role not recorded",
    archived: "From the archive",
  },
} as const;
